import { pgTable, serial, text } from 'drizzle-orm/pg-core';

export const specializations = pgTable('specializations', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(),
	description: text('description').notNull(),
	icon: text('icon').notNull().default('lucide:stethoscope'),
});
