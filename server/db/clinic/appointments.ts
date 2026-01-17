import {
	boolean,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
} from 'drizzle-orm/pg-core';
import { doctors } from './doctors';
import { appointmentStatusEnum, appointmentTypeEnum } from './enums';
import { patients } from './patients';
import { prescriptions } from './prescriptions';
import { recommendations } from './recommendations';
import { room } from './rooms';

export const appointments = pgTable('appointments', {
	appointmentId: serial('appointment_id').primaryKey(),
	patientId: text('patient_id')
		.notNull()
		.references(() => patients.userId, { onDelete: 'cascade' }),
	doctorId: text('doctor_id')
		.notNull()
		.references(() => doctors.userId, { onDelete: 'cascade' }),
	datetime: timestamp('datetime', {
		withTimezone: true,
		mode: 'date',
	}).notNull(),
	status: appointmentStatusEnum('status').notNull(),
	type: appointmentTypeEnum('type').notNull().default('consultation'),
	isOnline: boolean('is_online').notNull().default(false),
	notes: text('notes'),
	recommendationId: integer('recommendation_id').references(
		() => recommendations.recommendationId
	),
	prescriptionId: integer('prescription_id').references(
		() => prescriptions.prescriptionId
	),
	roomRoomId: integer('room_room_id').references(() => room.roomId),
});
