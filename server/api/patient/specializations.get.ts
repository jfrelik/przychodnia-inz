import { asc } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { specializations } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });
	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	// Patients just need to be logged in; no extra permission required.
	const rows = await useDb()
		.select({
			id: specializations.id,
			name: specializations.name,
		})
		.from(specializations)
		.orderBy(asc(specializations.name));

	return rows;
});
