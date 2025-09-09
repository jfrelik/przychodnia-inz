import { createAccessControl } from 'better-auth/plugins/access';

const statements = {
	appointments: ['read', 'list', 'create', 'update', 'delete'] as const,
	testResults: ['read', 'list', 'create', 'update', 'delete'] as const,
	medicalRecords: ['read', 'list', 'create', 'update', 'delete'] as const,
	availability: ['read', 'list', 'create', 'update', 'delete'] as const,
	prescriptions: ['read', 'list', 'create', 'update', 'delete'] as const,
	recommendations: ['read', 'list', 'create', 'update', 'delete'] as const,
	users: ['read', 'list', 'create', 'update', 'delete'] as const,
} as const;

export const ac = createAccessControl(statements);

export const roles = {
	// Patient: read own visits and own results (API enforces ownership)
	user: ac.newRole({
		appointments: ['read', 'list'],
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
		prescriptions: ['read', 'list'],
		recommendations: ['read', 'list'],
	}),

	// Admin: everything
	admin: ac.newRole(statements),
};
