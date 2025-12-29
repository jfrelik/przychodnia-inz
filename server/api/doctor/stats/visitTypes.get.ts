import { and, eq, sql } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { appointments, doctors } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: { appointments: ['list'] },
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const [doctorRow] = await useDb()
		.select({ userId: doctors.userId })
		.from(doctors)
		.where(eq(doctors.userId, session.user.id))
		.limit(1);

	if (!doctorRow)
		throw createError({
			statusCode: 404,
			statusMessage: 'Doctor profile not found',
		});

	const [counts] = await useDb()
		.select({
			onsite: sql<number>`count(*) FILTER (WHERE ${appointments.isOnline} = false)`,
			remote: sql<number>`count(*) FILTER (WHERE ${appointments.isOnline} = true)`,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.doctorId, doctorRow.userId),
				eq(appointments.status, 'completed')
			)
		);

	return {
		onsite: Number(counts?.onsite ?? 0),
		remote: Number(counts?.remote ?? 0),
	};
});
