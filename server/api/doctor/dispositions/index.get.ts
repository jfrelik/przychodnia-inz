import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { createError, defineEventHandler, getQuery } from 'h3';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import { availability } from '~~/server/db/clinic';
import db from '~~/server/util/db';

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

	const query = querySchema.parse(getQuery(event));

	let condition = eq(availability.doctorUserId, session.user.id);

	if (query.startDate) {
		condition = and(condition, gte(availability.day, query.startDate));
	}

	if (query.endDate) {
		condition = and(condition, lte(availability.day, query.endDate));
	}

	const slots = await db
		.select({
			scheduleId: availability.scheduleId,
			day: availability.day,
			timeStart: availability.timeStart,
			timeEnd: availability.timeEnd,
			doctorUserId: availability.doctorUserId,
		})
		.from(availability)
		.where(condition)
		.orderBy(asc(availability.day), asc(availability.timeStart));

	return slots;
});
