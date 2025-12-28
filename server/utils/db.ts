import { consola } from 'consola';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle(process.env.NUXT_DATABASE_URL!);

export function useDb() {
	return db;
}
consola.success('Database connection established');
