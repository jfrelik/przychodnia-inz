import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user } from '~~/server/db/auth';
import { receptionists } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		users: ['read'],
	});

	const userId = event.context.params?.id;

	if (!userId) {
		throw createError({
			statusCode: 400,
			message: 'Identyfikator rejestratora jest wymagany.',
		});
	}

	let receptionist:
		| {
				userId: string;
				userName: string | null;
				userEmail: string | null;
		  }
		| undefined;

	try {
		[receptionist] = await useDb()
			.select({
				userId: receptionists.userId,
				userName: user.name,
				userEmail: user.email,
			})
			.from(receptionists)
			.leftJoin(user, eq(receptionists.userId, user.id))
			.where(eq(receptionists.userId, userId))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}

	if (!receptionist) {
		throw createError({
			statusCode: 404,
			message: 'Rejestrator nie został znaleziony.',
		});
	}

	return receptionist;
});
