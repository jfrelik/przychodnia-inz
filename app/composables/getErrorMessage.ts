export const getErrorMessage = (error: unknown, fallback: string) => {
	const data = (
		error as { data?: { message?: string; statusMessage?: string } }
	)?.data;

	return data?.message ?? data?.statusMessage ?? fallback;
};
