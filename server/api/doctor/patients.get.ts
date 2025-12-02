import { desc, eq } from 'drizzle-orm';
import { createError } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import { appointments, doctors } from '~~/server/db/clinic';
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
				patientId: appointments.patientId,
				lastAppointmentId: appointments.appointmentId,
				lastAppointmentDatetime: appointments.datetime,
				lastAppointmentStatus: appointments.status,
				patientName: authUser.name,
				patientEmail: authUser.email,
			})
			.from(appointments)
			.leftJoin(authUser, eq(appointments.patientId, authUser.id))
			.where(eq(appointments.doctorId, doctorRow.userId))
			.orderBy(desc(appointments.datetime));

		const seen = new Set<string>();
		const patients = [];
		for (const row of rows) {
			if (seen.has(row.patientId)) continue;
			seen.add(row.patientId);
			patients.push(row);
		}

		return patients;
	},
	['doctor']
);

defineRouteMeta({
	openAPI: {
		operationId: 'Doctor_ListPatients',
		tags: ['Doctor'],
		summary: 'List patients assigned to doctor',
		description:
			'Returns patients who have appointments with the authenticated doctor, ordered by most recent/upcoming appointment.',
		responses: {
			200: { description: 'OK' },
			401: { description: 'Unauthorized' },
			403: { description: 'Forbidden' },
			404: { description: 'Not Found' },
		},
	},
});
