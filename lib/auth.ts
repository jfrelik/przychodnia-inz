import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { account, session, user, verification } from '../server/db/schema';
import db from '../server/util/db';
import { ac } from './permissions';

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
	},
	plugins: [
		admin({
			ac,
		}),
	],
});
