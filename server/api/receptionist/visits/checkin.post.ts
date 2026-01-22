import { and, eq } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { appointments, patients } from '~~/server/db/clinic';
import { peselHmac } from '~~/server/utils/pesel';

const payloadSchema = z
	.object({
		appointmentId: z.number().int().positive(),
		pesel: z
			.string()
			.regex(/^\d{11}$/, 'PESEL musi mieć 11 cyfr')
			.optional(),
	})
	.strict();

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		appointments: ['update'],
	});

	const payload = payloadSchema.parse(await readBody(event));
	const appointmentId = payload.appointmentId;

	let row:
		| {
				appointmentId: number;
				status: string;
				datetime: Date;
				doctorId: string;
				patientId: string | null;
				peselHmac: string | null;
				isOnline: boolean;
		  }
		| undefined;

	try {
		[row] = await useDb()
			.select({
				appointmentId: appointments.appointmentId,
				status: appointments.status,
				datetime: appointments.datetime,
				doctorId: appointments.doctorId,
				patientId: appointments.patientId,
				peselHmac: patients.peselHmac,
				isOnline: appointments.isOnline,
			})
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.userId))
			.where(eq(appointments.appointmentId, appointmentId))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!row)
		throw createError({
			statusCode: 404,
			message: 'Wizyta nie została znaleziona',
		});

	if (!row.patientId || !row.peselHmac)
		throw createError({
			statusCode: 400,
			message: 'Brak danych pacjenta dla wizyty',
		});

	if (row.status !== 'scheduled' && row.status !== 'checked_in') {
		throw createError({
			statusCode: 400,
			message: 'Wizyta nie może zostać zameldowana',
		});
	}

	// PESEL verification not required for telemedicine visits
	if (!row.isOnline) {
		if (!payload.pesel) {
			throw createError({
				statusCode: 400,
				message: 'PESEL jest wymagany dla wizyt stacjonarnych',
			});
		}

		const incomingHmac = peselHmac(payload.pesel);

		if (row.peselHmac !== incomingHmac) {
			throw createError({
				statusCode: 400,
				message: 'PESEL niezgodny z danymi pacjenta',
			});
		}
	}

	if (row.status === 'checked_in') {
		return {
			status: 'ok',
			appointmentId: row.appointmentId,
			visitStatus: row.status,
		};
	}

	try {
		const [updated] = await useDb()
			.update(appointments)
			.set({ status: 'checked_in' })
			.where(
				and(
					eq(appointments.appointmentId, appointmentId),
					eq(appointments.patientId, row.patientId)
				)
			)
			.returning({
				appointmentId: appointments.appointmentId,
				status: appointments.status,
				datetime: appointments.datetime,
				doctorId: appointments.doctorId,
				patientId: appointments.patientId,
			});

		if (!updated) {
			throw createError({
				statusCode: 500,
				message: 'Nie udało się zaktualizować wizyty',
			});
		}

		return {
			status: 'ok',
			appointmentId: updated.appointmentId,
			visitStatus: updated.status,
		};
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}
});
