import { count, eq } from 'drizzle-orm';
import { user } from '~~/server/db/auth';
import { doctors, logs, patients } from '~~/server/db/clinic';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

export default withAuth(async () => {
	const [adminsResult, doctorsResult, patientsResult, logsResult] =
		await Promise.all([
			db.select({ count: count() }).from(user).where(eq(user.role, 'admin')),
			db.select({ count: count() }).from(doctors),
			db.select({ count: count() }).from(patients),
			db.select({ count: count() }).from(logs),
		]);

	return {
		totalAdmins: Number(adminsResult[0]?.count ?? 0),
		totalDoctors: Number(doctorsResult[0]?.count ?? 0),
		totalPatients: Number(patientsResult[0]?.count ?? 0),
		totalLogs: Number(logsResult[0]?.count ?? 0),
	};
}, ['admin']);

defineRouteMeta({
	openAPI: {
		operationId: 'Admin_GetStatistics',
		tags: ['Admin'],
		summary: 'Get dashboard statistics',
		description:
			'Returns counts of admins, doctors, patients, and audit logs (admin only).',
		responses: {
			200: { description: 'OK' },
			401: { description: 'Unauthorized' },
			403: { description: 'Forbidden' },
		},
	},
});
