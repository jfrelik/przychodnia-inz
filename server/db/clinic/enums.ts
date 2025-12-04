import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['patient', 'doctor', 'admin']);
export const appointmentStatusEnum = pgEnum('appointment_status', [
	'scheduled',
	'completed',
	'canceled',
	'checked_in',
]);
export const prescriptionStatusEnum = pgEnum('prescription_status', [
	'active',
	'fulfilled',
]);
