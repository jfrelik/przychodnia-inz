import { eq } from 'drizzle-orm';
import { createError, readBody, setResponseStatus } from 'h3';
import crypto from 'node:crypto';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import { user } from '~~/server/db/auth';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

const payloadSchema = z
	.object({
		email: z.email().min(1, 'Adres email jest wymagany.'),
		name: z
			.string()
			.trim()
			.min(2, 'Imię i nazwisko musi zawierać co najmniej 2 znaki.'),
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
					role: 'admin',
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
				operation: 'AdminCreateAdmin',
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

		try {
			await auth.api.requestPasswordReset({
				body: {
					email: payload.email,
					redirectTo: '/change-password',
				},
			});
		} catch (error) {
			console.error({
				operation: 'AdminSendReset',
				targetEmail: payload.email,
				error,
			});
		}

		const [adminRow] = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				createdAt: user.createdAt,
			})
			.from(user)
			.where(eq(user.id, newUserId))
			.limit(1);

		await recordAuditLog(
			event,
			session.user.id,
			`Utworzono konto administratora "${adminRow?.name ?? payload.name}" i wysłano link do ustawienia hasła.`
		);

		setResponseStatus(event, 201);

		return {
			status: 'ok',
			admin: adminRow,
		};
	},
	['admin']
);

defineRouteMeta({
	openAPI: {
		operationId: 'Admin_CreateAdmin',
		tags: ['Admin'],
		summary: 'Create administrator',
		description:
			'Creates a new user account with admin role and sends password reset email (admin only).',
		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: {
						type: 'object',
						properties: {
							email: { type: 'string', format: 'email' },
							name: { type: 'string' },
						},
						required: ['email', 'name'],
					},
				},
			},
		},
		responses: {
			201: { description: 'Created' },
			400: { description: 'Validation error' },
			401: { description: 'Unauthorized' },
			403: { description: 'Forbidden' },
			409: { description: 'Email conflict' },
		},
	},
});
