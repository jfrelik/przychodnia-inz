import { and, desc, eq, gte } from 'drizzle-orm';
import { createError } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import {
	appointments,
	medicalRecords,
	patients,
	prescriptions,
	testResults,
} from '~~/server/db/clinic';
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

		if (!userRow) {
			throw createError({ statusCode: 404, statusMessage: 'User not found' });
		}

		// Ensure patient profile exists
		const [patientRow] = await db
			.select()
			.from(patients)
			.where(eq(patients.userId, userRow.id))
			.limit(1);
		if (!patientRow) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Patient profile not found',
			});
		}

		const now = new Date();

		// Upcoming scheduled appointments (detailed)
		const upcoming = await db
			.select({
				appointmentId: appointments.appointmentId,
				datetime: appointments.datetime,
				status: appointments.status,
				doctorId: appointments.doctorId,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.patientId, patientRow.userId),
					gte(appointments.datetime, now),
					eq(appointments.status, 'scheduled')
				)
			)
			.orderBy(desc(appointments.datetime));

		// All visits count
		const allVisits = await db
			.select()
			.from(appointments)
			.where(eq(appointments.patientId, patientRow.userId));

		// Active prescriptions via appointments
		const activePrescriptions = await db
			.select({
				prescriptionId: prescriptions.prescriptionId,
				medications: prescriptions.medications,
				issuedAt: prescriptions.issuedAt,
				status: prescriptions.status,
			})
			.from(appointments)
			.leftJoin(
				prescriptions,
				eq(appointments.prescriptionId, prescriptions.prescriptionId)
			)
			.where(
				and(
					eq(appointments.patientId, patientRow.userId),
					eq(prescriptions.status, 'active')
				)
			);

		// Test results via medical record
		const [record] = await db
			.select()
			.from(medicalRecords)
			.where(eq(medicalRecords.patientId, patientRow.userId))
			.limit(1);

		const latestResults = record
			? await db
					.select({
						testId: testResults.testId,
						testType: testResults.testType,
						result: testResults.result,
						testDate: testResults.testDate,
						filePath: testResults.filePath,
					})
					.from(testResults)
					.where(eq(testResults.recordId, record.recordId))
					.orderBy(desc(testResults.testDate))
			: [];
		const resultsCount = latestResults.length;

		return {
			user: {
				id: userRow.id,
				email: userRow.email,
				name: userRow.name,
				role: userRow.role,
				emailVerified: userRow.emailVerified,
				createdAt: userRow.createdAt,
			},
			overview: {
				upcomingAppointmentsCount: upcoming.length,
				activePrescriptionsCount: activePrescriptions.length,
				testResultsCount: resultsCount,
				visitsCount: allVisits.length,
			},
			nextAppointments: upcoming.slice(0, 3),
			activePrescriptions: activePrescriptions.slice(0, 5),
			latestResults: latestResults.slice(0, 5),
		};
	},
	['user']
);

defineRouteMeta({
	openAPI: {
		operationId: 'Patient_GetOverview',
		tags: ['Patient'],
		summary: 'Get patient overview',
		description:
			'Returns patient user info and dashboard aggregates: upcoming appointments, prescriptions, test results.',
		responses: {
			200: { description: 'OK' },
			401: { description: 'Unauthorized' },
			404: { description: 'Not Found' },
		},
	},
});
