export const getErrorMessage = (error: unknown, fallback: string) => {
	const data = (error as { data?: { message?: string } })?.data;
	return data?.message ?? fallback;
};
