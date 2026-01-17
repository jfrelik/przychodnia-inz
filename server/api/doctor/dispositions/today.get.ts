import { and, asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import {
	availability,
	doctors,
	room,
	roomSpecializations,
} from '~~/server/db/clinic';

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
	const session = await requireSessionWithPermissions(event, {
		availability: ['list'],
	});

	let doctorRow:
		| { userId: string; specializationId: number | null }
		| undefined;
	try {
		[doctorRow] = await useDb()
			.select({
				userId: doctors.userId,
				specializationId: doctors.specializationId,
			})
			.from(doctors)
			.where(eq(doctors.userId, session.user.id))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!doctorRow) {
		throw createError({
			statusCode: 404,
			message: 'Nie znaleziono profilu lekarza.',
		});
	}

	// Get room number for doctor's specialization
	let roomNumber: number | null = null;
	if (doctorRow.specializationId) {
		try {
			const [roomRow] = await useDb()
				.select({ number: room.number })
				.from(roomSpecializations)
				.innerJoin(room, eq(roomSpecializations.roomId, room.roomId))
				.where(
					eq(roomSpecializations.specializationId, doctorRow.specializationId)
				)
				.limit(1);
			roomNumber = roomRow?.number ?? null;
		} catch {
			// Ignore room fetch errors, it's not critical
		}
	}

	const today = buildTodayDate();

	let slots: RawAvailability[];
	try {
		slots = await useDb()
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
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	return {
		day: today,
		timeframes: mergeTimeframes(slots),
		roomNumber,
	};
});
