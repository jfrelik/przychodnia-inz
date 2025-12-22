import { asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user as authUser } from '~~/server/db/auth';
import { doctors, specializations } from '~~/server/db/clinic';
import db from '~~/server/util/db';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
	}

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				users: ['list'],
				doctors: ['list'],
			},
		},
	});

	if (!hasPermission.success) {
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
	}

	const rows = await db
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
		.leftJoin(specializations, eq(doctors.specializationId, specializations.id))
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
});
