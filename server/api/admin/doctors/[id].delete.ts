import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user } from '~~/server/db/auth';
import { doctors } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				doctors: ['delete'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const userId = event.context.params?.id;

	if (!userId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Identyfikator lekarza jest wymagany.',
		});
	}

	const [current] = await useDb()
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

	await useDb().transaction(async (tx) => {
		await tx.delete(doctors).where(eq(doctors.userId, userId));

		await tx.update(user).set({ role: 'user' }).where(eq(user.id, userId));
	});

	await useAuditLog(
		event,
		session.user.id,
		`Usunięto lekarza "${current.userName}".`
	);

	return {
		status: 'ok',
	};
});
