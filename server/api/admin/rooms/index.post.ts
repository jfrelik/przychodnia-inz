import { count, eq, inArray } from 'drizzle-orm';
import {
	createError,
	defineEventHandler,
	readBody,
	setResponseStatus,
} from 'h3';
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
		rooms: ['create'],
	});

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

	const specializationIds = payload.data.specializations
		? Array.from(new Set(payload.data.specializations))
		: [];

	let specializationNames: string[] = [];

	if (specializationIds.length > 0) {
		const found = await useDb()
			.select({ id: specializations.id, name: specializations.name })
			.from(specializations)
			.where(inArray(specializations.id, specializationIds));

		if (found.length !== specializationIds.length) {
			throw createError({
				statusCode: 400,
				message: 'Jedna lub więcej specjalizacji nie istnieje.',
			});
		}

		specializationNames = found.map((row) => row.name);
	}

	try {
		const createdRoom = await useDb().transaction(async (tx) => {
			const [created] = await tx
				.insert(room)
				.values({
					number: payload.data.number,
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

		const savedRoom = await fetchRoomWithMeta(createdRoom.roomId);

		if (!savedRoom) {
			throw createError({
				statusCode: 500,
				message: 'Nie udało się wczytać gabinetu po utworzeniu.',
			});
		}

		await useAuditLog(
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

		if (dbError?.code === '23505') {
			throw createError({
				statusCode: 409,
				message: 'Gabinet o tym numerze już istnieje.',
			});
		}

		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
