import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { createError, defineEventHandler, getQuery } from 'h3';
import { z } from 'zod';
import { availability } from '~~/server/db/clinic';

const querySchema = z
	.object({
		startDate: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Data musi być w formacie YYYY-MM-DD')
			.optional(),
		endDate: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Data musi być w formacie YYYY-MM-DD')
			.optional(),
	})
	.strict();

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		availability: ['list'],
	});

	const parsedQuery = querySchema.safeParse(getQuery(event));

	if (parsedQuery.error) {
		const flat = z.flattenError(parsedQuery.error);
		const firstFieldError = Object.values(flat.fieldErrors)
			.flat()
			.find((m): m is string => !!m);

		throw createError({
			statusCode: 400,
			message: firstFieldError ?? 'Nieprawidłowe dane wejściowe.',
		});
	}

	const query = parsedQuery.data;

	const conditions = [eq(availability.doctorUserId, session.user.id)];

	if (query.startDate) {
		conditions.push(gte(availability.day, query.startDate));
	}

	if (query.endDate) {
		conditions.push(lte(availability.day, query.endDate));
	}

	let slots;
	try {
		slots = await useDb()
			.select({
				scheduleId: availability.scheduleId,
				day: availability.day,
				timeStart: availability.timeStart,
				timeEnd: availability.timeEnd,
				doctorUserId: availability.doctorUserId,
			})
			.from(availability)
			.where(and(...conditions))
			.orderBy(asc(availability.day), asc(availability.timeStart));
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	return slots;
});
