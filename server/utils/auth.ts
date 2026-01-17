import { createError, type H3Event } from 'h3';
import { auth } from '~~/lib/auth';

export type PermissionMap = Record<string, string[]>;

export async function requireSession(event: H3Event) {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session) throw createError({ statusCode: 401, message: 'Unauthorized' });

	return session;
}

export async function requireSessionWithPermissions(
	event: H3Event,
	permissions: PermissionMap
) {
	const session = await requireSession(event);

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions,
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, message: 'Forbidden' });

	return session;
}
