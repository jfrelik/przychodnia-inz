import {
	date,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
} from 'drizzle-orm/pg-core';
import { patients } from './patients';

export const medicalRecords = pgTable('medical_records', {
	recordId: serial('record_id').primaryKey(),
	patientId: text('patient_id')
		.notNull()
		.unique()
		.references(() => patients.userId, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: false })
		.notNull()
		.defaultNow(),
});

export const testResults = pgTable('test_results', {
	testId: serial('test_id').primaryKey(),
	recordId: integer('record_id')
		.notNull()
		.references(() => medicalRecords.recordId, { onDelete: 'cascade' }),
	testType: text('test_type').notNull(),
	result: text('result').notNull(),
	testDate: date('test_date').notNull(),
	filePath: text('file_path').notNull(),
});
