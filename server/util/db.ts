import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const db = drizzle(process.env.DATABASE_URL!);
console.log('Database connection established');

migrate(db, { migrationsFolder: 'drizzle' })
	.then(() => console.log('Database migrations applied'))
	.catch((err) => {
		console.error('Database migrations failed:', err);
		throw err;
	});

export default db;
