import {
	createError,
	defineEventHandler,
	readBody,
	setResponseStatus,
} from 'h3';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import { specializations } from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';

const payloadSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, 'Nazwa specjalizacji musi zawierać co najmniej 2 znaki.')
			.max(120, 'Nazwa specjalizacji może mieć maksymalnie 120 znaków.'),
	})
	.strict();

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				specializations: ['create'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

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
});
