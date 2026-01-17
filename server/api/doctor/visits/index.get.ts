import { and, asc, desc, eq, gte, lte, ne } from 'drizzle-orm';
import { createError, defineEventHandler, getQuery } from 'h3';
import { z } from 'zod';
import { user as authUser } from '~~/server/db/auth';
import { appointments, doctors, patients, room } from '~~/server/db/clinic';

const buildPatientName = (
	firstName?: string | null,
	lastName?: string | null,
	fallback?: string | null
) => {
	const parts = [firstName, lastName].filter(Boolean).join(' ').trim();
	if (parts.length > 0) return parts;

	if (fallback && fallback.trim().length > 0) return fallback;

	return null;
};

const querySchema = z
	.object({
		date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Data musi być w formacie YYYY-MM-DD')
			.optional(),
	})
	.strict();

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		appointments: ['list'],
		users: ['read'],
	});

	const parsedQuery = querySchema.safeParse(getQuery(event));

	if (parsedQuery.error) {
		const flat = z.flattenError(parsedQuery.error);
		const firstFieldError = Object.values(flat.fieldErrors)
			.flat()
			.find((m): m is string => !!m);

		throw createError({
			statusCode: 400,
			message: firstFieldError ?? 'Nieprawidłowe dane wejściowe.',
		});
	}

	const query = parsedQuery.data;

	let doctorRow: { userId: string } | undefined;
	try {
		[doctorRow] = await useDb()
			.select({ userId: doctors.userId })
			.from(doctors)
			.where(eq(doctors.userId, session.user.id))
			.limit(1);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	if (!doctorRow) {
		throw createError({
			statusCode: 404,
			message: 'Nie znaleziono profilu lekarza.',
		});
	}

	const conditions = [
		eq(appointments.doctorId, doctorRow.userId),
		ne(appointments.status, 'canceled'),
	];

	if (query.date) {
		const startOfDay = new Date(`${query.date}T00:00:00`);
		const endOfDay = new Date(`${query.date}T23:59:59.999`);
		conditions.push(gte(appointments.datetime, startOfDay));
		conditions.push(lte(appointments.datetime, endOfDay));
	}

	let rows: Array<{
		appointmentId: number;
		datetime: Date;
		status: string;
		notes: string | null;
		patientId: string;
		patientFirstName: string | null;
		patientLastName: string | null;
		patientAuthName: string | null;
		patientEmail: string | null;
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
				patientId: appointments.patientId,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientAuthName: authUser.name,
				patientEmail: authUser.email,
				roomId: room.roomId,
				roomNumber: room.number,
			})
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.userId))
			.leftJoin(authUser, eq(appointments.patientId, authUser.id))
			.leftJoin(room, eq(appointments.roomRoomId, room.roomId))
			.where(and(...conditions))
			.orderBy(
				query.date ? asc(appointments.datetime) : desc(appointments.datetime)
			);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	return rows.map((row) => ({
		appointmentId: row.appointmentId,
		datetime: row.datetime,
		status: row.status,
		notes: row.notes,
		patientId: row.patientId,
		patientName: buildPatientName(
			row.patientFirstName,
			row.patientLastName,
			row.patientAuthName
		),
		patientEmail: row.patientEmail ?? null,
		roomId: row.roomId ?? null,
		roomNumber:
			row.roomNumber === undefined || row.roomNumber === null
				? null
				: String(row.roomNumber),
	}));
});
