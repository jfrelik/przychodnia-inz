import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { user as authUser } from '~~/server/db/auth';
import { appointments, availability, doctors } from '~~/server/db/clinic';
import type { SendEmailJob, SendEmailResult } from '~~/server/types/bullmq';

const queue = useQueue<SendEmailJob, SendEmailResult>('send-email');

const formatAppointmentDateTime = (date: Date) => formatDateTime(date);
const formatAppointmentType = (type: 'consultation' | 'procedure') =>
	type === 'procedure' ? 'Zabieg' : 'Konsultacja';
const formatVisitMode = (isOnline: boolean) =>
	isOnline ? 'Online' : 'Stacjonarna';

const payloadSchema = z.object({
	doctorId: z.string(),
	// Accept datetime strings as long as they parse to a valid Date; avoids overly strict ISO regex.
	datetime: z
		.string()
		.refine((value) => !Number.isNaN(new Date(value).getTime()), {
			message: 'Invalid datetime',
		}),
	isOnline: z.boolean().default(false),
	notes: z.string().max(500).optional(),
});

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		appointments: ['create'],
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

	const { doctorId, datetime, isOnline, notes } = payload.data;
	const type = 'consultation' as const;

	let doctorRow: typeof doctors.$inferSelect | undefined;
	try {
		[doctorRow] = await useDb()
			.select()
			.from(doctors)
			.where(eq(doctors.userId, doctorId))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}
	if (!doctorRow)
		throw createError({ statusCode: 404, message: 'Doctor not found' });

	let doctorUser: typeof authUser.$inferSelect | undefined;
	try {
		[doctorUser] = await useDb()
			.select()
			.from(authUser)
			.where(eq(authUser.id, doctorId))
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
	if (doctorUser.banned) {
		throw createError({
			statusCode: 400,
			message: 'Lekarz nie przyjmuje nowych wizyt.',
		});
	}

	const slotStart = new Date(datetime);
	if (Number.isNaN(slotStart.getTime()))
		throw createError({ statusCode: 400, message: 'Invalid datetime' });

	// Check if slot is in the past
	const now = nowTZ();
	if (slotStart.getTime() <= now.toMillis()) {
		throw createError({
			statusCode: 400,
			message:
				'Nie można zarezerwować wizyty w przeszłości. Wybierz inny termin.',
		});
	}

	const durationMinutes = getDurationMinutes(type);
	const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);
	const dateStr = slotStart.toISOString().slice(0, 10);

	let frames: Array<{ start: string; end: string; roomId: number | null }>;
	try {
		frames = await useDb()
			.select({
				start: availability.timeStart,
				end: availability.timeEnd,
				roomId: availability.roomRoomId,
			})
			.from(availability)
			.where(
				and(
					eq(availability.doctorUserId, doctorId),
					eq(availability.day, dateStr)
				)
			);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	const toMinutes = (time: string) => {
		const [h, m] = time.split(':').map(Number);
		return (h || 0) * 60 + (m || 0);
	};

	const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
	const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();

	const matchingFrame = frames.find((f) => {
		const start = toMinutes(f.start);
		const end = toMinutes(f.end);
		return slotStartMinutes >= start && slotEndMinutes <= end;
	});

	if (!matchingFrame)
		throw createError({
			statusCode: 400,
			message: 'Slot outside doctor availability',
		});

	// Get room from doctor's availability for that timeframe
	const assignedRoomId = matchingFrame.roomId ?? null;

	const dayStart = new Date(`${dateStr}T00:00:00`);
	const dayEnd = new Date(`${dateStr}T23:59:59`);

	let created: typeof appointments.$inferSelect | undefined;
	try {
		await useDb().transaction(async (tx) => {
			const existing = await tx
				.select({
					datetime: appointments.datetime,
					type: appointments.type,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.doctorId, doctorId),
						gte(appointments.datetime, dayStart),
						lte(appointments.datetime, dayEnd),
						inArray(appointments.status, ['scheduled', 'checked_in'])
					)
				)
				.for('update');

			const conflict = existing.some((row) => {
				const existingStart = new Date(row.datetime);
				const existingDuration = getDurationMinutes(
					row.type as 'consultation' | 'procedure'
				);
				const existingEnd = new Date(
					existingStart.getTime() + existingDuration * 60_000
				);
				return existingStart < slotEnd && slotStart < existingEnd;
			});

			if (conflict) {
				throw createError({
					statusCode: 409,
					message: 'Ktoś właśnie zarezerwował tę wizytę.',
				});
			}

			const [inserted] = await tx
				.insert(appointments)
				.values({
					patientId: session.user.id,
					doctorId,
					datetime: slotStart,
					status: 'scheduled',
					type,
					isOnline,
					notes,
					roomRoomId: assignedRoomId,
				})
				.returning();

			if (!inserted) {
				throw createError({
					statusCode: 500,
					message: 'Nie udało się utworzyć wizyty.',
				});
			}

			created = inserted;
		});
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!created) {
		throw createError({
			statusCode: 500,
			message: 'Nie udało się utworzyć wizyty.',
		});
	}

	const html = await renderEmailComponent(
		'AppointmentBooked',
		{
			patientName: session.user.name,
			doctorName: doctorUser.name,
			appointmentDateTime: formatAppointmentDateTime(slotStart),
			visitMode: formatVisitMode(isOnline),
			appointmentType: formatAppointmentType(type),
		},
		{
			pretty: true,
		}
	);

	await queue.add('appointment booked', {
		to: session.user.email,
		subject: 'Potwierdzenie zapisu na wizytę',
		html,
	});

	return {
		appointmentId: created.appointmentId,
		status: created.status,
	};
});
