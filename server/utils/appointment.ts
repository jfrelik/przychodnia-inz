const APPOINTMENT_TYPE_CONFIG = {
	consultation: { minutes: 20 },
	procedure: { minutes: 60 },
} as const;

export type AppointmentKind = keyof typeof APPOINTMENT_TYPE_CONFIG;

export const getDurationMinutes = (kind: AppointmentKind) =>
	APPOINTMENT_TYPE_CONFIG[kind]?.minutes ??
	APPOINTMENT_TYPE_CONFIG.consultation.minutes;

export const SLOT_MINUTES = APPOINTMENT_TYPE_CONFIG.consultation.minutes;
