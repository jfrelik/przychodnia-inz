import { and, asc, eq, gte } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user as authUser } from '~~/server/db/auth';
import { appointments, patients, room } from '~~/server/db/clinic';
import db from '~~/server/util/db';

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

	const email = session.user.email;

	const [userRow] = await db
		.select()
		.from(authUser)
		.where(eq(authUser.email, email))
		.limit(1);
	if (!userRow)
		throw createError({ statusCode: 404, statusMessage: 'User not found' });

	const [patientRow] = await db
		.select()
		.from(patients)
		.where(eq(patients.userId, userRow.id))
		.limit(1);
	if (!patientRow)
		throw createError({
			statusCode: 404,
			statusMessage: 'Patient profile not found',
		});

	const now = new Date();

	const rows = await db
		.select({
			appointmentId: appointments.appointmentId,
			datetime: appointments.datetime,
			status: appointments.status,
			notes: appointments.notes,
			doctorId: appointments.doctorId,
			doctorName: authUser.name,
			doctorEmail: authUser.email,
			roomId: room.roomId,
			roomNumber: room.number,
		})
		.from(appointments)
		.leftJoin(authUser, eq(appointments.doctorId, authUser.id))
		.leftJoin(room, eq(appointments.roomRoomId, room.roomId))
		.where(
			and(
				eq(appointments.patientId, patientRow.userId),
				gte(appointments.datetime, now)
			)
		)
		.orderBy(asc(appointments.datetime))
		.limit(2);

	return rows;
});
