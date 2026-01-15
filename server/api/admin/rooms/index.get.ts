import { asc, count, eq, isNotNull } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import {
	appointments,
	room,
	roomSpecializations,
	specializations,
} from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		rooms: ['list'],
	});

	try {
		const roomsList = await useDb()
			.select({
				roomId: room.roomId,
				number: room.number,
			})
			.from(room)
			.orderBy(asc(room.number));

		const appointmentCounts = await useDb()
			.select({
				roomId: appointments.roomRoomId,
				appointmentCount: count(appointments.appointmentId),
			})
			.from(appointments)
			.where(isNotNull(appointments.roomRoomId))
			.groupBy(appointments.roomRoomId);

		const roomSpecializationRows = await useDb()
			.select({
				roomId: roomSpecializations.roomId,
				specializationId: roomSpecializations.specializationId,
				specializationName: specializations.name,
			})
			.from(roomSpecializations)
			.leftJoin(
				specializations,
				eq(roomSpecializations.specializationId, specializations.id)
			);

		const appointmentCountMap = new Map(
			appointmentCounts.map((row) => [row.roomId, Number(row.appointmentCount)])
		);
		const specializationIdsMap = new Map<number, number[]>();
		const specializationNamesMap = new Map<number, string[]>();

		for (const row of roomSpecializationRows) {
			const roomId = row.roomId;
			if (!specializationIdsMap.has(roomId)) {
				specializationIdsMap.set(roomId, []);
				specializationNamesMap.set(roomId, []);
			}
			specializationIdsMap.get(roomId)?.push(row.specializationId);
			if (row.specializationName) {
				specializationNamesMap.get(roomId)?.push(row.specializationName);
			}
		}

		return roomsList.map((roomRow) => ({
			roomId: roomRow.roomId,
			number: roomRow.number,
			appointmentCount: appointmentCountMap.get(roomRow.roomId) ?? 0,
			specializationIds: specializationIdsMap.get(roomRow.roomId) ?? [],
			specializationNames: specializationNamesMap.get(roomRow.roomId) ?? [],
		}));
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
