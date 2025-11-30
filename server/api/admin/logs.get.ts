import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { user } from '~~/server/db/auth';
import { logs } from '~~/server/db/clinic';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

const uuidSchema = z.string().uuid();

const sanitizeNullableUuid = (value: unknown) => {
	if (value == null) return null;
	if (typeof value !== 'string') return null;

	const result = uuidSchema.safeParse(value);
	return result.success ? result.data : null;
};

const logEntrySchema = z.object({
	logId: z.number(),
	action: z.string(),
	timestamp: z.date(),
	ipAddress: z.string().nullable(),
	userId: uuidSchema.nullable(),
	userName: z.string().nullable(),
	userEmail: z.string().email().nullable(),
});

export default withAuth(
	async (_event) => {
		const rowsResult = await db
			.select({
				logId: logs.logId,
				action: logs.action,
				timestamp: logs.timestamp,
				ipAddress: logs.ipAddress,
				userId: logs.userId,
				userName: user.name,
				userEmail: user.email,
			})
			.from(logs)
			.leftJoin(user, eq(logs.userId, user.id))
			.orderBy(desc(logs.timestamp));

		const rows = rowsResult.map((row) =>
			logEntrySchema.parse({
				...row,
				ipAddress: row.ipAddress ?? null,
				userId: sanitizeNullableUuid(row.userId),
				userName: row.userName ?? null,
				userEmail: row.userEmail ?? null,
			})
		);

		return rows;
	},
	['admin']
);
