import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user } from '~~/server/db/auth';
import { receptionists } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		users: ['delete'],
	});

	const userId = event.context.params?.id;

	if (!userId) {
		throw createError({
			statusCode: 400,
			message: 'Identyfikator rejestratora jest wymagany.',
		});
	}

	let current: { userId: string; userName: string | null } | undefined;

	try {
		[current] = await useDb()
			.select({
				userId: receptionists.userId,
				userName: user.name,
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

	if (!current) {
		throw createError({
			statusCode: 404,
			message: 'Rejestrator nie został znaleziony.',
		});
	}

	try {
		await useDb().transaction(async (tx) => {
			await tx.delete(receptionists).where(eq(receptionists.userId, userId));

			await tx.update(user).set({ role: 'user' }).where(eq(user.id, userId));
		});

		await useAuditLog(
			event,
			session.user.id,
			`Usunięto rejestratora "${current.userName}".`
		);

		return {
			status: 'ok',
		};
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
