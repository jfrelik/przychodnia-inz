import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { user as authUser } from '~~/server/db/auth';
import {
	appointments,
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
	await requireSessionWithPermissions(event, {
		availability: ['update'],
	});

	const payload = payloadSchema.parse(await readBody(event));

	let slot:
		| {
				scheduleId: string;
				day: string | Date;
				start: string;
				end: string;
				doctorId: string | null;
				specializationId: number | null;
		  }
		| undefined;

	try {
		[slot] = await useDb()
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
			.leftJoin(authUser, eq(doctors.userId, authUser.id))
			.where(
				and(
					eq(availability.scheduleId, payload.scheduleId),
					eq(authUser.banned, false)
				)
			)
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!slot)
		throw createError({
			statusCode: 404,
			message: 'Dyspozycja nie została znaleziona',
		});

	if (!slot.specializationId) {
		throw createError({
			statusCode: 400,
			message: 'Lekarz nie ma przypisanej specjalizacji',
		});
	}

	if (!slot.doctorId) {
		throw createError({
			statusCode: 400,
			message: 'Brak powiązanego lekarza dla dyspozycji',
		});
	}

	const doctorId = slot.doctorId;

	const dayStr =
		typeof slot.day === 'string'
			? slot.day
			: (slot.day as unknown as Date).toISOString().slice(0, 10);

	const buildDateTime = (time: string) => new Date(`${dayStr}T${time}`);
	const slotStartDate = buildDateTime(slot.start);
	const slotEndDate = buildDateTime(slot.end);

	try {
		if (payload.roomId === null) {
			await useDb()
				.update(availability)
				.set({ roomRoomId: null })
				.where(eq(availability.scheduleId, payload.scheduleId));

			await useDb()
				.update(appointments)
				.set({ roomRoomId: null })
				.where(
					and(
						eq(appointments.doctorId, doctorId),
						gte(appointments.datetime, slotStartDate),
						lt(appointments.datetime, slotEndDate),
						inArray(appointments.status, ['scheduled', 'checked_in'])
					)
				);

			return { status: 'ok', roomId: null };
		}

		const roomRows = await useDb()
			.select({
				roomId: room.roomId,
				specializationId: roomSpecializations.specializationId,
			})
			.from(room)
			.leftJoin(
				roomSpecializations,
				eq(room.roomId, roomSpecializations.roomId)
			)
			.where(eq(room.roomId, payload.roomId));

		if (roomRows.length === 0)
			throw createError({
				statusCode: 404,
				message: 'Pokój nie został znaleziony',
			});

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
				message:
					'Pokój nie jest przypisany do specjalizacji lekarza i nie może być wybrany',
			});
		}

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
				message: 'Pokój jest już przypisany do innego lekarza w tym czasie',
			});
		}

		await useDb()
			.update(availability)
			.set({ roomRoomId: payload.roomId })
			.where(eq(availability.scheduleId, payload.scheduleId));

		await useDb()
			.update(appointments)
			.set({ roomRoomId: payload.roomId })
			.where(
				and(
					eq(appointments.doctorId, doctorId),
					gte(appointments.datetime, slotStartDate),
					lt(appointments.datetime, slotEndDate),
					inArray(appointments.status, ['scheduled', 'checked_in'])
				)
			);

		return { status: 'ok', roomId: payload.roomId };
	} catch (error: any) {
		if (error?.statusCode) throw error;
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}
});
