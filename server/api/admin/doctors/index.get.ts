import { asc, eq } from 'drizzle-orm';
import { user } from '~~/server/db/auth';
import { doctors, specializations } from '~~/server/db/clinic';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

export default withAuth(async () => {
	const rows = await db
		.select({
			userId: doctors.userId,
			userName: user.name,
			userEmail: user.email,
			specializationId: doctors.specializationId,
			specializationName: specializations.name,
			licenseNumber: doctors.licenseNumber,
		})
		.from(doctors)
		.leftJoin(user, eq(doctors.userId, user.id))
		.leftJoin(specializations, eq(doctors.specializationId, specializations.id))
		.orderBy(asc(user.name));

	return rows;
}, ['admin']);

defineRouteMeta({
	openAPI: {
		operationId: 'Admin_ListDoctors',
		tags: ['Admin'],
		summary: 'List all doctors',
		description:
			'Returns all doctors with user details and specialization names (admin only).',
		responses: {
			200: { description: 'OK' },
			401: { description: 'Unauthorized' },
			403: { description: 'Forbidden' },
		},
	},
});
