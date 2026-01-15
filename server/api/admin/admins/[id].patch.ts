import { and, eq } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { user } from '~~/server/db/auth';

const payloadSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, 'Imię i nazwisko musi zawierać co najmniej 2 znaki.')
			.optional(),
	})
	.refine(
		(payload) => Object.keys(payload).length > 0,
		'Brak danych do aktualizacji.'
	)
	.strict();

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		users: ['update'],
	});

	const userId = event.context.params?.id;

	if (!userId) {
		throw createError({
			statusCode: 400,
			message: 'Identyfikator administratora jest wymagany.',
		});
	}

	const [current] = await useDb()
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
		})
		.from(user)
		.where(and(eq(user.id, userId), eq(user.role, 'admin')))
		.limit(1);

	if (!current) {
		throw createError({
			statusCode: 404,
			message: 'Administrator nie został znaleziony.',
		});
	}

	const body = await readBody(event);
	const payload = payloadSchema.safeParse(body);

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

	const update: Record<string, unknown> = {};
	const auditMessages: string[] = [];

	if (payload.data.name && payload.data.name !== current.name) {
		update.name = payload.data.name;
		auditMessages.push(`zmieniono imię i nazwisko na "${payload.data.name}"`);
	}

	if (Object.keys(update).length === 0) {
		return {
			status: 'noop',
			message: 'Brak zmian do zapisania.',
		};
	}

	try {
		await useDb().update(user).set(update).where(eq(user.id, userId));

		const [updated] = await useDb()
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				createdAt: user.createdAt,
			})
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);

		await useAuditLog(
			event,
			session.user.id,
			`Zaktualizowano administratora "${current.name}": ${auditMessages.join(', ')}`
		);

		return {
			status: 'ok',
			admin: updated,
		};
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
