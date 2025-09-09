import type { H3Event } from 'h3';
import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';

export type AllowedRole = 'user' | 'doctor' | 'admin';

export function withAuth<T>(
	handler: (event: H3Event, session: any) => Promise<T> | T,
	allowedRoles?: AllowedRole[]
) {
	return defineEventHandler(async (event) => {
		const session = await auth.api.getSession({ headers: event.headers });

		if (!session)
			throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
		if (
			allowedRoles &&
			!allowedRoles.includes(session.user.role as AllowedRole)
		) {
			throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
		}
		return handler(event, session);
	});
}
