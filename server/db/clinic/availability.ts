import { date, pgTable, text, time } from 'drizzle-orm/pg-core';
import { doctors } from './doctors';

export const availability = pgTable('availability', {
	scheduleId: text('schedule_id').primaryKey(),
	day: date('day').notNull(),
	timeStart: time('time_start', { withTimezone: false }).notNull(),
	timeEnd: time('time_end', { withTimezone: false }).notNull(),
	doctorUserId: text('doctors_user_id')
		.notNull()
		.references(() => doctors.userId),
});
