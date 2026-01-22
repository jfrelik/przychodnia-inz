import { DateTime } from 'luxon';

const TIMEZONE = useAppTimezone();
const LOCALE = useAppLocale();

type DateInput = string | Date | null | undefined;

const toDateTime = (date: DateInput): DateTime | null => {
	if (!date) return null;
	const dt =
		typeof date === 'string'
			? DateTime.fromISO(date)
			: DateTime.fromJSDate(date);
	return dt.isValid ? dt.setZone(TIMEZONE).setLocale(LOCALE) : null;
};

export const useDate = (date: DateInput, fallback = 'Brak danych') => {
	const dt = toDateTime(date);
	return dt ? dt.toLocaleString(DateTime.DATETIME_MED) : fallback;
};

export const useDateLong = (date: DateInput, fallback = 'Brak danych') => {
	const dt = toDateTime(date);
	return dt ? dt.toLocaleString(DateTime.DATE_FULL) : fallback;
};

export const useDateTimeFull = (date: DateInput, fallback = 'Brak danych') => {
	const dt = toDateTime(date);
	return dt ? dt.toLocaleString(DateTime.DATETIME_FULL) : fallback;
};

export const useTime = (date: DateInput, fallback = 'Brak danych') => {
	const dt = toDateTime(date);
	return dt ? dt.toFormat('HH:mm') : fallback;
};

export const useDateShort = (date: DateInput, fallback = 'Brak danych') => {
	const dt = toDateTime(date);
	return dt ? dt.toFormat('dd.MM.yyyy') : fallback;
};

export const useDateTimeShort = (date: DateInput, fallback = 'Brak danych') => {
	const dt = toDateTime(date);
	return dt ? dt.toFormat('dd.MM.yyyy HH:mm') : fallback;
};

export const useRelativeDate = (date: DateInput, fallback = 'Brak danych') => {
	const dt = toDateTime(date);
	return dt ? dt.toRelative() : fallback;
};

export const useWeekday = (date: DateInput, fallback = 'Brak danych') => {
	const dt = toDateTime(date);
	return dt ? dt.toFormat('cccc') : fallback;
};

export const useNow = () => DateTime.now().setZone(TIMEZONE);

export const useToday = () => DateTime.now().setZone(TIMEZONE).toISODate()!;
