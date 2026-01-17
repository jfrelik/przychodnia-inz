import { date, pgTable, text } from 'drizzle-orm/pg-core';
import { user } from '../auth';

export const patients = pgTable('patients', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	// Core identity
	firstName: text('first_name'),
	lastName: text('last_name'),
	peselHmac: text('pesel_hmac').notNull().unique(),
	peselEnc: text('pesel_enc').notNull(),
	dateOfBirth: date('date_of_birth'),
	phone: text('phone'),
	address: text('address').notNull(),
});
