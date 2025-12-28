import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { createError, defineEventHandler, getQuery } from 'h3';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
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
			return toMinutes(v.startTime) < toMinutes(v.endTime);
		},
		{ message: 'Provide a valid time window (from < to)' }
	);

const parseUtcDate = (date: string) => {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d));
};

const buildDateRange = (start: string, end: string) => {
	const dates: string[] = [];
	const startDate = parseUtcDate(start);
	const endDate = parseUtcDate(end);
	for (
		let d = new Date(startDate.getTime());
		d.getTime() <= endDate.getTime();
		d.setUTCDate(d.getUTCDate() + 1)
	) {
		dates.push(d.toISOString().slice(0, 10));
	}
	return dates;
};

const toMinutes = (time: string) => {
	const [h, m] = time.split(':').map(Number);
	return (h || 0) * 60 + (m || 0);
};

const toTime = (date: string, minutes: number) => {
	const h = String(Math.floor(minutes / 60)).padStart(2, '0');
	const m = String(minutes % 60).padStart(2, '0');
	return `${date}T${h}:${m}:00`;
};

const mergeFrames = (frames: Frame[]): Frame[] => {
	if (!frames.length) return [];
	const sorted = frames
		.map((f) => ({ ...f, s: toMinutes(f.start), e: toMinutes(f.end) }))
		.sort((a, b) => a.s - b.s);

	const merged: Frame[] = [];
	for (const cur of sorted) {
		const last = merged[merged.length - 1];
		if (!last) {
			merged.push({ start: cur.start, end: cur.end });
			continue;
		}
		const lastEnd = toMinutes(last.end);
		if (cur.s <= lastEnd) {
			if (cur.e > lastEnd) last.end = cur.end;
		} else {
			merged.push({ start: cur.start, end: cur.end });
		}
	}
	return merged;
};

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });
	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: { userId: session.user.id, permissions: { appointments: ['list'] } },
	});
	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const query = querySchema.parse(getQuery(event));
	const { startDate, specializationId, doctorId, type } = query;
	const endDate = query.endDate ?? startDate;
	const slotDuration = getDurationMinutes(type);
	const dateRange = buildDateRange(startDate, endDate);
	const filterStartMinutes = query.startTime ? toMinutes(query.startTime) : 0;
	const filterEndMinutes = query.endTime ? toMinutes(query.endTime) : 24 * 60;

	const doctorRows = await useDb()
		.select({
			doctorId: doctors.userId,
			specializationId: doctors.specializationId,
			specializationName: specializations.name,
			doctorName: authUser.name,
			doctorEmail: authUser.email,
		})
		.from(doctors)
		.leftJoin(specializations, eq(doctors.specializationId, specializations.id))
		.leftJoin(authUser, eq(doctors.userId, authUser.id))
		.where(
			doctorId
				? eq(doctors.userId, doctorId)
				: eq(doctors.specializationId, specializationId!)
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
		// Availability over the range
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
				typeof row.day === 'string'
					? row.day
					: (row.day as unknown as Date).toISOString().slice(0, 10);
			const arr = availabilityByDate.get(dayStr) ?? [];
			arr.push({ start: row.start, end: row.end });
			availabilityByDate.set(dayStr, arr);
		}

		// Existing appointments over the range
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
			const start = new Date(row.datetime);
			const dateStr = start.toISOString().slice(0, 10);
			const startMinutes = start.getHours() * 60 + start.getMinutes();
			const duration = getDurationMinutes(
				row.type as 'consultation' | 'procedure'
			);
			const arr = existingByDate.get(dateStr) ?? [];
			arr.push({
				start: startMinutes,
				end: startMinutes + duration,
				type: row.type as any,
			});
			existingByDate.set(dateStr, arr);
		}

		const allSlots: { start: string; end: string }[] = [];

		for (const date of dateRange) {
			const frames = mergeFrames(availabilityByDate.get(date) ?? []);
			if (!frames.length) continue;

			const existingWindows = existingByDate.get(date) ?? [];

			for (const frame of frames) {
				let start = Math.max(toMinutes(frame.start), filterStartMinutes);
				const frameEnd = Math.min(toMinutes(frame.end), filterEndMinutes);

				while (start + slotDuration <= frameEnd) {
					const candidateEnd = start + slotDuration;
					const overlap = existingWindows.some(
						(w) => start < w.end && w.start < candidateEnd
					);
					if (!overlap) {
						allSlots.push({
							start: toTime(date, start),
							end: toTime(date, candidateEnd),
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
});
