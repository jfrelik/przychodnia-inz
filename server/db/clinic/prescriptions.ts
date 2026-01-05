import { pgTable, serial, timestamp } from 'drizzle-orm/pg-core';
import { prescriptionStatusEnum } from './enums';

export const prescriptions = pgTable('prescriptions', {
	prescriptionId: serial('prescription_id').primaryKey(),
	issuedAt: timestamp('issued_at', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow(),
	status: prescriptionStatusEnum('status').notNull(),
});
