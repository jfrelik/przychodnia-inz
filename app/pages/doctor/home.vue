<script lang="ts" setup>
	definePageMeta({
		layout: 'docs',
	});

	useHead({
		title: 'Panel doktora',
	});

	type VisitStatus = 'scheduled' | 'checked_in' | 'completed' | 'canceled';
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
		roomNumber: number | null;
	};

	type VisitStatusColor = 'primary' | 'success' | 'error' | 'warning' | 'info';

	const router = useRouter();
	const toast = useToast();

	const todayDateStr = computed(() => useToday());

	const {
		data: visitsData,
		pending: visitsLoading,
		error: visitsError,
		refresh: refreshVisits,
	} = await useLazyFetch<Visit[]>('/api/doctor/visits', {
		query: { date: todayDateStr },
		server: false,
	});

	const {
		data: dispositionData,
		pending: dispositionLoading,
		error: dispositionError,
	} = await useLazyFetch<TodayDispositionResponse>(
		'/api/doctor/dispositions/today',
		{
			server: false,
		}
	);

	const visits = computed(() => visitsData.value ?? []);

	const remainingVisits = computed(() => {
		return visits.value.filter(
			(v) => v.status === 'scheduled' || v.status === 'checked_in'
		);
	});

	const remainingOnsite = computed(() => {
		return remainingVisits.value.filter(
			(v) => v.roomNumber !== null && v.roomNumber !== undefined
		).length;
	});

	const remainingOnline = computed(() => {
		return remainingVisits.value.filter(
			(v) => v.roomNumber === null || v.roomNumber === undefined
		).length;
	});

	const nearestVisits = computed(() => {
		return remainingVisits.value
			.map((visit) => {
				const ts = new Date(visit.datetime).getTime();
				return { ...visit, ts };
			})
			.sort((a, b) => a.ts - b.ts)
			.slice(0, 3);
	});

	const showVisitsEmptyState = computed(
		() =>
			!visitsLoading.value &&
			!visitsError.value &&
			nearestVisits.value.length === 0
	);

	const visitStatusMeta: Record<
		VisitStatus,
		{ label: string; color: VisitStatusColor }
	> = {
		scheduled: { label: 'Zaplanowana', color: 'primary' },
		checked_in: { label: 'Obecność potwierdzona', color: 'warning' },
		completed: { label: 'Zakończona', color: 'success' },
		canceled: { label: 'Odwołana', color: 'error' },
	};

	const getStatusLabel = (status: VisitStatus) =>
		visitStatusMeta[status]?.label ?? 'Nieznany status';
	const getStatusColor = (status: VisitStatus): VisitStatusColor =>
		visitStatusMeta[status]?.color ?? 'primary';

	const formatDate = (value: string | Date) => useDateShort(value);
	const formatTime = (value: string | Date) => useTime(value);

	const todayTimeframes = computed(
		() => dispositionData.value?.timeframes ?? []
	);

	const formatTimeframe = (timeframe: { start: string; end: string }) => {
		const start = timeframe.start.slice(0, 5);
		const end = timeframe.end.slice(0, 5);
		return `${start} - ${end}`;
	};

	const showDispositionEmptyState = computed(
		() =>
			!dispositionLoading.value &&
			!dispositionError.value &&
			todayTimeframes.value.length === 0
	);

	const todayRoomNumber = computed(
		() => dispositionData.value?.roomNumber ?? null
	);

	const REFRESH_INTERVAL = 60;
	const refreshCountdown = ref(REFRESH_INTERVAL);
	const isRefreshing = ref(false);

	const performRefresh = async (showToast = false) => {
		isRefreshing.value = true;
		try {
			await refreshVisits();
			if (showToast) {
				toast.add({
					title: 'Odświeżono panel',
					description: 'Dane dashboardu zostały zaktualizowane.',
					color: 'success',
					icon: 'lucide:check',
				});
			}
		} finally {
			isRefreshing.value = false;
			refreshCountdown.value = REFRESH_INTERVAL;
		}
	};

	const handleManualRefresh = () => performRefresh(true);

	useIntervalFn(() => {
		if (refreshCountdown.value > 0) {
			refreshCountdown.value--;
		} else {
			performRefresh(false);
		}
	}, 1000);

	const handleAppointment = (appointmentId: number) =>
		router.push(`/doctor/handleAppointment/${appointmentId}`);
</script>

<template>
	<PageContainer>
		<div
			class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<PageHeader
				title="Panel doktora"
				description="Witamy w panelu doktora. Tutaj możesz przeglądać swoje wizyty, pacjentów oraz powiązane dane"
			/>
			<div class="flex items-center gap-3">
				<span class="text-sm text-gray-500 dark:text-gray-400">
					Odświeżenie za {{ refreshCountdown }}s
				</span>
				<UButton
					variant="soft"
					color="neutral"
					icon="lucide:refresh-cw"
					:loading="isRefreshing"
					class="cursor-pointer"
					@click="handleManualRefresh"
				>
					Odśwież
				</UButton>
			</div>
		</div>

		<ClientOnly>
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<UCard>
					<div class="flex items-center gap-3 pb-4">
						<div
							class="bg-primary-100 dark:bg-primary-900 flex h-12 w-12 items-center justify-center rounded-full"
						>
							<Icon
								name="lucide:clock"
								class="text-primary-600 dark:text-primary-400 h-6 w-6"
							/>
						</div>
						<div>
							<h2 class="text-xl font-bold">Godziny pracy dzisiaj</h2>
							<p class="text-sm text-gray-500 dark:text-gray-400">
								Twoja dyspozycja na dziś
							</p>
						</div>
					</div>

					<div v-auto-animate>
						<USkeleton v-if="dispositionLoading" class="h-20 w-full" />

						<UAlert
							v-else-if="dispositionError"
							title="Nie udało się pobrać dyspozycji"
							color="error"
							variant="soft"
							:description="
								getErrorMessage(
									dispositionError,
									'Nie udało się pobrać dyspozycji na dziś.'
								)
							"
						/>

						<div
							v-else-if="showDispositionEmptyState"
							class="flex flex-col items-center justify-center gap-2 py-6 text-center"
						>
							<Icon
								name="lucide:calendar-off"
								class="h-10 w-10 text-gray-400"
							/>
							<p class="text-sm text-gray-500">Brak dyspozycji na dziś</p>
							<UButton
								variant="soft"
								color="primary"
								size="sm"
								to="/doctor/disposition"
								class="mt-2"
							>
								Ustaw dyspozycję
							</UButton>
						</div>

						<div v-else class="space-y-3">
							<div
								v-for="timeframe in todayTimeframes"
								:key="`${timeframe.start}-${timeframe.end}`"
								class="bg-primary-50 dark:bg-primary-950 flex items-center gap-3 rounded-lg p-3"
							>
								<Icon
									name="lucide:alarm-clock"
									class="text-primary-600 dark:text-primary-400 h-5 w-5"
								/>
								<span
									class="text-primary-700 dark:text-primary-300 text-lg font-semibold"
								>
									{{ formatTimeframe(timeframe) }}
								</span>
							</div>

							<div
								v-if="todayRoomNumber"
								class="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
							>
								<Icon
									name="lucide:door-open"
									class="h-5 w-5 text-gray-600 dark:text-gray-400"
								/>
								<span class="text-gray-700 dark:text-gray-300">
									Gabinet
									<span class="font-semibold">{{ todayRoomNumber }}</span>
								</span>
							</div>
						</div>
					</div>
				</UCard>

				<UCard>
					<div class="flex items-center gap-3 pb-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900"
						>
							<Icon
								name="lucide:list-todo"
								class="h-6 w-6 text-blue-600 dark:text-blue-400"
							/>
						</div>
						<div>
							<h2 class="text-xl font-bold">Pozostałe wizyty dzisiaj</h2>
							<p class="text-sm text-gray-500 dark:text-gray-400">
								Wizyty do obsłużenia
							</p>
						</div>
					</div>

					<div v-auto-animate>
						<USkeleton v-if="visitsLoading" class="h-20 w-full" />

						<UAlert
							v-else-if="visitsError"
							title="Nie udało się pobrać wizyt"
							color="error"
							variant="soft"
							:description="
								getErrorMessage(visitsError, 'Nie udało się pobrać wizyt.')
							"
						/>

						<div v-else class="grid grid-cols-2 gap-4">
							<div
								class="flex flex-col items-center rounded-lg bg-green-50 p-4 dark:bg-green-950"
							>
								<Icon
									name="lucide:map-pin"
									class="mb-2 h-8 w-8 text-green-600 dark:text-green-400"
								/>
								<span
									class="text-3xl font-bold text-green-700 dark:text-green-300"
								>
									{{ remainingOnsite }}
								</span>
								<span class="text-sm text-green-600 dark:text-green-400">
									Stacjonarne
								</span>
							</div>
							<div
								class="flex flex-col items-center rounded-lg bg-purple-50 p-4 dark:bg-purple-950"
							>
								<Icon
									name="lucide:video"
									class="mb-2 h-8 w-8 text-purple-600 dark:text-purple-400"
								/>
								<span
									class="text-3xl font-bold text-purple-700 dark:text-purple-300"
								>
									{{ remainingOnline }}
								</span>
								<span class="text-sm text-purple-600 dark:text-purple-400">
									Online
								</span>
							</div>
						</div>
					</div>
				</UCard>
			</div>

			<UCard class="mt-4">
				<div
					class="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex items-center gap-3">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900"
						>
							<Icon
								name="lucide:calendar-clock"
								class="h-6 w-6 text-orange-600 dark:text-orange-400"
							/>
						</div>
						<div>
							<h2 class="text-xl font-bold">Najbliższe wizyty</h2>
							<p class="text-sm text-gray-500 dark:text-gray-400">
								Wizyty oczekujące na obsługę
							</p>
						</div>
					</div>
					<UButton
						variant="soft"
						color="neutral"
						class="w-full cursor-pointer sm:w-fit"
						to="/doctor/visits"
					>
						Pokaż wszystkie dzisiaj
					</UButton>
				</div>

				<div v-auto-animate class="flex flex-col gap-4">
					<USkeleton v-if="visitsLoading" class="h-32 w-full" />

					<UAlert
						v-else-if="visitsError"
						title="Nie udało się pobrać wizyt"
						color="error"
						variant="soft"
						:description="
							getErrorMessage(
								visitsError,
								'Nie udało się pobrać najbliższych wizyt.'
							)
						"
					/>

					<div
						v-else-if="showVisitsEmptyState"
						class="flex flex-col items-center justify-center gap-2 py-8 text-center"
					>
						<Icon name="lucide:check-circle" class="h-12 w-12 text-green-500" />
						<p class="text-lg font-medium text-gray-700 dark:text-gray-300">
							Wszystkie wizyty na dziś zostały obsłużone
						</p>
						<p class="text-sm text-gray-500">
							Brak kolejnych wizyt zaplanowanych na dziś.
						</p>
					</div>

					<UCard
						v-for="visit in nearestVisits"
						v-else
						:key="visit.appointmentId"
						:class="[
							visit.status === 'checked_in'
								? 'ring-warning-500 dark:ring-warning-400 ring-2'
								: '',
						]"
					>
						<div class="flex items-center justify-between gap-4">
							<div class="flex items-center gap-4">
								<div
									class="hidden h-12 w-12 items-center justify-center rounded-full sm:flex"
									:class="
										visit.status === 'checked_in'
											? 'bg-warning-100 dark:bg-warning-900'
											: 'bg-blue-100 dark:bg-blue-900'
									"
								>
									<Icon
										:name="
											visit.status === 'checked_in'
												? 'lucide:user-check'
												: 'lucide:calendar'
										"
										:class="
											visit.status === 'checked_in'
												? 'text-warning-600 dark:text-warning-400 h-6 w-6'
												: 'h-6 w-6 text-blue-600 dark:text-blue-400'
										"
									/>
								</div>

								<div class="flex flex-col">
									<h3 class="text-xl font-bold">
										{{ visit.patientName || 'Pacjent' }}
									</h3>
									<p class="text-sm text-gray-500 dark:text-gray-400">
										{{
											visit.roomNumber
												? `Gabinet ${visit.roomNumber}`
												: 'Wizyta online'
										}}
									</p>

									<div
										class="mt-1 flex flex-row flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400"
									>
										<span class="flex items-center gap-1">
											<Icon name="lucide:calendar" class="h-4 w-4" />
											{{ formatDate(visit.datetime) }}
										</span>
										<span class="flex items-center gap-1">
											<Icon name="lucide:clock" class="h-4 w-4" />
											{{ formatTime(visit.datetime) }}
										</span>
										<UBadge
											variant="subtle"
											:color="getStatusColor(visit.status)"
										>
											{{ getStatusLabel(visit.status) }}
										</UBadge>
									</div>
								</div>
							</div>

							<div class="flex flex-col gap-2 sm:flex-row">
								<UButton
									v-if="visit.status === 'checked_in'"
									variant="solid"
									color="primary"
									label="Przyjmij"
									icon="lucide:play"
									class="cursor-pointer"
									@click="handleAppointment(visit.appointmentId)"
								/>
								<UButton
									v-else
									variant="soft"
									color="neutral"
									label="Szczegóły"
									icon="lucide:eye"
									class="cursor-pointer"
									@click="handleAppointment(visit.appointmentId)"
								/>
							</div>
						</div>
					</UCard>
				</div>
			</UCard>
		</ClientOnly>
	</PageContainer>
</template>
