import { and, eq } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import {
	appointments,
	medicalRecords,
	medications,
	prescriptions,
	recommendations,
	testResults,
} from '~~/server/db/clinic';

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
	const session = await requireSessionWithPermissions(event, {
		appointments: ['update'],
		prescriptions: ['create'],
		recommendations: ['create'],
	});

	const appointmentId = Number(event.context.params?.id);
	if (!Number.isFinite(appointmentId))
		throw createError({
			statusCode: 400,
			message: 'Nieprawidłowy identyfikator wizyty',
		});

	const body = await readBody(event);
	const parsedPayload = payloadSchema.safeParse(body);

	if (parsedPayload.error) {
		const flat = z.flattenError(parsedPayload.error);
		const firstFieldError = Object.values(flat.fieldErrors)
			.flat()
			.find((m): m is string => !!m);

		throw createError({
			statusCode: 400,
			message: firstFieldError ?? 'Nieprawidłowe dane wejściowe.',
		});
	}

	const payload = parsedPayload.data;

	let appointmentRow:
		| {
				appointmentId: number;
				doctorId: string;
				status: string;
				patientId: string;
		  }
		| undefined;
	try {
		[appointmentRow] = await useDb()
			.select({
				appointmentId: appointments.appointmentId,
				doctorId: appointments.doctorId,
				status: appointments.status,
				patientId: appointments.patientId,
			})
			.from(appointments)
			.where(eq(appointments.appointmentId, appointmentId))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!appointmentRow)
		throw createError({
			statusCode: 404,
			message: 'Nie znaleziono wizyty',
		});

	if (appointmentRow.doctorId !== session.user.id)
		throw createError({ statusCode: 403, message: 'Brak dostępu' });

	if (appointmentRow.status !== 'checked_in')
		throw createError({
			statusCode: 400,
			message: 'Wizyta nie została zameldowana przez recepcję',
		});

	const medicationLines = normalizeMedications(payload.prescribedMedications);
	const examResultCodes = normalizeExamCodes(payload.examResultCodes);

	let result;
	try {
		result = await useDb().transaction(async (tx) => {
			let recommendationId: number | null = null;
			if (
				payload.recommendations &&
				payload.recommendations.trim().length > 0
			) {
				const [rec] = await tx
					.insert(recommendations)
					.values({ content: payload.recommendations.trim() })
					.returning({ recommendationId: recommendations.recommendationId });
				if (rec) {
					recommendationId = rec.recommendationId;
				}
			}

			let prescriptionId: number | null = null;
			if (medicationLines) {
				const [prescription] = await tx
					.insert(prescriptions)
					.values({
						status: 'active',
					})
					.returning({ prescriptionId: prescriptions.prescriptionId });
				if (prescription) {
					prescriptionId = prescription.prescriptionId;

					await tx.insert(medications).values(
						medicationLines.map((description) => ({
							prescriptionId: prescriptionId!,
							description,
						}))
					);
				}
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
					if (record) {
						recordId = record.recordId;
					}
				}

				if (recordId) {
					const now = new Date();
					const testDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
					await tx.insert(testResults).values(
						examResultCodes.map((code) => ({
							recordId: recordId!,
							testType: 'Kod badania',
							result: code,
							testDate: testDateStr,
						}))
					);
				}
			}

			return updated;
		});
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	return result;
});
