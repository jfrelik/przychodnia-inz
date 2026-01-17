import { betterAuth } from 'better-auth';
import { localization } from 'better-auth-localization';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import 'dotenv/config';
import { account, session, user, verification } from '../server/db/schema';
import type { SendEmailJob, SendEmailResult } from '../server/types/bullmq';
import { ac, roles } from './permissions';

const queue = useQueue<SendEmailJob, SendEmailResult>('send-email');
const db = useDb();

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
		sendResetPassword: async ({ user, url }, _request) => {
			const html = await renderEmailComponent(
				'PasswordReset',
				{
					userName: user.name,
					resetUrl: url,
				},
				{
					pretty: true,
				}
			);

			await queue.add('email reset', {
				to: user.email,
				subject: 'Resetowanie hasła',
				html,
			});
		},
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, token }, _request) => {
			const betterAuthUrl = process.env.BETTER_AUTH_URL;

			const html = await renderEmailComponent(
				'EmailConfirm',
				{
					userName: user.name,
					confirmationUrl: `${betterAuthUrl}/verify-email?token=${token}`,
				},
				{
					pretty: true,
				}
			);

			await queue.add('email confirmation', {
				to: user.email,
				subject: 'Potwierdzenie adresu e-mail',
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
		}),
	],
});
