import { asc, count, eq } from 'drizzle-orm';
import { appointments, room } from '~~/server/db/clinic';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

export default withAuth(async () => {
	const rows = await db
		.select({
			roomId: room.roomId,
			number: room.number,
			appointmentCount: count(appointments.appointmentId),
		})
		.from(room)
		.leftJoin(appointments, eq(appointments.roomRoomId, room.roomId))
		.groupBy(room.roomId)
		.orderBy(asc(room.number));

	return rows.map((row) => ({
		...row,
		appointmentCount: Number(row.appointmentCount ?? 0),
	}));
}, ['admin']);

defineRouteMeta({
	openAPI: {
		operationId: 'Admin_ListRooms',
		tags: ['Admin'],
		summary: 'List rooms',
		description: 'Returns all rooms with appointment counts.',
		responses: {
			200: { description: 'OK' },
			401: { description: 'Unauthorized' },
			403: { description: 'Forbidden' },
		},
	},
});
