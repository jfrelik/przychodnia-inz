import { and, eq, gte, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { user as authUser } from '~~/server/db/auth';
import { appointments, patients } from '~~/server/db/clinic';
import type { SendEmailJob, SendEmailResult } from '~~/server/types/bullmq';

export default defineTask({
	meta: {
		name: 'visit:reminder',
		description: 'Sends visit reminder emails to patients.',
	},
	async run() {
		const queue = useQueue<SendEmailJob, SendEmailResult>('send-email');

		const formatAppointmentType = (type: 'consultation' | 'procedure') =>
			type === 'procedure' ? 'Zabieg' : 'Konsultacja';
		const formatVisitMode = (isOnline: boolean) =>
			isOnline ? 'Online' : 'Stacjonarna';

		const buildPatientName = (
			firstName?: string | null,
			lastName?: string | null,
			fallback?: string | null
		) => {
			const parts = [firstName, lastName].filter(Boolean).join(' ').trim();
			if (parts.length > 0) return parts;

			if (fallback && fallback.trim().length > 0) return fallback;

			return 'Pacjent';
		};

		const { start: startOfDay, end: endOfDay } = todayRange();

		const patientUser = alias(authUser, 'patient_user');
		const doctorUser = alias(authUser, 'doctor_user');

		let rows: Array<{
			appointmentId: number;
			datetime: Date;
			isOnline: boolean;
			type: string;
			patientName: string | null;
			patientEmail: string | null;
			patientFirstName: string | null;
			patientLastName: string | null;
			doctorName: string | null;
		}> = [];

		try {
			rows = await useDb()
				.select({
					appointmentId: appointments.appointmentId,
					datetime: appointments.datetime,
					isOnline: appointments.isOnline,
					type: appointments.type,
					patientFirstName: patients.firstName,
					patientLastName: patients.lastName,
					patientName: patientUser.name,
					patientEmail: patientUser.email,
					doctorName: doctorUser.name,
				})
				.from(appointments)
				.leftJoin(patients, eq(appointments.patientId, patients.userId))
				.leftJoin(patientUser, eq(appointments.patientId, patientUser.id))
				.leftJoin(doctorUser, eq(appointments.doctorId, doctorUser.id))
				.where(
					and(
						eq(appointments.status, 'scheduled'),
						gte(appointments.datetime, startOfDay),
						lte(appointments.datetime, endOfDay)
					)
				);
		} catch (error) {
			const { message } = getDbErrorMessage(error);
			throw new Error(message);
		}

		let queued = 0;

		for (const row of rows) {
			if (!row.patientEmail) continue;

			const html = await renderEmailComponent(
				'AppointmentReminder',
				{
					patientName: buildPatientName(
						row.patientFirstName,
						row.patientLastName,
						row.patientName
					),
					doctorName: row.doctorName ?? 'Lekarz',
					appointmentDateTime: formatDateTime(row.datetime),
					visitMode: formatVisitMode(row.isOnline),
					appointmentType: formatAppointmentType(
						row.type as 'consultation' | 'procedure'
					),
				},
				{ pretty: true }
			);

			await queue.add('appointment reminder', {
				to: row.patientEmail,
				subject: 'Przypomnienie o wizycie',
				html,
			});

			queued += 1;
		}

		return { result: 'Success', queued, total: rows.length };
	},
});
