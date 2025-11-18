import { count, eq } from 'drizzle-orm';
import { createError, readBody } from 'h3';
import { z } from 'zod';
import { doctors, specializations } from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

const payloadSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, 'Nazwa specjalizacji musi zawierać co najmniej 2 znaki.')
			.max(120, 'Nazwa specjalizacji może mieć maksymalnie 120 znaków.')
			.optional(),
	})
	.refine(
		(payload) => Object.keys(payload).length > 0,
		'Brak danych do aktualizacji.'
	)
	.strict();

export default withAuth(
	async (event, session) => {
		const specializationId = Number(event.context.params?.id);

		if (!specializationId || Number.isNaN(specializationId)) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Identyfikator specjalizacji jest wymagany.',
			});
		}

		const [current] = await db
			.select({
				id: specializations.id,
				name: specializations.name,
			})
			.from(specializations)
			.where(eq(specializations.id, specializationId))
			.limit(1);

		if (!current) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Specjalizacja nie została znaleziona.',
			});
		}

		const body = await readBody(event);
		const payload = payloadSchema.parse(body);

		const update: Record<string, unknown> = {};
		const auditMessages: string[] = [];

		if (payload.name && payload.name !== current.name) {
			update.name = payload.name;
			auditMessages.push(`zmieniono nazwę na "${payload.name}"`);
		}

		if (Object.keys(update).length === 0) {
			return {
				status: 'noop',
				message: 'Brak zmian do zapisania.',
			};
		}

		try {
			await db
				.update(specializations)
				.set(update)
				.where(eq(specializations.id, specializationId));
		} catch (error: unknown) {
			const dbError = error as { code?: string };

			console.error({
				operation: 'AdminUpdateSpecialization',
				targetId: specializationId,
				errorCode: dbError?.code,
				error,
			});

			if (dbError?.code === '23505') {
				throw createError({
					statusCode: 409,
					statusMessage: 'Specjalizacja o takiej nazwie już istnieje.',
				});
			}
			throw error;
		}

		const [updated] = await db
			.select({
				id: specializations.id,
				name: specializations.name,
				doctorCount: count(doctors.userId),
			})
			.from(specializations)
			.leftJoin(doctors, eq(doctors.specializationId, specializations.id))
			.where(eq(specializations.id, specializationId))
			.groupBy(specializations.id);

		await recordAuditLog(
			event,
			session.user.id,
			`Zaktualizowano specjalizację "${current.name}": ${auditMessages.join(', ')}`
		);

		return {
			status: 'ok',
			specialization: {
				...updated,
				doctorCount: Number(updated?.doctorCount ?? 0),
			},
		};
	},
	['admin']
);

defineRouteMeta({
	openAPI: {
		operationId: 'Admin_UpdateSpecialization',
		tags: ['Admin'],
		summary: 'Update specialization',
		description:
			'Aktualizuje nazwę specjalizacji (dostęp tylko dla administratorów).',
		responses: {
			200: { description: 'OK' },
			400: { description: 'Validation error' },
			401: { description: 'Unauthorized' },
			403: { description: 'Forbidden' },
			404: { description: 'Not found' },
			409: { description: 'Conflict' },
		},
	},
});
