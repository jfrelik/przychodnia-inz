import { and, gte, inArray, lte } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { appointments } from '~~/server/db/clinic';

const buildTodayRange = () => {
	const start = new Date();
	start.setHours(0, 0, 0, 0);

	const end = new Date(start);
	end.setHours(23, 59, 59, 999);

	return { start, end };
};

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		appointments: ['list'],
	});

	const { start, end } = buildTodayRange();

	try {
		const rows = await useDb()
			.select({
				datetime: appointments.datetime,
				isOnline: appointments.isOnline,
				status: appointments.status,
			})
			.from(appointments)
			.where(
				and(
					inArray(appointments.status, [
						'scheduled',
						'checked_in',
						'completed',
					]),
					gte(appointments.datetime, start),
					lte(appointments.datetime, end)
				)
			);

		const bucketMap = new Map<number, { onsite: number; remote: number }>();
		for (const row of rows) {
			const ts = new Date(row.datetime);
			const hour = ts.getHours();
			const bucket = bucketMap.get(hour) ?? { onsite: 0, remote: 0 };
			if (row.isOnline) bucket.remote += 1;
			else bucket.onsite += 1;
			bucketMap.set(hour, bucket);
		}

		const buckets = Array.from(bucketMap.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([hour, counts]) => ({
				hour,
				label: `${String(hour).padStart(2, '0')}:00`,
				onsite: counts.onsite,
				remote: counts.remote,
			}));

		const totals = buckets.reduce(
			(acc, item) => {
				acc.onsite += item.onsite;
				acc.remote += item.remote;
				return acc;
			},
			{ onsite: 0, remote: 0 }
		);

		return {
			day: start.toISOString().slice(0, 10),
			buckets,
			totals,
		};
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}
});
