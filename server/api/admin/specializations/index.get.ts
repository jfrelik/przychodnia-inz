import { asc, count, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { doctors, specializations } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				specializations: ['list'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	try {
		const rows = await useDb()
			.select({
				id: specializations.id,
				name: specializations.name,
				description: specializations.description,
				icon: specializations.icon,
				doctorCount: count(doctors.userId),
			})
			.from(specializations)
			.leftJoin(doctors, eq(doctors.specializationId, specializations.id))
			.groupBy(specializations.id)
			.orderBy(asc(specializations.name));

		return rows.map((row) => ({
			...row,
			doctorCount: Number(row.doctorCount ?? 0),
		}));
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
