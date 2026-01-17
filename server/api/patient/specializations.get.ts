import { asc } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { specializations } from '~~/server/db/clinic';

export default defineEventHandler(async (event) => {
	// Patients just need to be logged in; no extra permission required.
	await requireSession(event);
	let rows: Array<{
		id: number;
		name: string;
		description: string;
		icon: string | null;
	}>;
	try {
		rows = await useDb()
			.select({
				id: specializations.id,
				name: specializations.name,
				description: specializations.description,
				icon: specializations.icon,
			})
			.from(specializations)
			.orderBy(asc(specializations.name));
	} catch (error) {
		const { message } = getDbErrorMessage(error);
		throw createError({ statusCode: 500, message });
	}

	return rows;
});
