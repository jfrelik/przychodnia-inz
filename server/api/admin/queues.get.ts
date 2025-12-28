import { createError, defineEventHandler } from 'h3';
import { auth } from '~~/lib/auth';
import type { SendEmailJob, SendEmailResult } from '~~/server/types/bullmq';

type QueueSummary = {
	name: string;
	label: string;
	counts: {
		waiting: number;
		active: number;
		completed: number;
		failed: number;
		delayed: number;
		paused: number;
	};
	jobs: {
		id: string | number | null;
		name: string;
		state: string;
		attemptsMade: number;
		timestamp: number | null;
		processedOn: number | null;
		finishedOn: number | null;
		failedReason: string | null;
		data: SendEmailJob;
		returnValue: SendEmailResult | null;
		stacktrace: string[];
		opts: Record<string, unknown>;
	}[];
};

const queues = [
	{
		name: 'send-email',
		label: 'Wysylka e-maili',
	},
] as const;

export default defineEventHandler(async (event) => {
	const session = await auth.api.getSession({ headers: event.headers });

	if (!session)
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

	const hasPermission = await auth.api.userHasPermission({
		body: {
			userId: session.user.id,
			permissions: {
				queues: ['list'],
			},
		},
	});

	if (!hasPermission.success)
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

	const summaries: QueueSummary[] = [];

	for (const queueConfig of queues) {
		const queue = useQueue<SendEmailJob, SendEmailResult>(queueConfig.name);
		const counts = await queue.getJobCounts(
			'wait',
			'active',
			'completed',
			'failed',
			'delayed',
			'paused'
		);
		const jobs = await queue.getJobs(
			['active', 'wait', 'delayed', 'failed', 'completed', 'paused'],
			0,
			24
		);
		const jobsWithState = await Promise.all(
			jobs.map(async (job) => ({
				id: job.id ?? null,
				name: job.name,
				state: await job.getState(),
				attemptsMade: job.attemptsMade,
				timestamp: job.timestamp ?? null,
				processedOn: job.processedOn ?? null,
				finishedOn: job.finishedOn ?? null,
				failedReason: job.failedReason ?? null,
				data: job.data,
				returnValue: (job.returnvalue as SendEmailResult | undefined) ?? null,
				stacktrace: job.stacktrace ?? [],
				opts: job.opts ?? {},
			}))
		);

		summaries.push({
			name: queueConfig.name,
			label: queueConfig.label,
			counts: {
				waiting: counts.wait ?? 0,
				active: counts.active ?? 0,
				completed: counts.completed ?? 0,
				failed: counts.failed ?? 0,
				delayed: counts.delayed ?? 0,
				paused: counts.paused ?? 0,
			},
			jobs: jobsWithState,
		});
	}

	return summaries;
});
