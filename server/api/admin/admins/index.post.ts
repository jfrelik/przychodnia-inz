import consola from 'consola';
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

const payloadSchema = z
	.object({
		email: z.email().min(1, 'Adres email jest wymagany.'),
		name: z
			.string()
			.trim()
			.min(2, 'Imię i nazwisko musi zawierać co najmniej 2 znaki.'),
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
				users: ['create'],
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
				role: 'admin',
			},
		});

		await useDb().transaction(async (tx) => {
			await tx
				.update(user)
				.set({ emailVerified: true })
				.where(eq(user.id, signUpResult.user.id));
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

		consola.error({
			operation: 'AdminCreateAdmin',
			targetEmail: payload.data.email,
			errorCode: apiError?.body?.code ?? apiError?.statusCode,
			error: apiError,
		});

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

	try {
		await auth.api.requestPasswordReset({
			body: {
				email: payload.data.email,
				redirectTo: '/change-password',
			},
		});
	} catch (error) {
		consola.error({
			operation: 'AdminSendReset',
			targetEmail: payload.email,
			error,
		});
	}

	try {
		const [adminRow] = await useDb()
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				createdAt: user.createdAt,
			})
			.from(user)
			.where(eq(user.id, newUserId))
			.limit(1);

		await useAuditLog(
			event,
			session.user.id,
			`Utworzono konto administratora "${adminRow?.name ?? payload.data.name}" i wysłano link do ustawienia hasła.`
		);

		setResponseStatus(event, 201);

		return {
			status: 'ok',
			admin: adminRow,
		};
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
