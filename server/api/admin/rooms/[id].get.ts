import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import {
	room,
	roomSpecializations,
	specializations,
} from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	await requireSessionWithPermissions(event, {
		rooms: ['read'],
	});

	const roomId = Number(event.context.params?.id);

	if (!roomId || Number.isNaN(roomId)) {
		throw createError({
			statusCode: 400,
			message: 'Identyfikator gabinetu jest wymagany.',
		});
	}

	let current: { roomId: number; number: number } | undefined;

	try {
		[current] = await useDb()
			.select({
				roomId: room.roomId,
				number: room.number,
			})
			.from(room)
			.where(eq(room.roomId, roomId))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}

	if (!current) {
		throw createError({
			statusCode: 404,
			message: 'Gabinet nie został znaleziony.',
		});
	}

	let specializationRows: {
		specializationId: number;
		specializationName: string | null;
	}[] = [];

	try {
		specializationRows = await useDb()
			.select({
				specializationId: roomSpecializations.specializationId,
				specializationName: specializations.name,
			})
			.from(roomSpecializations)
			.leftJoin(
				specializations,
				eq(roomSpecializations.specializationId, specializations.id)
			)
			.where(eq(roomSpecializations.roomId, roomId));
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}

	const specializationIds = specializationRows.map(
		(row) => row.specializationId
	);
	const specializationNames = specializationRows
		.map((row) => row.specializationName)
		.filter((name): name is string => !!name);

	return {
		...current,
		specializationIds,
		specializationNames,
	};
});
