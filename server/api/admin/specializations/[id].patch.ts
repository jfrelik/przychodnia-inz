import { count, eq } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { doctors, specializations } from '~~/server/db/clinic';

const payloadSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, 'Nazwa specjalizacji musi zawierać co najmniej 2 znaki.')
			.max(120, 'Nazwa specjalizacji może mieć maksymalnie 120 znaków.')
			.optional(),
		description: z
			.string()
			.trim()
			.min(5, 'Opis specjalizacji musi zawierać co najmniej 5 znaków.')
			.max(500, 'Opis specjalizacji może mieć maksymalnie 500 znaków.')
			.optional(),
		icon: z
			.string()
			.trim()
			.regex(
				/^lucide:[a-z0-9-]+$/,
				'Nazwa ikonki musi zaczynać się od "lucide:" i zawierać tylko małe litery.'
			)
			.optional(),
	})
	.refine(
		(payload) => Object.keys(payload).length > 0,
		'Brak danych do aktualizacji.'
	)
	.strict();

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		specializations: ['update'],
	});

	const specializationId = Number(event.context.params?.id);

	if (!specializationId || Number.isNaN(specializationId)) {
		throw createError({
			statusCode: 400,
			message: 'Identyfikator specjalizacji jest wymagany.',
		});
	}

	const [current] = await useDb()
		.select({
			id: specializations.id,
			name: specializations.name,
			description: specializations.description,
			icon: specializations.icon,
		})
		.from(specializations)
		.where(eq(specializations.id, specializationId))
		.limit(1);

	if (!current) {
		throw createError({
			statusCode: 404,
			message: 'Specjalizacja nie została znaleziona.',
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

	const update: Record<string, unknown> = {};
	const auditMessages: string[] = [];

	if (payload.data.name && payload.data.name !== current.name) {
		update.name = payload.data.name;
		auditMessages.push(`zmieniono nazwę na "${payload.data.name}"`);
	}
	if (
		payload.data.description !== undefined &&
		payload.data.description !== current.description
	) {
		update.description = payload.data.description;
		auditMessages.push('zmieniono opis');
	}
	if (payload.data.icon && payload.data.icon !== current.icon) {
		update.icon = payload.data.icon;
		auditMessages.push(`zmieniono ikonę na "${payload.data.icon}"`);
	}

	if (Object.keys(update).length === 0) {
		return {
			status: 'noop',
			message: 'Brak zmian do zapisania.',
		};
	}

	try {
		await useDb()
			.update(specializations)
			.set(update)
			.where(eq(specializations.id, specializationId));

		const [updated] = await useDb()
			.select({
				id: specializations.id,
				name: specializations.name,
				description: specializations.description,
				icon: specializations.icon,
				doctorCount: count(doctors.userId),
			})
			.from(specializations)
			.leftJoin(doctors, eq(doctors.specializationId, specializations.id))
			.where(eq(specializations.id, specializationId))
			.groupBy(specializations.id);

		await useAuditLog(
			event,
			session.user.id,
			`Zaktualizowano specjalizację "${current.name}": ${auditMessages.join(', ')}`
		);

		return {
			status: 'ok',
			specialization: {
				...updated,
				doctorCount: Number(updated?.doctorCount ?? 0),
			},
		};
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
