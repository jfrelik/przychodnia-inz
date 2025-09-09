import { integer, pgTable, text } from 'drizzle-orm/pg-core';
import { user } from '../auth';
import { specializations } from './specializations';

export const doctors = pgTable('doctors', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	// Link to dedicated specializations table (nullable for smooth migration)
	specializationId: integer('specialization_id').references(
		() => specializations.id
	),
	licenseNumber: text('license_number').notNull().unique(),
});
