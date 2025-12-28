import { count, eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { auth } from '~~/lib/auth';
import { user } from '~~/server/db/auth';

export default defineNitroPlugin(async () => {
	const runtimeConfig = useRuntimeConfig();

	// Migrate db first
	await useMigrate();

	const [{ admins }] = await useDb()
		.select({ admins: count() })
		.from(user)
		.where(eq(user.role, 'admin'));
	if (admins > 0) return;

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
});
