import { betterAuth } from 'better-auth';
import { localization } from 'better-auth-localization';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { account, session, user, verification } from '../server/db/schema';
import db from '../server/util/db';
import { ac, roles } from './permissions';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user,
			account,
			session,
			verification,
		},
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url, token }, request) => {
			const { sendMail } = useNodeMailer();

			const html = await renderEmailComponent(
				'EmailConfirm',
				{
					userName: user.name,
					confirmationUrl: url,
				},
				{
					pretty: true,
				}
			);

			await sendMail({
				to: user.email,
				subject: 'Zweryfikuj swój adres e-mail',
				html,
			});
		},
	},
	plugins: [
		admin({
			ac,
			roles,
		}),
		localization({
			defaultLocale: 'pl-PL',
			fallbackLocale: 'default',
		}),
	],
});
