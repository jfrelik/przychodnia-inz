import { eq } from 'drizzle-orm';
import { createError } from 'h3';
import { user } from '~~/server/db/auth';
import { doctors } from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

export default withAuth(
	async (event, session) => {
		const userId = event.context.params?.id;

		if (!userId) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Identyfikator lekarza jest wymagany.',
			});
		}

		const [current] = await db
			.select({
				userId: doctors.userId,
				userName: user.name,
			})
			.from(doctors)
			.leftJoin(user, eq(doctors.userId, user.id))
			.where(eq(doctors.userId, userId))
			.limit(1);

		if (!current) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Lekarz nie został znaleziony.',
			});
		}

		await db.transaction(async (tx) => {
			await tx.delete(doctors).where(eq(doctors.userId, userId));

			await tx.update(user).set({ role: 'user' }).where(eq(user.id, userId));
		});

		await recordAuditLog(
			event,
			session.user.id,
			`Usunięto lekarza "${current.userName}".`
		);

		return {
			status: 'ok',
		};
	},
	['admin']
);

defineRouteMeta({
	openAPI: {
		operationId: 'Admin_DeleteDoctor',
		tags: ['Admin'],
		summary: 'Delete doctor',
		description:
			'Deletes doctor record and reverts user role to user (admin only).',
		responses: {
			200: { description: 'OK' },
			400: { description: 'Bad request' },
			401: { description: 'Unauthorized' },
			403: { description: 'Forbidden' },
			404: { description: 'Not found' },
		},
	},
});
