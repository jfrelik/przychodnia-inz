<script lang="ts" setup>
	import { CalendarDate } from '@internationalized/date';
	import { DateTime } from 'luxon';

	import type { VisitDetails } from '~/components/visit/CardModal.vue';

	definePageMeta({
		layout: 'docs',
	});

	useHead({
		title: 'Wizyty',
	});

	const TIMEZONE = useAppTimezone();
	const LOCALE = useAppLocale();

	type VisitStatus = 'scheduled' | 'completed' | 'checked_in';
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

	type StatusColor =
		| 'primary'
		| 'success'
		| 'error'
		| 'neutral'
		| 'info'
		| 'warning';

	const route = useRoute();
	const router = useRouter();

	const nowWarsaw = () => DateTime.now().setZone(TIMEZONE);
	const todayLuxon = nowWarsaw().startOf('day');
	const todayDate = new CalendarDate(
		todayLuxon.year,
		todayLuxon.month,
		todayLuxon.day
	);

	const getInitialDate = (): CalendarDate => {
		const dateParam = route.query.date as string | undefined;
		if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
			const [year, month, day] = dateParam.split('-').map(Number);
			return new CalendarDate(year!, month!, day!);
		}
		return todayDate;
	};

	const selectedDate = ref<CalendarDate>(getInitialDate());

	const formatDateParam = (date: CalendarDate) => {
		const year = date.year;
		const month = String(date.month).padStart(2, '0');
		const day = String(date.day).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	const dateParam = computed(() =>
		formatDateParam(selectedDate.value as CalendarDate)
	);

	const isToday = computed(() => selectedDate.value.compare(todayDate) === 0);

	const { data, pending, error, refresh } = await useLazyFetch<Visit[]>(
		'/api/doctor/visits',
		{
			query: { date: dateParam },
			watch: [dateParam],
			server: false,
		}
	);

	const visits = computed(() => data.value ?? []);
	const showEmptyState = computed(
		() => !pending.value && !error.value && visits.value.length === 0
	);

	const scheduledVisitsCount = computed(
		() =>
			visits.value.filter((v) => ['scheduled', 'checked_in'].includes(v.status))
				.length
	);
	const completedVisitsCount = computed(
		() => visits.value.filter((v) => v.status === 'completed').length
	);

	const statusMeta: Record<VisitStatus, { label: string; color: StatusColor }> =
		{
			scheduled: { label: 'Zaplanowana', color: 'primary' },
			checked_in: { label: 'Obecność potwierdzona', color: 'warning' },
			completed: { label: 'Zakończona', color: 'success' },
		};

	const formatTime = (value: Visit['datetime']) => {
		const iso = value instanceof Date ? value.toISOString() : String(value);
		return DateTime.fromISO(iso).setZone(TIMEZONE).toFormat('HH:mm');
	};

	const formatDisplayDate = (date: CalendarDate) => {
		return DateTime.fromObject(
			{ year: date.year, month: date.month, day: date.day },
			{ zone: TIMEZONE }
		)
			.setLocale(LOCALE)
			.toLocaleString({
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			});
	};

	const getStatusLabel = (status: VisitStatus) =>
		statusMeta[status]?.label ?? 'Nieznany status';
	const getStatusColor = (status: VisitStatus): StatusColor =>
		statusMeta[status]?.color ?? 'neutral';
	const getPatientLabel = (visit: Visit) =>
		visit.patientName ?? 'Pacjent w trakcie przydziału';
	const getLocationLabel = (visit: Visit) =>
		visit.roomNumber ? `Gabinet ${visit.roomNumber}` : 'Wizyta online';

	const goToToday = () => {
		selectedDate.value = todayDate;
	};

	const goToPreviousDay = () => {
		selectedDate.value = selectedDate.value.subtract({
			days: 1,
		}) as CalendarDate;
	};

	const goToNextDay = () => {
		selectedDate.value = selectedDate.value.add({ days: 1 }) as CalendarDate;
	};

	watch(selectedDate, (newDate) => {
		const newDateParam = formatDateParam(newDate as CalendarDate);
		const todayParam = formatDateParam(todayDate);

		if (newDateParam === todayParam) {
			router.replace({ query: {} });
		} else {
			router.replace({ query: { date: newDateParam } });
		}
	});

	const isModalOpen = ref(false);
	const modalLoading = ref(false);
	const modalError = ref<string | null>(null);
	const selectedVisitDetails = ref<VisitDetails | null>(null);

	const openVisitModal = async (appointmentId: number) => {
		isModalOpen.value = true;
		modalLoading.value = true;
		modalError.value = null;
		selectedVisitDetails.value = null;

		try {
			const data = await $fetch<VisitDetails>(
				`/api/doctor/appointments/${appointmentId}`
			);
			selectedVisitDetails.value = data;
		} catch (err) {
			modalError.value = getErrorMessage(
				err,
				'Nie udało się pobrać szczegółów wizyty'
			);
		} finally {
			modalLoading.value = false;
		}
	};

	const closeModal = () => {
		isModalOpen.value = false;
		selectedVisitDetails.value = null;
		modalError.value = null;
	};
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Wizyty"
			description="Przeglądaj swoje wizyty. Wybierz datę z kalendarza, aby zobaczyć wizyty z wybranego dnia."
		/>

		<ClientOnly>
			<UCard class="mb-6">
				<div
					class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex items-center gap-3">
						<UButton
							icon="lucide:chevron-left"
							variant="soft"
							color="neutral"
							size="sm"
							class="cursor-pointer"
							@click="goToPreviousDay"
						/>

						<UPopover>
							<UButton
								variant="outline"
								color="neutral"
								icon="lucide:calendar"
								class="min-w-70 cursor-pointer justify-start"
							>
								<span class="capitalize">
									{{ formatDisplayDate(selectedDate as CalendarDate) }}
								</span>
								<UBadge
									v-if="isToday"
									variant="subtle"
									color="primary"
									size="xs"
									class="ml-2"
								>
									Dziś
								</UBadge>
							</UButton>

							<template #content>
								<UCalendar
									:model-value="selectedDate as CalendarDate"
									class="p-2"
									@update:model-value="
										(val: any) => (selectedDate = val as CalendarDate)
									"
								/>
							</template>
						</UPopover>

						<UButton
							icon="lucide:chevron-right"
							variant="soft"
							color="neutral"
							size="sm"
							class="cursor-pointer"
							@click="goToNextDay"
						/>
					</div>

					<div class="flex gap-2">
						<UButton
							v-if="!isToday"
							variant="soft"
							color="primary"
							size="sm"
							icon="lucide:calendar-check"
							class="cursor-pointer"
							@click="goToToday"
						>
							Wróć do dziś
						</UButton>
						<UButton
							v-if="!pending && !error"
							variant="soft"
							color="neutral"
							icon="lucide:refresh-cw"
							size="sm"
							class="cursor-pointer"
							@click="refresh()"
						>
							Odśwież
						</UButton>
					</div>
				</div>
			</UCard>

			<div class="mb-6 grid w-full grid-cols-1 gap-4 md:grid-cols-2">
				<UCard>
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900"
						>
							<UIcon
								name="lucide:calendar"
								class="h-6 w-6 text-blue-600 dark:text-blue-400"
							/>
						</div>
						<div v-auto-animate class="min-h-8">
							<USkeleton v-if="pending" class="h-8 w-8" />
							<p
								v-else
								class="text-2xl font-bold text-gray-800 dark:text-gray-200"
							>
								{{ scheduledVisitsCount }}
							</p>
							<p class="text-sm text-gray-600 dark:text-gray-400">
								{{ isToday ? 'Zaplanowane na dziś' : 'Zaplanowane' }}
							</p>
						</div>
					</div>
				</UCard>

				<UCard>
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900"
						>
							<UIcon
								name="lucide:check"
								class="h-6 w-6 text-green-600 dark:text-green-400"
							/>
						</div>
						<div v-auto-animate class="min-h-8">
							<USkeleton v-if="pending" class="h-8 w-8" />
							<p
								v-else
								class="text-2xl font-bold text-gray-800 dark:text-gray-200"
							>
								{{ completedVisitsCount }}
							</p>
							<p class="text-sm text-gray-600 dark:text-gray-400">
								{{ isToday ? 'Zakończone dziś' : 'Zakończone' }}
							</p>
						</div>
					</div>
				</UCard>
			</div>

			<div class="flex flex-col gap-4">
				<UAlert
					v-if="error"
					title="Nie udało się pobrać wizyt"
					color="error"
					variant="soft"
					:description="getErrorMessage(error, 'Spróbuj ponownie później.')"
				>
					<template #actions>
						<UButton
							class="cursor-pointer"
							color="error"
							variant="soft"
							size="sm"
							@click="refresh()"
						>
							Spróbuj ponownie
						</UButton>
					</template>
				</UAlert>

				<div v-else v-auto-animate>
					<div v-if="pending" class="flex flex-col gap-4">
						<USkeleton
							v-for="placeholder in 3"
							:key="placeholder"
							class="h-20 w-full"
						/>
					</div>

					<div
						v-else-if="showEmptyState"
						class="flex flex-col items-center justify-center gap-2 py-12 text-center"
					>
						<UIcon name="lucide:calendar-x" class="h-12 w-12 text-gray-400" />
						<p class="text-lg font-medium text-gray-700 dark:text-gray-300">
							Brak wizyt {{ isToday ? 'na dziś' : 'w wybranym dniu' }}
						</p>
						<p class="text-sm text-gray-500">
							Wybierz inną datę lub sprawdź później.
						</p>
					</div>

					<div v-else class="flex flex-col gap-3">
						<UCard v-for="visit in visits" :key="visit.appointmentId">
							<div class="flex items-center gap-4">
								<div
									class="flex flex-col items-center rounded-lg px-3 py-2"
									:class="
										visit.status === 'checked_in'
											? 'bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300'
											: visit.status === 'completed'
												? 'bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300'
												: 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
									"
								>
									<span class="text-lg font-bold">
										{{ formatTime(visit.datetime) }}
									</span>
								</div>
								<div class="flex flex-1 flex-col gap-1">
									<p
										class="text-base font-semibold text-gray-900 dark:text-gray-100"
									>
										{{ getPatientLabel(visit) }}
									</p>
									<div
										class="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
									>
										<span class="flex items-center gap-1">
											<UIcon
												:name="
													visit.roomNumber ? 'lucide:map-pin' : 'lucide:video'
												"
												class="h-4 w-4"
											/>
											{{ getLocationLabel(visit) }}
										</span>
										<UBadge
											variant="subtle"
											:color="getStatusColor(visit.status)"
											size="sm"
										>
											{{ getStatusLabel(visit.status) }}
										</UBadge>
									</div>
								</div>
								<div class="flex gap-2">
									<UButton
										variant="ghost"
										color="neutral"
										icon="lucide:file-text"
										size="sm"
										class="cursor-pointer"
										@click="openVisitModal(visit.appointmentId)"
									>
										Karta
									</UButton>
									<UButton
										v-if="
											['scheduled', 'checked_in'].includes(visit.status) &&
											isToday
										"
										:variant="visit.status === 'checked_in' ? 'solid' : 'soft'"
										:color="visit.status === 'checked_in' ? 'primary' : 'info'"
										icon="lucide:play"
										size="sm"
										class="cursor-pointer"
										:to="`/doctor/handleAppointment/${visit.appointmentId}`"
									>
										{{ visit.status === 'checked_in' ? 'Przyjmij' : 'Obsłuż' }}
									</UButton>
								</div>
							</div>
						</UCard>
					</div>
				</div>
			</div>
		</ClientOnly>

		<VisitCardModal
			v-model:open="isModalOpen"
			:loading="modalLoading"
			:error="modalError"
			:visit="selectedVisitDetails"
			:show-patient="true"
			@close="closeModal"
		/>
	</PageContainer>
</template>
