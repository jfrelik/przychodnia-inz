import { createError, readBody, setResponseStatus } from 'h3';
import { z } from 'zod';
import { room } from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

const payloadSchema = z
	.object({
		number: z
			.number()
			.int('Numer gabinetu musi być liczbą całkowitą.')
			.min(1, 'Numer gabinetu musi być liczbą od 1 do 9999.')
			.max(9999, 'Numer gabinetu musi być liczbą od 1 do 9999.'),
	})
	.strict();

export default withAuth(
	async (event, session) => {
		const body = await readBody(event);
		const payload = payloadSchema.parse(body);

		try {
			const [created] = await db
				.insert(room)
				.values({ number: payload.number })
				.returning({
					roomId: room.roomId,
					number: room.number,
				});

			await recordAuditLog(
				event,
				session.user.id,
				`Dodano gabinet numer ${created.number}.`
			);

			setResponseStatus(event, 201);

			return {
				status: 'ok',
				room: created,
			};
		} catch (error: unknown) {
			const dbError = error as { code?: string };

			console.error({
				operation: 'AdminCreateRoom',
				targetNumber: payload.number,
				errorCode: dbError?.code,
				error,
			});

			if (dbError?.code === '23505') {
				throw createError({
					statusCode: 409,
					statusMessage: 'Gabinet o tym numerze już istnieje.',
				});
			}

			throw error;
		}
	},
	['admin']
);

defineRouteMeta({
	openAPI: {
		operationId: 'Admin_CreateRoom',
		tags: ['Admin'],
		summary: 'Create room',
		description: 'Dodaje nowy gabinet',
		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: {
						type: 'object',
						properties: {
							number: {
								type: 'integer',
								minimum: 1,
								maximum: 9999,
							},
						},
						required: ['number'],
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
