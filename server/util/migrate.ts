import { consola } from 'consola';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import db from './db';

export default migrate(db, { migrationsFolder: 'drizzle' })
	.then(() => consola.success('Database migrations applied'))
	.catch((err) => {
		consola.error('Database migrations failed:', err);
		throw err;
	});
