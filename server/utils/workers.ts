import { type Processor, type WorkerOptions, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const workerMap = new Map<string, Worker>();

export const useWorker = <
	DataType = unknown,
	ResultType = unknown,
	NameType extends string = string,
>(
	name: string,
	fn: string | URL | Processor<DataType, ResultType, NameType>,
	opts?: Partial<Omit<WorkerOptions, 'connection'>>
): Worker<DataType, ResultType, NameType> => {
	const existingWorker = workerMap.get(name);
	if (existingWorker) {
		return existingWorker as unknown as Worker<DataType, ResultType, NameType>;
	}

	const { NUXT_REDIS_URL } = process.env;

	if (!NUXT_REDIS_URL) {
		throw new Error('env NUXT_REDIS_URL is not defined');
	}

	const connection = new Redis(NUXT_REDIS_URL, {
		/**
		 * Is better to set this as `null`
		 * @see https://docs.bullmq.io/guide/connections#maxretriesperrequest
		 */
		maxRetriesPerRequest: null,
	});

	const worker = new Worker<DataType, ResultType, NameType>(name, fn, {
		...opts,
		connection,
	});

	workerMap.set(name, worker as unknown as Worker);

	return worker;
};
