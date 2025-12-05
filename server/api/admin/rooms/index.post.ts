import consola from 'consola';
import { eq, inArray, sql } from 'drizzle-orm';
import {
	createError,
	defineEventHandler,
	readBody,
	setResponseStatus,
} from 'h3';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import {
	appointments,
	room,
	roomSpecializations,
	specializations,
} from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';

const payloadSchema = z
	.object({
		number: z
			.number()
			.int('Numer gabinetu musi być liczbą całkowitą.')
			.min(1, 'Numer gabinetu musi być liczbą od 1 do 9999.')
			.max(9999, 'Numer gabinetu musi być liczbą od 1 do 9999.'),
		specializations: z
			.array(
				z
					.number()
					.int('ID specjalizacji musi być liczbą całkowitą.')
					.positive('ID specjalizacji musi być liczbą dodatnią.')
			)
			.optional(),
	})
	.strict();

const normalizeIds = (ids?: (number | null)[]) =>
	(ids ?? []).filter((id): id is number => id !== null);

const fetchRoomWithMeta = async (roomId: number) =>
	db
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
		.where(eq(room.roomId, roomId))
		.groupBy(room.roomId, room.number)
		.limit(1);

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				rooms: ['create'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const body = await readBody(event);
	const payload = payloadSchema.parse(body);

	const specializationIds = payload.specializations
		? Array.from(new Set(payload.specializations))
		: [];

	let specializationNames: string[] = [];

	if (specializationIds.length > 0) {
		const found = await db
			.select({ id: specializations.id, name: specializations.name })
			.from(specializations)
			.where(inArray(specializations.id, specializationIds));

		if (found.length !== specializationIds.length) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Jedna lub więcej specjalizacji nie istnieje.',
			});
		}

		specializationNames = found.map((row) => row.name);
	}

	try {
		const createdRoom = await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(room)
				.values({
					number: payload.number,
				})
				.returning({
					roomId: room.roomId,
					number: room.number,
				});

			if (specializationIds.length > 0) {
				await tx.insert(roomSpecializations).values(
					specializationIds.map((specId: number) => ({
						roomId: created.roomId,
						specializationId: specId,
					}))
				);
			}

			return created;
		});

		const [savedRoom] = await fetchRoomWithMeta(createdRoom.roomId);

		if (!savedRoom) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Nie udało się wczytać gabinetu po utworzeniu.',
			});
		}

		await recordAuditLog(
			event,
			session.user.id,
			specializationNames.length > 0
				? `Dodano gabinet numer ${createdRoom.number} (specjalizacje: ${specializationNames.join(', ')}).`
				: `Dodano gabinet numer ${createdRoom.number}.`
		);

		setResponseStatus(event, 201);

		return {
			status: 'ok',
			room: {
				...savedRoom,
				appointmentCount: Number(savedRoom?.appointmentCount ?? 0),
				specializationIds: normalizeIds(savedRoom?.specializationIds),
				specializationNames: (savedRoom?.specializationNames ?? []).filter(
					(name): name is string => name !== null && name !== undefined
				),
			},
		};
	} catch (error: unknown) {
		const dbError = error as { code?: string };

		consola.error({
			operation: 'AdminCreateRoom',
			targetNumber: payload.number,
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
});
