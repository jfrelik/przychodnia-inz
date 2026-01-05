import { eq } from 'drizzle-orm';
import {
	createError,
	defineEventHandler,
	readBody,
	setResponseStatus,
} from 'h3';
import crypto from 'node:crypto';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import { user } from '~~/server/db/auth';
import { doctors, specializations } from '~~/server/db/clinic';

const payloadSchema = z
	.object({
		email: z
			.email('Adres email jest nieprawidłowy.')
			.min(1, 'Adres email jest wymagany.'),
		name: z
			.string()
			.trim()
			.min(2, 'Imię i nazwisko musi zawierać co najmniej 2 znaki.'),
		specializationId: z.number().int().positive().nullable(),
		licenseNumber: z
			.string()
			.trim()
			.min(3, 'Numer licencji musi zawierać co najmniej 3 znaki.')
			.max(50, 'Numer licencji może mieć maksymalnie 50 znaków.'),
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
				doctors: ['create'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

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

	const tempPassword = crypto.randomBytes(32).toString('hex');

	let createdUser: {
		id: string;
		name: string | null;
		email: string;
	};

	try {
		const signUpResult = await auth.api.createUser({
			body: {
				email: payload.data.email,
				password: tempPassword,
				name: payload.data.name,
				role: 'doctor',
			},
		});

		createdUser = {
			id: signUpResult.user.id,
			name: signUpResult.user.name,
			email: signUpResult.user.email,
		};
	} catch (error: unknown) {
		const apiError = error as {
			statusCode?: number;
			body?: { code?: string };
		};

		if (
			apiError?.statusCode === 422 &&
			apiError.body?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
		) {
			throw createError({
				statusCode: 409,
				statusMessage: 'Użytkownik o tym adresie email już istnieje.',
			});
		}

		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}

	const newUserId = createdUser.id;

	if (payload.data.specializationId !== null) {
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
				statusMessage: 'Specjalizacja nie została znaleziona.',
			});
		}
	}

	try {
		await useDb().transaction(async (tx) => {
			await tx.insert(doctors).values({
				userId: newUserId,
				specializationId: payload.data.specializationId,
				licenseNumber: payload.data.licenseNumber,
			});

			await tx
				.update(user)
				.set({ emailVerified: true })
				.where(eq(user.id, newUserId));
		});
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}

	await auth.api.requestPasswordReset({
		body: {
			email: payload.data.email,
			redirectTo: '/change-password',
		},
	});

	try {
		const [doctorRow] = await useDb()
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
			.where(eq(doctors.userId, newUserId))
			.limit(1);

		await useAuditLog(
			event,
			session.user.id,
			`Utworzono konto lekarza "${doctorRow?.userName ?? payload.data.name}", licencja: ${payload.data.licenseNumber}) i wysłano link do ustawienia hasła.`
		);

		setResponseStatus(event, 201);

		return {
			status: 'ok',
			doctor: doctorRow,
		};
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
