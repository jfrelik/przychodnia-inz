import { and, eq, inArray } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { user } from '~~/server/db/auth';
import { appointments, doctors } from '~~/server/db/clinic';
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

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				doctors: ['delete'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const userId = event.context.params?.id;

	if (!userId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Identyfikator lekarza jest wymagany.',
		});
	}

	let current: { userId: string; userName: string | null } | undefined;

	try {
		[current] = await useDb()
			.select({
				userId: doctors.userId,
				userName: user.name,
			})
			.from(doctors)
			.leftJoin(user, eq(doctors.userId, user.id))
			.where(eq(doctors.userId, userId))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}

	if (!current) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Lekarz nie został znaleziony.',
		});
	}

	let canceledAppointments: Array<{
		patientName: string | null;
		patientEmail: string | null;
		datetime: Date;
		isOnline: boolean;
		type: string;
	}> = [];

	try {
		canceledAppointments = await useDb().transaction(async (tx) => {
			const rows = await tx
				.select({
					patientName: user.name,
					patientEmail: user.email,
					datetime: appointments.datetime,
					isOnline: appointments.isOnline,
					type: appointments.type,
				})
				.from(appointments)
				.leftJoin(user, eq(appointments.patientId, user.id))
				.where(
					and(
						eq(appointments.doctorId, userId),
						inArray(appointments.status, ['scheduled', 'checked_in'])
					)
				);

			if (rows.length) {
				await tx
					.update(appointments)
					.set({ status: 'canceled' })
					.where(
						and(
							eq(appointments.doctorId, userId),
							inArray(appointments.status, ['scheduled', 'checked_in'])
						)
					);
			}

			await tx
				.update(user)
				.set({
					banned: true,
					banReason: 'Konto wyłączone przez administratora',
				})
				.where(eq(user.id, userId));

			return rows;
		});

		await useAuditLog(
			event,
			session.user.id,
			`Usunięto lekarza "${current.userName}" i odwołano jego wizyty.`
		);

		for (const appointment of canceledAppointments) {
			if (!appointment.patientEmail) continue;
			const html = await renderEmailComponent(
				'AppointmentCanceled',
				{
					patientName: appointment.patientName,
					doctorName: current.userName ?? 'Lekarz',
					appointmentDateTime: formatAppointmentDateTime(
						new Date(appointment.datetime)
					),
					visitMode: formatVisitMode(appointment.isOnline),
					appointmentType: formatAppointmentType(
						appointment.type as 'consultation' | 'procedure'
					),
				},
				{
					pretty: true,
				}
			);

			await queue.add('appointment canceled', {
				to: appointment.patientEmail,
				subject: 'Potwierdzenie odwołania wizyty',
				html,
			});
		}

		return {
			status: 'ok',
		};
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
