import { relations } from 'drizzle-orm';
import { user } from '../auth';
import { appointments } from './appointments';
import { availability } from './availability';
import { doctors } from './doctors';
import { logs } from './logs';
import { medicalRecords } from './medical';
import { patients } from './patients';
import { prescriptions, recommendations } from './prescriptions';
import { room } from './rooms';
import { roomSpecializations } from './roomSpecializations';
import { specializations } from './specializations';
import { testResults } from './testResults';

// users
export const usersRelations = relations(user, ({ one, many }) => ({
	logs: many(logs),
	patient: one(patients, { fields: [user.id], references: [patients.userId] }),
	doctor: one(doctors, { fields: [user.id], references: [doctors.userId] }),
}));

export const availabilityRelations = relations(availability, ({ one }) => ({
	doctor: one(doctors, {
		fields: [availability.doctorUserId],
		references: [doctors.userId],
	}),
}));

// doctors
export const doctorsRelations = relations(doctors, ({ one }) => ({
	specialization: one(specializations, {
		fields: [doctors.specializationId],
		references: [specializations.id],
	}),
}));

// medical records
export const medicalRecordsRelations = relations(
	medicalRecords,
	({ one, many }) => ({
		patient: one(patients, {
			fields: [medicalRecords.patientId],
			references: [patients.userId],
		}),
		testResults: many(testResults),
	})
);

export const testResultsRelations = relations(testResults, ({ one }) => ({
	record: one(medicalRecords, {
		fields: [testResults.recordId],
		references: [medicalRecords.recordId],
	}),
}));

// appointments
export const appointmentsRelations = relations(appointments, ({ one }) => ({
	patient: one(patients, {
		fields: [appointments.patientId],
		references: [patients.userId],
	}),
	doctor: one(doctors, {
		fields: [appointments.doctorId],
		references: [doctors.userId],
	}),
	prescription: one(prescriptions, {
		fields: [appointments.prescriptionId],
		references: [prescriptions.prescriptionId],
	}),
	recommendation: one(recommendations, {
		fields: [appointments.recommendationId],
		references: [recommendations.recommendationId],
	}),
	room: one(room, {
		fields: [appointments.roomRoomId],
		references: [room.roomId],
	}),
}));

// room
export const roomRelations = relations(room, ({ many }) => ({
	appointments: many(appointments),
	roomSpecializations: many(roomSpecializations),
}));

export const specializationsRelations = relations(
	specializations,
	({ many }) => ({
		roomSpecializations: many(roomSpecializations),
		doctors: many(doctors),
	})
);

export const roomSpecializationsRelations = relations(
	roomSpecializations,
	({ one }) => ({
		room: one(room, {
			fields: [roomSpecializations.roomId],
			references: [room.roomId],
		}),
		specialization: one(specializations, {
			fields: [roomSpecializations.specializationId],
			references: [specializations.id],
		}),
	})
);

// roles/permissions are handled via Better Auth Access Control plugin in code.

// logs
export const logsRelations = relations(logs, ({ one }) => ({
	user: one(user, {
		fields: [logs.userId],
		references: [user.id],
	}),
}));
