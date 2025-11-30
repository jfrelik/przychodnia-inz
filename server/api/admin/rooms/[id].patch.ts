import { count, eq } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import { appointments, room, specializations } from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';

const payloadSchema = z
	.object({
		number: z
			.number()
			.int('Numer gabinetu musi być liczbą całkowitą.')
			.min(1, 'Numer gabinetu musi być liczbą od 1 do 9999.')
			.max(9999, 'Numer gabinetu musi być liczbą od 1 do 9999.')
			.optional(),
		specializationId: z
			.number()
			.int('Wybrana specjalizacja jest nieprawidłowa.')
			.min(1, 'Wybrana specjalizacja jest nieprawidłowa.')
			.nullable()
			.optional(),
	})
	.refine(
		(payload) => Object.keys(payload).length > 0,
		'Brak danych do aktualizacji.'
	)
	.strict();

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				rooms: ['update'],
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
			specializationId: room.specializationId,
			specializationName: specializations.name,
		})
		.from(room)
		.leftJoin(specializations, eq(room.specializationId, specializations.id))
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

	if (
		payload.specializationId !== undefined &&
		payload.specializationId !== current.specializationId
	) {
		if (payload.specializationId === null) {
			update.specializationId = null;
			auditMessages.push('usunięto specjalizację');
		} else {
			const [newSpecialization] = await db
				.select({
					id: specializations.id,
					name: specializations.name,
				})
				.from(specializations)
				.where(eq(specializations.id, payload.specializationId))
				.limit(1);

			if (!newSpecialization) {
				throw createError({
					statusCode: 404,
					statusMessage: 'Wybrana specjalizacja nie istnieje.',
				});
			}

			update.specializationId = payload.specializationId;
			auditMessages.push(
				`zmieniono specjalizację na ${newSpecialization.name}`
			);
		}
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
			specializationId: room.specializationId,
			specializationName: specializations.name,
		})
		.from(room)
		.leftJoin(appointments, eq(appointments.roomRoomId, room.roomId))
		.leftJoin(specializations, eq(room.specializationId, specializations.id))
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
});
