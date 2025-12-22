import { and, count, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user } from '~~/server/db/auth';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				users: ['delete'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

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
});
