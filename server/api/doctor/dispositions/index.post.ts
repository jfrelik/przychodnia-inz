import consola from 'consola';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import {
	createError,
	defineEventHandler,
	readBody,
	setResponseStatus,
} from 'h3';
import { z } from 'zod';
import { auth } from '~~/lib/auth';
import { availability } from '~~/server/db/clinic';
import { recordAuditLog } from '~~/server/util/audit';
import db from '~~/server/util/db';

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
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
	}

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				availability: ['create'],
			},
		},
	});

	if (!hasPermission.success) {
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
	}

	const body = await readBody(event);
	const payload = payloadSchema.parse(body);

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	for (const day of payload.days) {
		const parsedDay = new Date(`${day.date}T00:00:00`);
		if (Number.isNaN(parsedDay.getTime())) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Data jest nieprawidłowa',
			});
		}

		if (parsedDay.getTime() < today.getTime()) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Data nie może być w przeszłości',
			});
		}

		if (day.date < payload.periodStart || day.date > payload.periodEnd) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Data musi być w zakresie wybranego okresu',
			});
		}
	}

	let insertedCount = 0;

	try {
		await db.transaction(async (tx) => {
			// Collect unique dates for deletion
			const uniqueDates = [...new Set(payload.days.map((item) => item.date))];

			for (const date of uniqueDates) {
				await tx
					.delete(availability)
					.where(
						and(
							eq(availability.doctorUserId, session.user.id),
							eq(availability.day, date)
						)
					);
			}

			const bulkValues = payload.days.map((item) => ({
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
		consola.error({
			operation: 'DoctorBulkDispositions',
			doctorId: session.user.id,
			periodStart: payload.periodStart,
			periodEnd: payload.periodEnd,
			error,
		});
		throw error;
	}

	await recordAuditLog(
		event,
		session.user.id,
		`Zapisano dyspozycje na okres ${payload.periodStart} - ${payload.periodEnd} (${insertedCount} slotów)`
	);

	setResponseStatus(event, 200);
	return { status: 'ok', count: insertedCount };
});
