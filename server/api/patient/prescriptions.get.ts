import { and, asc, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import { appointments, medications, prescriptions } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		prescriptions: ['list'],
	});

	let rows: Array<{
		prescriptionId: number | null;
		issuedAt: Date | null;
		status: 'active' | 'fulfilled' | null;
		appointmentId: number | null;
		appointmentDatetime: Date | null;
		doctorId: string | null;
		doctorName: string | null;
		doctorEmail: string | null;
	}>;
	try {
		rows = await useDb()
			.select({
				prescriptionId: prescriptions.prescriptionId,
				issuedAt: prescriptions.issuedAt,
				status: prescriptions.status,
				appointmentId: appointments.appointmentId,
				appointmentDatetime: appointments.datetime,
				doctorId: appointments.doctorId,
				doctorName: authUser.name,
				doctorEmail: authUser.email,
			})
			.from(appointments)
			.leftJoin(
				prescriptions,
				eq(appointments.prescriptionId, prescriptions.prescriptionId)
			)
			.leftJoin(authUser, eq(appointments.doctorId, authUser.id))
			.where(
				and(
					eq(appointments.patientId, session.user.id),
					isNotNull(appointments.prescriptionId),
					isNotNull(prescriptions.prescriptionId)
				)
			)
			.orderBy(desc(prescriptions.issuedAt));
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	const prescriptionIds = [
		...new Set(
			rows
				.map((row) => row.prescriptionId)
				.filter((id): id is number => id !== null)
		),
	];
	let medicationsRows: Array<{ prescriptionId: number; description: string }> =
		[];
	if (prescriptionIds.length) {
		try {
			medicationsRows = await useDb()
				.select({
					prescriptionId: medications.prescriptionId,
					description: medications.description,
				})
				.from(medications)
				.where(inArray(medications.prescriptionId, prescriptionIds))
				.orderBy(asc(medications.createdAt));
		} catch (error) {
			const { message } = getDbErrorMessage(error);
			throw createError({ statusCode: 500, message });
		}
	}
	const medicationsByPrescriptionId = new Map<number, string[]>();
	for (const item of medicationsRows) {
		const current = medicationsByPrescriptionId.get(item.prescriptionId) ?? [];
		current.push(item.description);
		medicationsByPrescriptionId.set(item.prescriptionId, current);
	}

	return rows.map((row) => ({
		...row,
		medications:
			row.prescriptionId !== null
				? (medicationsByPrescriptionId.get(row.prescriptionId) ?? [])
				: [],
	}));
});
