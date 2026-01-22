import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { appointments, doctors } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		appointments: ['list'],
	});

	let doctorRow: { userId: string } | undefined;
	try {
		[doctorRow] = await useDb()
			.select({ userId: doctors.userId })
			.from(doctors)
			.where(eq(doctors.userId, session.user.id))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!doctorRow)
		throw createError({
			statusCode: 404,
			message: 'Nie znaleziono profilu lekarza',
		});

	const weekTrunc = sql`date_trunc('week', ${appointments.datetime})`;

	let rows: Array<{ weekStart: string; count: number }>;
	try {
		rows = await useDb()
			.select({
				weekStart: sql<string>`to_char(${weekTrunc}, 'YYYY-MM-DD')`,
				count: sql<number>`count(*)`,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.doctorId, doctorRow.userId),
					eq(appointments.status, 'completed'),
					gte(appointments.datetime, nowTZ().minus({ months: 2 }).toJSDate())
				)
			)
			.groupBy(weekTrunc)
			.orderBy(asc(weekTrunc));
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	return rows.map((row) => ({
		weekStart: row.weekStart,
		count: Number(row.count ?? 0),
	}));
});
