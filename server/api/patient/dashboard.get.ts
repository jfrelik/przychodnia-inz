import { and, asc, desc, eq, gte, inArray, isNotNull } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { user as authUser } from '~~/server/db/auth';
import {
	appointments,
	medicalRecords,
	medications,
	prescriptions,
	room,
	testResults,
} from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	const session = await requireSessionWithPermissions(event, {
		appointments: ['list'],
		prescriptions: ['list'],
		testResults: ['list'],
		medicalRecords: ['read'],
	});

	const now = new Date();

	let upcomingVisits: Array<{
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
		upcomingVisits = await useDb()
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
			.where(
				and(
					eq(appointments.patientId, session.user.id),
					eq(appointments.status, 'scheduled'),
					gte(appointments.datetime, now)
				)
			)
			.orderBy(asc(appointments.datetime))
			.limit(2);
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	let recentResults: Array<{
		testId: number;
		testType: string;
		result: string;
		testDate: string;
	}> = [];
	try {
		const [record] = await useDb()
			.select()
			.from(medicalRecords)
			.where(eq(medicalRecords.patientId, session.user.id))
			.limit(1);
		if (record) {
			recentResults = await useDb()
				.select({
					testId: testResults.testId,
					testType: testResults.testType,
					result: testResults.result,
					testDate: testResults.testDate,
				})
				.from(testResults)
				.where(eq(testResults.recordId, record.recordId))
				.orderBy(desc(testResults.testDate))
				.limit(2);
		}
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	let prescriptionRows: Array<{
		prescriptionId: number | null;
		issuedAt: Date | null;
		status: 'active' | 'fulfilled' | null;
		appointmentId: number | null;
		appointmentDatetime: Date | null;
		doctorId: string | null;
		doctorName: string | null;
		doctorEmail: string | null;
	}>;
	try {
		prescriptionRows = await useDb()
			.select({
				prescriptionId: prescriptions.prescriptionId,
				issuedAt: prescriptions.issuedAt,
				status: prescriptions.status,
				appointmentId: appointments.appointmentId,
				appointmentDatetime: appointments.datetime,
				doctorId: appointments.doctorId,
				doctorName: authUser.name,
				doctorEmail: authUser.email,
			})
			.from(appointments)
			.leftJoin(
				prescriptions,
				and(
					eq(appointments.prescriptionId, prescriptions.prescriptionId),
					eq(prescriptions.status, 'active')
				)
			)
			.leftJoin(authUser, eq(appointments.doctorId, authUser.id))
			.where(
				and(
					eq(appointments.patientId, session.user.id),
					isNotNull(appointments.prescriptionId),
					isNotNull(prescriptions.prescriptionId)
				)
			)
			.orderBy(desc(prescriptions.issuedAt));
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	const uniquePrescriptions = new Map<
		number,
		(typeof prescriptionRows)[number]
	>();
	for (const row of prescriptionRows) {
		if (row.prescriptionId == null) continue;
		if (!uniquePrescriptions.has(row.prescriptionId))
			uniquePrescriptions.set(row.prescriptionId, row);
		if (uniquePrescriptions.size >= 4) break;
	}

	const prescriptionIds = Array.from(uniquePrescriptions.keys());
	let medicationsRows: Array<{ prescriptionId: number; description: string }> =
		[];
	if (prescriptionIds.length) {
		try {
			medicationsRows = await useDb()
				.select({
					prescriptionId: medications.prescriptionId,
					description: medications.description,
				})
				.from(medications)
				.where(inArray(medications.prescriptionId, prescriptionIds))
				.orderBy(asc(medications.createdAt));
		} catch (error) {
			const { message } = getDbErrorMessage(error);
			throw createError({ statusCode: 500, message });
		}
	}

	const medicationsByPrescriptionId = new Map<number, string[]>();
	for (const item of medicationsRows) {
		const current = medicationsByPrescriptionId.get(item.prescriptionId) ?? [];
		current.push(item.description);
		medicationsByPrescriptionId.set(item.prescriptionId, current);
	}

	const activePrescriptions = Array.from(uniquePrescriptions.values()).map(
		(row) => ({
			...row,
			medications: row.prescriptionId
				? (medicationsByPrescriptionId.get(row.prescriptionId) ?? [])
				: [],
		})
	);

	return {
		upcomingVisits,
		recentResults,
		activePrescriptions,
	};
});
