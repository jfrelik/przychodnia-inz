import { count, eq } from 'drizzle-orm';
import { createError, readBody } from 'h3';
import { z } from 'zod';
import { appointments, room } from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

const payloadSchema = z
	.object({
		number: z
			.number()
			.int('Numer gabinetu musi być liczbą całkowitą.')
			.min(1, 'Numer gabinetu musi być liczbą od 1 do 9999.')
			.max(9999, 'Numer gabinetu musi być liczbą od 1 do 9999.')
			.optional(),
	})
	.refine(
		(payload) => Object.keys(payload).length > 0,
		'Brak danych do aktualizacji.'
	)
	.strict();

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

		const body = await readBody(event);
		const payload = payloadSchema.parse(body);

		const update: Record<string, unknown> = {};
		const auditMessages: string[] = [];

		if (payload.number && payload.number !== current.number) {
			update.number = payload.number;
			auditMessages.push(`zmieniono numer na ${payload.number}`);
		}

		if (Object.keys(update).length === 0) {
			return {
				status: 'noop',
				message: 'Brak zmian do zapisania.',
			};
		}

		try {
			await db.update(room).set(update).where(eq(room.roomId, roomId));
		} catch (error: unknown) {
			const dbError = error as { code?: string };

			console.error({
				operation: 'AdminUpdateRoom',
				targetId: roomId,
				errorCode: dbError?.code,
				error,
			});

			if (dbError?.code === '23505') {
				throw createError({
					statusCode: 409,
					statusMessage: 'Gabinet o tym numerze już istnieje.',
				});
			}
			throw error;
		}

		const [updated] = await db
			.select({
				roomId: room.roomId,
				number: room.number,
				appointmentCount: count(appointments.appointmentId),
			})
			.from(room)
			.leftJoin(appointments, eq(appointments.roomRoomId, room.roomId))
			.where(eq(room.roomId, roomId))
			.groupBy(room.roomId);

		await recordAuditLog(
			event,
			session.user.id,
			`Zaktualizowano gabinet ${current.number}: ${auditMessages.join(', ')}`
		);

		return {
			status: 'ok',
			room: {
				...updated,
				appointmentCount: Number(updated?.appointmentCount ?? 0),
			},
		};
	},
	['admin']
);
