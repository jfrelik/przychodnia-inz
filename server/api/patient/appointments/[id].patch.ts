import { and, eq } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { user as authUser } from '~~/server/db/auth';
import { appointments } from '~~/server/db/clinic';
import type { SendEmailJob, SendEmailResult } from '~~/server/types/bullmq';

const queue = useQueue<SendEmailJob, SendEmailResult>('send-email');

const formatAppointmentDateTime = (date: Date) =>
	date.toLocaleString('pl-PL', {
		dateStyle: 'long',
		timeStyle: 'short',
	});
const formatAppointmentType = (type: 'consultation' | 'procedure') =>
	type === 'procedure' ? 'Zabieg' : 'Konsultacja';
const formatVisitMode = (isOnline: boolean) =>
	isOnline ? 'Online' : 'Stacjonarna';

const payloadSchema = z.object({
	status: z.literal('canceled'),
});

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		appointments: ['update'],
	});

	const appointmentId = Number(event.context.params?.id);
	if (!Number.isFinite(appointmentId))
		throw createError({
			statusCode: 400,
			message: 'Invalid appointment id',
		});

	const body = await readBody(event);
	const payload = payloadSchema.safeParse(body);

	if (payload.error) {
		const flat = z.flattenError(payload.error);
		const firstFieldError = Object.values(flat.fieldErrors)
			.flat()
			.find((m): m is string => !!m);

		throw createError({
			statusCode: 400,
			message: firstFieldError ?? 'Nieprawidłowe dane wejściowe.',
		});
	}

	let appointmentRow:
		| {
				appointmentId: number;
				status: string;
				doctorId: string;
				datetime: Date;
				type: string;
				isOnline: boolean;
		  }
		| undefined;
	try {
		[appointmentRow] = await useDb()
			.select({
				appointmentId: appointments.appointmentId,
				status: appointments.status,
				doctorId: appointments.doctorId,
				datetime: appointments.datetime,
				type: appointments.type,
				isOnline: appointments.isOnline,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.appointmentId, appointmentId),
					eq(appointments.patientId, session.user.id)
				)
			)
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!appointmentRow)
		throw createError({
			statusCode: 404,
			message: 'Appointment not found',
		});

	if (appointmentRow.status !== 'scheduled')
		throw createError({
			statusCode: 400,
			message: 'Only scheduled appointments can be canceled',
		});

	let doctorUser: typeof authUser.$inferSelect | undefined;
	try {
		[doctorUser] = await useDb()
			.select()
			.from(authUser)
			.where(eq(authUser.id, appointmentRow.doctorId))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}
	if (!doctorUser)
		throw createError({
			statusCode: 404,
			message: 'Doctor account not found',
		});

	let updated: { appointmentId: number; status: string } | undefined;
	try {
		[updated] = await useDb()
			.update(appointments)
			.set({ status: payload.data.status })
			.where(
				and(
					eq(appointments.appointmentId, appointmentId),
					eq(appointments.patientId, session.user.id)
				)
			)
			.returning({
				appointmentId: appointments.appointmentId,
				status: appointments.status,
			});
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	const html = await renderEmailComponent(
		'AppointmentCanceled',
		{
			patientName: session.user.name,
			doctorName: doctorUser.name,
			appointmentDateTime: formatAppointmentDateTime(
				new Date(appointmentRow.datetime)
			),
			visitMode: formatVisitMode(appointmentRow.isOnline),
			appointmentType: formatAppointmentType(
				appointmentRow.type as 'consultation' | 'procedure'
			),
		},
		{
			pretty: true,
		}
	);

	await queue.add('appointment canceled', {
		to: session.user.email,
		subject: 'Potwierdzenie odwołania wizyty',
		html,
	});

	return updated;
});
