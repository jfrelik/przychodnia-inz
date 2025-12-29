export type SendEmailJob = {
	to: string;
	subject: string;
	html: string;
};

export type SendEmailResult = {
	messageId: string;
	response: string;
	sentAt: number;
};
