import { asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import {
	appointments,
	medications,
	patients,
	prescriptions,
	recommendations,
	room,
} from '~~/server/db/clinic';

const buildPatientName = (
	firstName?: string | null,
	lastName?: string | null,
	fallback?: string | null
) => {
	const parts = [firstName, lastName].filter(Boolean).join(' ').trim();
	if (parts.length > 0) return parts;
	if (fallback && fallback.trim().length > 0) return fallback;
	return null;
};

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		appointments: ['read'],
		users: ['read'],
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
				patientFirstName: string | null;
				patientLastName: string | null;
				patientAuthName: string | null;
				patientEmail: string | null;
				patientPhone: string | null;
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
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientAuthName: authUser.name,
				patientEmail: authUser.email,
				patientPhone: patients.phone,
				roomId: room.roomId,
				roomNumber: room.number,
				recommendationContent: recommendations.content,
				prescriptionId: prescriptions.prescriptionId,
			})
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.userId))
			.leftJoin(authUser, eq(appointments.patientId, authUser.id))
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

	if (row.doctorId !== session.user.id)
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
		patientId: row.patientId,
		patientName: buildPatientName(
			row.patientFirstName,
			row.patientLastName,
			row.patientAuthName
		),
		patientEmail: row.patientEmail ?? null,
		patientPhone: row.patientPhone ?? null,
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
