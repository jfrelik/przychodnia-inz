import { asc, eq } from 'drizzle-orm';
import { user } from '~~/server/db/auth';
import { patients } from '~~/server/db/clinic';
import db from '~~/server/util/db';
import { withAuth } from '~~/server/util/withAuth';

export default withAuth(async () => {
	const rows = await db
		.select({
			userId: patients.userId,
			firstName: patients.firstName,
			lastName: patients.lastName,
			pesel: patients.pesel,
			phone: patients.phone,
			address: patients.address,
			email: user.email,
			createdAt: user.createdAt,
		})
		.from(patients)
		.leftJoin(user, eq(patients.userId, user.id))
		.orderBy(asc(patients.lastName));

	return rows;
}, ['admin']);
