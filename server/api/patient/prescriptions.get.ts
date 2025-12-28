import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user as authUser } from '~~/server/db/auth';
import { appointments, patients, prescriptions } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				prescriptions: ['list'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const email = session.user.email;

	const [userRow] = await useDb()
		.select()
		.from(authUser)
		.where(eq(authUser.email, email))
		.limit(1);
	if (!userRow)
		throw createError({ statusCode: 404, statusMessage: 'User not found' });

	const [patientRow] = await useDb()
		.select()
		.from(patients)
		.where(eq(patients.userId, userRow.id))
		.limit(1);
	if (!patientRow)
		throw createError({
			statusCode: 404,
			statusMessage: 'Patient profile not found',
		});

	const rows = await useDb()
		.select({
			prescriptionId: prescriptions.prescriptionId,
			medications: prescriptions.medications,
			issuedAt: prescriptions.issuedAt,
			status: prescriptions.status,
			appointmentId: appointments.appointmentId,
			appointmentDatetime: appointments.datetime,
			doctorId: appointments.doctorId,
			doctorName: authUser.name,
			doctorEmail: authUser.email,
		})
		.from(appointments)
		.leftJoin(
			prescriptions,
			eq(appointments.prescriptionId, prescriptions.prescriptionId)
		)
		.leftJoin(authUser, eq(appointments.doctorId, authUser.id))
		.where(
			and(
				eq(appointments.patientId, patientRow.userId),
				isNotNull(appointments.prescriptionId),
				isNotNull(prescriptions.prescriptionId)
			)
		)
		.orderBy(desc(prescriptions.issuedAt));

	// Deduplicate prescriptions in case of multiple appointments referencing same prescription
	const map = new Map<number, (typeof rows)[number]>();
	for (const r of rows) {
		if (r.prescriptionId != null && !map.has(r.prescriptionId))
			map.set(r.prescriptionId, r);
	}

	return Array.from(map.values());
});
