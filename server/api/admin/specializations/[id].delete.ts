import { count, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { doctors, specializations } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		specializations: ['delete'],
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

	const [assigned] = await useDb()
		.select({ total: count(doctors.userId) })
		.from(doctors)
		.where(eq(doctors.specializationId, specializationId));

	if (Number(assigned?.total ?? 0) > 0) {
		throw createError({
			statusCode: 400,
			message:
				'Nie można usunąć specjalizacji, do której przypisani są lekarze.',
		});
	}

	try {
		await useDb()
			.delete(specializations)
			.where(eq(specializations.id, specializationId));

		await useAuditLog(
			event,
			session.user.id,
			`Usunięto specjalizację "${current.name}".`
		);

		return {
			status: 'ok',
		};
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
