import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const recommendations = pgTable('recommendations', {
	recommendationId: serial('recommendation_id').primaryKey(),
	content: text('content').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow(),
});
