import { randomUUID } from 'crypto';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import {
	createError,
	defineEventHandler,
	readBody,
	setResponseStatus,
} from 'h3';
import { z } from 'zod';
import { user } from '~~/server/db/auth';
import { appointments, availability } from '~~/server/db/clinic';
import type { SendEmailJob, SendEmailResult } from '~~/server/types/bullmq';

const queue = useQueue<SendEmailJob, SendEmailResult>('send-email');

const formatAppointmentType = (type: 'consultation' | 'procedure') =>
	type === 'procedure' ? 'Zabieg' : 'Konsultacja';
const formatVisitMode = (isOnline: boolean) =>
	isOnline ? 'Online' : 'Stacjonarna';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const payloadSchema = z
	.object({
		periodStart: z
			.string()
			.regex(dateRegex, 'Data musi być w formacie YYYY-MM-DD'),
		periodEnd: z
			.string()
			.regex(dateRegex, 'Data musi być w formacie YYYY-MM-DD'),
		days: z
			.array(
				z
					.object({
						date: z
							.string()
							.regex(dateRegex, 'Data musi być w formacie YYYY-MM-DD'),
						startHour: z.number().int().min(0).max(23),
						endHour: z.number().int().min(0).max(23),
					})
					.refine((data) => data.endHour > data.startHour, {
						message: 'Godzina zakończenia musi być późniejsza niż rozpoczęcia',
					})
			)
			.min(1, 'Wybierz przynajmniej jeden dzień'),
	})
	.strict()
	.refine((data) => data.periodEnd >= data.periodStart, {
		message: 'Data zakończenia musi być późniejsza lub równa dacie rozpoczęcia',
		path: ['periodEnd'],
	});

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		availability: ['create'],
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

	const todayStr = todayDateString();
	const earliestAllowedKey = tomorrowDateString();

	for (const day of payload.data.days) {
		const parsedDay = parseDateString(day.date);
		if (!parsedDay.isValid) {
			throw createError({
				statusCode: 400,
				message: 'Data jest nieprawidłowa',
			});
		}

		if (day.date < todayStr) {
			throw createError({
				statusCode: 400,
				message: 'Data nie może być w przeszłości',
			});
		}

		if (day.date < earliestAllowedKey) {
			throw createError({
				statusCode: 400,
				message: 'Dyspozycje można ustawiać od jutra.',
			});
		}

		if (
			day.date < payload.data.periodStart ||
			day.date > payload.data.periodEnd
		) {
			throw createError({
				statusCode: 400,
				message: 'Data musi być w zakresie wybranego okresu',
			});
		}
	}

	let insertedCount = 0;
	const canceledAppointments: Array<{
		patientName: string | null;
		patientEmail: string | null;
		datetime: Date;
		isOnline: boolean;
		type: string;
	}> = [];

	try {
		await useDb().transaction(async (tx) => {
			const payloadDays = [
				...new Set(payload.data.days.map((item) => item.date)),
			];

			const existingRows = await tx
				.select({ day: availability.day })
				.from(availability)
				.where(
					and(
						eq(availability.doctorUserId, session.user.id),
						gte(availability.day, payload.data.periodStart),
						lte(availability.day, payload.data.periodEnd)
					)
				);

			const existingDays = [
				...new Set(existingRows.map((row) => row.day)),
			].filter((day) => day >= earliestAllowedKey);
			const removedDays = existingDays.filter(
				(day) => !payloadDays.includes(day)
			);

			if (removedDays.length) {
				for (const day of removedDays) {
					const dayStart = parseDateString(day);
					const startOfDay = dayStart.toJSDate();
					const endOfDay = dayStart.endOf('day').toJSDate();

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
								eq(appointments.doctorId, session.user.id),
								inArray(appointments.status, ['scheduled', 'checked_in']),
								gte(appointments.datetime, startOfDay),
								lte(appointments.datetime, endOfDay)
							)
						);

					if (rows.length) {
						await tx
							.update(appointments)
							.set({ status: 'canceled' })
							.where(
								and(
									eq(appointments.doctorId, session.user.id),
									inArray(appointments.status, ['scheduled', 'checked_in']),
									gte(appointments.datetime, startOfDay),
									lte(appointments.datetime, endOfDay)
								)
							);

						canceledAppointments.push(...rows);
					}
				}
			}

			await tx
				.delete(availability)
				.where(
					and(
						eq(availability.doctorUserId, session.user.id),
						gte(availability.day, earliestAllowedKey),
						gte(availability.day, payload.data.periodStart),
						lte(availability.day, payload.data.periodEnd)
					)
				);

			const bulkValues = payload.data.days.map((item) => ({
				scheduleId: randomUUID(),
				day: item.date,
				timeStart: String(item.startHour).padStart(2, '0') + ':00:00',
				timeEnd: String(item.endHour).padStart(2, '0') + ':00:00',
				doctorUserId: session.user.id,
			}));

			await tx.insert(availability).values(bulkValues);
			insertedCount = bulkValues.length;
		});
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	await useAuditLog(
		event,
		session.user.id,
		`Zapisano dyspozycje na okres ${payload.data.periodStart} - ${payload.data.periodEnd} (${insertedCount} slotów)`
	);

	if (canceledAppointments.length) {
		const reason = 'Lekarz anulował swoją dyspozycję w wybranym dniu.';

		for (const appointment of canceledAppointments) {
			if (!appointment.patientEmail) continue;
			const html = await renderEmailComponent(
				'AppointmentCanceled',
				{
					patientName: appointment.patientName,
					doctorName: session.user.name ?? 'Lekarz',
					appointmentDateTime: formatDateTime(appointment.datetime),
					visitMode: formatVisitMode(appointment.isOnline),
					appointmentType: formatAppointmentType(
						appointment.type as 'consultation' | 'procedure'
					),
					reason,
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
	}

	setResponseStatus(event, 200);
	return { status: 'ok', count: insertedCount };
});
