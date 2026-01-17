import { and, asc, count, eq, gte, lte, min } from 'drizzle-orm';
import {
	appointments,
	availability,
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

	const todayStr = now.toISOString().slice(0, 10);

	// Look ahead 30 days
	const endDateObj = new Date(now);
	endDateObj.setDate(endDateObj.getDate() + 30);
	const endDateStr = endDateObj.toISOString().slice(0, 10);

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
			})
			.from(specializations)
			.orderBy(asc(specializations.name)),
	]);

	// Get first available date per specialization from availability table
	const availabilityBySpec = await useDb()
		.select({
			specializationId: doctors.specializationId,
			firstDay: min(availability.day),
		})
		.from(availability)
		.innerJoin(doctors, eq(availability.doctorUserId, doctors.userId))
		.where(gte(availability.day, todayStr))
		.groupBy(doctors.specializationId);

	const firstDayMap = new Map<number, string>();
	for (const row of availabilityBySpec) {
		if (row.specializationId && row.firstDay) {
			firstDayMap.set(row.specializationId, row.firstDay);
		}
	}

	return {
		patientsCount: Number(patientsResult[0]?.count ?? 0),
		visitsToday: Number(visitsResult[0]?.count ?? 0),
		specializations: specializationRows.map((spec) => ({
			...spec,
			nextAvailableDate: firstDayMap.get(spec.id) ?? null,
		})),
	};
});
