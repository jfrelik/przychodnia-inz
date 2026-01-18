<script lang="ts" setup>
	import {
		CalendarDate,
		getLocalTimeZone,
		today,
		type DateValue,
	} from '@internationalized/date';
	import type { StepperItem } from '@nuxt/ui';
	import type { DateRange } from 'reka-ui';
	import * as z from 'zod';

	type Specialization = {
		id: number;
		name: string;
		description?: string | null;
		icon?: string | null;
	};

	type SlotResult = {
		doctorId: string;
		doctorName?: string | null;
		doctorEmail?: string | null;
		specializationId?: number | null;
		specializationName?: string | null;
		slots: { start: string; end: string }[];
	};

	type UiSlot = {
		id: string;
		doctorId: string;
		doctorName: string;
		start: string;
		end: string;
		specializationName?: string | null;
	};

	type VisitType = 'consultation' | 'procedure';

	const props = withDefaults(
		defineProps<{
			/** Patient info for receptionist mode */
			patient?: { userId: string; name: string; email: string } | null;
			/** Allow procedure booking (receptionist only) */
			allowProcedures?: boolean;
			/** API base path for slots and appointments */
			apiBasePath: '/api/patient' | '/api/receptionist';
			/** Callback after successful booking */
			onSuccess?: () => void;
		}>(),
		{
			patient: null,
			allowProcedures: false,
			onSuccess: undefined,
		}
	);

	const emit = defineEmits<{
		success: [];
	}>();

	const toast = useToast();

	const schema = z.object({
		specializationId: z.number().int().positive().optional(),
		isOnline: z.boolean(),
	});
	type Schema = z.output<typeof schema>;

	const schemaState = ref<Schema>({
		specializationId: undefined,
		isOnline: false,
	});

	const {
		data: specializationsData,
		pending: specsPending,
		error: specsError,
		refresh: refreshSpecializations,
	} = await useLazyFetch<Specialization[]>('/api/patient/specializations', {
		server: false,
		default: () => [],
	});

	const specializationOptions = computed(() =>
		(specializationsData.value ?? []).map((s) => ({
			label: s.name,
			value: s.id,
		}))
	);

	const selectedSpecializationDescription = computed(
		() =>
			(specializationsData.value ?? []).find(
				(s) => s.id === schemaState.value.specializationId
			)?.description ?? ''
	);

	// Visit type options (procedure only for receptionist)
	const visitTypeOptions = computed(() => {
		const options: { label: string; value: VisitType }[] = [
			{ label: 'Konsultacja (20 min)', value: 'consultation' },
		];
		if (props.allowProcedures) {
			options.push({ label: 'Procedura (60 min)', value: 'procedure' });
		}
		return options;
	});
	const visitType = ref<VisitType>('consultation');

	const baseVisitModeOptions = [
		{ label: 'W placówce', value: false },
		{ label: 'Online / teleporada', value: true },
	];
	const visitModeOptions = computed(() =>
		visitType.value === 'procedure'
			? baseVisitModeOptions.filter((option) => option.value === false)
			: baseVisitModeOptions
	);
	const visitTypeLabel = computed(
		() =>
			visitTypeOptions.value.find((v) => v.value === visitType.value)?.label ??
			'Konsultacja (20 min)'
	);

	const visitSignupStep = [
		'Wybór specjalizacji',
		'Rodzaj i tryb wizyty',
		'Wybór terminu wizyty',
		'Zatwierdzenie wizyty',
	];

	const currentStep = ref(1);
	const visitSteps: StepperItem[] = [
		{
			id: 1,
			title: 'Specjalizacja',
			description: 'Wybierz specjalizację lekarza',
			icon: 'lucide:list',
		},
		{
			id: 2,
			title: 'Rodzaj i tryb',
			description: 'Określ tryb wizyty',
			icon: 'lucide:layout-grid',
		},
		{
			id: 3,
			title: 'Termin',
			description: 'Znajdź wolny slot',
			icon: 'lucide:calendar',
		},
		{
			id: 4,
			title: 'Zatwierdzenie',
			description: 'Sprawdź szczegóły',
			icon: 'lucide:check-square',
		},
	];

	const activeStep = computed({
		get: () => currentStep.value - 1,
		set: (index: number) => {
			currentStep.value = index + 1;
		},
	});

	const isMobile = useMediaQuery('(max-width: 640px)');

	const tz = getLocalTimeZone();
	const todayDate = today(tz);
	const selectedDateRange = ref<DateRange | null>({
		start: todayDate,
		end: todayDate.add({ weeks: 1 }),
	});

	const timeWindow = ref({ start: '08:00', end: '18:00' });
	const slots = ref<UiSlot[]>([]);
	const slotsPending = ref(false);
	const selectedSlotId = ref<string | null>(null);
	const selectedDay = ref<string | null>(null);
	const bookingPending = ref(false);

	const unavailableDates = (date: DateValue) => {
		let calendarDate: CalendarDate;
		if ('toCalendar' in date && typeof date.toCalendar === 'function') {
			calendarDate = date as CalendarDate;
		} else {
			const [yearStr, monthStr, dayStr] = date.toString().split('-');
			const year = Number(yearStr);
			const month = Number(monthStr);
			const day = Number(dayStr);
			if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
				throw new Error('Invalid date value');
			}
			calendarDate = new CalendarDate(year, month, day);
		}
		return calendarDate.compare(todayDate) < 0;
	};

	const formatDateTime = (iso: string) => {
		const d = new Date(iso);
		return d.toLocaleString('pl-PL', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const formatDateLabel = (isoDate: string) => {
		return new Date(`${isoDate}T00:00:00`).toLocaleDateString('pl-PL', {
			weekday: 'short',
			day: '2-digit',
			month: '2-digit',
		});
	};

	const formatDayMonth = (isoDate: string) =>
		new Date(`${isoDate}T00:00:00`).toLocaleDateString('pl-PL', {
			day: '2-digit',
			month: '2-digit',
		});

	const formatWeekday = (isoDate: string) =>
		new Date(`${isoDate}T00:00:00`).toLocaleDateString('pl-PL', {
			weekday: 'long',
		});

	const timeToMinutes = (time: string) => {
		const [h, m] = time.split(':').map(Number);
		return (h || 0) * 60 + (m || 0);
	};

	const slotsByDay = computed<Record<string, UiSlot[]>>(() => {
		const grouped: Record<string, UiSlot[]> = {};
		for (const slot of slots.value) {
			const day = slot.start.slice(0, 10);
			const arr = grouped[day] ?? [];
			arr.push(slot);
			grouped[day] = arr.sort(
				(a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
			);
		}
		return grouped;
	});

	const daysWithSlots = computed(() => Object.keys(slotsByDay.value).sort());

	const slotsForSelectedDay = computed(() =>
		selectedDay.value ? (slotsByDay.value[selectedDay.value] ?? []) : []
	);

	watch(selectedDay, () => {
		selectedSlotId.value = null;
	});

	watch(visitType, () => {
		selectedSlotId.value = null;
		selectedDay.value = null;
		slots.value = [];
		if (visitType.value === 'procedure') {
			schemaState.value.isOnline = false;
		}
	});

	const fetchSlots = async () => {
		const parsed = schema.safeParse(schemaState.value);
		if (!parsed.success || !schemaState.value.specializationId) {
			toast.add({
				title: 'Brak danych',
				description: 'Wybierz specjalizację i tryb wizyty.',
				color: 'warning',
			});
			return;
		}

		if (!selectedDateRange.value) {
			toast.add({
				title: 'Brak zakresu dat',
				description: 'Ustaw zakres dat przed wyszukiwaniem.',
				color: 'warning',
			});
			return;
		}
		if (!selectedDateRange.value.start) {
			toast.add({
				title: 'Brak daty początkowej',
				description: 'Wybierz datę startową przed wyszukiwaniem.',
				color: 'warning',
			});
			return;
		}

		const { start: windowStart, end: windowEnd } = timeWindow.value;
		const fromMinutes = timeToMinutes(windowStart);
		const toMinutes = timeToMinutes(windowEnd);
		if (!windowStart || !windowEnd || fromMinutes >= toMinutes) {
			toast.add({
				title: 'Nieprawidłowy zakres godzin',
				description: 'Ustaw godziny od i do (od < do).',
				color: 'warning',
			});
			return;
		}

		slotsPending.value = true;
		selectedSlotId.value = null;
		selectedDay.value = null;

		try {
			const start = selectedDateRange.value.start.toString();
			const end =
				selectedDateRange.value.end?.toString() ??
				selectedDateRange.value.start.toString();

			const params: Record<string, string | number> = {
				startDate: start,
				endDate: end,
				specializationId: schemaState.value.specializationId,
				startTime: windowStart,
				endTime: windowEnd,
			};

			// Receptionist API accepts type param for procedure slots
			if (props.allowProcedures) {
				params.type = visitType.value;
			}

			const response = await $fetch<{
				startDate: string;
				endDate: string;
				slots: SlotResult[];
			}>(`${props.apiBasePath}/availableSlots`, { params });

			const flattened: UiSlot[] = (response.slots ?? []).flatMap((doc) =>
				(doc.slots ?? []).map((slot) => ({
					id: `${doc.doctorId}-${slot.start}`,
					doctorId: doc.doctorId,
					doctorName: doc.doctorName || 'Lekarz',
					start: slot.start,
					end: slot.end,
					specializationName: doc.specializationName,
				}))
			);

			slots.value = flattened;
			selectedDay.value = daysWithSlots.value[0] ?? null;

			if (!flattened.length) {
				toast.add({
					title: 'Brak terminów',
					description: 'Brak wolnych slotów dla wybranych kryteriów.',
					color: 'warning',
				});
			}
		} catch (error) {
			toast.add({
				title: 'Błąd',
				description: getErrorMessage(error, 'Nie udało się pobrać terminów.'),
				color: 'error',
				icon: 'lucide:alert-triangle',
			});
		} finally {
			slotsPending.value = false;
		}
	};

	const selectSlot = (id: string) => {
		selectedSlotId.value = selectedSlotId.value === id ? null : id;
	};

	const selectedSlot = computed(() =>
		slots.value.find((slot) => slot.id === selectedSlotId.value)
	);

	const goNext = () => {
		if (currentStep.value === 3 && !selectedSlotId.value) return;
		if (currentStep.value < visitSteps.length) currentStep.value++;
	};
	const goPrev = () => {
		if (currentStep.value > 1) currentStep.value--;
	};

	const bookVisit = async () => {
		if (!selectedSlot.value) {
			toast.add({
				title: 'Brak terminu',
				description: 'Wybierz termin, aby potwierdzić wizytę.',
				color: 'warning',
			});
			return;
		}

		try {
			bookingPending.value = true;

			const body: Record<string, unknown> = {
				doctorId: selectedSlot.value.doctorId,
				datetime: selectedSlot.value.start,
				type: visitType.value,
				isOnline: schemaState.value.isOnline,
			};

			// Receptionist mode requires patientId
			if (props.patient) {
				body.patientId = props.patient.userId;
			}

			await $fetch(`${props.apiBasePath}/appointments`, {
				method: 'POST',
				body,
			});

			const successMessage = props.patient
				? 'Pacjent otrzyma potwierdzenie e-mail.'
				: 'Potwierdzenie wysłano na Twój e-mail.';

			toast.add({
				title: 'Zarezerwowano wizytę',
				description: successMessage,
				color: 'success',
				icon: 'lucide:check',
			});

			// Reset form
			currentStep.value = 1;
			selectedSlotId.value = null;
			slots.value = [];
			selectedDay.value = null;
			schemaState.value.specializationId = undefined;
			schemaState.value.isOnline = false;
			visitType.value = 'consultation';

			emit('success');
			props.onSuccess?.();
		} catch (error) {
			toast.add({
				title: 'Nie udało się zarezerwować',
				description: getErrorMessage(error, 'Sprawdź dane i spróbuj ponownie.'),
				color: 'error',
				icon: 'lucide:alert-triangle',
			});
		} finally {
			bookingPending.value = false;
		}
	};

	// For receptionist mode - check if patient is provided
	const isReceptionistMode = computed(() => props.patient !== null);
	const canProceed = computed(() => !isReceptionistMode.value || props.patient);
</script>

<template>
	<div class="flex flex-col gap-4">
		<h1 class="text-lg font-bold sm:text-2xl">
			Krok {{ currentStep }}: {{ visitSignupStep[currentStep - 1] }}
		</h1>

		<UStepper
			v-model="activeStep"
			:items="visitSteps"
			:orientation="isMobile ? 'vertical' : 'horizontal'"
			:ui="isMobile ? { root: 'flex flex-col gap-4' } : undefined"
			class="w-full"
			disabled
		>
			<template #content="{ item }">
				<UCard>
					<!-- Step 1: Specialization -->
					<section v-if="item.id === 1" class="flex min-h-48 flex-col gap-4">
						<div class="flex h-full w-full flex-col items-center gap-3">
							<UFormField
								label="Specjalizacja"
								name="specialization"
								class="w-full md:w-1/2"
							>
								<USelect
									v-model="schemaState.specializationId"
									:items="specializationOptions"
									placeholder="Wybierz specjalizację"
									class="w-full cursor-pointer"
									:disabled="!canProceed"
								/>
							</UFormField>
							<p
								v-if="
									schemaState.specializationId &&
									selectedSpecializationDescription
								"
								class="text-sm text-neutral-600"
							>
								{{ selectedSpecializationDescription }}
							</p>
							<UAlert
								v-if="specsError"
								color="error"
								title="Nie udało się pobrać specjalizacji"
								:description="specsError.message || 'Spróbuj ponownie później.'"
							>
								<template #actions>
									<UButton
										color="error"
										variant="soft"
										size="sm"
										class="cursor-pointer"
										:loading="specsPending"
										@click="() => refreshSpecializations()"
									>
										Spróbuj ponownie
									</UButton>
								</template>
							</UAlert>
						</div>
						<div class="mt-auto flex justify-end">
							<UButton
								label="Dalej"
								color="info"
								trailing-icon="lucide:arrow-right"
								:disabled="
									!schemaState.specializationId || specsPending || !canProceed
								"
								class="w-full cursor-pointer sm:w-auto"
								@click="goNext"
							/>
						</div>
					</section>

					<!-- Step 2: Visit type and mode -->
					<section
						v-else-if="item.id === 2"
						class="flex min-h-48 flex-col gap-4"
					>
						<div class="flex w-full flex-col items-center gap-3">
							<!-- Visit type (only show selector if procedures allowed) -->
							<UFormField
								v-if="allowProcedures"
								label="Rodzaj wizyty"
								name="visit-type"
								class="w-full md:w-1/2"
							>
								<USelect
									v-model="visitType"
									:items="visitTypeOptions"
									placeholder="Wybierz rodzaj wizyty"
									class="w-full cursor-pointer"
									:disabled="!canProceed"
								/>
							</UFormField>

							<UFormField
								label="Tryb wizyty"
								name="mode"
								class="w-full md:w-1/2"
							>
								<USelect
									v-model="schemaState.isOnline"
									:items="visitModeOptions"
									placeholder="Wybierz tryb wizyty"
									class="w-full cursor-pointer"
									:disabled="!canProceed || visitType === 'procedure'"
								/>
							</UFormField>
							<p class="text-sm text-neutral-600">
								<template v-if="allowProcedures">
									Rodzaj: {{ visitTypeLabel }}. Procedura rezerwuje 60 minut i
									odbywa się tylko stacjonarnie.
								</template>
								<template v-else>
									Wybierz rodzaj wizyty. Zabiegi umówisz bezpośrednio w placówce
									lub telefonicznie.
								</template>
							</p>
						</div>
						<div
							class="mt-auto flex flex-col gap-3 sm:flex-row sm:justify-between"
						>
							<UButton
								label="Cofnij"
								variant="outline"
								color="neutral"
								trailing-icon="lucide:arrow-left"
								class="w-full cursor-pointer sm:w-auto"
								@click="goPrev"
							/>
							<UButton
								label="Dalej"
								color="info"
								trailing-icon="lucide:arrow-right"
								class="w-full cursor-pointer sm:w-auto"
								:disabled="!canProceed"
								@click="goNext"
							/>
						</div>
					</section>

					<!-- Step 3: Date/time selection -->
					<section v-else-if="item.id === 3" class="flex flex-col gap-4">
						<div class="flex flex-col gap-4">
							<div
								class="grid gap-4 lg:grid-cols-[minmax(240px,280px)_1fr] lg:items-start"
							>
								<div class="space-y-3">
									<!-- @vue-ignore -->
									<UCalendar
										v-model="selectedDateRange"
										:year-controls="false"
										range
										:is-date-unavailable="unavailableDates"
									/>
									<div class="grid grid-cols-2 gap-2">
										<UFormField label="Od" name="time-from">
											<UInput v-model="timeWindow.start" type="time" />
										</UFormField>
										<UFormField label="Do" name="time-to">
											<UInput v-model="timeWindow.end" type="time" />
										</UFormField>
									</div>
									<UButton
										label="Szukaj wizyty"
										icon="lucide:search"
										:loading="slotsPending"
										class="w-full cursor-pointer justify-center"
										:disabled="!canProceed"
										@click="fetchSlots"
									/>
								</div>

								<!-- Right: available days -->
								<div class="flex flex-col gap-3">
									<p class="text-sm text-neutral-600">
										Wybierz dzień i odpowiadającą Ci wizytę. Możesz zawęzić
										godziny wyszukiwania.
									</p>

									<div
										v-if="slotsPending"
										class="rounded-lg border border-dashed p-4 text-sm text-neutral-600"
									>
										Ładuję dostępne terminy...
									</div>

									<div
										v-else-if="!slots.length"
										class="rounded-lg border border-dashed p-4 text-sm text-neutral-600"
									>
										Brak wyników — wybierz inny zakres dat lub godzin.
									</div>

									<div v-else v-auto-animate>
										<UScrollArea
											:orientation="isMobile ? 'horizontal' : 'vertical'"
											:class="
												isMobile
													? 'w-full max-w-full'
													: 'max-h-72 w-full max-w-full'
											"
										>
											<div
												:class="
													isMobile
														? 'flex gap-4 px-2 py-2'
														: 'flex flex-col gap-4 py-2 pr-3'
												"
											>
												<div
													v-for="day in daysWithSlots"
													:key="day"
													:class="[
														'cursor-pointer rounded-xl border bg-white px-4 py-4 shadow-sm transition',
														isMobile ? 'min-w-40 shrink-0' : 'w-full',
														selectedDay === day
															? 'border-secondary-400 bg-secondary-50'
															: 'hover:border-primary-300 border-gray-200',
													]"
													@click="selectedDay = day"
												>
													<div
														:class="
															isMobile
																? 'flex flex-col gap-2 text-left'
																: 'grid grid-cols-[auto_1fr] items-center gap-3'
														"
													>
														<div class="flex flex-col">
															<p class="text-lg font-semibold text-gray-900">
																{{ formatDayMonth(day) }}
															</p>
															<p
																class="text-xs tracking-wide text-gray-500 uppercase"
															>
																Dzień
															</p>
														</div>
														<div class="flex flex-col gap-1">
															<p
																class="text-sm font-medium text-gray-700 capitalize"
															>
																{{ formatWeekday(day) }}
															</p>
															<p class="text-xs text-gray-600">
																{{ slotsByDay[day]?.length ?? 0 }} wizyt
															</p>
														</div>
													</div>
												</div>
											</div>
										</UScrollArea>
									</div>
								</div>
							</div>

							<!-- Below both: available visits for selected day -->
							<div v-if="!slotsPending && slots.length" class="space-y-2">
								<p class="text-sm font-semibold text-gray-700">
									{{
										selectedDay ? formatDateLabel(selectedDay) : 'Wybierz dzień'
									}}
								</p>

								<div
									v-if="!selectedDay"
									class="rounded-lg border border-dashed p-4"
								>
									<p class="text-sm text-neutral-600">
										Wybierz dzień z listy po prawej stronie.
									</p>
								</div>

								<div v-else v-auto-animate>
									<UScrollArea
										:orientation="isMobile ? 'horizontal' : 'vertical'"
										:class="
											isMobile
												? 'w-full max-w-full'
												: 'max-h-80 w-full max-w-full'
										"
									>
										<div
											:class="
												isMobile
													? 'flex gap-4 px-2 py-2'
													: 'flex flex-col gap-4 py-2 pr-3'
											"
										>
											<div
												v-for="slot in slotsForSelectedDay"
												:key="slot.id"
												:class="[
													'cursor-pointer rounded-xl border bg-white px-4 py-4 shadow-sm transition',
													isMobile ? 'min-w-60 shrink-0' : 'w-full',
													selectedSlotId === slot.id
														? 'border-secondary-400 bg-secondary-50'
														: 'border-gray-200 hover:border-green-300',
												]"
												@click="selectSlot(slot.id)"
											>
												<div class="flex flex-col gap-2">
													<div class="flex items-start justify-between gap-3">
														<p class="text-sm font-semibold text-gray-900">
															{{ slot.doctorName }}
														</p>
														<p class="text-sm font-semibold text-gray-800">
															{{ formatDateTime(slot.start) }}
														</p>
													</div>
													<div class="flex items-center justify-between gap-2">
														<p class="text-xs text-gray-600">
															{{ slot.specializationName || 'Specjalizacja' }}
														</p>
														<p class="text-xs text-gray-500">Termin</p>
													</div>
												</div>
											</div>
										</div>
									</UScrollArea>
									<p
										v-if="selectedDay && !slotsForSelectedDay.length"
										class="text-sm text-neutral-500"
									>
										Brak terminów w wybranym dniu.
									</p>
								</div>
							</div>
						</div>

						<div class="flex flex-col gap-3 sm:flex-row sm:justify-between">
							<UButton
								label="Cofnij"
								variant="outline"
								color="neutral"
								icon="lucide:arrow-left"
								class="w-full cursor-pointer sm:w-auto"
								@click="goPrev"
							/>
							<UButton
								label="Zatwierdź termin"
								color="info"
								icon="lucide:calendar-check"
								class="w-full cursor-pointer sm:w-auto"
								:disabled="!selectedSlotId"
								@click="goNext"
							/>
						</div>
					</section>

					<!-- Step 4: Confirmation -->
					<section v-else-if="item.id === 4" class="flex flex-col gap-4">
						<div>
							<p class="text-lg font-semibold text-gray-900">
								Podsumowanie wizyty
							</p>
							<p class="text-sm text-gray-500">
								Sprawdź, czy poniższe dane są poprawne przed potwierdzeniem.
							</p>
						</div>

						<UCard class="w-full">
							<div class="space-y-4">
								<!-- Patient info (receptionist mode only) -->
								<div v-if="patient">
									<p
										class="text-xs font-medium tracking-wide text-gray-500 uppercase"
									>
										Pacjent
									</p>
									<p class="text-sm font-medium text-gray-900">
										{{ patient.name }}
									</p>
									<p class="text-xs text-gray-600">{{ patient.email }}</p>
								</div>

								<div>
									<p
										class="text-xs font-medium tracking-wide text-gray-500 uppercase"
									>
										Specjalizacja
									</p>
									<p class="text-sm font-medium text-gray-900">
										{{
											specializationOptions.find(
												(s) => s.value === schemaState.specializationId
											)?.label || 'Nie wybrano'
										}}
									</p>
								</div>

								<div>
									<p
										class="text-xs font-medium tracking-wide text-gray-500 uppercase"
									>
										Rodzaj wizyty
									</p>
									<p class="text-sm font-medium text-gray-900">
										{{ visitTypeLabel }}
									</p>
								</div>

								<div>
									<p
										class="text-xs font-medium tracking-wide text-gray-500 uppercase"
									>
										Tryb
									</p>
									<p class="text-sm font-medium text-gray-900">
										{{
											schemaState.isOnline ? 'Online / telefon' : 'W placówce'
										}}
									</p>
								</div>

								<div>
									<p
										class="text-xs font-medium tracking-wide text-gray-500 uppercase"
									>
										Termin wizyty
									</p>
									<p
										v-if="selectedSlot"
										class="text-sm font-medium text-gray-900"
									>
										{{ formatDateTime(selectedSlot.start) }} -
										{{ selectedSlot.doctorName }}
									</p>
									<p v-else class="text-sm text-gray-500">
										Nie wybrano terminu wizyty
									</p>
								</div>
							</div>
						</UCard>

						<div class="flex flex-col gap-3 sm:flex-row sm:justify-between">
							<UButton
								label="Cofnij"
								variant="outline"
								class="w-full cursor-pointer sm:w-auto"
								color="neutral"
								icon="lucide:arrow-left"
								@click="goPrev"
							/>
							<UButton
								label="Potwierdź wizytę"
								color="success"
								icon="lucide:check-circle"
								class="w-full cursor-pointer sm:w-auto"
								:disabled="!selectedSlotId || !canProceed"
								:loading="bookingPending"
								@click="bookVisit"
							/>
						</div>
					</section>
				</UCard>
			</template>
		</UStepper>
	</div>
</template>
