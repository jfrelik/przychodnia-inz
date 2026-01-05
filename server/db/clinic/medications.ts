import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { prescriptions } from './prescriptions';

export const medications = pgTable('medications', {
	medicationId: serial('medication_id').primaryKey(),
	prescriptionId: integer('prescription_id')
		.notNull()
		.references(() => prescriptions.prescriptionId, { onDelete: 'cascade' }),
	description: text('description').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow(),
});
