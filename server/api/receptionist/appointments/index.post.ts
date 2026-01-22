import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { user as authUser } from '~~/server/db/auth';
import {
	appointments,
	availability,
	doctors,
	patients,
} from '~~/server/db/clinic';
import type { SendEmailJob, SendEmailResult } from '~~/server/types/bullmq';

const queue = useQueue<SendEmailJob, SendEmailResult>('send-email');

const formatAppointmentDateTime = (date: Date) => formatDateTime(date);
const formatAppointmentType = (type: 'consultation' | 'procedure') =>
	type === 'procedure' ? 'Zabieg' : 'Konsultacja';
const formatVisitMode = (isOnline: boolean) =>
	isOnline ? 'Online' : 'Stacjonarna';

const payloadSchema = z.object({
	patientId: z.string(),
	doctorId: z.string(),
	datetime: z
		.string()
		.refine((value) => !Number.isNaN(new Date(value).getTime()), {
			message: 'Invalid datetime',
		}),
	type: z.enum(['consultation', 'procedure']).default('consultation'),
	isOnline: z.boolean().default(false),
	notes: z.string().max(500).optional(),
});

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		appointments: ['create'],
	});

	const payload = payloadSchema.parse(await readBody(event));
	const { patientId, doctorId, datetime, type, isOnline, notes } = payload;

	let patientUser: typeof authUser.$inferSelect | undefined;
	let patientRow: typeof patients.$inferSelect | undefined;
	let doctorRow: typeof doctors.$inferSelect | undefined;
	let doctorUser: typeof authUser.$inferSelect | undefined;

	try {
		[patientUser] = await useDb()
			.select()
			.from(authUser)
			.where(eq(authUser.id, patientId))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!patientUser)
		throw createError({
			statusCode: 404,
			message: 'Pacjent nie został znaleziony',
		});
	if (patientUser.role !== 'user')
		throw createError({
			statusCode: 400,
			message: 'Wybrany użytkownik nie jest pacjentem',
		});

	try {
		[patientRow] = await useDb()
			.select()
			.from(patients)
			.where(eq(patients.userId, patientId))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!patientRow)
		throw createError({
			statusCode: 404,
			message: 'Profil pacjenta nie został znaleziony',
		});

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
		throw createError({
			statusCode: 404,
			message: 'Lekarz nie został znaleziony',
		});

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
			message: 'Konto lekarza nie zostało znalezione',
		});
	if (doctorUser.banned) {
		throw createError({
			statusCode: 400,
			message: 'Lekarz nie przyjmuje nowych wizyt.',
		});
	}

	const slotStart = new Date(datetime);
	if (Number.isNaN(slotStart.getTime()))
		throw createError({ statusCode: 400, message: 'Nieprawidłowa data' });

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
			message: 'Wybrany termin jest poza dostępnością lekarza',
		});

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
					message: 'Ktoś właśnie zarezerwował ten termin',
				});
			}

			[created] = await tx
				.insert(appointments)
				.values({
					patientId,
					doctorId,
					datetime: slotStart,
					status: 'scheduled',
					type,
					isOnline,
					notes,
					roomRoomId: assignedRoomId,
				})
				.returning();
		});
	} catch (error: any) {
		if (error?.statusCode === 409) throw error;
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!created) {
		throw createError({
			statusCode: 500,
			message: 'Nie udało się utworzyć wizyty',
		});
	}

	const html = await renderEmailComponent(
		'AppointmentBooked',
		{
			patientName: patientUser.name,
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
		to: patientUser.email,
		subject: 'Potwierdzenie zapisu na wizytę',
		html,
	});

	return {
		appointmentId: created.appointmentId,
		status: created.status,
		type: created.type,
	};
});
