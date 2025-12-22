import { integer, pgTable, primaryKey } from 'drizzle-orm/pg-core';
import { room } from './rooms';
import { specializations } from './specializations';

export const roomSpecializations = pgTable(
	'room_specializations',
	{
		roomId: integer('room_id')
			.notNull()
			.references(() => room.roomId, { onDelete: 'cascade' }),
		specializationId: integer('specialization_id')
			.notNull()
			.references(() => specializations.id, { onDelete: 'cascade' }),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.roomId, table.specializationId] }),
	})
);
