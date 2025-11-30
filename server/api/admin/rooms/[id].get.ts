import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { room } from '~~/server/db/clinic';
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
		})
		.from(room)
		.where(eq(room.roomId, roomId))
		.limit(1);

	if (!current) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Gabinet nie został znaleziony.',
		});
	}

	return current;
});
