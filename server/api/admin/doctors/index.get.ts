import { and, asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user } from '~~/server/db/auth';
import { doctors, specializations } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				doctors: ['list'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

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
