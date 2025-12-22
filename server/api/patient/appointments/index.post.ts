import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import { user as authUser } from '~~/server/db/auth';
import {
	appointments,
	availability,
	doctors,
	patients,
	room,
} from '~~/server/db/clinic';
import { getDurationMinutes } from '~~/server/util/appointmentTypes';
import db from '~~/server/util/db';

const payloadSchema = z.object({
	doctorId: z.string(),
	// Accept datetime strings as long as they parse to a valid Date; avoids overly strict ISO regex.
	datetime: z
		.string()
		.refine((value) => !Number.isNaN(new Date(value).getTime()), {
			message: 'Invalid datetime',
		}),
	isOnline: z.boolean().default(false),
	roomId: z.number().optional(),
	notes: z.string().max(500).optional(),
});

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });
	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: { appointments: ['create'] },
		},
	});
	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const payload = payloadSchema.parse(await readBody(event));
	const { doctorId, datetime, isOnline, roomId, notes } = payload;
	const type = 'consultation' as const;

	const [userRow] = await db
		.select()
		.from(authUser)
		.where(eq(authUser.id, session.user.id))
		.limit(1);
	if (!userRow)
		throw createError({ statusCode: 404, statusMessage: 'User not found' });

	const [patientRow] = await db
		.select()
		.from(patients)
		.where(eq(patients.userId, userRow.id))
		.limit(1);
	if (!patientRow)
		throw createError({
			statusCode: 404,
			statusMessage: 'Patient profile not found',
		});

	const [doctorRow] = await db
		.select()
		.from(doctors)
		.where(eq(doctors.userId, doctorId))
		.limit(1);
	if (!doctorRow)
		throw createError({ statusCode: 404, statusMessage: 'Doctor not found' });

	const slotStart = new Date(datetime);
	if (Number.isNaN(slotStart.getTime()))
		throw createError({ statusCode: 400, statusMessage: 'Invalid datetime' });

	const durationMinutes = getDurationMinutes(type);
	const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);
	const dateStr = slotStart.toISOString().slice(0, 10);

	const frames = await db
		.select({ start: availability.timeStart, end: availability.timeEnd })
		.from(availability)
		.where(
			and(
				eq(availability.doctorUserId, doctorId),
				eq(availability.day, dateStr)
			)
		);

	const toMinutes = (time: string) => {
		const [h, m] = time.split(':').map(Number);
		return (h || 0) * 60 + (m || 0);
	};

	const inAvailability = frames.some((f) => {
		const start = toMinutes(f.start);
		const end = toMinutes(f.end);
		const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
		const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
		return slotStartMinutes >= start && slotEndMinutes <= end;
	});

	if (!inAvailability)
		throw createError({
			statusCode: 400,
			statusMessage: 'Slot outside doctor availability',
		});

	const dayStart = new Date(`${dateStr}T00:00:00`);
	const dayEnd = new Date(`${dateStr}T23:59:59`);

	const existing = await db
		.select({
			datetime: appointments.datetime,
			type: appointments.type,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.doctorId, doctorId),
				gte(appointments.datetime, dayStart),
				lte(appointments.datetime, dayEnd),
				inArray(appointments.status, ['scheduled', 'checked_in'])
			)
		);

	const conflict = existing.some((row) => {
		const existingStart = new Date(row.datetime);
		const existingDuration = getDurationMinutes(
			row.type as 'consultation' | 'procedure'
		);
		const existingEnd = new Date(
			existingStart.getTime() + existingDuration * 60_000
		);
		return existingStart < slotEnd && slotStart < existingEnd;
	});
	if (conflict)
		throw createError({ statusCode: 409, statusMessage: 'Slot already taken' });

	let resolvedRoomId = roomId;

	// Pick provided room or fall back to the first configured room.
	if (resolvedRoomId === undefined) {
		const [anyRoom] = await db.select().from(room).limit(1);
		if (!anyRoom)
			throw createError({
				statusCode: 400,
				statusMessage: 'No rooms configured',
			});
		resolvedRoomId = anyRoom.roomId;
	}

	const [roomRow] = await db
		.select()
		.from(room)
		.where(eq(room.roomId, resolvedRoomId))
		.limit(1);
	if (!roomRow)
		throw createError({ statusCode: 404, statusMessage: 'Room not found' });

	if (!isOnline) {
		const roomConflict = await db
			.select({
				datetime: appointments.datetime,
				type: appointments.type,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.roomRoomId, resolvedRoomId),
					gte(appointments.datetime, dayStart),
					lte(appointments.datetime, dayEnd),
					inArray(appointments.status, ['scheduled', 'checked_in'])
				)
			)
			.then((rows) =>
				rows.some((row) => {
					const existingStart = new Date(row.datetime);
					const existingDuration = getDurationMinutes(
						row.type as 'consultation' | 'procedure'
					);
					const existingEnd = new Date(
						existingStart.getTime() + existingDuration * 60_000
					);
					return existingStart < slotEnd && slotStart < existingEnd;
				})
			);

		if (roomConflict)
			throw createError({
				statusCode: 409,
				statusMessage: 'Room not available',
			});
	}

	const [created] = await db
		.insert(appointments)
		.values({
			patientId: patientRow.userId,
			doctorId,
			datetime: slotStart,
			status: 'scheduled',
			type,
			isOnline,
			notes,
			roomRoomId: resolvedRoomId ?? 1,
		})
		.returning();

	return {
		appointmentId: created.appointmentId,
		status: created.status,
	};
});
