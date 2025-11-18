import { and, eq } from 'drizzle-orm';
import { createError, readBody } from 'h3';
import { z } from 'zod';
import { user } from '~~/server/db/auth';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

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

export default withAuth(
	async (event, session) => {
		const userId = event.context.params?.id;

		if (!userId) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Identyfikator administratora jest wymagany.',
			});
		}

		const [current] = await db
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
				statusMessage: 'Administrator nie został znaleziony.',
			});
		}

		const body = await readBody(event);
		const payload = payloadSchema.parse(body);

		const update: Record<string, unknown> = {};
		const auditMessages: string[] = [];

		if (payload.name && payload.name !== current.name) {
			update.name = payload.name;
			auditMessages.push(`zmieniono imię i nazwisko na "${payload.name}"`);
		}

		if (Object.keys(update).length === 0) {
			return {
				status: 'noop',
				message: 'Brak zmian do zapisania.',
			};
		}

		await db.update(user).set(update).where(eq(user.id, userId));

		const [updated] = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				createdAt: user.createdAt,
			})
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);

		await recordAuditLog(
			event,
			session.user.id,
			`Zaktualizowano administratora "${current.name}": ${auditMessages.join(', ')}`
		);

		return {
			status: 'ok',
			admin: updated,
		};
	},
	['admin']
);

defineRouteMeta({
	openAPI: {
		operationId: 'Admin_UpdateAdmin',
		tags: ['Admin'],
		summary: 'Update administrator',
		description: 'Updates administrator name (admin only).',
		responses: {
			200: { description: 'OK' },
			400: { description: 'Validation error' },
			401: { description: 'Unauthorized' },
			403: { description: 'Forbidden' },
			404: { description: 'Not found' },
		},
	},
});
