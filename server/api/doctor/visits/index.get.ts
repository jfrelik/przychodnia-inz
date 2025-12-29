import { desc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user as authUser } from '~~/server/db/auth';
import { appointments, doctors, patients, room } from '~~/server/db/clinic';

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
				appointments: ['list'],
				users: ['read'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const [doctorRow] = await useDb()
		.select({ userId: doctors.userId })
		.from(doctors)
		.where(eq(doctors.userId, session.user.id))
		.limit(1);

	if (!doctorRow) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Doctor profile not found.',
		});
	}

	const rows = await useDb()
		.select({
			appointmentId: appointments.appointmentId,
			datetime: appointments.datetime,
			status: appointments.status,
			notes: appointments.notes,
			patientId: appointments.patientId,
			patientFirstName: patients.firstName,
			patientLastName: patients.lastName,
			patientAuthName: authUser.name,
			patientEmail: authUser.email,
			roomId: room.roomId,
			roomNumber: room.number,
		})
		.from(appointments)
		.leftJoin(patients, eq(appointments.patientId, patients.userId))
		.leftJoin(authUser, eq(appointments.patientId, authUser.id))
		.leftJoin(room, eq(appointments.roomRoomId, room.roomId))
		.where(eq(appointments.doctorId, doctorRow.userId))
		.orderBy(desc(appointments.datetime));

	return rows.map((row) => ({
		appointmentId: row.appointmentId,
		datetime: row.datetime,
		status: row.status,
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
	}));
});
