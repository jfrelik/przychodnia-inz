import { and, desc, eq } from 'drizzle-orm';
import { createError } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import { appointments, patients, prescriptions } from '~~/server/db/clinic';
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
				prescriptionId: prescriptions.prescriptionId,
				medications: prescriptions.medications,
				issuedAt: prescriptions.issuedAt,
				status: prescriptions.status,
				appointmentId: appointments.appointmentId,
				appointmentDatetime: appointments.datetime,
				doctorId: appointments.doctorId,
				doctorName: authUser.name,
				doctorEmail: authUser.email,
			})
			.from(appointments)
			.innerJoin(
				prescriptions,
				and(
					eq(appointments.prescriptionId, prescriptions.prescriptionId),
					eq(prescriptions.status, 'active')
				)
			)
			.leftJoin(authUser, eq(appointments.doctorId, authUser.id))
			.where(eq(appointments.patientId, patientRow.userId))
			.orderBy(desc(prescriptions.issuedAt));

		const map = new Map<number, (typeof rows)[number]>();
		for (const r of rows) {
			if (r.prescriptionId != null && !map.has(r.prescriptionId))
				map.set(r.prescriptionId, r);
		}

		return Array.from(map.values());
	},
	['user']
);

defineRouteMeta({
	openAPI: {
		operationId: 'Patient_ListActivePrescriptions',
		tags: ['Patient'],
		description:
			'Returns prescriptions with status active issued to the authenticated patient.',
		responses: {
			200: { description: 'OK' },
			401: { description: 'Unauthorized' },
		},
	},
});
