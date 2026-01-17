import { desc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { medicalRecords, testResults } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		testResults: ['list'],
		medicalRecords: ['read'],
	});

	let record: typeof medicalRecords.$inferSelect | undefined;
	try {
		[record] = await useDb()
			.select()
			.from(medicalRecords)
			.where(eq(medicalRecords.patientId, session.user.id))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}
	if (!record) return [];

	let rows: Array<{
		testId: number;
		testType: string;
		result: string;
		testDate: string;
	}>;
	try {
		rows = await useDb()
			.select({
				testId: testResults.testId,
				testType: testResults.testType,
				result: testResults.result,
				testDate: testResults.testDate,
			})
			.from(testResults)
			.where(eq(testResults.recordId, record.recordId))
			.orderBy(desc(testResults.testDate));
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	return rows;
});
