import { count, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import { appointments, room } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				rooms: ['delete'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const roomId = Number(event.context.params?.id);

	if (!roomId || Number.isNaN(roomId)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Identyfikator gabinetu jest wymagany.',
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
			statusMessage: 'Gabinet nie został znaleziony.',
		});
	}

	let assigned: { total: number } | undefined;

	try {
		[assigned] = await useDb()
			.select({ total: count(appointments.appointmentId) })
			.from(appointments)
			.where(eq(appointments.roomRoomId, roomId));
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}

	if (Number(assigned?.total ?? 0) > 0) {
		throw createError({
			statusCode: 400,
			statusMessage:
				'Nie można usunąć gabinetu, do którego przypisane są wizyty.',
		});
	}

	try {
		await useDb().delete(room).where(eq(room.roomId, roomId));

		await useAuditLog(
			event,
			session.user.id,
			`Usunięto gabinet numer ${current.number}.`
		);

		return {
			status: 'ok',
		};
	} catch (error) {
		const { message } = getDbErrorMessage(error);

		throw createError({
			statusCode: 500,
			message,
		});
	}
});
