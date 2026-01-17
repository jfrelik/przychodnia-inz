import { desc, eq } from 'drizzle-orm';
import { createError, defineEventHandler, getRouterParam } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import {
	appointments,
	doctors,
	room,
	specializations,
} from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		appointments: ['list'],
	});

	const patientId = getRouterParam(event, 'patientId');
	if (!patientId) {
		throw createError({ statusCode: 400, message: 'Patient ID is required' });
	}

	try {
		const rows = await useDb()
			.select({
				appointmentId: appointments.appointmentId,
				datetime: appointments.datetime,
				status: appointments.status,
				type: appointments.type,
				isOnline: appointments.isOnline,
				notes: appointments.notes,
				doctorId: appointments.doctorId,
				doctorName: authUser.name,
				doctorEmail: authUser.email,
				specializationId: doctors.specializationId,
				specializationName: specializations.name,
				roomId: room.roomId,
				roomNumber: room.number,
			})
			.from(appointments)
			.leftJoin(authUser, eq(appointments.doctorId, authUser.id))
			.leftJoin(doctors, eq(appointments.doctorId, doctors.userId))
			.leftJoin(
				specializations,
				eq(doctors.specializationId, specializations.id)
			)
			.leftJoin(room, eq(appointments.roomRoomId, room.roomId))
			.where(eq(appointments.patientId, patientId))
			.orderBy(desc(appointments.datetime));

		return rows;
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}
});
