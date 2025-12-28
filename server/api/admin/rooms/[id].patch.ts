import consola from 'consola';
import { eq, inArray, sql } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import {
	appointments,
	room,
	roomSpecializations,
	specializations,
} from '~~/server/db/clinic';

const payloadSchema = z
	.object({
		number: z
			.number()
			.int('Numer gabinetu musi być liczbą całkowitą.')
			.min(1, 'Numer gabinetu musi być liczbą od 1 do 9999.')
			.max(9999, 'Numer gabinetu musi być liczbą od 1 do 9999.')
			.optional(),
		specializations: z
			.array(
				z
					.number()
					.int('ID specjalizacji musi być liczbą całkowitą.')
					.positive('ID specjalizacji musi być liczbą dodatnią.')
			)
			.optional(),
	})
	.refine(
		(payload) => Object.keys(payload).length > 0,
		'Brak danych do aktualizacji.'
	)
	.strict();

const normalizeIds = (ids?: (number | null)[]) =>
	(ids ?? []).filter((id): id is number => id !== null);

const fetchRoomWithMeta = async (roomId: number) =>
	useDb()
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

	const [currentRaw] = await fetchRoomWithMeta(roomId);

	if (!currentRaw) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Gabinet nie został znaleziony.',
		});
	}

	const currentSpecializations = normalizeIds(currentRaw.specializationIds);

	const body = await readBody(event);
	const payload = payloadSchema.parse(body);

	const update: Record<string, unknown> = {};
	const auditMessages: string[] = [];

	if (payload.number !== undefined && payload.number !== currentRaw.number) {
		update.number = payload.number;
		auditMessages.push(`zmieniono numer na ${payload.number}`);
	}

	const nextSpecializations =
		payload.specializations?.length === 0
			? []
			: payload.specializations
				? Array.from(new Set(payload.specializations))
				: undefined;

	const currentSorted = [...currentSpecializations].sort((a, b) => a - b);
	const nextSorted =
		nextSpecializations !== undefined
			? [...nextSpecializations].sort((a, b) => a - b)
			: undefined;

	const specializationsChanged =
		nextSorted !== undefined &&
		(nextSorted.length !== currentSorted.length ||
			nextSorted.some((id, index) => id !== currentSorted[index]));

	let specializationNames: string[] = [];

	if (nextSpecializations !== undefined) {
		if (nextSpecializations.length > 0) {
			const found = await useDb()
				.select({ id: specializations.id, name: specializations.name })
				.from(specializations)
				.where(inArray(specializations.id, nextSpecializations));

			if (found.length !== nextSpecializations.length) {
				throw createError({
					statusCode: 400,
					statusMessage: 'Jedna lub więcej specjalizacji nie istnieje.',
				});
			}

			specializationNames = found.map((row) => row.name);
		}

		if (specializationsChanged) {
			auditMessages.push(
				nextSpecializations.length > 0
					? `zaktualizowano specjalizacje: ${specializationNames.join(', ')}`
					: 'usunięto wszystkie specjalizacje'
			);
		}
	}

	if (Object.keys(update).length === 0 && !specializationsChanged) {
		return {
			status: 'noop',
			message: 'Brak zmian do zapisania.',
		};
	}

	try {
		await useDb().transaction(async (tx) => {
			if (Object.keys(update).length > 0) {
				await tx.update(room).set(update).where(eq(room.roomId, roomId));
			}

			if (specializationsChanged && nextSpecializations !== undefined) {
				await tx
					.delete(roomSpecializations)
					.where(eq(roomSpecializations.roomId, roomId));

				if (nextSpecializations.length > 0) {
					await tx.insert(roomSpecializations).values(
						nextSpecializations.map((specId: number) => ({
							roomId,
							specializationId: specId,
						}))
					);
				}
			}
		});
	} catch (error: unknown) {
		const dbError = error as { code?: string };

		consola.error({
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

		if (dbError?.code === '23503') {
			throw createError({
				statusCode: 400,
				statusMessage: 'Nieprawidłowy identyfikator specjalizacji.',
			});
		}

		throw error;
	}

	const [updated] = await fetchRoomWithMeta(roomId);

	if (!updated) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Nie udało się wczytać gabinetu po aktualizacji.',
		});
	}

	const updatedNumberForLog =
		(update.number as number | undefined) ?? currentRaw.number;

	await useAuditLog(
		event,
		session.user.id,
		`Zaktualizowano gabinet ${updatedNumberForLog}: ${auditMessages.join(', ')}`
	);

	return {
		status: 'ok',
		room: {
			...updated,
			appointmentCount: Number(updated?.appointmentCount ?? 0),
			specializationIds: normalizeIds(updated?.specializationIds),
			specializationNames: (updated?.specializationNames ?? []).filter(
				(name): name is string => name !== null && name !== undefined
			),
		},
	};
});
