import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const db = drizzle(process.env.DATABASE_URL!);
console.log('Database connection established');
migrate(db, { migrationsFolder: 'drizzle' });
console.log('Database migrations applied');

export default db;
