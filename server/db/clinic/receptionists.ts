import { pgTable, text } from 'drizzle-orm/pg-core';
import { user } from '../auth';

export const receptionists = pgTable('receptionists', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
});
