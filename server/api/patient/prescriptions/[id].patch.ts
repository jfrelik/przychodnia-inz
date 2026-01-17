import { and, eq } from 'drizzle-orm';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod';
import { appointments, prescriptions } from '~~/server/db/clinic';

const payloadSchema = z.object({
	status: z.literal('fulfilled'),
});

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		prescriptions: ['update'],
	});

	const prescriptionId = Number(event.context.params?.id);
	if (!Number.isFinite(prescriptionId))
		throw createError({
			statusCode: 400,
			message: 'Invalid prescription id',
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

	let prescriptionRow:
		| { prescriptionId: number | null; status: 'active' | 'fulfilled' | null }
		| undefined;
	try {
		[prescriptionRow] = await useDb()
			.select({
				prescriptionId: prescriptions.prescriptionId,
				status: prescriptions.status,
			})
			.from(appointments)
			.leftJoin(
				prescriptions,
				eq(appointments.prescriptionId, prescriptions.prescriptionId)
			)
			.where(
				and(
					eq(appointments.patientId, session.user.id),
					eq(prescriptions.prescriptionId, prescriptionId)
				)
			)
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!prescriptionRow)
		throw createError({
			statusCode: 404,
			message: 'Prescription not found',
		});

	if (prescriptionRow.status !== 'active')
		throw createError({
			statusCode: 400,
			message: 'Only active prescriptions can be fulfilled',
		});

	let updated:
		| { prescriptionId: number | null; status: 'active' | 'fulfilled' | null }
		| undefined;
	try {
		[updated] = await useDb()
			.update(prescriptions)
			.set({ status: payload.data.status })
			.where(eq(prescriptions.prescriptionId, prescriptionId))
			.returning({
				prescriptionId: prescriptions.prescriptionId,
				status: prescriptions.status,
			});
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	return updated;
});
