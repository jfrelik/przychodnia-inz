import { desc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user as authUser } from '~~/server/db/auth';
import { appointments, doctors, patients } from '~~/server/db/clinic';

const buildPatientName = (
	firstName?: string | null,
	lastName?: string | null,
	fallback?: string | null
) => {
	const parts = [firstName, lastName].filter(Boolean).join(' ').trim();
	if (parts.length > 0) return parts;

	if (fallback && fallback.trim().length > 0) return fallback;

	return null;
};

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				appointments: ['list'],
				users: ['read'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const [doctorRow] = await useDb()
		.select({ userId: doctors.userId })
		.from(doctors)
		.where(eq(doctors.userId, session.user.id))
		.limit(1);

	if (!doctorRow) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Doctor profile not found.',
		});
	}

	const rows = await useDb()
		.select({
			patientId: appointments.patientId,
			lastAppointmentId: appointments.appointmentId,
			lastAppointmentDatetime: appointments.datetime,
			lastAppointmentStatus: appointments.status,
			patientFirstName: patients.firstName,
			patientLastName: patients.lastName,
			patientAuthName: authUser.name,
			patientEmail: authUser.email,
		})
		.from(appointments)
		.leftJoin(patients, eq(appointments.patientId, patients.userId))
		.leftJoin(authUser, eq(appointments.patientId, authUser.id))
		.where(eq(appointments.doctorId, doctorRow.userId))
		.orderBy(desc(appointments.datetime));

	const seen = new Set<string>();
	const patientsList = [];

	for (const row of rows) {
		if (seen.has(row.patientId)) continue;
		seen.add(row.patientId);
		patientsList.push({
			patientId: row.patientId,
			patientName: buildPatientName(
				row.patientFirstName,
				row.patientLastName,
				row.patientAuthName
			),
			patientEmail: row.patientEmail ?? null,
			lastAppointmentId: row.lastAppointmentId,
			lastAppointmentDatetime: row.lastAppointmentDatetime,
			lastAppointmentStatus: row.lastAppointmentStatus,
		});
	}

	return patientsList;
});
