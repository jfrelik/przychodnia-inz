import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/admin/access';

const statements = {
	...defaultStatements,
	appointments: ['read', 'list', 'create', 'update', 'delete'] as const,
	availability: ['read', 'list', 'create', 'update', 'delete'] as const,
	doctors: ['read', 'list', 'create', 'update', 'delete'] as const,
	logs: ['read', 'list'] as const,
	medicalRecords: ['read', 'list', 'create', 'update', 'delete'] as const,
	patients: ['read', 'list', 'create', 'update', 'delete'] as const,
	prescriptions: ['read', 'list', 'create', 'update', 'delete'] as const,
	queues: ['read', 'list'] as const,
	testResults: ['read', 'list', 'create', 'update', 'delete'] as const,
	recommendations: ['read', 'list', 'create', 'update', 'delete'] as const,
	rooms: ['read', 'list', 'create', 'update', 'delete'] as const,
	specializations: ['read', 'list', 'create', 'update', 'delete'] as const,
	users: ['read', 'list', 'create', 'update', 'delete'] as const,
	statistics: ['view'] as const,
} as const;

export const ac = createAccessControl(statements);

export const roles = {
	// Patient: read own visits and own results (API enforces ownership)
	user: ac.newRole({
		appointments: ['read', 'list', 'create'],
		testResults: ['read', 'list'],
		medicalRecords: ['read', 'list'],
		prescriptions: ['read', 'list'],
		recommendations: ['read', 'list'],
	}),

	// Doctor: read/list their visits and the patients from those visits
	doctor: ac.newRole({
		appointments: ['read', 'list', 'update'],
		users: ['read', 'list'],
		availability: ['read', 'list', 'create', 'update'],
		prescriptions: ['read', 'list', 'create', 'update'],
		recommendations: ['read', 'list', 'create', 'update'],
		testResults: ['read', 'list', 'create', 'update'],
		medicalRecords: ['read', 'list', 'create', 'update'],
	}),

	// Receptionist: manage appointments, view doctors and patients
	receptionist: ac.newRole({
		appointments: ['read', 'list', 'create', 'update'],
		availability: ['read', 'list'],
		users: ['read', 'list'],
		doctors: ['read', 'list'],
		patients: ['read', 'list'],
		rooms: ['read', 'list'],
	}),

	// Admin: everything
	admin: ac.newRole({
		...statements,
	}),
};
