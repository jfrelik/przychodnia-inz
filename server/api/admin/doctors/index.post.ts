import { eq } from 'drizzle-orm';
import { createError, readBody, setResponseStatus } from 'h3';
import crypto from 'node:crypto';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import { user } from '~~/server/db/auth';
import { doctors, specializations } from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

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

export default withAuth(
	async (event, session) => {
		const body = await readBody(event);
		const payload = payloadSchema.parse(body);

		const tempPassword = crypto.randomBytes(32).toString('hex');

		let createdUser: {
			id: string;
			name: string | null;
			email: string;
		};

		try {
			const signUpResult = await auth.api.createUser({
				body: {
					email: payload.email,
					password: tempPassword,
					name: payload.name,
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

			console.error({
				operation: 'AdminCreateDoctor',
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

			throw error;
		}

		const newUserId = createdUser.id;

		if (payload.specializationId !== null) {
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

		try {
			await db.transaction(async (tx) => {
				await tx.insert(doctors).values({
					userId: newUserId,
					specializationId: payload.specializationId,
					licenseNumber: payload.licenseNumber,
				});

				await tx
					.update(user)
					.set({ emailVerified: true })
					.where(eq(user.id, newUserId));
			});
		} catch (error: unknown) {
			const dbError = error as { code?: string };

			console.error({
				operation: 'AdminCreateDoctorRecord',
				targetLicense: payload.licenseNumber,
				targetEmail: payload.email,
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

		try {
			await auth.api.requestPasswordReset({
				body: {
					email: payload.email,
					redirectTo: '/change-password',
				},
			});
		} catch (error) {
			console.error({
				operation: 'AdminSendDoctorReset',
				targetEmail: payload.email,
				error,
			});
		}

		const [doctorRow] = await db
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

		await recordAuditLog(
			event,
			session.user.id,
			`Utworzono konto lekarza "${doctorRow?.userName ?? payload.name}", licencja: ${payload.licenseNumber}) i wysłano link do ustawienia hasła.`
		);

		setResponseStatus(event, 201);

		return {
			status: 'ok',
			doctor: doctorRow,
		};
	},
	['admin']
);
