import { consola } from 'consola';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle(process.env.DATABASE_URL!);
consola.success('Database connection established');

export default db;
