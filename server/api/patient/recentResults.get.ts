import { desc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user as authUser } from '~~/server/db/auth';
import { medicalRecords, patients, testResults } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				testResults: ['list'],
				medicalRecords: ['read'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const email = session.user.email;

	const [userRow] = await useDb()
		.select()
		.from(authUser)
		.where(eq(authUser.email, email))
		.limit(1);
	if (!userRow)
		throw createError({ statusCode: 404, statusMessage: 'User not found' });

	const [patientRow] = await useDb()
		.select()
		.from(patients)
		.where(eq(patients.userId, userRow.id))
		.limit(1);
	if (!patientRow)
		throw createError({
			statusCode: 404,
			statusMessage: 'Patient profile not found',
		});

	const [record] = await useDb()
		.select()
		.from(medicalRecords)
		.where(eq(medicalRecords.patientId, patientRow.userId))
		.limit(1);
	if (!record) return [];

	const rows = await useDb()
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
		.limit(3);

	return rows;
});
