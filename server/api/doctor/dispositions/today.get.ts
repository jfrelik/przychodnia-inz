import { and, asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { availability, doctors } from '~~/server/db/clinic';

type RawAvailability = {
	scheduleId: string;
	day: string;
	timeStart: string;
	timeEnd: string;
};

type Timeframe = { start: string; end: string };

const buildTodayDate = () => {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
};

const toMinutes = (time: string) => {
	const [hours, minutes] = time.split(':');
	return parseInt(hours ?? '0', 10) * 60 + parseInt(minutes ?? '0', 10);
};

const mergeTimeframes = (slots: RawAvailability[]): Timeframe[] => {
	if (!slots.length) return [];

	const normalized = slots
		.map((slot) => ({
			start: slot.timeStart,
			end: slot.timeEnd,
			startMinutes: toMinutes(slot.timeStart),
			endMinutes: toMinutes(slot.timeEnd),
		}))
		.sort((a, b) => a.startMinutes - b.startMinutes);

	const merged: Timeframe[] = [];
	for (const current of normalized) {
		const last = merged[merged.length - 1];

		if (!last) {
			merged.push({ start: current.start, end: current.end });
			continue;
		}

		const lastEndMinutes = toMinutes(last.end);
		if (current.startMinutes <= lastEndMinutes) {
			const shouldExtend = toMinutes(current.end) > lastEndMinutes;
			if (shouldExtend) {
				last.end = current.end;
			}
			continue;
		}

		merged.push({ start: current.start, end: current.end });
	}

	return merged;
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
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const [doctorRow] = await useDb()
		.select({ userId: doctors.userId })
		.from(doctors)
		.where(eq(doctors.userId, session.user.id))
		.limit(1);

	if (!doctorRow) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Doctor profile not found.',
		});
	}

	const today = buildTodayDate();

	const slots = await useDb()
		.select({
			scheduleId: availability.scheduleId,
			day: availability.day,
			timeStart: availability.timeStart,
			timeEnd: availability.timeEnd,
		})
		.from(availability)
		.where(
			and(
				eq(availability.doctorUserId, doctorRow.userId),
				eq(availability.day, today)
			)
		)
		.orderBy(asc(availability.timeStart));

	return {
		day: today,
		timeframes: mergeTimeframes(slots),
	};
});
