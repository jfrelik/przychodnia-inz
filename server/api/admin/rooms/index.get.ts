import { asc, eq, sql } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import {
	appointments,
	room,
	roomSpecializations,
	specializations,
} from '~~/server/db/clinic';
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
			appointmentCount: sql<number>`count(DISTINCT ${appointments.appointmentId})`,
			specializationIds: sql<
				number[]
			>`coalesce(array_agg(DISTINCT ${roomSpecializations.specializationId}), '{}'::int[])`,
			specializationNames: sql<
				string[]
			>`coalesce(array_agg(DISTINCT ${specializations.name}), '{}'::text[])`,
		})
		.from(room)
		.leftJoin(appointments, eq(appointments.roomRoomId, room.roomId))
		.leftJoin(roomSpecializations, eq(room.roomId, roomSpecializations.roomId))
		.leftJoin(
			specializations,
			eq(roomSpecializations.specializationId, specializations.id)
		)
		.groupBy(room.roomId, room.number)
		.orderBy(asc(room.number));

	return rows.map((row) => ({
		roomId: row.roomId,
		number: row.number,
		appointmentCount: Number(row.appointmentCount ?? 0),
		specializationIds: (row.specializationIds ?? []).filter(
			(id): id is number => id !== null
		),
		specializationNames: (row.specializationNames ?? []).filter(
			(name): name is string => name !== null && name !== undefined
		),
	}));
});
