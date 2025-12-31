import { asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler, getQuery } from 'h3';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import { user as authUser } from '~~/server/db/auth';
import {
	availability,
	doctors,
	room,
	roomSpecializations,
	specializations,
} from '~~/server/db/clinic';

const querySchema = z
	.object({
		day: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Data musi być w formacie YYYY-MM-DD')
			.optional(),
	})
	.strict();

const buildTodayDate = () => {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
};

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });
	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				availability: ['list'],
				rooms: ['list'],
				doctors: ['list'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const query = querySchema.parse(getQuery(event));
	const day = query.day ?? buildTodayDate();

	const rawRooms = await useDb()
		.select({
			roomId: room.roomId,
			number: room.number,
			specializationId: roomSpecializations.specializationId,
			specializationName: specializations.name,
		})
		.from(room)
		.leftJoin(roomSpecializations, eq(room.roomId, roomSpecializations.roomId))
		.leftJoin(
			specializations,
			eq(roomSpecializations.specializationId, specializations.id)
		)
		.orderBy(asc(room.number), asc(room.roomId));

	const roomMap = new Map<
		number,
		{
			roomId: number;
			number: number;
			specializationIds: number[];
			specializationNames: string[];
		}
	>();

	for (const current of rawRooms) {
		const entry = roomMap.get(current.roomId) ?? {
			roomId: current.roomId,
			number: current.number,
			specializationIds: [],
			specializationNames: [],
		};

		if (
			current.specializationId !== null &&
			current.specializationId !== undefined &&
			!entry.specializationIds.includes(current.specializationId)
		) {
			entry.specializationIds.push(current.specializationId);
		}

		if (
			current.specializationName &&
			!entry.specializationNames.includes(current.specializationName)
		) {
			entry.specializationNames.push(current.specializationName);
		}

		roomMap.set(current.roomId, entry);
	}

	const rooms = Array.from(roomMap.values()).sort(
		(a, b) => a.number - b.number
	);

	const slots = await useDb()
		.select({
			scheduleId: availability.scheduleId,
			day: availability.day,
			start: availability.timeStart,
			end: availability.timeEnd,
			roomId: availability.roomRoomId,
			roomNumber: room.number,
			doctorId: doctors.userId,
			doctorName: authUser.name,
			doctorEmail: authUser.email,
			specializationId: doctors.specializationId,
			specializationName: specializations.name,
		})
		.from(availability)
		.leftJoin(room, eq(availability.roomRoomId, room.roomId))
		.leftJoin(doctors, eq(availability.doctorUserId, doctors.userId))
		.leftJoin(specializations, eq(doctors.specializationId, specializations.id))
		.leftJoin(authUser, eq(doctors.userId, authUser.id))
		.where(eq(availability.day, day))
		.orderBy(asc(availability.timeStart));

	const response = slots.map((slot) => {
		const specializationId = slot.specializationId ?? null;
		const compatibleRooms = specializationId
			? rooms.filter((r) => r.specializationIds.includes(specializationId))
			: [];

		return {
			scheduleId: slot.scheduleId,
			day: typeof slot.day === 'string' ? slot.day : day,
			start: slot.start,
			end: slot.end,
			doctorId: slot.doctorId,
			doctorName: slot.doctorName ?? 'Lekarz',
			doctorEmail: slot.doctorEmail ?? '',
			specializationId,
			specializationName: slot.specializationName ?? 'Brak specjalizacji',
			roomId: slot.roomId ?? null,
			roomNumber: slot.roomNumber ?? null,
			compatibleRooms: compatibleRooms.map((r) => ({
				roomId: r.roomId,
				number: r.number,
			})),
		};
	});

	return {
		day,
		timeframes: response,
		rooms: rooms.map((r) => ({
			roomId: r.roomId,
			number: r.number,
			specializationIds: r.specializationIds,
			specializationNames: r.specializationNames,
		})),
	};
});
