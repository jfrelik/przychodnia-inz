<script lang="ts" setup>
	import { Icon } from '#components';

	definePageMeta({
		layout: 'receptionist',
	});

	useHead({
		title: 'Panel recepcji',
	});

	const headlineStats = [
		{
			label: 'Dzisiejsze wizyty',
			value: 24,
			icon: 'i-lucide-calendar-days',
			accent: 'bg-blue-100 text-blue-600',
		},
		{
			label: 'Oczekujące check-in',
			value: 6,
			icon: 'i-lucide-clock-3',
			accent: 'bg-amber-100 text-amber-600',
		},
		{
			label: 'Nowi pacjenci',
			value: 3,
			icon: 'i-lucide-user-plus',
			accent: 'bg-emerald-100 text-emerald-600',
		},
		{
			label: 'Zwolnione sloty',
			value: 4,
			icon: 'i-lucide-door-open',
			accent: 'bg-slate-100 text-slate-600',
		},
	];

	const queuePreview = [
		{
			name: 'Anna Nowak',
			time: '10:20',
			doctor: 'dr K. Malinowski',
			room: '201',
			type: 'Stacjonarna',
		},
		{
			name: 'Piotr Zieliński',
			time: '10:40',
			doctor: 'dr J. Nowak',
			room: '105',
			type: 'Kontrola',
		},
		{
			name: 'Marta Lewandowska',
			time: '11:00',
			doctor: 'dr A. Wysocka',
			room: 'Teleporada',
			type: 'Teleporada',
		},
	];

	const dailyFlow = [
		{ slot: '08:00', arrivals: 6, registrations: 5 },
		{ slot: '09:00', arrivals: 8, registrations: 7 },
		{ slot: '10:00', arrivals: 11, registrations: 9 },
		{ slot: '11:00', arrivals: 9, registrations: 8 },
		{ slot: '12:00', arrivals: 7, registrations: 6 },
		{ slot: '13:00', arrivals: 5, registrations: 4 },
		{ slot: '14:00', arrivals: 4, registrations: 4 },
	];

	const dailyFlowCategories = {
		arrivals: { name: 'Wejścia do placówki', color: '#2563eb' },
		registrations: { name: 'Zarejestrowane wizyty', color: '#10b981' },
	} as const;

	const dailyFlowTicks = dailyFlow.map((_, idx) => idx);
	const formatDailyTick = (tick: number) => dailyFlow[tick]?.slot ?? '';

	const visitTypes = [28, 12, 7];
	const visitTypeCategories = {
		onsite: { name: 'Stacjonarne', color: '#2563eb' },
		followup: { name: 'Kontrolne', color: '#f59e0b' },
		remote: { name: 'Teleporady', color: '#10b981' },
	} as const;
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel recepcji"
			description="Szybki podgląd dnia: wizyty, check-in oraz obciążenie recepcji."
		/>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
						icon="i-lucide-list"
						class="cursor-pointer"
					>
						Zobacz wszystkie
					</UButton>
				</div>
				<div class="space-y-3">
					<div
						v-for="item in queuePreview"
						:key="item.name + item.time"
						class="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2"
					>
						<div>
							<p class="font-medium text-neutral-800">{{ item.name }}</p>
							<p class="text-xs text-neutral-500">
								{{ item.doctor }} • {{ item.time }}
							</p>
						</div>
						<div class="flex items-center gap-2 text-sm text-neutral-600">
							<UBadge variant="soft" color="primary">{{ item.type }}</UBadge>
							<span class="text-neutral-400">|</span>
							<span>{{ item.room }}</span>
						</div>
					</div>
				</div>
			</UCard>
		</div>

		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<UCard :ui="{ body: 'p-5' }">
				<div class="flex items-center justify-between pb-3">
					<h2 class="text-lg font-semibold">Ruch w ciągu dnia</h2>
					<UBadge variant="soft" color="primary">Dane poglądowe</UBadge>
				</div>
				<ClientOnly>
					<BarChart
						:data="dailyFlow"
						:categories="dailyFlowCategories"
						:y-axis="['arrivals', 'registrations']"
						:x-explicit-ticks="dailyFlowTicks"
						:x-formatter="formatDailyTick"
						:height="280"
						:bar-padding="0.25"
						:group-padding="0.2"
					/>
				</ClientOnly>
			</UCard>

			<UCard :ui="{ body: 'p-5' }">
				<div class="flex items-center justify-between pb-3">
					<h2 class="text-lg font-semibold">Typy wizyt</h2>
					<UBadge variant="soft" color="primary">Poglądowe</UBadge>
				</div>
				<ClientOnly>
					<DonutChart
						:data="visitTypes"
						:categories="visitTypeCategories"
						:height="280"
						:radius="110"
						:arc-width="36"
					/>
				</ClientOnly>
			</UCard>
		</div>
	</PageContainer>
</template>
