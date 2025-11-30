import { count, eq } from 'drizzle-orm';
import { createError } from 'h3';
import { appointments, room } from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

export default withAuth(
	async (event, session) => {
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

		const [assigned] = await db
			.select({ total: count(appointments.appointmentId) })
			.from(appointments)
			.where(eq(appointments.roomRoomId, roomId));

		if (Number(assigned?.total ?? 0) > 0) {
			throw createError({
				statusCode: 400,
				statusMessage:
					'Nie można usunąć gabinetu, do którego przypisane są wizyty.',
			});
		}

		await db.delete(room).where(eq(room.roomId, roomId));

		await recordAuditLog(
			event,
			session.user.id,
			`Usunięto gabinet numer ${current.number}.`
		);

		return {
			status: 'ok',
		};
	},
	['admin']
);

defineRouteMeta({
	openAPI: {
		operationId: 'Admin_DeleteRoom',
		tags: ['Admin'],
		summary: 'Delete room',
		description:
			'Usuwa gabinet bez przypisanych wizyt (dostęp tylko dla administratorów).',
		responses: {
			200: { description: 'OK' },
			400: { description: 'Gabinet ma przypisane wizyty' },
			401: { description: 'Unauthorized' },
			403: { description: 'Forbidden' },
			404: { description: 'Not found' },
		},
	},
});
