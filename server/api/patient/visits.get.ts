import { and, desc, eq } from 'drizzle-orm';
import { createError } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import { appointments, patients, room } from '~~/server/db/clinic';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

export default withAuth(
	async (event, session) => {
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
				appointmentId: appointments.appointmentId,
				datetime: appointments.datetime,
				status: appointments.status,
				notes: appointments.notes,
				doctorId: appointments.doctorId,
				doctorName: authUser.name,
				doctorEmail: authUser.email,
				roomId: room.roomId,
				roomNumber: room.number,
			})
			.from(appointments)
			.leftJoin(authUser, eq(appointments.doctorId, authUser.id))
			.leftJoin(room, eq(appointments.roomRoomId, room.roomId))
			.where(and(eq(appointments.patientId, patientRow.userId)))
			.orderBy(desc(appointments.datetime));

		return rows;
	},
	['user']
);

defineRouteMeta({
	openAPI: {
		operationId: 'Patient_ListVisits',
		tags: ['Patient'],
		summary: 'List patient visits',
		description:
			'Returns appointments for the authenticated patient with doctor and room info.',
		responses: {
			200: { description: 'OK' },
			401: { description: 'Unauthorized' },
		},
	},
});
