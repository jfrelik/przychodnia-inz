<script lang="ts" setup>
	import { Icon } from '#components';

	definePageMeta({
		layout: 'docs',
	});

	useHead({
		title: 'Panel doktora',
	});

	type VisitStatus = 'scheduled' | 'completed' | 'canceled';
	type Visit = {
		appointmentId: number;
		datetime: string | Date;
		status: VisitStatus;
		notes: string | null;
		patientId: string;
		patientName: string | null;
		patientEmail: string | null;
		roomId: number | null;
		roomNumber: string | null;
	};

	type TodayDispositionResponse = {
		day: string;
		timeframes: { start: string; end: string }[];
	};

	const { data: visitsData, pending: visitsLoading } = await useFetch<Visit[]>(
		'/api/doctor/visits/today',
		{
			key: 'doctor-home-today-visits',
		}
	);

	const {
		data: dispositionData,
		pending: dispositionLoading,
		error: dispositionError,
	} = await useFetch<TodayDispositionResponse>(
		'/api/doctor/dispositions/today',
		{
			key: 'doctor-home-disposition-today',
		}
	);

	const visits = computed(() => visitsData.value ?? []);

	const nearestVisit = computed(() => {
		const nowTs = Date.now();
		return (
			visits.value
				.map((visit) => {
					const ts = new Date(visit.datetime).getTime();
					return { ...visit, ts };
				})
				.filter((v) => v.ts >= nowTs)
				.sort((a, b) => a.ts - b.ts)[0] ?? null
		);
	});

	const formatDate = (value: string | Date) =>
		new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium' }).format(
			new Date(value)
		);

	const formatTime = (value: string | Date) =>
		new Intl.DateTimeFormat('pl-PL', {
			hour: '2-digit',
			minute: '2-digit',
		}).format(new Date(value));

	const todayTimeframes = computed(
		() => dispositionData.value?.timeframes ?? []
	);

	const formatTimeframe = (timeframe: { start: string; end: string }) => {
		const start = timeframe.start.slice(0, 5);
		const end = timeframe.end.slice(0, 5);
		return `${start}-${end}`;
	};

	const availabilityLabel = computed(() => {
		if (dispositionLoading.value) return 'Ładowanie...';
		if (dispositionError.value)
			return 'Nie udało się pobrać dyspozycji na dziś';
		if (!todayTimeframes.value.length) return 'Brak dyspozycji na dziś';
		return todayTimeframes.value.map((tf) => formatTimeframe(tf)).join(', ');
	});

	const dispositionReminder = ref(true);

	// temp placeholders
	const weeklyVisits = [
		{ week: 'Tydzień 1', visits: 18 },
		{ week: 'Tydzień 2', visits: 22 },
		{ week: 'Tydzień 3', visits: 19 },
		{ week: 'Tydzień 4', visits: 25 },
		{ week: 'Tydzień 5', visits: 21 },
		{ week: 'Tydzień 6', visits: 24 },
		{ week: 'Tydzień 7', visits: 20 },
		{ week: 'Tydzień 8', visits: 23 },
	];
	const weeklyVisitsCategories = {
		visits: { name: 'Obsłużone wizyty', color: '#2563eb' },
	} as const;

	const weeklyTicks = weeklyVisits.map((_, idx) => idx);
	const formatWeekTick = (tick: number) => weeklyVisits[tick]?.week ?? '';

	const visitTypeData = [38, 22];
	const visitTypeCategories = {
		onsite: { name: 'Wizyty w placówce', color: '#2563eb' },
		remote: { name: 'Konsultacje telefoniczne', color: '#10b981' },
	} as const;
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel doktora"
			description="Witamy w panelu doktora. Tutaj możesz przeglądać swoje wizyty, pacjentów oraz powiązane dane"
		/>
		<UAlert
			v-if="dispositionReminder"
			color="error"
			title="Uzupełnij dyspozycję"
			description="Przejdź do panelu dyspozycji, aby wpisać swoją dostępność w nadchodzący okres."
			icon="carbon:warning"
		/>
		<div class="grid grid-cols-2 gap-4">
			<UCard :ui="{ body: 'p-6' }">
				<h1 class="text-2xl font-bold">Godziny pracy dzisiaj</h1>
				<div v-if="dispositionLoading" class="mt-2 space-y-2">
					<div class="h-4 w-24 rounded bg-gray-200" />
					<div class="h-4 w-32 rounded bg-gray-200" />
				</div>
				<p v-else-if="dispositionError" class="text-sm text-red-600">
					Nie udało się pobrać dyspozycji na dziś
				</p>
				<template v-else-if="todayTimeframes.length">
					<p
						v-for="timeframe in todayTimeframes"
						:key="`${timeframe.start}-${timeframe.end}`"
						class="text-sm"
					>
						{{ formatTimeframe(timeframe) }}
					</p>
				</template>
				<p v-else class="text-sm text-gray-600">{{ availabilityLabel }}</p>
			</UCard>
			<UCard :ui="{ body: 'p-6' }">
				<h1 class="text-2xl font-bold">Pozostałe wizyty</h1>
				<p>Stacjonarne: 4</p>
				<p>Telefoniczne: 6</p>
			</UCard>
		</div>
		<UCard :ui="{ body: 'p-6' }">
			<div class="flex items-center justify-between pb-6">
				<h1 class="text-2xl font-bold">Najbliższa wizyta</h1>
				<UButton
					variant="soft"
					color="neutral"
					class="w-fit cursor-pointer"
					to="/doctor/visits/today"
				>
					Pokaż wszystkie dzisiaj
				</UButton>
			</div>

			<UCard v-if="visitsLoading" :ui="{ body: 'p-6' }">
				<div class="animate-pulse space-y-2">
					<div class="h-4 w-1/3 rounded bg-gray-200" />
					<div class="h-3 w-1/4 rounded bg-gray-200" />
					<div class="h-3 w-1/5 rounded bg-gray-200" />
				</div>
			</UCard>

			<UCard v-else-if="nearestVisit" :ui="{ body: 'p-6' }">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100"
						>
							<Icon name="carbon:calendar" class-name="w-6 h-6 text-blue-600" />
						</div>

						<div class="flex flex-col">
							<h2 class="text-xl font-bold">
								{{ nearestVisit.patientName || 'Pacjent' }}
							</h2>
							<p class="text-sm text-gray-500">
								{{
									nearestVisit.roomNumber
										? `Gabinet ${nearestVisit.roomNumber}`
										: 'Gabinet przydzielany'
								}}
							</p>

							<div
								class="mt-1 flex flex-row flex-wrap gap-3 text-sm text-gray-600"
							>
								<p>{{ formatDate(nearestVisit.datetime) }}</p>
								<p>{{ formatTime(nearestVisit.datetime) }}</p>
								<UBadge variant="subtle" color="info">Wizyta</UBadge>
							</div>
						</div>
					</div>
					<div class="flex gap-4">
						<UButton
							variant="soft"
							color="neutral"
							label="Przyjmij teraz"
							icon="carbon:play"
							class="cursor-pointer"
							:to="`/doctor/handleAppointment/${nearestVisit.appointmentId}`"
						/>
						<UButton
							variant="soft"
							color="neutral"
							icon="carbon:view"
							size="xl"
							class="cursor-pointer"
							to="/doctor/visits/today"
						/>
					</div>
				</div>
			</UCard>

			<UCard v-else :ui="{ body: 'p-6' }">
				<div class="flex items-center gap-3 text-gray-600">
					<Icon name="carbon:checkmark" class-name="w-5 h-5 text-green-600" />
					<p>Brak kolejnych wizyt zaplanowanych na dziś.</p>
				</div>
			</UCard>
		</UCard>

		<div class="grid grid-cols-2 gap-4">
			<UCard :ui="{ body: 'p-6' }">
				<div class="flex items-center justify-between pb-4">
					<h2 class="text-xl font-semibold">
						Wizyty tygodniowo (ostatnie 2 miesiące)
					</h2>
				</div>
				<ClientOnly>
					<BarChart
						:data="weeklyVisits"
						:categories="weeklyVisitsCategories"
						:y-axis="['visits']"
						:x-explicit-ticks="weeklyTicks"
						:x-formatter="formatWeekTick"
						:height="280"
						:bar-padding="0.25"
						:group-padding="0.2"
					/>
				</ClientOnly>
			</UCard>

			<UCard :ui="{ body: 'p-6' }">
				<div class="flex items-center justify-between pb-4">
					<h2 class="text-xl font-semibold">Podział typów wizyt</h2>
				</div>
				<ClientOnly>
					<DonutChart
						:data="visitTypeData"
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
