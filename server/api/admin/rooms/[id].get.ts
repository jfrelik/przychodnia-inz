import { eq, sql } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import {
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
				rooms: ['read'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const roomId = Number(event.context.params?.id);

	if (!roomId || Number.isNaN(roomId)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Identyfikator gabinetu jest wymagany.',
		});
	}

	const [current] = await db
		.select({
			roomId: room.roomId,
			number: room.number,
			specializationIds: sql<
				number[]
			>`coalesce(array_agg(DISTINCT ${roomSpecializations.specializationId}), '{}'::integer[])`,
			specializationNames: sql<
				string[]
			>`coalesce(array_agg(DISTINCT ${specializations.name}), '{}'::text[])`,
		})
		.from(room)
		.leftJoin(roomSpecializations, eq(room.roomId, roomSpecializations.roomId))
		.leftJoin(
			specializations,
			eq(roomSpecializations.specializationId, specializations.id)
		)
		.where(eq(room.roomId, roomId))
		.groupBy(room.roomId, room.number)
		.limit(1);

	if (!current) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Gabinet nie został znaleziony.',
		});
	}

	return {
		...current,
		specializationIds: (current.specializationIds ?? []).filter(
			(id): id is number => id !== null
		),
		specializationNames: (current.specializationNames ?? []).filter(
			(name): name is string => name !== null && name !== undefined
		),
	};
});
