import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user as authUser } from '~~/server/db/auth';
import {
	appointments,
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
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				appointments: ['read'],
				users: ['read'],
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

	const [row] = await useDb()
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
			roomId: room.roomId,
			roomNumber: room.number,
			recommendationContent: recommendations.content,
			prescriptionMedications: prescriptions.medications,
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

	if (!row)
		throw createError({
			statusCode: 404,
			statusMessage: 'Appointment not found',
		});

	if (row.doctorId !== session.user.id)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

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
		roomId: row.roomId ?? null,
		roomNumber:
			row.roomNumber === undefined || row.roomNumber === null
				? null
				: String(row.roomNumber),
		recommendation: row.recommendationContent ?? null,
		prescription: row.prescriptionMedications ?? null,
	};
});
