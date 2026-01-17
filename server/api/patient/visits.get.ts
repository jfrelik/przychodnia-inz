import { and, asc, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import { appointments, room } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		appointments: ['list'],
	});

	let rows: Array<{
		appointmentId: number;
		datetime: Date;
		status: string;
		notes: string | null;
		doctorId: string;
		doctorName: string | null;
		doctorEmail: string | null;
		roomId: number | null;
		roomNumber: number | null;
	}>;
	try {
		rows = await useDb()
			.select({
				appointmentId: appointments.appointmentId,
				datetime: appointments.datetime,
				status: appointments.status,
				notes: appointments.notes,
				doctorId: appointments.doctorId,
				doctorName: authUser.name,
				doctorEmail: authUser.email,
				roomId: room.roomId,
				roomNumber: room.number,
			})
			.from(appointments)
			.leftJoin(authUser, eq(appointments.doctorId, authUser.id))
			.leftJoin(room, eq(appointments.roomRoomId, room.roomId))
			.where(and(eq(appointments.patientId, session.user.id)))
			.orderBy(asc(appointments.datetime));
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	return rows;
});
