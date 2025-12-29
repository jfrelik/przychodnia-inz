import { and, eq } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import {
	appointments,
	medicalRecords,
	prescriptions,
	recommendations,
	testResults,
} from '~~/server/db/clinic';
import db from '~~/server/util/db';

const payloadSchema = z.object({
	visitGoal: z.string().min(1, 'Cel wizyty jest wymagany'),
	symptoms: z.string().optional(),
	diagnosisDescription: z.string().optional(),
	prescribedMedications: z.string().optional(),
	recommendations: z.string().optional(),
	proceduresPerformed: z.string().optional(),
	examResultCodes: z.array(z.string()).optional(),
});

const normalizeMedications = (input?: string | null) => {
	if (!input) return null;
	const parts = input
		.split(/\r?\n/)
		.map((s) => s.trim())
		.filter(Boolean);
	if (!parts.length) return null;
	return parts;
};

const buildNotes = (payload: z.infer<typeof payloadSchema>) => {
	const chunks: string[] = [];
	chunks.push(`Cel wizyty: ${payload.visitGoal}`);
	if (payload.symptoms) chunks.push(`Objawy: ${payload.symptoms}`);
	if (payload.diagnosisDescription)
		chunks.push(`Diagnoza: ${payload.diagnosisDescription}`);
	if (payload.recommendations)
		chunks.push(`Zalecenia: ${payload.recommendations}`);
	if (payload.proceduresPerformed)
		chunks.push(`Procedury: ${payload.proceduresPerformed}`);
	return chunks.join('\n\n');
};

const normalizeExamCode = (value?: string | null) => {
	if (!value) return null;
	const trimmed = value.trim();
	return trimmed.length ? trimmed : null;
};

const normalizeExamCodes = (values?: string[] | null) => {
	if (!values || !values.length) return [];
	const normalized = values
		.map((code) => normalizeExamCode(code))
		.filter((code): code is string => Boolean(code));
	return Array.from(new Set(normalized));
};

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				appointments: ['update'],
				prescriptions: ['create'],
				recommendations: ['create'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const appointmentId = Number(event.context.params?.id);
	if (!Number.isFinite(appointmentId))
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid appointment id',
		});

	const payload = payloadSchema.parse(await readBody(event));

	const [appointmentRow] = await db
		.select({
			appointmentId: appointments.appointmentId,
			doctorId: appointments.doctorId,
			status: appointments.status,
			patientId: appointments.patientId,
		})
		.from(appointments)
		.where(eq(appointments.appointmentId, appointmentId))
		.limit(1);

	if (!appointmentRow)
		throw createError({
			statusCode: 404,
			statusMessage: 'Appointment not found',
		});

	if (appointmentRow.doctorId !== session.user.id)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	if (!['scheduled', 'checked_in'].includes(appointmentRow.status))
		throw createError({
			statusCode: 400,
			statusMessage: 'Appointment is already closed',
		});

	const medications = normalizeMedications(payload.prescribedMedications);
	const examResultCodes = normalizeExamCodes(payload.examResultCodes);

	const result = await db.transaction(async (tx) => {
		let recommendationId: number | null = null;
		if (payload.recommendations && payload.recommendations.trim().length > 0) {
			const [rec] = await tx
				.insert(recommendations)
				.values({ content: payload.recommendations.trim() })
				.returning({ recommendationId: recommendations.recommendationId });
			recommendationId = rec.recommendationId;
		}

		let prescriptionId: number | null = null;
		if (medications) {
			const [prescription] = await tx
				.insert(prescriptions)
				.values({
					medications,
					status: 'active',
				})
				.returning({ prescriptionId: prescriptions.prescriptionId });
			prescriptionId = prescription.prescriptionId;
		}

		const [updated] = await tx
			.update(appointments)
			.set({
				status: 'completed',
				notes: buildNotes(payload),
				recommendationId: recommendationId ?? undefined,
				prescriptionId: prescriptionId ?? undefined,
			})
			.where(
				and(
					eq(appointments.appointmentId, appointmentId),
					eq(appointments.doctorId, session.user.id)
				)
			)
			.returning({
				appointmentId: appointments.appointmentId,
				status: appointments.status,
				recommendationId: appointments.recommendationId,
				prescriptionId: appointments.prescriptionId,
			});

		if (examResultCodes.length) {
			const [existingRecord] = await tx
				.select({ recordId: medicalRecords.recordId })
				.from(medicalRecords)
				.where(eq(medicalRecords.patientId, appointmentRow.patientId))
				.limit(1);

			let recordId = existingRecord?.recordId;
			if (!recordId) {
				const [record] = await tx
					.insert(medicalRecords)
					.values({ patientId: appointmentRow.patientId })
					.returning({ recordId: medicalRecords.recordId });
				recordId = record.recordId;
			}

			const now = new Date();
			await tx.insert(testResults).values(
				examResultCodes.map((code) => ({
					recordId,
					testType: 'Kod badania',
					result: code,
					testDate: now,
				}))
			);
		}

		return updated;
	});

	return result;
});
