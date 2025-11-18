import { and, count, eq } from 'drizzle-orm';
import { createError } from 'h3';
import { user } from '~~/server/db/auth';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

export default withAuth(
	async (event, session) => {
		const userId = event.context.params?.id;

		if (!userId) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Identyfikator administratora jest wymagany.',
			});
		}

		if (userId === session.user.id) {
			throw createError({
				statusCode: 403,
				statusMessage: 'Nie możesz usunąć własnego konta administratora.',
			});
		}

		const [countResult] = await db
			.select({ count: count() })
			.from(user)
			.where(eq(user.role, 'admin'));

		const totalAdmins = Number(countResult?.count ?? 0);

		if (totalAdmins <= 1) {
			throw createError({
				statusCode: 403,
				statusMessage:
					'Nie można usunąć ostatniego administratora. Musi istnieć co najmniej jeden administrator.',
			});
		}

		const [current] = await db
			.select({
				id: user.id,
				name: user.name,
			})
			.from(user)
			.where(and(eq(user.id, userId), eq(user.role, 'admin')))
			.limit(1);

		if (!current) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Administrator nie został znaleziony.',
			});
		}

		await db.update(user).set({ role: 'user' }).where(eq(user.id, userId));

		await recordAuditLog(
			event,
			session.user.id,
			`Usunięto administratora "${current.name}" i zmieniono rolę na użytkownika.`
		);

		return {
			status: 'ok',
		};
	},
	['admin']
);

defineRouteMeta({
	openAPI: {
		operationId: 'Admin_DeleteAdmin',
		tags: ['Admin'],
		summary: 'Delete administrator',
		description:
			'Reverts administrator role to regular user. Prevents self-deletion and deleting the last admin (admin only).',
		responses: {
			200: { description: 'OK' },
			400: { description: 'Bad request' },
			401: { description: 'Unauthorized' },
			403: { description: 'Forbidden' },
			404: { description: 'Not found' },
		},
	},
});
