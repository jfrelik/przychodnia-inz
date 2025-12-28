import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user } from '~~/server/db/auth';
import { receptionists } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				users: ['read'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const userId = event.context.params?.id;

	if (!userId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Identyfikator rejestratora jest wymagany.',
		});
	}

	const [receptionist] = await useDb()
		.select({
			userId: receptionists.userId,
			userName: user.name,
			userEmail: user.email,
		})
		.from(receptionists)
		.leftJoin(user, eq(receptionists.userId, user.id))
		.where(eq(receptionists.userId, userId))
		.limit(1);

	if (!receptionist) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Rejestrator nie został znaleziony.',
		});
	}

	return receptionist;
});
