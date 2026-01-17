import { and, asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user } from '~~/server/db/auth';
import { doctors, specializations } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		doctors: ['list'],
	});

	try {
		const rows = await useDb()
			.select({
				userId: doctors.userId,
				userName: user.name,
				userEmail: user.email,
				specializationId: doctors.specializationId,
				specializationName: specializations.name,
				licenseNumber: doctors.licenseNumber,
			})
			.from(doctors)
			.leftJoin(user, eq(doctors.userId, user.id))
			.leftJoin(
				specializations,
				eq(doctors.specializationId, specializations.id)
			)
			.where(and(eq(user.banned, false)))
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
