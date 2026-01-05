import { asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user } from '~~/server/db/auth';
import { appointments, patients, room } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				appointments: ['list'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const doctorUser = user;

	try {
		const rows = await useDb()
			.select({
				appointmentId: appointments.appointmentId,
				datetime: appointments.datetime,
				status: appointments.status,
				notes: appointments.notes,
				patientId: appointments.patientId,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientPesel: patients.pesel,
				doctorId: appointments.doctorId,
				doctorName: doctorUser.name,
				roomId: room.roomId,
				roomNumber: room.number,
			})
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.userId))
			.leftJoin(doctorUser, eq(appointments.doctorId, doctorUser.id))
			.leftJoin(room, eq(appointments.roomRoomId, room.roomId))
			.orderBy(asc(appointments.datetime));

		return rows;
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
