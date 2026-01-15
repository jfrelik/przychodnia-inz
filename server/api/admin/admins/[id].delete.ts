import { and, count, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user } from '~~/server/db/auth';

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		users: ['delete'],
	});

	const userId = event.context.params?.id;

	if (!userId) {
		throw createError({
			statusCode: 400,
			message: 'Identyfikator administratora jest wymagany.',
		});
	}

	if (userId === session.user.id) {
		throw createError({
			statusCode: 403,
			message: 'Nie możesz usunąć własnego konta administratora.',
		});
	}

	let countResult: { count: number } | undefined;

	try {
		[countResult] = await useDb()
			.select({ count: count() })
			.from(user)
			.where(eq(user.role, 'admin'));
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}

	const totalAdmins = Number(countResult?.count ?? 0);

	if (totalAdmins <= 1) {
		throw createError({
			statusCode: 403,
			message:
				'Nie można usunąć ostatniego administratora. Musi istnieć co najmniej jeden administrator.',
		});
	}

	let current: { id: string; name: string | null } | undefined;

	try {
		[current] = await useDb()
			.select({
				id: user.id,
				name: user.name,
			})
			.from(user)
			.where(and(eq(user.id, userId), eq(user.role, 'admin')))
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
			message: 'Administrator nie został znaleziony.',
		});
	}

	try {
		await useDb().delete(user).where(eq(user.id, userId));

		await useAuditLog(
			event,
			session.user.id,
			`Usunięto administratora "${current.name}".`
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
