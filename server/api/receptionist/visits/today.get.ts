import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { createError, defineEventHandler } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import { appointments, doctors, patients, room } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		appointments: ['list'],
	});

	const { start, end } = todayRange();

	const patientUser = alias(authUser, 'patient_user');
	const doctorUser = alias(authUser, 'doctor_user');

	try {
		const rows = await useDb()
			.select({
				appointmentId: appointments.appointmentId,
				datetime: appointments.datetime,
				status: appointments.status,
				isOnline: appointments.isOnline,
				type: appointments.type,
				patientName: patientUser.name,
				patientEmail: patientUser.email,
				doctorName: doctorUser.name,
				doctorEmail: doctorUser.email,
				roomNumber: room.number,
			})
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.userId))
			.leftJoin(doctors, eq(appointments.doctorId, doctors.userId))
			.leftJoin(patientUser, eq(appointments.patientId, patientUser.id))
			.leftJoin(doctorUser, eq(appointments.doctorId, doctorUser.id))
			.leftJoin(room, eq(appointments.roomRoomId, room.roomId))
			.where(
				and(
					inArray(appointments.status, ['scheduled', 'checked_in']),
					gte(appointments.datetime, start),
					lte(appointments.datetime, end)
				)
			)
			.orderBy(asc(appointments.datetime));

		return rows.map((row) => ({
			appointmentId: row.appointmentId,
			datetime: row.datetime,
			status: row.status as 'scheduled' | 'checked_in',
			isOnline: row.isOnline ?? false,
			type: row.type as 'consultation' | 'procedure',
			patientName: row.patientName ?? 'Pacjent',
			patientEmail: row.patientEmail ?? null,
			doctorName: row.doctorName ?? 'Lekarz',
			doctorEmail: row.doctorEmail ?? null,
			roomNumber:
				row.roomNumber === undefined || row.roomNumber === null
					? null
					: Number(row.roomNumber),
		}));
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}
});
