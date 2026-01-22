import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { createError, defineEventHandler, getQuery } from 'h3';
import { z } from 'zod';
import { user as authUser } from '~~/server/db/auth';
import {
	appointments,
	availability,
	doctors,
	specializations,
} from '~~/server/db/clinic';

type Frame = { start: string; end: string };

const querySchema = z
	.object({
		startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
		endDate: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
			.optional(),
		specializationId: z.coerce.number().optional(),
		doctorId: z.string().optional(),
		startTime: z
			.string()
			.regex(/^\d{2}:\d{2}$/, 'Use HH:MM')
			.optional(),
		endTime: z
			.string()
			.regex(/^\d{2}:\d{2}$/, 'Use HH:MM')
			.optional(),
		type: z.enum(['consultation', 'procedure']).default('consultation'),
	})
	.refine((v) => v.specializationId || v.doctorId, {
		message: 'Provide specializationId or doctorId',
	})
	.refine(
		(v) => {
			if (!v.startTime && !v.endTime) return true;
			if (!v.startTime || !v.endTime) return false;
			return timeToMinutes(v.startTime) < timeToMinutes(v.endTime);
		},
		{ message: 'Provide a valid time window (from < to)' }
	);

const mergeFrames = (frames: Frame[]): Frame[] => {
	if (!frames.length) return [];
	const sorted = frames
		.map((f) => ({
			...f,
			s: timeToMinutes(f.start),
			e: timeToMinutes(f.end),
		}))
		.sort((a, b) => a.s - b.s);

	const merged: Frame[] = [];
	for (const cur of sorted) {
		const last = merged[merged.length - 1];
		if (!last) {
			merged.push({ start: cur.start, end: cur.end });
			continue;
		}
		const lastEnd = timeToMinutes(last.end);
		if (cur.s <= lastEnd) {
			if (cur.e > lastEnd) last.end = cur.end;
		} else {
			merged.push({ start: cur.start, end: cur.end });
		}
	}
	return merged;
};

// Aligns minutes to next slot boundary (0, 20, 40)
// e.g. 14:08 -> 14:20, 14:21 -> 14:40, 14:41 -> 15:00
const alignToNextSlot = (minutes: number, slotDuration: number): number => {
	const remainder = minutes % slotDuration;
	if (remainder === 0) return minutes;
	return minutes + (slotDuration - remainder);
};

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		appointments: ['list'],
	});

	const query = querySchema.parse(getQuery(event));
	const { startDate, specializationId, doctorId, type } = query;
	const endDate = query.endDate ?? startDate;
	const slotDuration = getDurationMinutes(type);
	const dateRange = buildDateRange(startDate, endDate);
	const filterStartMinutes = query.startTime
		? timeToMinutes(query.startTime)
		: 0;
	const filterEndMinutes = query.endTime
		? timeToMinutes(query.endTime)
		: 24 * 60;

	try {
		const doctorRows = await useDb()
			.select({
				doctorId: doctors.userId,
				specializationId: doctors.specializationId,
				specializationName: specializations.name,
				doctorName: authUser.name,
				doctorEmail: authUser.email,
			})
			.from(doctors)
			.leftJoin(
				specializations,
				eq(doctors.specializationId, specializations.id)
			)
			.leftJoin(authUser, eq(doctors.userId, authUser.id))
			.where(
				and(
					eq(authUser.banned, false),
					doctorId
						? eq(doctors.userId, doctorId)
						: eq(doctors.specializationId, specializationId!)
				)
			);

		if (doctorRows.length === 0)
			return {
				startDate,
				endDate,
				slots: [] as Array<unknown>,
				doctors: [] as Array<unknown>,
			};

		const results = [];

		for (const doc of doctorRows) {
			const availabilities = await useDb()
				.select({
					day: availability.day,
					start: availability.timeStart,
					end: availability.timeEnd,
				})
				.from(availability)
				.where(
					and(
						eq(availability.doctorUserId, doc.doctorId),
						gte(availability.day, startDate),
						lte(availability.day, endDate)
					)
				)
				.orderBy(asc(availability.day), asc(availability.timeStart));

			const availabilityByDate = new Map<string, Frame[]>();
			for (const row of availabilities) {
				const dayStr =
					typeof row.day === 'string' ? row.day : getDateString(row.day);
				const arr = availabilityByDate.get(dayStr) ?? [];
				arr.push({ start: row.start, end: row.end });
				availabilityByDate.set(dayStr, arr);
			}

			const existing = await useDb()
				.select({
					datetime: appointments.datetime,
					type: appointments.type,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.doctorId, doc.doctorId),
						gte(appointments.datetime, new Date(`${startDate}T00:00:00`)),
						lte(appointments.datetime, new Date(`${endDate}T23:59:59`)),
						inArray(appointments.status, ['scheduled', 'checked_in'])
					)
				);

			const existingByDate = new Map<
				string,
				{ start: number; end: number; type: 'consultation' | 'procedure' }[]
			>();
			for (const row of existing) {
				const dateStr = getDateString(row.datetime);
				const startMinutes = getMinutesOfDay(row.datetime);
				const duration = getDurationMinutes(
					row.type as 'consultation' | 'procedure'
				);
				const arr = existingByDate.get(dateStr) ?? [];
				arr.push({
					start: startMinutes,
					end: startMinutes + duration,
					type: row.type as 'consultation' | 'procedure',
				});
				existingByDate.set(dateStr, arr);
			}

			const allSlots: { start: string; end: string }[] = [];
			const todayWarsaw = todayDateString();
			const currentMinutes = currentMinutesOfDay();

			for (const date of dateRange) {
				const frames = mergeFrames(availabilityByDate.get(date) ?? []);
				if (!frames.length) continue;

				const existingWindows = existingByDate.get(date) ?? [];
				const isToday = date === todayWarsaw;

				for (const frame of frames) {
					let start = Math.max(timeToMinutes(frame.start), filterStartMinutes);
					const frameEnd = Math.min(timeToMinutes(frame.end), filterEndMinutes);

					// For today, skip slots that have already passed
					// and align to next valid slot boundary (0, 20, 40 minutes)
					if (isToday) {
						const minStartForToday = alignToNextSlot(
							currentMinutes + 1,
							slotDuration
						);
						start = Math.max(start, minStartForToday);
					}

					// Ensure start is aligned to slot boundary
					start = alignToNextSlot(start, slotDuration);

					while (start + slotDuration <= frameEnd) {
						const candidateEnd = start + slotDuration;
						const overlap = existingWindows.some(
							(w) => start < w.end && w.start < candidateEnd
						);
						if (!overlap) {
							allSlots.push({
								start: toTZISO(date, start),
								end: toTZISO(date, candidateEnd),
							});
						}
						start += slotDuration;
					}
				}
			}

			results.push({
				doctorId: doc.doctorId,
				specializationId: doc.specializationId,
				specializationName: doc.specializationName,
				doctorName: doc.doctorName,
				doctorEmail: doc.doctorEmail,
				slots: allSlots,
			});
		}

		return { startDate, endDate, slots: results, type };
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}
});
