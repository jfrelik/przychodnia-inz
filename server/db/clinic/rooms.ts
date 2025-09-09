import { integer, pgTable, serial } from 'drizzle-orm/pg-core';

export const room = pgTable('room', {
	roomId: serial('room_id').primaryKey(),
	number: integer('number').notNull(),
});
