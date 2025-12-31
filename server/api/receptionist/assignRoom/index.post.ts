import { and, eq } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import {
	availability,
	doctors,
	room,
	roomSpecializations,
} from '~~/server/db/clinic';

const payloadSchema = z
	.object({
		scheduleId: z.string().min(1),
		roomId: z.number().int().positive().nullable(),
	})
	.strict();

const toMinutes = (time: string | null | undefined) => {
	if (!time) return 0;
	const [h, m] = time.split(':').map(Number);
	return (h || 0) * 60 + (m || 0);
};

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });
	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				availability: ['update', 'read'],
				rooms: ['read'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const payload = payloadSchema.parse(await readBody(event));

	const [slot] = await useDb()
		.select({
			scheduleId: availability.scheduleId,
			day: availability.day,
			start: availability.timeStart,
			end: availability.timeEnd,
			doctorId: doctors.userId,
			specializationId: doctors.specializationId,
		})
		.from(availability)
		.leftJoin(doctors, eq(availability.doctorUserId, doctors.userId))
		.where(eq(availability.scheduleId, payload.scheduleId))
		.limit(1);

	if (!slot)
		throw createError({ statusCode: 404, statusMessage: 'Slot not found' });

	if (!slot.specializationId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Lekarz nie ma przypisanej specjalizacji',
		});
	}

	if (payload.roomId === null) {
		await useDb()
			.update(availability)
			.set({ roomRoomId: null })
			.where(eq(availability.scheduleId, payload.scheduleId));

		return { status: 'ok', roomId: null };
	}

	const roomRows = await useDb()
		.select({
			roomId: room.roomId,
			specializationId: roomSpecializations.specializationId,
		})
		.from(room)
		.leftJoin(roomSpecializations, eq(room.roomId, roomSpecializations.roomId))
		.where(eq(room.roomId, payload.roomId));

	if (roomRows.length === 0)
		throw createError({ statusCode: 404, statusMessage: 'Room not found' });

	const roomSpecIds = Array.from(
		new Set(
			roomRows
				.map((row) => row.specializationId)
				.filter((id): id is number => id !== null && id !== undefined)
		)
	);

	if (!roomSpecIds.includes(slot.specializationId)) {
		throw createError({
			statusCode: 400,
			statusMessage:
				'Pokój nie jest przypisany do specjalizacji lekarza i nie mo‘•e byŽÅ wybrany',
		});
	}

	const dayStr =
		typeof slot.day === 'string'
			? slot.day
			: (slot.day as unknown as Date).toISOString().slice(0, 10);

	const assigned = await useDb()
		.select({
			scheduleId: availability.scheduleId,
			start: availability.timeStart,
			end: availability.timeEnd,
		})
		.from(availability)
		.where(
			and(
				eq(availability.roomRoomId, payload.roomId),
				eq(availability.day, dayStr)
			)
		);

	const slotStart = toMinutes(slot.start);
	const slotEnd = toMinutes(slot.end);
	const conflict = assigned.some((row) => {
		if (row.scheduleId === slot.scheduleId) return false;
		const otherStart = toMinutes(row.start);
		const otherEnd = toMinutes(row.end);
		return slotStart < otherEnd && otherStart < slotEnd;
	});

	if (conflict) {
		throw createError({
			statusCode: 409,
			statusMessage:
				'Pokój jest ju‘• przypisany do innego lekarza w tym czasie',
		});
	}

	await useDb()
		.update(availability)
		.set({ roomRoomId: payload.roomId })
		.where(eq(availability.scheduleId, payload.scheduleId));

	return { status: 'ok', roomId: payload.roomId };
});
