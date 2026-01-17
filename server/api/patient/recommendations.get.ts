import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import { appointments, recommendations } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		recommendations: ['list'],
	});

	let rows: Array<{
		recommendationId: number | null;
		content: string | null;
		createdAt: Date | null;
		appointmentId: number | null;
		appointmentDatetime: Date | null;
		doctorId: string | null;
		doctorName: string | null;
		doctorEmail: string | null;
	}>;
	try {
		rows = await useDb()
			.select({
				recommendationId: recommendations.recommendationId,
				content: recommendations.content,
				createdAt: recommendations.createdAt,
				appointmentId: appointments.appointmentId,
				appointmentDatetime: appointments.datetime,
				doctorId: appointments.doctorId,
				doctorName: authUser.name,
				doctorEmail: authUser.email,
			})
			.from(appointments)
			.leftJoin(
				recommendations,
				eq(appointments.recommendationId, recommendations.recommendationId)
			)
			.leftJoin(authUser, eq(appointments.doctorId, authUser.id))
			.where(
				and(
					eq(appointments.patientId, session.user.id),
					isNotNull(appointments.recommendationId),
					isNotNull(recommendations.recommendationId)
				)
			)
			.orderBy(desc(recommendations.createdAt));
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	return rows;
});
