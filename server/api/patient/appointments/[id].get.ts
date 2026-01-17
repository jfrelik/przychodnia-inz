import { asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import {
	appointments,
	doctors,
	medications,
	prescriptions,
	recommendations,
	room,
} from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		appointments: ['read'],
	});

	const appointmentId = Number(event.context.params?.id);
	if (!Number.isFinite(appointmentId))
		throw createError({
			statusCode: 400,
			message: 'Nieprawidłowy identyfikator wizyty',
		});

	let row:
		| {
				appointmentId: number;
				datetime: Date;
				status: string;
				type: string;
				isOnline: boolean;
				notes: string | null;
				doctorId: string;
				patientId: string;
				doctorName: string | null;
				roomId: number | null;
				roomNumber: number | null;
				recommendationContent: string | null;
				prescriptionId: number | null;
		  }
		| undefined;
	try {
		[row] = await useDb()
			.select({
				appointmentId: appointments.appointmentId,
				datetime: appointments.datetime,
				status: appointments.status,
				type: appointments.type,
				isOnline: appointments.isOnline,
				notes: appointments.notes,
				doctorId: appointments.doctorId,
				patientId: appointments.patientId,
				doctorName: authUser.name,
				roomId: room.roomId,
				roomNumber: room.number,
				recommendationContent: recommendations.content,
				prescriptionId: prescriptions.prescriptionId,
			})
			.from(appointments)
			.leftJoin(doctors, eq(appointments.doctorId, doctors.userId))
			.leftJoin(authUser, eq(appointments.doctorId, authUser.id))
			.leftJoin(room, eq(appointments.roomRoomId, room.roomId))
			.leftJoin(
				recommendations,
				eq(appointments.recommendationId, recommendations.recommendationId)
			)
			.leftJoin(
				prescriptions,
				eq(appointments.prescriptionId, prescriptions.prescriptionId)
			)
			.where(eq(appointments.appointmentId, appointmentId))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!row)
		throw createError({
			statusCode: 404,
			message: 'Nie znaleziono wizyty',
		});

	// Verify that the appointment belongs to the current patient
	if (row.patientId !== session.user.id)
		throw createError({ statusCode: 403, message: 'Brak dostępu' });

	let prescriptionMedications: Array<{ description: string }> = [];
	if (row.prescriptionId) {
		try {
			prescriptionMedications = await useDb()
				.select({ description: medications.description })
				.from(medications)
				.where(eq(medications.prescriptionId, row.prescriptionId))
				.orderBy(asc(medications.createdAt));
		} catch (error) {
			const { message } = getDbErrorMessage(error);
			throw createError({ statusCode: 500, message });
		}
	}

	return {
		appointmentId: row.appointmentId,
		datetime: row.datetime,
		status: row.status,
		type: row.type,
		isOnline: row.isOnline,
		notes: row.notes,
		doctorName: row.doctorName ?? null,
		roomId: row.roomId ?? null,
		roomNumber:
			row.roomNumber === undefined || row.roomNumber === null
				? null
				: String(row.roomNumber),
		recommendation: row.recommendationContent ?? null,
		prescription: row.prescriptionId
			? prescriptionMedications.map((item) => item.description)
			: null,
	};
});
