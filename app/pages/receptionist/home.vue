<script lang="ts" setup>
	import { Icon } from '#components';

	definePageMeta({
		layout: 'receptionist',
	});

	useHead({
		title: 'Panel recepcji',
	});

	type VisitBuckets = {
		day: string;
		buckets: { hour: number; label: string; onsite: number; remote: number }[];
		totals: { onsite: number; remote: number };
	};

	type QueueVisit = {
		appointmentId: number;
		datetime: string | Date;
		status: 'scheduled' | 'checked_in';
		isOnline: boolean;
		type: 'consultation' | 'procedure';
		patientName: string | null;
		patientEmail: string | null;
		doctorName: string | null;
		doctorEmail: string | null;
		roomNumber: number | null;
	};

	const {
		data: visitsData,
		pending: visitsPending,
		error: visitsError,
		refresh: refreshVisits,
	} = await useFetch<VisitBuckets>('/api/receptionist/stats/visitsToday', {
		key: 'receptionist-visits-today',
	});

	const {
		data: queueData,
		pending: queuePending,
		error: queueError,
		refresh: refreshQueue,
	} = await useFetch<QueueVisit[]>('/api/receptionist/visits/today', {
		key: 'receptionist-queue-today',
		default: () => [],
	});

	const queueVisits = computed(() => queueData.value ?? []);
	const queuePage = ref(1);
	const queuePageSize = 5;
	const queuePageCount = computed(() =>
		Math.max(1, Math.ceil(queueVisits.value.length / queuePageSize))
	);

	watch(
		() => queueVisits.value.length,
		() => {
			if (queuePage.value > queuePageCount.value)
				queuePage.value = queuePageCount.value;
		}
	);

	const pagedQueue = computed(() => {
		const start = (queuePage.value - 1) * queuePageSize;
		return queueVisits.value.slice(start, start + queuePageSize);
	});

	const formatTime = (value: string | Date) =>
		new Intl.DateTimeFormat('pl-PL', {
			hour: '2-digit',
			minute: '2-digit',
		}).format(new Date(value));

	const headlineStats = computed(() => {
		const totals = visitsData.value?.totals ?? { onsite: 0, remote: 0 };
		const total = totals.onsite + totals.remote;

		return [
			{
				label: 'Dzisiejsze wizyty',
				value: total,
				icon: 'carbon:calendar',
				accent: 'bg-blue-100 text-blue-600',
			},
			{
				label: 'Stacjonarne',
				value: totals.onsite,
				icon: 'carbon:building',
				accent: 'bg-emerald-100 text-emerald-700',
			},
			{
				label: 'Zdalne',
				value: totals.remote,
				icon: 'carbon:phone',
				accent: 'bg-sky-100 text-sky-700',
			},
		];
	});

	const visitCategories = {
		onsite: { name: 'Wizyty w placówce', color: '#2563eb' },
		remote: { name: 'Teleporady', color: '#10b981' },
	} as const;

	const visitChartData = computed(
		() =>
			(visitsData.value?.buckets ?? []).map((bucket) => ({
				label: bucket.label,
				onsite: bucket.onsite,
				remote: bucket.remote,
			})) ?? []
	);

	const visitTicks = computed(() => visitChartData.value.map((_, idx) => idx));
	const formatVisitTick = (tick: number) =>
		visitChartData.value[tick]?.label ?? '';
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel recepcji"
			description="Szybki podgląd dnia: wizyty, check-in oraz obciążenie recepcji."
		/>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<UCard
				v-for="stat in headlineStats"
				:key="stat.label"
				:ui="{ body: 'p-5' }"
				class="h-full"
			>
				<div class="flex items-center gap-4">
					<div
						class="flex h-11 w-11 items-center justify-center rounded-full"
						:class="stat.accent"
					>
						<Icon :name="stat.icon" class-name="h-5 w-5" />
					</div>
					<div class="flex flex-col">
						<span class="text-2xl font-semibold">{{ stat.value }}</span>
						<span class="text-sm text-neutral-500">{{ stat.label }}</span>
					</div>
				</div>
			</UCard>
		</div>

		<div class="grid grid-cols-1 gap-4">
			<UCard :ui="{ body: 'p-5' }">
				<div class="flex items-center justify-between pb-4">
					<h2 class="text-lg font-semibold">Kolejka na dziś</h2>
					<UButton
						variant="soft"
						color="neutral"
						icon="i-lucide-refresh-ccw"
						class="cursor-pointer"
						@click="refreshQueue()"
					>
						Odśwież
					</UButton>
				</div>

				<UAlert
					v-if="queueError"
					color="error"
					icon="i-lucide-alert-triangle"
					title="Nie udało się pobrać wizyt"
					description="Spróbuj ponownie za chwilę."
					class="mb-3"
				/>

				<div v-if="queuePending" class="space-y-2">
					<div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
					<div class="h-28 animate-pulse rounded bg-gray-100" />
				</div>
				<div v-else>
					<p v-if="!queueVisits.length" class="text-sm text-neutral-500">
						Brak oczekujących wizyt na dziś.
					</p>
					<div v-else class="space-y-3">
						<div
							v-for="item in pagedQueue"
							:key="item.appointmentId"
							class="flex flex-col gap-1 rounded-lg border border-neutral-100 px-3 py-2"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<UBadge
										:color="item.isOnline ? 'info' : 'primary'"
										variant="subtle"
									>
										{{ item.isOnline ? 'Zdalna' : 'Stacjonarna' }}
									</UBadge>
								</div>
								<span class="text-sm font-medium text-neutral-800">
									{{ formatTime(item.datetime) }}
								</span>
							</div>
							<div
								class="flex flex-wrap items-center gap-3 text-sm text-neutral-700"
							>
								<div class="flex items-center gap-1">
									<Icon
										name="carbon:user"
										class-name="h-4 w-4 text-neutral-500"
									/>
									<span>{{ item.patientName || 'Pacjent' }}</span>
								</div>
								<span class="text-neutral-400">|</span>
								<div class="flex items-center gap-1">
									<Icon
										name="carbon:stethoscope"
										class-name="h-4 w-4 text-neutral-500"
									/>
									<span>{{ item.doctorName || 'Lekarz' }}</span>
								</div>
								<span class="text-neutral-400">|</span>
								<div class="flex items-center gap-1">
									<Icon
										name="carbon:location"
										class-name="h-4 w-4 text-neutral-500"
									/>
									<span>
										{{
											item.isOnline
												? 'Teleporada'
												: item.roomNumber
													? `Gabinet ${item.roomNumber}`
													: 'Gabinet do przydziału'
										}}
									</span>
								</div>
							</div>
						</div>

						<div class="flex justify-center pt-2">
							<UPagination
								v-model="queuePage"
								:page-count="queuePageCount"
								:total="queueVisits.length"
								:items-per-page="queuePageSize"
							/>
						</div>
					</div>
				</div>
			</UCard>
		</div>

		<div class="grid grid-cols-1 gap-4">
			<UCard :ui="{ body: 'p-5' }">
				<div class="flex items-center justify-between pb-3">
					<div>
						<h2 class="text-lg font-semibold">
							Wizyty dzisiaj (stacjonarne vs zdalne)
						</h2>
						<p class="text-sm text-neutral-500">
							Dwukolumnowy wykres dla bieżącego dnia.
						</p>
					</div>
					<UButton
						variant="soft"
						color="neutral"
						icon="i-lucide-refresh-ccw"
						class="cursor-pointer"
						@click="refreshVisits()"
					>
						Odśwież
					</UButton>
				</div>

				<UAlert
					v-if="visitsError"
					color="error"
					icon="i-lucide-alert-triangle"
					title="Nie udało się pobrać danych"
					description="Spróbuj ponownie za chwilę."
					class="mb-3"
				/>

				<div v-if="visitsPending" class="space-y-2">
					<div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
					<div class="h-64 animate-pulse rounded bg-gray-100" />
				</div>
				<div v-else>
					<p v-if="!visitChartData.length" class="text-sm text-neutral-500">
						Brak wizyt zaplanowanych na dziś.
					</p>
					<ClientOnly v-else>
						<BarChart
							:data="visitChartData"
							:categories="visitCategories"
							:y-axis="['onsite', 'remote']"
							:x-explicit-ticks="visitTicks"
							:x-formatter="formatVisitTick"
							:height="320"
							:bar-padding="0.25"
							:group-padding="0.2"
						/>
					</ClientOnly>
				</div>
			</UCard>
		</div>
	</PageContainer>
</template>
