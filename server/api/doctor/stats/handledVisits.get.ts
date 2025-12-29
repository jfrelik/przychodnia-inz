import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { appointments, doctors } from '~~/server/db/clinic';

const twoMonthsAgo = () => {
	const date = new Date();
	date.setMonth(date.getMonth() - 2);
	return date;
};

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: { appointments: ['list'] },
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const [doctorRow] = await useDb()
		.select({ userId: doctors.userId })
		.from(doctors)
		.where(eq(doctors.userId, session.user.id))
		.limit(1);

	if (!doctorRow)
		throw createError({
			statusCode: 404,
			statusMessage: 'Doctor profile not found',
		});

	const weekTrunc = sql`date_trunc('week', ${appointments.datetime})`;

	const rows = await useDb()
		.select({
			weekStart: sql<string>`to_char(${weekTrunc}, 'YYYY-MM-DD')`,
			count: sql<number>`count(*)`,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.doctorId, doctorRow.userId),
				eq(appointments.status, 'completed'),
				gte(appointments.datetime, twoMonthsAgo())
			)
		)
		.groupBy(weekTrunc)
		.orderBy(asc(weekTrunc));

	return rows.map((row) => ({
		weekStart: row.weekStart,
		count: Number(row.count ?? 0),
	}));
});
