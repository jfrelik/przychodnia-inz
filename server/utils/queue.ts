import { Queue, type QueueOptions } from 'bullmq';
import { Redis } from 'ioredis';

const queueMap = new Map<string, Queue>();

export const useQueue = <
	DataType = unknown,
	ResultType = unknown,
	NameType extends string = string,
>(
	name: string,
	opts?: Partial<Omit<QueueOptions, 'connection'>>
) => {
	if (queueMap.has(name)) {
		return queueMap.get(name)! as Queue<DataType, ResultType, NameType>;
	}

	const { NUXT_REDIS_URL } = process.env;

	if (!NUXT_REDIS_URL) {
		throw new Error('env NUXT_REDIS_URL is not defined');
	}

	const connection = new Redis(NUXT_REDIS_URL);

	queueMap.set(
		name,
		new Queue<DataType, ResultType, NameType>(name, { ...opts, connection })
	);

	return queueMap.get(name) as Queue<DataType, ResultType, NameType>;
};
