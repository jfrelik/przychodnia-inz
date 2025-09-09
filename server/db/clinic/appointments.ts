import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { doctors } from './doctors';
import { appointmentStatusEnum } from './enums';
import { patients } from './patients';
import { prescriptions, recommendations } from './prescriptions';
import { room } from './rooms';

export const appointments = pgTable('appointments', {
	appointmentId: serial('appointment_id').primaryKey(),
	patientId: text('patient_id')
		.notNull()
		.references(() => patients.userId, { onDelete: 'cascade' }),
	doctorId: text('doctor_id')
		.notNull()
		.references(() => doctors.userId, { onDelete: 'cascade' }),
	datetime: timestamp('datetime', { withTimezone: false }).notNull(),
	status: appointmentStatusEnum('status').notNull(),
	notes: text('notes'),
	recommendationId: integer('recommendation_id')
		.notNull()
		.references(() => recommendations.recommendationId),
	prescriptionId: integer('prescription_id')
		.notNull()
		.references(() => prescriptions.prescriptionId),
	roomRoomId: integer('room_room_id')
		.notNull()
		.references(() => room.roomId),
});
