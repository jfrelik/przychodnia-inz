import type { H3Event } from 'h3';
import { getRequestIP } from 'h3';
import { logs } from '~~/server/db/clinic';
import db from './db';

export async function recordAuditLog(
	event: H3Event,
	userId: string | null,
	action: string
) {
	const ip =
		getRequestIP(event, { xForwardedFor: true }) ??
		event.node.req.headers['x-forwarded-for']?.toString() ??
		event.node.req.socket.remoteAddress ??
		'nieznany';

	await db.insert(logs).values({
		userId,
		action,
		ipAddress: ip,
	});
}
