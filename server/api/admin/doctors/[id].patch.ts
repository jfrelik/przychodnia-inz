import consola from 'consola';
import { eq } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import { user } from '~~/server/db/auth';
import { doctors, specializations } from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';

const payloadSchema = z
	.object({
		specializationId: z.number().int().positive().nullable().optional(),
		licenseNumber: z
			.string()
			.trim()
			.min(3, 'Numer licencji musi zawierać co najmniej 3 znaki.')
			.max(50, 'Numer licencji może mieć maksymalnie 50 znaków.')
			.optional(),
	})
	.refine(
		(payload) => Object.keys(payload).length > 0,
		'Brak danych do aktualizacji.'
	)
	.strict();

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				doctors: ['update'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const userId = event.context.params?.id;

	if (!userId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Identyfikator lekarza jest wymagany.',
		});
	}

	const [current] = await db
		.select({
			userId: doctors.userId,
			specializationId: doctors.specializationId,
			licenseNumber: doctors.licenseNumber,
			userName: user.name,
			userEmail: user.email,
		})
		.from(doctors)
		.leftJoin(user, eq(doctors.userId, user.id))
		.where(eq(doctors.userId, userId))
		.limit(1);

	if (!current) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Lekarz nie został znaleziony.',
		});
	}

	const body = await readBody(event);
	const payload = payloadSchema.parse(body);

	if (
		payload.specializationId !== undefined &&
		payload.specializationId !== null
	) {
		const [specialization] = await db
			.select({ id: specializations.id })
			.from(specializations)
			.where(eq(specializations.id, payload.specializationId))
			.limit(1);

		if (!specialization) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Specjalizacja nie została znaleziona.',
			});
		}
	}

	const update: Record<string, unknown> = {};
	const auditMessages: string[] = [];

	if (
		Object.prototype.hasOwnProperty.call(payload, 'specializationId') &&
		payload.specializationId !== current.specializationId
	) {
		update.specializationId = payload.specializationId ?? null;
		auditMessages.push('zmieniono specjalizację');
	}

	if (
		payload.licenseNumber &&
		payload.licenseNumber !== current.licenseNumber
	) {
		update.licenseNumber = payload.licenseNumber;
		auditMessages.push(
			`zmieniono numer licencji na "${payload.licenseNumber}"`
		);
	}

	if (Object.keys(update).length === 0) {
		return {
			status: 'noop',
			message: 'Brak zmian do zapisania.',
		};
	}

	try {
		await db.update(doctors).set(update).where(eq(doctors.userId, userId));
	} catch (error: unknown) {
		const dbError = error as { code?: string };

		consola.error({
			operation: 'AdminUpdateDoctor',
			targetUserId: userId,
			errorCode: dbError?.code,
			error,
		});

		if (dbError?.code === '23505') {
			throw createError({
				statusCode: 409,
				statusMessage: 'Lekarz o takim numerze licencji już istnieje.',
			});
		}
		throw error;
	}

	const [updated] = await db
		.select({
			userId: doctors.userId,
			userName: user.name,
			userEmail: user.email,
			specializationId: doctors.specializationId,
			specializationName: specializations.name,
			licenseNumber: doctors.licenseNumber,
		})
		.from(doctors)
		.leftJoin(user, eq(doctors.userId, user.id))
		.leftJoin(specializations, eq(doctors.specializationId, specializations.id))
		.where(eq(doctors.userId, userId))
		.limit(1);

	await recordAuditLog(
		event,
		session.user.id,
		`Zaktualizowano lekarza "${current.userName}": ${auditMessages.join(', ')}`
	);

	return {
		status: 'ok',
		doctor: updated,
	};
});
