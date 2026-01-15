import { asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user } from '~~/server/db/auth';
import { patients } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		patients: ['list'],
	});

	try {
		const rows = await useDb()
			.select({
				userId: patients.userId,
				firstName: patients.firstName,
				lastName: patients.lastName,
				phone: patients.phone,
				address: patients.address,
				email: user.email,
				createdAt: user.createdAt,
			})
			.from(patients)
			.leftJoin(user, eq(patients.userId, user.id))
			.orderBy(asc(patients.lastName));

		return rows;
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
