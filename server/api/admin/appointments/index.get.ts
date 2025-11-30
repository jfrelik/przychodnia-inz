import { asc, eq } from 'drizzle-orm';
import { user } from '~~/server/db/auth';
import { appointments, patients, room } from '~~/server/db/clinic';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

export default withAuth(async () => {
	const doctorUser = user;

	const rows = await db
		.select({
			appointmentId: appointments.appointmentId,
			datetime: appointments.datetime,
			status: appointments.status,
			notes: appointments.notes,
			patientId: appointments.patientId,
			patientFirstName: patients.firstName,
			patientLastName: patients.lastName,
			patientPesel: patients.pesel,
			doctorId: appointments.doctorId,
			doctorName: doctorUser.name,
			roomId: room.roomId,
			roomNumber: room.number,
		})
		.from(appointments)
		.leftJoin(patients, eq(appointments.patientId, patients.userId))
		.leftJoin(doctorUser, eq(appointments.doctorId, doctorUser.id))
		.leftJoin(room, eq(appointments.roomRoomId, room.roomId))
		.orderBy(asc(appointments.datetime));

	return rows;
}, ['admin']);
