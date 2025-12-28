import { asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user } from '~~/server/db/auth';
import { patients } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				patients: ['list'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const rows = await useDb()
		.select({
			userId: patients.userId,
			firstName: patients.firstName,
			lastName: patients.lastName,
			pesel: patients.pesel,
			phone: patients.phone,
			address: patients.address,
			email: user.email,
			createdAt: user.createdAt,
		})
		.from(patients)
		.leftJoin(user, eq(patients.userId, user.id))
		.orderBy(asc(patients.lastName));

	return rows;
});
