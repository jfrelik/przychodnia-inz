import { asc, count, eq } from 'drizzle-orm';
import { doctors, specializations } from '~~/server/db/clinic';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

export default withAuth(async () => {
	const rows = await db
		.select({
			id: specializations.id,
			name: specializations.name,
			doctorCount: count(doctors.userId),
		})
		.from(specializations)
		.leftJoin(doctors, eq(doctors.specializationId, specializations.id))
		.groupBy(specializations.id)
		.orderBy(asc(specializations.name));

	return rows.map((row) => ({
		...row,
		doctorCount: Number(row.doctorCount ?? 0),
	}));
}, ['admin']);
