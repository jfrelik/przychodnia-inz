import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from '../auth';

export const logs = pgTable('logs', {
	logId: serial('log_id').primaryKey(),
	userId: text('user_id').references(() => user.id, {
		onDelete: 'set null',
	}),
	action: text('action').notNull(),
	timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow(),
	ipAddress: text('ip_address').notNull(),
});
