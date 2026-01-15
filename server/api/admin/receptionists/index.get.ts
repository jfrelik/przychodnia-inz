import { asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user } from '~~/server/db/auth';
import { receptionists } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		users: ['list'],
	});

	try {
		const rows = await useDb()
			.select({
				userId: receptionists.userId,
				userName: user.name,
				userEmail: user.email,
			})
			.from(receptionists)
			.leftJoin(user, eq(receptionists.userId, user.id))
			.orderBy(asc(user.name));

		return rows;
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
