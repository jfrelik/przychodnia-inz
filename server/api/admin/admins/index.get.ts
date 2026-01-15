import { asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user } from '~~/server/db/auth';

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		users: ['list'],
	});

	try {
		const admins = await useDb()
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				createdAt: user.createdAt,
			})
			.from(user)
			.where(eq(user.role, 'admin'))
			.orderBy(asc(user.name));

		return admins;
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
