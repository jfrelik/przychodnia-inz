import { asc, eq } from 'drizzle-orm';
import { user } from '~~/server/db/auth';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

export default withAuth(async () => {
	const admins = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			createdAt: user.createdAt,
		})
		.from(user)
		.where(eq(user.role, 'admin'))
		.orderBy(asc(user.name));

	return admins;
}, ['admin']);

defineRouteMeta({
	openAPI: {
		operationId: 'Admin_ListAdmins',
		tags: ['Admin'],
		summary: 'List all administrators',
		description: 'Returns all users with admin role (admin only).',
		responses: {
			200: { description: 'OK' },
			401: { description: 'Unauthorized' },
			403: { description: 'Forbidden' },
		},
	},
});
