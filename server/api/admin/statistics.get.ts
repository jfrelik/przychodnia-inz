import { and, count, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user } from '~~/server/db/auth';
import { doctors, logs, patients } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		statistics: ['view'],
	});

	try {
		const [adminsResult, doctorsResult, patientsResult, logsResult] =
			await Promise.all([
				useDb()
					.select({ count: count() })
					.from(user)
					.where(eq(user.role, 'admin')),
				useDb()
					.select({ count: count() })
					.from(doctors)
					.leftJoin(user, eq(doctors.userId, user.id))
					.where(and(eq(user.banned, false))),
				useDb().select({ count: count() }).from(patients),
				useDb().select({ count: count() }).from(logs),
			]);

		return {
			totalAdmins: Number(adminsResult[0]?.count ?? 0),
			totalDoctors: Number(doctorsResult[0]?.count ?? 0),
			totalPatients: Number(patientsResult[0]?.count ?? 0),
			totalLogs: Number(logsResult[0]?.count ?? 0),
		};
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
