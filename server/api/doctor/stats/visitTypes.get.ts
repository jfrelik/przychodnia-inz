import { and, eq, sql } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { appointments, doctors } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		appointments: ['list'],
	});

	let doctorRow: { userId: string } | undefined;
	try {
		[doctorRow] = await useDb()
			.select({ userId: doctors.userId })
			.from(doctors)
			.where(eq(doctors.userId, session.user.id))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!doctorRow)
		throw createError({
			statusCode: 404,
			message: 'Nie znaleziono profilu lekarza',
		});

	let counts: { onsite: number; remote: number } | undefined;
	try {
		[counts] = await useDb()
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
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	return {
		onsite: Number(counts?.onsite ?? 0),
		remote: Number(counts?.remote ?? 0),
	};
});
