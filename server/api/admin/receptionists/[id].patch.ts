import { eq } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { user } from '~~/server/db/auth';
import { receptionists } from '~~/server/db/clinic';

const payloadSchema = z.object({}).strict();

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		users: ['update'],
	});

	const userId = event.context.params?.id;

	if (!userId) {
		throw createError({
			statusCode: 400,
			message: 'Identyfikator rejestratora jest wymagany.',
		});
	}

	let current:
		| {
				userId: string;
				userName: string | null;
				userEmail: string | null;
		  }
		| undefined;

	try {
		[current] = await useDb()
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

	if (!current) {
		throw createError({
			statusCode: 404,
			message: 'Rejestrator nie został znaleziony.',
		});
	}

	const body = await readBody(event);
	const payload = payloadSchema.safeParse(body ?? {});

	if (payload.error) {
		const flat = z.flattenError(payload.error);

		const firstFieldError = Object.values(flat.fieldErrors)
			.flat()
			.find((m): m is string => !!m);

		throw createError({
			statusCode: 400,
			message: firstFieldError ?? 'Nieprawidłowe dane wejściowe.',
		});
	}

	return {
		status: 'noop',
		message: 'Brak zmian do zapisania.',
	};
});
