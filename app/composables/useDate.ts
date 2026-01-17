export const useDate = (date: string) => {
	return new Date(date).toLocaleString('pl-PL', {
		timeZone: 'Europe/Warsaw',
	});
};
