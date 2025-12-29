import { count, eq } from 'drizzle-orm';
import { auth } from '~~/lib/auth';
import { user } from '~~/server/db/auth';
import { doctors, logs, patients } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				statistics: ['view'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const [adminsResult, doctorsResult, patientsResult, logsResult] =
		await Promise.all([
			useDb()
				.select({ count: count() })
				.from(user)
				.where(eq(user.role, 'admin')),
			useDb().select({ count: count() }).from(doctors),
			useDb().select({ count: count() }).from(patients),
			useDb().select({ count: count() }).from(logs),
		]);

	return {
		totalAdmins: Number(adminsResult[0]?.count ?? 0),
		totalDoctors: Number(doctorsResult[0]?.count ?? 0),
		totalPatients: Number(patientsResult[0]?.count ?? 0),
		totalLogs: Number(logsResult[0]?.count ?? 0),
	};
});
