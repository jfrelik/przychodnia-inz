import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { account, session, user, verification } from '~~/server/db/schema';
import db from '../server/util/db';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user: user,
			account: account,
			session: session,
			verification: verification,
		},
	}),
	emailAndPassword: {
		enabled: true,
	},
});
