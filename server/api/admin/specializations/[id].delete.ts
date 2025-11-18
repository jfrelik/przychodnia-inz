import { count, eq } from 'drizzle-orm';
import { createError } from 'h3';
import { doctors, specializations } from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

export default withAuth(
	async (event, session) => {
		const specializationId = Number(event.context.params?.id);

		if (!specializationId || Number.isNaN(specializationId)) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Identyfikator specjalizacji jest wymagany.',
			});
		}

		const [current] = await db
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
				statusMessage: 'Specjalizacja nie została znaleziona.',
			});
		}

		const [assigned] = await db
			.select({ total: count(doctors.userId) })
			.from(doctors)
			.where(eq(doctors.specializationId, specializationId));

		if (Number(assigned?.total ?? 0) > 0) {
			throw createError({
				statusCode: 400,
				statusMessage:
					'Nie można usunąć specjalizacji, do której przypisani są lekarze.',
			});
		}

		await db
			.delete(specializations)
			.where(eq(specializations.id, specializationId));

		await recordAuditLog(
			event,
			session.user.id,
			`Usunięto specjalizację "${current.name}".`
		);

		return {
			status: 'ok',
		};
	},
	['admin']
);

defineRouteMeta({
	openAPI: {
		operationId: 'Admin_DeleteSpecialization',
		tags: ['Admin'],
		summary: 'Delete specialization',
		description:
			'Usuwa specjalizację bez przypisanych lekarzy (dostęp tylko dla administratorów).',
		responses: {
			200: { description: 'OK' },
			400: { description: 'Specjalizacja ma przypisanych lekarzy' },
			401: { description: 'Unauthorized' },
			403: { description: 'Forbidden' },
			404: { description: 'Not found' },
		},
	},
});
