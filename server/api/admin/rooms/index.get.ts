import { asc, count, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { appointments, room, specializations } from '~~/server/db/clinic';
import db from '~~/server/util/db';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				rooms: ['list'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const rows = await db
		.select({
			roomId: room.roomId,
			number: room.number,
			appointmentCount: count(appointments.appointmentId),
			specializationId: room.specializationId,
			specializationName: specializations.name,
		})
		.from(room)
		.leftJoin(appointments, eq(appointments.roomRoomId, room.roomId))
		.leftJoin(specializations, eq(room.specializationId, specializations.id))
		.groupBy(room.roomId, specializations.name)
		.orderBy(asc(room.number));

	return rows.map((row) => ({
		...row,
		appointmentCount: Number(row.appointmentCount ?? 0),
	}));
});
