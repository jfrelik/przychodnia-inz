import { asc, count, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { doctors, specializations } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		specializations: ['list'],
	});

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
