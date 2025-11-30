import { eq } from 'drizzle-orm';
import { createError } from 'h3';
import { room } from '~~/server/db/clinic';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

export default withAuth(
	async (event) => {
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
	},
	['admin']
);
