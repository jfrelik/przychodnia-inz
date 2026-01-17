import consola from 'consola';
import { count, eq, inArray } from 'drizzle-orm';
import crypto from 'node:crypto';
import { auth } from '~~/lib/auth';
import { account, session, user, verification } from '~~/server/db/auth';
import {
	appointments,
	availability,
	doctors,
	logs,
	medicalRecords,
	medications,
	patients,
	prescriptions,
	receptionists,
	recommendations,
	room,
	roomSpecializations,
	specializations,
	testResults,
} from '~~/server/db/clinic';

const getRequiredEnv = (key: string, fallback?: string) => {
	const value = process.env[key] ?? fallback;
	if (!value) {
		throw new Error(`Missing required env variable: ${key}`);
	}
	return value;
};

const upsertUserWithRole = async (payload: {
	email: string;
	password: string;
	name: string;
	role: string;
}) => {
	const existing = await useDb()
		.select({ id: user.id, emailVerified: user.emailVerified, role: user.role })
		.from(user)
		.where(eq(user.email, payload.email))
		.limit(1);

	if (existing.length) {
		const existingUser = existing[0];
		if (existingUser.role !== payload.role) {
			await useDb()
				.update(user)
				.set({ role: payload.role })
				.where(eq(user.id, existingUser.id));
		}
		if (!existingUser.emailVerified) {
			await useDb()
				.update(user)
				.set({ emailVerified: true })
				.where(eq(user.id, existingUser.id));
		}
		return existingUser.id;
	}

	const { user: created } = await auth.api.createUser({
		body: {
			email: payload.email,
			password: payload.password,
			name: payload.name,
			role: payload.role === 'admin' ? 'admin' : 'user',
		},
	});

	await useDb()
		.update(user)
		.set({ emailVerified: true, role: payload.role })
		.where(eq(user.id, created.id));

	return created.id;
};

const markEmailsVerified = async (emails: string[]) => {
	if (!emails.length) return;
	await useDb()
		.update(user)
		.set({ emailVerified: true })
		.where(inArray(user.email, emails));
};

const clearDatabase = async () => {
	const db = useDb();
	await db.delete(prescriptions);
	await db.delete(recommendations);
	await db.delete(testResults);
	await db.delete(medicalRecords);
	await db.delete(appointments);
	await db.delete(availability);
	await db.delete(logs);
	await db.delete(roomSpecializations);
	await db.delete(room);
	await db.delete(doctors);
	await db.delete(receptionists);
	await db.delete(patients);
	await db.delete(specializations);
	await db.delete(medications);
	await db.delete(session);
	await db.delete(account);
	await db.delete(verification);
	await db.delete(user);
};

export default defineNitroPlugin(async () => {
	const runtimeConfig = useRuntimeConfig();
	const demoEnabled = ['1', 'true', 'yes', 'on'].includes(
		String(process.env.DEMO ?? 'false').toLowerCase()
	);

	// Migrate db first
	await useMigrate();

	const [{ usersCount }] = await useDb()
		.select({ usersCount: count() })
		.from(user);

	// In demo mode, clear DB if users exist to recreate demo accounts
	if (demoEnabled && usersCount > 0) {
		consola.warn('Demo mode enabled: clearing database...');
		await clearDatabase();
	} else if (usersCount > 0) {
		return;
	}

	if (!demoEnabled) {
		const password = crypto.randomBytes(16).toString('hex');
		const { user: created } = await auth.api.createUser({
			body: {
				email: runtimeConfig.defaultAdminEmail,
				password,
				name: 'Administrator',
				role: 'admin',
			},
		});

		await useDb()
			.update(user)
			.set({ emailVerified: true })
			.where(eq(user.id, created.id));

		console.info(`Stworzono ${created.email}, hasło: ${password}`);
		return;
	}

	// DEMO mode
	const adminEmail = getRequiredEnv(
		'DEMO_ADMIN_EMAIL',
		runtimeConfig.defaultAdminEmail
	);
	const adminPassword = getRequiredEnv('DEMO_ADMIN_PASSWORD');
	const adminName = process.env.DEMO_ADMIN_NAME ?? 'Demo Administrator';

	const doctorEmail = getRequiredEnv('DEMO_DOCTOR_EMAIL');
	const doctorPassword = getRequiredEnv('DEMO_DOCTOR_PASSWORD');
	const doctorName = process.env.DEMO_DOCTOR_NAME ?? 'Demo Lekarz';
	const doctorLicense = getRequiredEnv('DEMO_DOCTOR_LICENSE');

	const receptionistEmail = getRequiredEnv('DEMO_RECEPTIONIST_EMAIL');
	const receptionistPassword = getRequiredEnv('DEMO_RECEPTIONIST_PASSWORD');
	const receptionistName =
		process.env.DEMO_RECEPTIONIST_NAME ?? 'Demo Recepcjonista';

	// Admin
	await upsertUserWithRole({
		email: adminEmail,
		password: adminPassword,
		name: adminName,
		role: 'admin',
	});

	// Doctor
	const doctorUserId = await upsertUserWithRole({
		email: doctorEmail,
		password: doctorPassword,
		name: doctorName,
		role: 'doctor',
	});
	const existingDoctor = await useDb()
		.select({ userId: doctors.userId })
		.from(doctors)
		.where(eq(doctors.userId, doctorUserId));
	if (!existingDoctor.length) {
		await useDb().insert(doctors).values({
			userId: doctorUserId,
			licenseNumber: doctorLicense,
		});
	}

	// Receptionist
	const receptionistUserId = await upsertUserWithRole({
		email: receptionistEmail,
		password: receptionistPassword,
		name: receptionistName,
		role: 'receptionist',
	});
	const existingReceptionist = await useDb()
		.select({ userId: receptionists.userId })
		.from(receptionists)
		.where(eq(receptionists.userId, receptionistUserId));
	if (!existingReceptionist.length) {
		await useDb().insert(receptionists).values({ userId: receptionistUserId });
	}

	await markEmailsVerified([adminEmail, doctorEmail, receptionistEmail]);

	await useDb()
		.insert(specializations)
		.values([
			{
				name: 'Pediatria',
				description: 'Opieka medyczna dla dzieci i młodzieży',
				icon: 'lucide:baby',
			},
			{
				name: 'Kardiologia',
				description: 'Diagnostyka i leczenie chorób serca i układu krążenia',
				icon: 'lucide:heart-pulse',
			},
			{
				name: 'Dermatologia',
				description: 'Leczenie chorób skóry, włosów i paznokci',
				icon: 'lucide:scan-face',
			},
		]);

	consola.success('DEMO data inserted.');
});
