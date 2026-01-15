import { eq } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { user } from '~~/server/db/auth';
import { doctors, specializations } from '~~/server/db/clinic';

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
	const session = await requireSessionWithPermissions(event, {
		doctors: ['update'],
	});

	const userId = event.context.params?.id;

	if (!userId) {
		throw createError({
			statusCode: 400,
			message: 'Identyfikator lekarza jest wymagany.',
		});
	}

	let current:
		| {
				userId: string;
				specializationId: number | null;
				licenseNumber: string;
				userName: string | null;
				userEmail: string | null;
		  }
		| undefined;

	try {
		[current] = await useDb()
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
			message: 'Lekarz nie został znaleziony.',
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

	if (
		payload.data.specializationId !== undefined &&
		payload.data.specializationId !== null
	) {
		let specialization: { id: number } | undefined;

		try {
			[specialization] = await useDb()
				.select({ id: specializations.id })
				.from(specializations)
				.where(eq(specializations.id, payload.data.specializationId))
				.limit(1);
		} catch (error) {
			const { message } = getDbErrorMessage(error);

			throw createError({
				statusCode: 500,
				message,
			});
		}

		if (!specialization) {
			throw createError({
				statusCode: 404,
				message: 'Specjalizacja nie została znaleziona.',
			});
		}
	}

	const update: Record<string, unknown> = {};
	const auditMessages: string[] = [];

	if (
		Object.prototype.hasOwnProperty.call(payload.data, 'specializationId') &&
		payload.data.specializationId !== current.specializationId
	) {
		update.specializationId = payload.data.specializationId ?? null;
		auditMessages.push('zmieniono specjalizację');
	}

	if (
		payload.data.licenseNumber &&
		payload.data.licenseNumber !== current.licenseNumber
	) {
		update.licenseNumber = payload.data.licenseNumber;
		auditMessages.push(
			`zmieniono numer licencji na "${payload.data.licenseNumber}"`
		);
	}

	if (Object.keys(update).length === 0) {
		return {
			status: 'noop',
			message: 'Brak zmian do zapisania.',
		};
	}

	try {
		await useDb().update(doctors).set(update).where(eq(doctors.userId, userId));
	} catch (error: unknown) {
		const dbError = error as { code?: string };

		if (dbError?.code === '23505') {
			throw createError({
				statusCode: 409,
				message: 'Lekarz o takim numerze licencji już istnieje.',
			});
		}
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}

	try {
		const [updated] = await useDb()
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
			.leftJoin(
				specializations,
				eq(doctors.specializationId, specializations.id)
			)
			.where(eq(doctors.userId, userId))
			.limit(1);

		await useAuditLog(
			event,
			session.user.id,
			`Zaktualizowano lekarza "${current.userName}": ${auditMessages.join(', ')}`
		);

		return {
			status: 'ok',
			doctor: updated,
		};
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
