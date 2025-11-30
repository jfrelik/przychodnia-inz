import { desc, eq } from 'drizzle-orm';
import { createError } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import { medicalRecords, patients, testResults } from '~~/server/db/clinic';
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

		const [record] = await db
			.select()
			.from(medicalRecords)
			.where(eq(medicalRecords.patientId, patientRow.userId))
			.limit(1);
		if (!record) return [];

		const rows = await db
			.select({
				testId: testResults.testId,
				testType: testResults.testType,
				result: testResults.result,
				testDate: testResults.testDate,
				filePath: testResults.filePath,
			})
			.from(testResults)
			.where(eq(testResults.recordId, record.recordId))
			.orderBy(desc(testResults.testDate));

		return rows;
	},
	['user']
);
