import { eq } from 'drizzle-orm';
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
	await requireSessionWithPermissions(event, {
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
				patientId: string;
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
				patientId: appointments.patientId,
				doctorId: appointments.doctorId,
				datetime: appointments.datetime,
				type: appointments.type,
				isOnline: appointments.isOnline,
			})
			.from(appointments)
			.where(eq(appointments.appointmentId, appointmentId))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!appointmentRow)
		throw createError({
			statusCode: 404,
			message: 'Wizyta nie została znaleziona',
		});

	if (!['scheduled', 'checked_in'].includes(appointmentRow.status))
		throw createError({
			statusCode: 400,
			message: 'Można anulować tylko zaplanowane lub potwierdzone wizyty',
		});

	// Get patient info
	let patientUser: typeof authUser.$inferSelect | undefined;
	try {
		[patientUser] = await useDb()
			.select()
			.from(authUser)
			.where(eq(authUser.id, appointmentRow.patientId))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	// Get doctor info
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

	let updated: { appointmentId: number; status: string } | undefined;
	try {
		[updated] = await useDb()
			.update(appointments)
			.set({ status: payload.data.status })
			.where(eq(appointments.appointmentId, appointmentId))
			.returning({
				appointmentId: appointments.appointmentId,
				status: appointments.status,
			});
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	// Send email to patient if we have their info
	if (patientUser && doctorUser) {
		const html = await renderEmailComponent(
			'AppointmentCanceled',
			{
				patientName: patientUser.name,
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
			to: patientUser.email,
			subject: 'Wizyta została anulowana',
			html,
		});
	}

	return updated;
});
