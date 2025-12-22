import { asc, count, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { doctors, specializations } from '~~/server/db/clinic';
import db from '~~/server/util/db';

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

	const rows = await db
		.select({
			id: specializations.id,
			name: specializations.name,
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
});
