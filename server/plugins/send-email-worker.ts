import type { SendEmailJob, SendEmailResult } from '~~/server/types/bullmq';

const { sendMail } = useNodeMailer();

export default defineNitroPlugin(() => {
	if (import.meta.prerender) return;

	useWorker<SendEmailJob, SendEmailResult>('send-email', async (job) => {
		const { to, subject, html } = job.data;

		const result = await sendMail({
			to,
			subject,
			html,
		});

		return {
			messageId: result.messageId,
			response: result.response,
			sentAt: Date.now(),
		};
	});
});
