<script lang="ts" setup>
	import { PageHeader } from '#components';
	import type { TableColumn } from '@nuxt/ui';
	const UButton = resolveComponent('UButton');

	type QueueJob = {
		id: string | number | null;
		name: string;
		state: string;
		attemptsMade: number;
		timestamp: number | null;
		processedOn: number | null;
		finishedOn: number | null;
		failedReason: string | null;
		data: {
			to?: string;
			subject?: string;
			html?: string;
		};
		returnValue: {
			messageId: string;
			response: string;
			sentAt: number;
		} | null;
		stacktrace: string[];
		opts: Record<string, unknown>;
	};

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
		jobs: QueueJob[];
	};

	definePageMeta({
		layout: 'admin',
	});

	useHead({
		title: 'Kolejki BullMQ',
	});

	const {
		data: queuesResponse,
		error,
		refresh,
		pending,
	} = await useLazyFetch<QueueSummary[]>('/api/admin/queues', {
		default: () => [],
		server: false,
	});

	const queues = computed(() => queuesResponse.value ?? []);
	const selectedQueueName = ref<string | undefined>(undefined);
	const tableKey = ref(0);

	watch(
		() => queuesResponse.value,
		() => {
			tableKey.value++;
		},
		{ deep: false }
	);

	watch(
		queues,
		(list) => {
			if (!selectedQueueName.value && list.length > 0) {
				selectedQueueName.value = list[0]!.name;
			}
		},
		{ immediate: true }
	);

	const queueOptions = computed(() =>
		queues.value.map((queue) => ({
			label: queue.label,
			value: queue.name,
		}))
	);

	const selectedQueue = computed(
		() =>
			queues.value.find((queue) => queue.name === selectedQueueName.value) ??
			null
	);

	const jobs = computed(() => selectedQueue.value?.jobs ?? []);

	const isJobModalOpen = ref(false);
	const selectedJob = ref<QueueJob | null>(null);

	const openJobModal = (job: QueueJob) => {
		selectedJob.value = job;
		isJobModalOpen.value = true;
	};

	const closeJobModal = () => {
		isJobModalOpen.value = false;
	};

	type BadgeColor =
		| 'error'
		| 'primary'
		| 'secondary'
		| 'success'
		| 'info'
		| 'warning'
		| 'neutral';

	const stateColors: Record<string, BadgeColor> = {
		active: 'primary',
		completed: 'success',
		failed: 'error',
		delayed: 'warning',
		paused: 'neutral',
		wait: 'warning',
		waiting: 'warning',
	};

	const formatDate = (value: number | null) =>
		value
			? new Date(value).toLocaleString('pl-PL', {
					dateStyle: 'short',
					timeStyle: 'short',
				})
			: '—';

	const formatJson = (value: unknown) => JSON.stringify(value, null, 2) ?? '—';

	const columns: TableColumn<QueueJob>[] = [
		{
			accessorKey: 'id',
			header: 'ID',
			cell: ({ row }) => row.getValue('id') ?? '—',
			size: 80,
		},
		{
			accessorKey: 'state',
			header: 'Status',
			size: 120,
		},
		{
			id: 'recipient',
			header: 'Odbiorca',
			cell: ({ row }) => row.original.data?.to ?? '—',
			size: 200,
		},
		{
			id: 'subject',
			header: 'Temat',
			cell: ({ row }) => row.original.data?.subject ?? '—',
			size: 220,
		},
		{
			accessorKey: 'timestamp',
			header: 'Dodano',
			cell: ({ row }) => formatDate(row.original.timestamp),
			size: 140,
		},
		{
			id: 'details',
			header: '',
			cell: ({ row }) =>
				h(
					UButton,
					{
						color: 'neutral',
						variant: 'ghost',
						size: 'xs',
						icon: 'lucide:eye',
						class: 'cursor-pointer',
						'aria-label': 'Szczegóły zadania',
						onClick: () => openJobModal(row.original),
					},
					() => 'Szczegóły'
				),
			size: 120,
		},
	];
</script>

<template>
	<PageContainer class="min-h-0 flex-1">
		<div class="flex min-h-0 flex-1 flex-col gap-y-6">
			<PageHeader
				title="Kolejki BullMQ"
				description="Podgląd kolejek i ostatnich zadań w tle."
			/>

			<UAlert
				v-if="error"
				color="error"
				icon="lucide:alert-triangle"
				description="Nie udało się pobrać danych kolejek."
			>
				<template #actions>
					<UButton color="neutral" variant="soft" @click="refresh()">
						Ponów próbę
					</UButton>
				</template>
			</UAlert>

			<UCard
				class="flex min-h-0 flex-1 flex-col"
				:ui="{ body: 'flex flex-1 flex-col min-h-0 gap-4 p-5' }"
			>
				<template #header>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 class="text-lg font-semibold">Status kolejek</h2>
							<p class="text-sm text-neutral-500">
								Najnowsze zadania i statystyki przetwarzania.
							</p>
						</div>
						<div class="flex flex-wrap items-center gap-3">
							<USelect
								v-model="selectedQueueName"
								:items="queueOptions"
								placeholder="Wybierz kolejkę"
								class="min-w-56"
								:value-key="'value'"
							/>
							<UButton
								variant="soft"
								icon="lucide:refresh-cw"
								class="cursor-pointer"
								@click="refresh()"
							>
								Odśwież
							</UButton>
						</div>
					</div>
				</template>

				<div
					v-if="selectedQueue"
					class="grid gap-3 md:grid-cols-3 lg:grid-cols-6"
				>
					<div class="border-default rounded-lg border p-4">
						<p class="text-xs text-neutral-500">Oczekujące</p>
						<p class="text-xl font-semibold">
							{{ selectedQueue.counts.waiting }}
						</p>
					</div>
					<div class="border-default rounded-lg border p-4">
						<p class="text-xs text-neutral-500">Aktywne</p>
						<p class="text-xl font-semibold">
							{{ selectedQueue.counts.active }}
						</p>
					</div>
					<div class="border-default rounded-lg border p-4">
						<p class="text-xs text-neutral-500">Opóźnione</p>
						<p class="text-xl font-semibold">
							{{ selectedQueue.counts.delayed }}
						</p>
					</div>
					<div class="border-default rounded-lg border p-4">
						<p class="text-xs text-neutral-500">Zakończone</p>
						<p class="text-xl font-semibold">
							{{ selectedQueue.counts.completed }}
						</p>
					</div>
					<div class="border-default rounded-lg border p-4">
						<p class="text-xs text-neutral-500">Błędy</p>
						<p class="text-xl font-semibold">
							{{ selectedQueue.counts.failed }}
						</p>
					</div>
					<div class="border-default rounded-lg border p-4">
						<p class="text-xs text-neutral-500">Wstrzymane</p>
						<p class="text-xl font-semibold">
							{{ selectedQueue.counts.paused }}
						</p>
					</div>
				</div>

				<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
					<ClientOnly>
						<UTable
							:key="tableKey"
							:data="jobs"
							:columns="columns"
							:loading="pending"
							class="min-h-0 min-w-full flex-1 overflow-y-auto"
							empty="Nie ma zadań w kolejce."
						>
							<template #state-cell="{ row }">
								<UBadge
									variant="soft"
									:color="stateColors[row.original.state] ?? 'neutral'"
									:label="row.original.state"
								/>
							</template>
						</UTable>
					</ClientOnly>
				</div>
			</UCard>
		</div>

		<UModal v-model:open="isJobModalOpen">
			<template #content>
				<UCard>
					<template #header>
						<h3 class="text-lg font-semibold">Szczegóły zadania</h3>
					</template>

					<div v-if="selectedJob" class="grid gap-4 text-sm">
						<div class="grid gap-2 md:grid-cols-2">
							<div>
								<p class="text-xs font-semibold text-neutral-500 uppercase">
									Nazwa zadania
								</p>
								<p class="text-neutral-800">{{ selectedJob.name }}</p>
							</div>
							<div>
								<p class="text-xs font-semibold text-neutral-500 uppercase">
									Status
								</p>
								<p class="text-neutral-800">{{ selectedJob.state }}</p>
							</div>
							<div>
								<p class="text-xs font-semibold text-neutral-500 uppercase">
									Dodano
								</p>
								<p class="text-neutral-800">
									{{ formatDate(selectedJob.timestamp) }}
								</p>
							</div>
							<div>
								<p class="text-xs font-semibold text-neutral-500 uppercase">
									Zakończono
								</p>
								<p class="text-neutral-800">
									{{ formatDate(selectedJob.finishedOn) }}
								</p>
							</div>
						</div>

						<div class="grid gap-2 md:grid-cols-2">
							<div>
								<p class="text-xs font-semibold text-neutral-500 uppercase">
									Dane zadania
								</p>
								<pre
									class="max-h-64 overflow-auto rounded-md bg-white p-3 text-xs text-neutral-700"
									>{{ formatJson(selectedJob.data) }}</pre
								>
							</div>
							<div>
								<p class="text-xs font-semibold text-neutral-500 uppercase">
									Wynik
								</p>
								<pre
									class="max-h-64 overflow-auto rounded-md bg-white p-3 text-xs text-neutral-700"
									>{{ formatJson(selectedJob.returnValue) }}</pre
								>
							</div>
						</div>

						<div v-if="selectedJob.stacktrace?.length">
							<p class="text-xs font-semibold text-neutral-500 uppercase">
								Stacktrace
							</p>
							<pre
								class="max-h-64 overflow-auto rounded-md bg-white p-3 text-xs text-rose-700"
								>{{ selectedJob.stacktrace.join('\n') }}</pre
							>
						</div>

						<div>
							<p class="text-xs font-semibold text-neutral-500 uppercase">
								Opcje zadania
							</p>
							<pre
								class="max-h-64 overflow-auto rounded-md bg-white p-3 text-xs text-neutral-700"
								>{{ formatJson(selectedJob.opts) }}</pre
							>
						</div>
					</div>

					<template #footer>
						<div class="flex justify-end gap-2">
							<UButton
								type="button"
								variant="ghost"
								class="cursor-pointer"
								@click="closeJobModal"
							>
								Zamknij
							</UButton>
						</div>
					</template>
				</UCard>
			</template>
		</UModal>
	</PageContainer>
</template>
