import { and, eq } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import { user as authUser } from '~~/server/db/auth';
import { appointments, patients } from '~~/server/db/clinic';

const payloadSchema = z.object({
	status: z.literal('canceled'),
});

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				appointments: ['update'],
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

	const appointmentId = Number(event.context.params?.id);
	if (!Number.isFinite(appointmentId))
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid appointment id',
		});

	const payload = payloadSchema.parse(await readBody(event));

	const [appointmentRow] = await useDb()
		.select({
			appointmentId: appointments.appointmentId,
			status: appointments.status,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.appointmentId, appointmentId),
				eq(appointments.patientId, patientRow.userId)
			)
		)
		.limit(1);

	if (!appointmentRow)
		throw createError({
			statusCode: 404,
			statusMessage: 'Appointment not found',
		});

	if (appointmentRow.status !== 'scheduled')
		throw createError({
			statusCode: 400,
			statusMessage: 'Only scheduled appointments can be canceled',
		});

	const [updated] = await useDb()
		.update(appointments)
		.set({ status: payload.status })
		.where(
			and(
				eq(appointments.appointmentId, appointmentId),
				eq(appointments.patientId, patientRow.userId)
			)
		)
		.returning({
			appointmentId: appointments.appointmentId,
			status: appointments.status,
		});

	return updated;
});
