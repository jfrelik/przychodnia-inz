import { DateTime, Settings } from 'luxon';

export const TIMEZONE = 'Europe/Warsaw';
export const LOCALE = 'pl-PL';

Settings.defaultZone = TIMEZONE;
Settings.defaultLocale = LOCALE;

export const nowTZ = () => DateTime.now().setZone(TIMEZONE);

export const todayDateString = () => nowTZ().toISODate()!;

export const tomorrowDateString = () => nowTZ().plus({ days: 1 }).toISODate()!;

// Returns current minute of day (0-1439)
export const currentMinutesOfDay = () => {
	const now = nowTZ();
	return now.hour * 60 + now.minute;
};

// Converts HH:MM to minutes from midnight
export const timeToMinutes = (time: string): number => {
	const [h, m] = time.split(':').map(Number);
	return (h || 0) * 60 + (m || 0);
};

// Converts minutes from midnight to HH:MM
export const minutesToTime = (minutes: number): string => {
	const h = String(Math.floor(minutes / 60)).padStart(2, '0');
	const m = String(minutes % 60).padStart(2, '0');
	return `${h}:${m}`;
};

// Creates ISO string with app timezone offset
export const toTZISO = (date: string, minutes: number): string => {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return DateTime.fromObject(
		{
			year: +date.slice(0, 4),
			month: +date.slice(5, 7),
			day: +date.slice(8, 10),
			hour: h,
			minute: m,
		},
		{ zone: TIMEZONE }
	).toISO()!;
};

export const parseToTZ = (iso: string): DateTime => {
	return DateTime.fromISO(iso).setZone(TIMEZONE);
};

// Parses YYYY-MM-DD to DateTime (start of day)
export const parseDateString = (date: string): DateTime => {
	return DateTime.fromISO(date, { zone: TIMEZONE }).startOf('day');
};

// Generates date range from start to end (inclusive)
export const buildDateRange = (start: string, end: string): string[] => {
	const dates: string[] = [];
	let current = parseDateString(start);
	const endDate = parseDateString(end);

	while (current <= endDate) {
		dates.push(current.toISODate()!);
		current = current.plus({ days: 1 });
	}
	return dates;
};

export const formatDateLong = (date: Date | string): string => {
	const dt =
		typeof date === 'string'
			? DateTime.fromISO(date)
			: DateTime.fromJSDate(date);
	return dt
		.setZone(TIMEZONE)
		.setLocale(LOCALE)
		.toLocaleString(DateTime.DATE_FULL);
};

export const formatDateTime = (date: Date | string): string => {
	const dt =
		typeof date === 'string'
			? DateTime.fromISO(date)
			: DateTime.fromJSDate(date);
	return dt
		.setZone(TIMEZONE)
		.setLocale(LOCALE)
		.toLocaleString(DateTime.DATETIME_MED);
};

export const formatTime = (date: Date | string): string => {
	const dt =
		typeof date === 'string'
			? DateTime.fromISO(date)
			: DateTime.fromJSDate(date);
	return dt.setZone(TIMEZONE).toFormat('HH:mm');
};

// Returns minutes of day from date (0-1439)
export const getMinutesOfDay = (date: Date | string): number => {
	const dt =
		typeof date === 'string'
			? DateTime.fromISO(date)
			: DateTime.fromJSDate(date);
	const tz = dt.setZone(TIMEZONE);
	return tz.hour * 60 + tz.minute;
};

// Returns YYYY-MM-DD from Date or ISO string
export const getDateString = (date: Date | string): string => {
	const dt =
		typeof date === 'string'
			? DateTime.fromISO(date)
			: DateTime.fromJSDate(date);
	return dt.setZone(TIMEZONE).toISODate()!;
};

// Returns today's start and end as JS Date (for DB queries)
export const todayRange = (): { start: Date; end: Date } => {
	const now = nowTZ();
	return {
		start: now.startOf('day').toJSDate(),
		end: now.endOf('day').toJSDate(),
	};
};
