import {
	createError,
	defineEventHandler,
	readBody,
	setResponseStatus,
} from 'h3';
import { z } from 'zod';
import { specializations } from '~~/server/db/clinic';

const payloadSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, 'Nazwa specjalizacji musi zawierać co najmniej 2 znaki.')
			.max(120, 'Nazwa specjalizacji może mieć maksymalnie 120 znaków.'),
		description: z
			.string()
			.trim()
			.min(5, 'Opis specjalizacji musi zawierać co najmniej 5 znaków.')
			.max(500, 'Opis specjalizacji może mieć maksymalnie 500 znaków.'),
		icon: z
			.string()
			.trim()
			.regex(
				/^lucide:[a-z0-9-]+$/,
				'Nazwa ikonki musi zaczynać się od "lucide:" i zawierać tylko małe litery.'
			),
	})
	.strict();

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		specializations: ['create'],
	});

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

	try {
		const [created] = await useDb()
			.insert(specializations)
			.values({
				name: payload.data.name,
				description: payload.data.description,
				icon: payload.data.icon,
			})
			.returning({
				id: specializations.id,
				name: specializations.name,
				description: specializations.description,
				icon: specializations.icon,
			});

		if (!created) {
			throw createError({
				statusCode: 500,
				message: 'Nie udało się utworzyć specjalizacji.',
			});
		}

		await useAuditLog(
			event,
			session.user.id,
			`Dodano specjalizację "${created.name}".`
		);

		setResponseStatus(event, 201);

		return {
			status: 'ok',
			specialization: { ...created, doctorCount: 0 },
		};
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
