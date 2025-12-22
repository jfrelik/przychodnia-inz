import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user as authUser } from '~~/server/db/auth';
import { appointments, patients, recommendations } from '~~/server/db/clinic';
import db from '~~/server/util/db';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				recommendations: ['list'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const email = session.user.email;

	const [userRow] = await db
		.select()
		.from(authUser)
		.where(eq(authUser.email, email))
		.limit(1);
	if (!userRow)
		throw createError({ statusCode: 404, statusMessage: 'User not found' });

	const [patientRow] = await db
		.select()
		.from(patients)
		.where(eq(patients.userId, userRow.id))
		.limit(1);
	if (!patientRow)
		throw createError({
			statusCode: 404,
			statusMessage: 'Patient profile not found',
		});

	const rows = await db
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
				eq(appointments.patientId, patientRow.userId),
				isNotNull(appointments.recommendationId),
				isNotNull(recommendations.recommendationId)
			)
		)
		.orderBy(desc(recommendations.createdAt));

	// Deduplicate in case of multiple appointments referencing same recommendation
	const map = new Map<number, (typeof rows)[number]>();
	for (const r of rows) {
		if (r.recommendationId != null && !map.has(r.recommendationId))
			map.set(r.recommendationId, r);
	}

	return Array.from(map.values());
});
