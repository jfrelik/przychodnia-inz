import { jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { prescriptionStatusEnum } from './enums';

export const prescriptions = pgTable('prescriptions', {
	prescriptionId: serial('prescription_id').primaryKey(),
	medications: jsonb('medications').notNull(),
	issuedAt: timestamp('issued_at', { withTimezone: false })
		.notNull()
		.defaultNow(),
	status: prescriptionStatusEnum('status').notNull(),
});

export const recommendations = pgTable('recommendations', {
	recommendationId: serial('recommendation_id').primaryKey(),
	content: text('content').notNull(),
	createdAt: timestamp('created_at', { withTimezone: false })
		.notNull()
		.defaultNow(),
});
