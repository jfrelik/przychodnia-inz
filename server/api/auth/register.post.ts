import consola from 'consola';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import { user } from '~~/server/db/auth';
import { patients } from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';

const payloadSchema = z
	.object({
		email: z.email({ message: 'Adres email jest wymagany.' }),
		name: z
			.string()
			.trim()
			.min(2, { message: 'Imię musi zawierać co najmniej 2 znaki.' }),
		surname: z
			.string()
			.trim()
			.min(2, { message: 'Nazwisko musi zawierać co najmniej 2 znaki.' }),
		pesel: z
			.string()
			.length(11, { message: 'PESEL musi mieć dokładnie 11 znaków' })
			.regex(/^\d+$/, { message: 'PESEL musi składać się tylko z cyfr' }),
		phone: z
			.string()
			.min(9, { message: 'Numer telefonu musi zawierać co najmniej 9 znaków.' })
			.max(15, { message: 'Numer telefonu może mieć maksymalnie 15 znaków.' })
			.regex(/^\+?\d+$/, {
				message:
					'Numer telefonu może zawierać tylko cyfry i opcjonalny znak + na początku.',
			}),
		password: z
			.string()
			.min(12, { message: 'Hasło musi zawierać co najmniej 12 znaków.' })
			.regex(/[A-Z]/, {
				message: 'Hasło musi zawierać co najmniej jedną wielką literę.',
			})
			.regex(/[a-z]/, {
				message: 'Hasło musi zawierać co najmniej jedną małą literę.',
			})
			.regex(/\d/, { message: 'Hasło musi zawierać co najmniej jedną cyfrę.' })
			.regex(/[^A-Za-z0-9]/, {
				message: 'Hasło musi zawierać co najmniej jeden znak specjalny.',
			}),
		address: z
			.string()
			.trim()
			.min(5, { message: 'Adres musi zawierać co najmniej 5 znaków.' }),
	})
	.strict();

export default defineEventHandler(async (event) => {
	const body = await readBody(event);
	let payload: z.infer<typeof payloadSchema>;

	try {
		payload = payloadSchema.parse(body);
	} catch (validationError) {
		consola.error({
			operation: 'PatientRegistrationValidation',
			error: validationError,
		});
		throw createError({
			statusCode: 400,
			statusMessage: 'Błąd walidacji danych rejestracji.',
		});
	}

	// Check if PESEL already exists to avoid creating orphaned auth user
	// !TODO: Consider if we really want this check - RODO
	// const existingPatient = await db
	// 	.select({ pesel: patients.pesel })
	// 	.from(patients)
	// 	.where(eq(patients.pesel, payload.pesel))
	// 	.limit(1);

	// if (existingPatient.length > 0) {
	// 	throw createError({
	// 		statusCode: 409,
	// 		statusMessage: 'Pacjent o tym numerze PESEL już istnieje.',
	// 	});
	// }

	let newUserId: string;

	// Creating auth user
	try {
		const fullName = `${payload.name} ${payload.surname}`.trim();
		const signUpResult = await auth.api.signUpEmail({
			body: {
				email: payload.email,
				password: payload.password,
				name: fullName,
				callbackURL: '/login',
			},
		});

		newUserId = signUpResult.user.id;
	} catch (error: unknown) {
		const apiError = error as {
			statusCode?: number;
			body?: { code?: string };
		};

		consola.error({
			operation: 'PatientRegistration',
			targetEmail: payload.email,
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

		throw createError({
			statusCode: 500,
			statusMessage: 'Błąd tworzenia konta użytkownika.',
		});
	}

	// Calculate date of birth from PESEL
	const yearPart = parseInt(payload.pesel.substring(0, 2), 10);
	const monthPart = parseInt(payload.pesel.substring(2, 4), 10);
	const dayPart = parseInt(payload.pesel.substring(4, 6), 10);

	let birthYear = yearPart;
	let birthMonth = monthPart;
	if (monthPart > 80) {
		birthYear += 1800;
		birthMonth -= 80;
	} else if (monthPart > 60) {
		birthYear += 2200;
		birthMonth -= 60;
	} else if (monthPart > 40) {
		birthYear += 2100;
		birthMonth -= 40;
	} else if (monthPart > 20) {
		birthYear += 2000;
		birthMonth -= 20;
	} else {
		birthYear += 1900;
	}
	const dateOfBirth = new Date(
		birthYear,
		birthMonth - 1,
		dayPart
	).toDateString();

	// Create patient profile and link to auth user
	try {
		await db.transaction(async (tx) => {
			await tx.insert(patients).values({
				userId: newUserId,
				firstName: payload.name,
				lastName: payload.surname,
				dateOfBirth: dateOfBirth,
				pesel: payload.pesel,
				phone: payload.phone,
				address: payload.address,
			});
		});
	} catch (error: unknown) {
		consola.error({
			operation: 'PatientProfileCreation',
			targetPesel: payload.pesel,
			targetEmail: payload.email,
			error,
		});

		throw createError({
			statusCode: 500,
			statusMessage: 'Błąd tworzenia profilu pacjenta.',
		});
	}

	let patientRow: {
		userId: string;
		firstName: string | null;
		lastName: string | null;
		pesel: string;
		phone: string | null;
		address: string;
		email: string | null;
		createdAt: Date | null;
	};

	try {
		const rows = await db
			.select({
				userId: patients.userId,
				firstName: patients.firstName,
				lastName: patients.lastName,
				pesel: patients.pesel,
				phone: patients.phone,
				address: patients.address,
				email: user.email,
				createdAt: user.createdAt,
			})
			.from(patients)
			.leftJoin(user, eq(patients.userId, user.id))
			.where(eq(patients.userId, newUserId))
			.limit(1);

		if (!rows[0]) {
			throw new Error('Patient record not found after creation');
		}

		patientRow = rows[0];
	} catch (error) {
		consola.error({ operation: 'PatientRegistrationFetch', error });
		throw createError({
			statusCode: 500,
			statusMessage: 'Błąd podczas pobierania danych pacjenta.',
		});
	}

	await recordAuditLog(
		event,
		newUserId,
		'Zarejestrowano nowe konto pacjenta i wysłano link weryfikacyjny.'
	);

	setResponseStatus(event, 201);

	return {
		status: 'ok',
		patient: patientRow,
		message:
			'Rejestracja powiodła się. Sprawdź swoją skrzynkę email, aby potwierdzić konto.',
	};
});
