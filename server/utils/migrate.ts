import { consola } from 'consola';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

export async function useMigrate() {
	try {
		const db = useDb();
		await migrate(db, { migrationsFolder: 'drizzle' });
		return consola.success('Database migrations applied');
	} catch (err) {
		consola.error('Database migrations failed:', err);
		throw err;
	}
}
