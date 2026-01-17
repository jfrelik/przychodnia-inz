import { and, asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import { doctors, specializations } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		users: ['list'],
	});

	try {
		const rows = await useDb()
			.select({
				userId: authUser.id,
				name: authUser.name,
				email: authUser.email,
				role: authUser.role,
				createdAt: authUser.createdAt,
				doctorUserId: doctors.userId,
				licenseNumber: doctors.licenseNumber,
				specializationName: specializations.name,
			})
			.from(authUser)
			.leftJoin(doctors, eq(authUser.id, doctors.userId))
			.leftJoin(
				specializations,
				eq(doctors.specializationId, specializations.id)
			)
			.where(and(eq(authUser.banned, false)))
			.orderBy(asc(authUser.name));

		return rows.map((row) => ({
			userId: row.userId,
			name: row.name,
			email: row.email,
			role: row.role,
			createdAt: row.createdAt,
			isDoctor: Boolean(row.doctorUserId),
			licenseNumber: row.licenseNumber ?? null,
			specializationName: row.specializationName ?? null,
		}));
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}
});
