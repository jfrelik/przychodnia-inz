import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { patients } from './patients';

export const medicalRecords = pgTable('medical_records', {
	recordId: serial('record_id').primaryKey(),
	patientId: text('patient_id')
		.notNull()
		.unique()
		.references(() => patients.userId, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow(),
});
