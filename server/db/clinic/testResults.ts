import { date, integer, pgTable, serial, text } from 'drizzle-orm/pg-core';
import { medicalRecords } from './medical';

export const testResults = pgTable('test_results', {
	testId: serial('test_id').primaryKey(),
	recordId: integer('record_id')
		.notNull()
		.references(() => medicalRecords.recordId, { onDelete: 'cascade' }),
	testType: text('test_type').notNull(),
	result: text('result').notNull(),
	testDate: date('test_date').notNull(),
});
