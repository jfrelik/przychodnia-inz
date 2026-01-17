import { count, eq, inArray } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
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

const fetchRoomWithMeta = async (roomId: number) => {
	const [roomRow] = await useDb()
		.select({
			roomId: room.roomId,
			number: room.number,
		})
		.from(room)
		.where(eq(room.roomId, roomId))
		.limit(1);

	if (!roomRow) {
		return undefined;
	}

	const [appointmentCountRow] = await useDb()
		.select({
			appointmentCount: count(appointments.appointmentId),
		})
		.from(appointments)
		.where(eq(appointments.roomRoomId, roomId));

	const specializationRows = await useDb()
		.select({
			specializationId: roomSpecializations.specializationId,
			specializationName: specializations.name,
		})
		.from(roomSpecializations)
		.leftJoin(
			specializations,
			eq(roomSpecializations.specializationId, specializations.id)
		)
		.where(eq(roomSpecializations.roomId, roomId));

	return {
		...roomRow,
		appointmentCount: Number(appointmentCountRow?.appointmentCount ?? 0),
		specializationIds: specializationRows.map((row) => row.specializationId),
		specializationNames: specializationRows
			.map((row) => row.specializationName)
			.filter((name): name is string => !!name),
	};
};

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		rooms: ['update'],
	});

	const roomId = Number(event.context.params?.id);

	if (!roomId || Number.isNaN(roomId)) {
		throw createError({
			statusCode: 400,
			message: 'Identyfikator gabinetu jest wymagany.',
		});
	}

	let currentRaw:
		| {
				roomId: number;
				number: number;
				appointmentCount: number;
				specializationIds: number[];
				specializationNames: string[];
		  }
		| undefined;

	try {
		currentRaw = await fetchRoomWithMeta(roomId);
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}

	if (!currentRaw) {
		throw createError({
			statusCode: 404,
			message: 'Gabinet nie został znaleziony.',
		});
	}

	const currentSpecializations = normalizeIds(currentRaw.specializationIds);

	const body = await readBody(event);
	const payload = payloadSchema.safeParse(body);

	if (payload.error) {
		const flat = z.flattenError(payload.error);

		const firstFieldError = Object.values(flat.fieldErrors)
			.flat()
			.find((m): m is string => !!m);

		throw createError({
			statusCode: 400,
			message: firstFieldError ?? 'Nieprawidłowe dane wejściowe.',
		});
	}

	const update: Record<string, unknown> = {};
	const auditMessages: string[] = [];

	if (
		payload.data.number !== undefined &&
		payload.data.number !== currentRaw.number
	) {
		update.number = payload.data.number;
		auditMessages.push(`zmieniono numer na ${payload.data.number}`);
	}

	const nextSpecializations =
		payload.data.specializations?.length === 0
			? []
			: payload.data.specializations
				? Array.from(new Set(payload.data.specializations))
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
			let found: { id: number; name: string }[] = [];

			try {
				found = await useDb()
					.select({ id: specializations.id, name: specializations.name })
					.from(specializations)
					.where(inArray(specializations.id, nextSpecializations));
			} catch (error) {
				const { message } = getDbErrorMessage(error);

				throw createError({
					statusCode: 500,
					message,
				});
			}

			if (found.length !== nextSpecializations.length) {
				throw createError({
					statusCode: 400,
					message: 'Jedna lub więcej specjalizacji nie istnieje.',
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

		if (dbError?.code === '23505') {
			throw createError({
				statusCode: 409,
				message: 'Gabinet o tym numerze już istnieje.',
			});
		}

		if (dbError?.code === '23503') {
			throw createError({
				statusCode: 400,
				message: 'Nieprawidłowy identyfikator specjalizacji.',
			});
		}

		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}

	let updated:
		| {
				roomId: number;
				number: number;
				appointmentCount: number;
				specializationIds: number[];
				specializationNames: string[];
		  }
		| undefined;

	try {
		updated = await fetchRoomWithMeta(roomId);

		if (!updated) {
			throw createError({
				statusCode: 500,
				message: 'Nie udało się wczytać gabinetu po aktualizacji.',
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
	} catch (error) {
		if (typeof error === 'object' && error !== null && 'statusCode' in error) {
			throw error;
		}

		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
