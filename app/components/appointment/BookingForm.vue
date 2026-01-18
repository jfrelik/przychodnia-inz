<script lang="ts" setup>
	import { getLocalTimeZone, today } from '@internationalized/date';
	import type { StepperItem } from '@nuxt/ui';
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

	const slots = ref<UiSlot[]>([]);
	const slotsPending = ref(false);
	const selectedSlotId = ref<string | null>(null);
	const selectedDay = ref<string | null>(null);
	const bookingPending = ref(false);

	// Date navigation - show 30 days ahead
	const DAYS_TO_SHOW = 30;
	const availableDays = computed(() => {
		const days: string[] = [];
		for (let i = 0; i < DAYS_TO_SHOW; i++) {
			days.push(todayDate.add({ days: i }).toString());
		}
		return days;
	});

	// Current visible day index for navigation
	const dayScrollRef = ref<HTMLElement | null>(null);

	const scrollDays = (direction: 'left' | 'right') => {
		if (dayScrollRef.value) {
			const scrollAmount = 200;
			dayScrollRef.value.scrollBy({
				left: direction === 'left' ? -scrollAmount : scrollAmount,
				behavior: 'smooth',
			});
		}
	};

	const formatDateTime = (iso: string) => {
		const d = new Date(iso);
		return d.toLocaleString('pl-PL', {
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const formatDateFull = (iso: string) => {
		const d = new Date(iso);
		return d.toLocaleString('pl-PL', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const formatDayMonth = (isoDate: string) =>
		new Date(`${isoDate}T00:00:00`).toLocaleDateString('pl-PL', {
			day: '2-digit',
			month: '2-digit',
		});

	const formatWeekdayShort = (isoDate: string) =>
		new Date(`${isoDate}T00:00:00`).toLocaleDateString('pl-PL', {
			weekday: 'short',
		});

	const formatWeekday = (isoDate: string) =>
		new Date(`${isoDate}T00:00:00`).toLocaleDateString('pl-PL', {
			weekday: 'long',
		});

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

	const daysWithSlots = computed(() =>
		availableDays.value.filter(
			(day) => (slotsByDay.value[day]?.length ?? 0) > 0
		)
	);

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
			return;
		}

		slotsPending.value = true;
		selectedSlotId.value = null;
		selectedDay.value = null;

		try {
			const startDate = todayDate.toString();
			const endDate = todayDate.add({ days: DAYS_TO_SHOW - 1 }).toString();

			const params: Record<string, string | number> = {
				startDate,
				endDate,
				specializationId: schemaState.value.specializationId,
				startTime: '00:00',
				endTime: '23:59',
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

			// Auto-select first day with slots
			if (daysWithSlots.value.length > 0) {
				selectedDay.value = daysWithSlots.value[0] ?? null;
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

	// Auto-fetch slots when entering step 3
	watch(currentStep, async (newStep) => {
		if (newStep === 3 && schemaState.value.specializationId) {
			await fetchSlots();
		}
	});

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
						<!-- Loading state -->
						<div
							v-if="slotsPending"
							class="flex min-h-48 items-center justify-center"
						>
							<div class="flex flex-col items-center gap-3">
								<UIcon
									name="lucide:loader-2"
									class="size-8 animate-spin text-neutral-400"
								/>
								<p class="text-sm text-neutral-600">
									Szukam dostępnych terminów...
								</p>
							</div>
						</div>

						<!-- Content -->
						<template v-else>
							<!-- Date selector with arrows -->
							<div class="flex flex-col gap-2">
								<p class="text-sm font-medium text-gray-700">Wybierz dzień:</p>
								<div class="flex items-center gap-2">
									<UButton
										icon="lucide:chevron-left"
										variant="outline"
										color="neutral"
										size="sm"
										class="shrink-0 cursor-pointer"
										@click="scrollDays('left')"
									/>
									<div
										ref="dayScrollRef"
										class="flex flex-1 gap-2 overflow-x-auto scroll-smooth py-1"
										style="scrollbar-width: none; -ms-overflow-style: none"
									>
										<button
											v-for="day in availableDays"
											:key="day"
											:class="[
												'flex shrink-0 cursor-pointer flex-col items-center rounded-lg border px-3 py-2 transition',
												selectedDay === day
													? 'border-primary-500 bg-primary-50 text-primary-700'
													: (slotsByDay[day]?.length ?? 0) > 0
														? 'hover:border-primary-300 border-gray-200 bg-white'
														: 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400',
											]"
											:disabled="(slotsByDay[day]?.length ?? 0) === 0"
											@click="
												(slotsByDay[day]?.length ?? 0) > 0
													? (selectedDay = day)
													: null
											"
										>
											<span class="text-xs uppercase">
												{{ formatWeekdayShort(day) }}
											</span>
											<span class="text-sm font-semibold">
												{{ formatDayMonth(day) }}
											</span>
											<span
												v-if="(slotsByDay[day]?.length ?? 0) > 0"
												class="text-xs text-gray-500"
											>
												{{ slotsByDay[day]?.length }} term.
											</span>
										</button>
									</div>
									<UButton
										icon="lucide:chevron-right"
										variant="outline"
										color="neutral"
										size="sm"
										class="shrink-0 cursor-pointer"
										@click="scrollDays('right')"
									/>
								</div>
							</div>

							<!-- No slots message -->
							<div
								v-if="slots.length === 0"
								class="rounded-lg border border-dashed p-6 text-center"
							>
								<UIcon
									name="lucide:calendar-x"
									class="mx-auto mb-2 size-10 text-neutral-400"
								/>
								<p class="text-sm font-medium text-neutral-600">
									Brak dostępnych terminów
								</p>
								<p class="mt-1 text-xs text-neutral-500">
									W najbliższych {{ DAYS_TO_SHOW }} dniach nie ma wolnych
									terminów dla wybranej specjalizacji.
								</p>
							</div>

							<!-- Available slots for selected day -->
							<div v-else-if="selectedDay" class="flex flex-col gap-3">
								<p class="text-sm font-medium text-gray-700">
									Dostępne terminy w dniu
									<span class="capitalize">
										{{ formatWeekday(selectedDay) }},
									</span>
									{{ formatDayMonth(selectedDay) }}:
								</p>

								<div
									v-if="slotsForSelectedDay.length === 0"
									class="rounded-lg border border-dashed p-4 text-center text-sm text-neutral-500"
								>
									Brak terminów w tym dniu. Wybierz inny dzień.
								</div>

								<div v-else class="max-h-64 overflow-y-auto">
									<div
										v-auto-animate
										class="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3"
									>
										<div
											v-for="slot in slotsForSelectedDay"
											:key="slot.id"
											:class="[
												'cursor-pointer rounded-lg border p-3 transition',
												selectedSlotId === slot.id
													? 'border-primary-500 bg-primary-50 ring-primary-500 ring-1'
													: 'hover:border-primary-300 border-gray-200 bg-white hover:shadow-sm',
											]"
											@click="selectSlot(slot.id)"
										>
											<div class="flex items-center justify-between gap-2">
												<span class="text-lg font-semibold text-gray-900">
													{{ formatDateTime(slot.start) }}
												</span>
												<UIcon
													v-if="selectedSlotId === slot.id"
													name="lucide:check-circle"
													class="text-primary-600 size-5"
												/>
											</div>
											<p class="mt-1 text-sm text-gray-600">
												{{ slot.doctorName }}
											</p>
										</div>
									</div>
								</div>
							</div>

							<!-- Prompt to select day -->
							<div
								v-else
								class="rounded-lg border border-dashed p-4 text-center text-sm text-neutral-500"
							>
								Wybierz dzień z listy powyżej, aby zobaczyć dostępne terminy.
							</div>
						</template>

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
										{{ formatDateFull(selectedSlot.start) }} -
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
