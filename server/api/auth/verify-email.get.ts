import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { createError, defineEventHandler, getQuery } from 'h3';
import { jwtVerify } from 'jose';
import { auth } from '~~/lib/auth';
import { user as authUser } from '~~/server/db/auth';

const secret = process.env.BETTER_AUTH_SECRET;

export default defineEventHandler(async (event) => {
	const query = getQuery(event);

	if (!query.token || Array.isArray(query.token)) {
		throw createError({
			statusCode: 400,
			message: 'Brak tokenu weryfikacyjnego',
		});
	}

	if (!secret) {
		throw createError({
			statusCode: 500,
			message: 'Brak konfiguracji serwera',
		});
	}

	const key = new TextEncoder().encode(secret);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let payload: any;

	try {
		const result = await jwtVerify(String(query.token), key, {
			algorithms: ['HS256'],
		});

		payload = result.payload;
	} catch (err) {
		throw createError({
			statusCode: 401,
			message: 'Nie udało się zweryfikować tokenu.',
		});
	}

	const email = payload.email as string | undefined;

	if (!email) {
		throw createError({
			statusCode: 400,
			message: 'Nieprawidłowy token.',
		});
	}

	const [dbUser] = await useDb()
		.select({ emailVerified: authUser.emailVerified })
		.from(authUser)
		.where(eq(authUser.email, email))
		.limit(1);

	if (!dbUser) {
		throw createError({
			statusCode: 404,
			message: 'Użytkownik nie istnieje.',
		});
	}

	if (dbUser.emailVerified) {
		throw createError({
			statusCode: 409,
			message: 'Adres e-mail jest już zweryfikowany.',
		});
	}

	try {
		await auth.api.verifyEmail({
			query: { token: String(query.token) },
		});
	} catch (error) {
		throw createError({
			statusCode: 400,
			message: 'Nie udało się zweryfikować adresu e-mail.',
		});
	}

	return { status: 'ok', emailVerified: true };
});
