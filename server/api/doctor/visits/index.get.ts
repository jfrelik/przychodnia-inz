import { desc, eq } from 'drizzle-orm';
import { createError } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import { appointments, doctors, room } from '~~/server/db/clinic';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

export default withAuth(
	async (_event, session) => {
		const email = session.user.email;

		const [userRow] = await db
			.select()
			.from(authUser)
			.where(eq(authUser.email, email))
			.limit(1);
		if (!userRow)
			throw createError({ statusCode: 404, statusMessage: 'User not found' });

		const [doctorRow] = await db
			.select()
			.from(doctors)
			.where(eq(doctors.userId, userRow.id))
			.limit(1);
		if (!doctorRow)
			throw createError({
				statusCode: 404,
				statusMessage: 'Doctor profile not found',
			});

		const rows = await db
			.select({
				appointmentId: appointments.appointmentId,
				datetime: appointments.datetime,
				status: appointments.status,
				notes: appointments.notes,
				patientId: appointments.patientId,
				patientName: authUser.name,
				patientEmail: authUser.email,
				roomId: room.roomId,
				roomNumber: room.number,
			})
			.from(appointments)
			.leftJoin(authUser, eq(appointments.patientId, authUser.id))
			.leftJoin(room, eq(appointments.roomRoomId, room.roomId))
			.where(eq(appointments.doctorId, doctorRow.userId))
			.orderBy(desc(appointments.datetime));

		return rows;
	},
	['doctor']
);

defineRouteMeta({
	openAPI: {
		operationId: 'Doctor_ListVisits',
		tags: ['Doctor'],
		summary: 'List doctor visits',
		description:
			'Returns appointments assigned to the authenticated doctor with patient and room info.',
		responses: {
			200: { description: 'OK' },
			401: { description: 'Unauthorized' },
			403: { description: 'Forbidden' },
			404: { description: 'Not Found' },
		},
	},
});
