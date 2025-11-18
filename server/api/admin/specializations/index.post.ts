import { createError, readBody, setResponseStatus } from 'h3';
import { z } from 'zod';
import { specializations } from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

const payloadSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, 'Nazwa specjalizacji musi zawierać co najmniej 2 znaki.')
			.max(120, 'Nazwa specjalizacji może mieć maksymalnie 120 znaków.'),
	})
	.strict();

export default withAuth(
	async (event, session) => {
		const body = await readBody(event);
		const payload = payloadSchema.parse(body);

		try {
			const [created] = await db
				.insert(specializations)
				.values({ name: payload.name })
				.returning({
					id: specializations.id,
					name: specializations.name,
				});

			await recordAuditLog(
				event,
				session.user.id,
				`Dodano specjalizację "${created.name}".`
			);

			setResponseStatus(event, 201);

			return {
				status: 'ok',
				specialization: { ...created, doctorCount: 0 },
			};
		} catch (error: unknown) {
			const dbError = error as { code?: string };

			console.error({
				operation: 'AdminCreateSpecialization',
				targetName: payload.name,
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
	},
	['admin']
);

defineRouteMeta({
	openAPI: {
		operationId: 'Admin_CreateSpecialization',
		tags: ['Admin'],
		summary: 'Create specialization',
		description: 'Dodaje nową specjalizację medyczną',
		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: {
						type: 'object',
						properties: {
							name: {
								type: 'string',
								minLength: 2,
								maxLength: 120,
							},
						},
						required: ['name'],
					},
				},
			},
		},
		responses: {
			201: { description: 'Created' },
			400: { description: 'Validation error' },
			401: { description: 'Unauthorized' },
			403: { description: 'Forbidden' },
			409: { description: 'Conflict' },
		},
	},
});
