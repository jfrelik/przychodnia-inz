import { eq } from 'drizzle-orm';
import {
	createError,
	defineEventHandler,
	readBody,
	setResponseStatus,
} from 'h3';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import { room, specializations } from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';

const payloadSchema = z
	.object({
		number: z
			.number()
			.int('Numer gabinetu musi być liczbą całkowitą.')
			.min(1, 'Numer gabinetu musi być liczbą od 1 do 9999.')
			.max(9999, 'Numer gabinetu musi być liczbą od 1 do 9999.'),
		specializationId: z
			.number()
			.int('Wybrana specjalizacja jest nieprawidłowa.')
			.min(1, 'Wybrana specjalizacja jest nieprawidłowa.')
			.nullable()
			.optional(),
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
				rooms: ['create'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const body = await readBody(event);
	const payload = payloadSchema.parse(body);

	let selectedSpecialization: { id: number; name: string } | null = null;

	if (
		payload.specializationId !== undefined &&
		payload.specializationId !== null
	) {
		const [foundSpecialization] = await db
			.select({
				id: specializations.id,
				name: specializations.name,
			})
			.from(specializations)
			.where(eq(specializations.id, payload.specializationId))
			.limit(1);

		if (!foundSpecialization) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Wybrana specjalizacja nie istnieje.',
			});
		}

		selectedSpecialization = foundSpecialization;
	}

	try {
		const [created] = await db
			.insert(room)
			.values({
				number: payload.number,
				specializationId: payload.specializationId ?? null,
			})
			.returning({
				roomId: room.roomId,
				number: room.number,
				specializationId: room.specializationId,
			});

		await recordAuditLog(
			event,
			session.user.id,
			selectedSpecialization
				? `Dodano gabinet numer ${created.number} (specjalizacja: ${selectedSpecialization.name}).`
				: `Dodano gabinet numer ${created.number}.`
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
});
