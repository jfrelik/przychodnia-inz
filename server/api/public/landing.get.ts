import { and, asc, count, eq, gte, lte, min } from 'drizzle-orm';
import {
	appointments,
	doctors,
	patients,
	specializations,
} from '~~/server/db/clinic';

export default defineEventHandler(async () => {
	const now = new Date();
	const startOfDay = new Date(now);
	startOfDay.setHours(0, 0, 0, 0);
	const endOfDay = new Date(now);
	endOfDay.setHours(23, 59, 59, 999);

	const [patientsResult, visitsResult, specializationRows] = await Promise.all([
		useDb().select({ count: count() }).from(patients),
		useDb()
			.select({ count: count() })
			.from(appointments)
			.where(
				and(
					gte(appointments.datetime, startOfDay),
					lte(appointments.datetime, endOfDay)
				)
			),
		useDb()
			.select({
				id: specializations.id,
				name: specializations.name,
				description: specializations.description,
				icon: specializations.icon,
				nextVisitAt: min(appointments.datetime),
			})
			.from(specializations)
			.leftJoin(doctors, eq(doctors.specializationId, specializations.id))
			.leftJoin(
				appointments,
				and(
					eq(appointments.doctorId, doctors.userId),
					gte(appointments.datetime, now)
				)
			)
			.groupBy(
				specializations.id,
				specializations.name,
				specializations.description,
				specializations.icon
			)
			.orderBy(asc(specializations.name)),
	]);

	return {
		patientsCount: Number(patientsResult[0]?.count ?? 0),
		visitsToday: Number(visitsResult[0]?.count ?? 0),
		specializations: specializationRows.map((row) => ({
			...row,
			nextVisitAt: row.nextVisitAt
				? new Date(row.nextVisitAt).toISOString()
				: null,
		})),
	};
});
