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

	definePageMeta({
		layout: 'user',
	});

	useHead({
		title: 'Panel pacjenta',
	});

	type Specialization = {
		id: number;
		name: string;
		description?: string | null;
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
	} = await useFetch<Specialization[]>('/api/patient/specializations', {
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

	const visitModeOptions = [
		{ label: 'W placówce', value: false },
		{ label: 'Online / teleporada', value: true },
	];
	const visitTypeValue = 'consultation';
	const visitTypeLabel = 'Konsultacja (20 min)';

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
			icon: 'carbon:choices',
		},
		{
			id: 2,
			title: 'Rodzaj i tryb',
			description: 'Określ tryb wizyty',
			icon: 'carbon:types',
		},
		{
			id: 3,
			title: 'Termin',
			description: 'Znajdź wolny slot',
			icon: 'carbon:calendar',
		},
		{
			id: 4,
			title: 'Zatwierdzenie',
			description: 'Sprawdź szczegóły',
			icon: 'carbon:checkbox-checked',
		},
	];

	const activeStep = computed({
		get: () => currentStep.value - 1,
		set: (index: number) => {
			currentStep.value = index + 1;
		},
	});

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
			const response = await $fetch<{
				startDate: string;
				endDate: string;
				slots: SlotResult[];
			}>('/api/patient/availableSlots', {
				params: {
					startDate: start,
					endDate: end,
					specializationId: schemaState.value.specializationId,
					startTime: windowStart,
					endTime: windowEnd,
				},
			});

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
		} catch (error: unknown) {
			const message =
				typeof error === 'object' &&
				error !== null &&
				'data' in error &&
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				typeof (error as any).data?.message === 'string'
					? // eslint-disable-next-line @typescript-eslint/no-explicit-any
						(error as any).data.message
					: undefined;

			toast.add({
				title: 'Błąd',
				description: message || 'Nie udało się pobrać terminów.',
				color: 'error',
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
			await $fetch('/api/patient/appointments', {
				method: 'POST',
				body: {
					doctorId: selectedSlot.value.doctorId,
					datetime: selectedSlot.value.start,
					type: visitTypeValue,
					isOnline: schemaState.value.isOnline,
				},
			});

			toast.add({
				title: 'Zarezerwowano wizytę',
				description: 'Potwierdzenie wysłano na Twój e-mail.',
				color: 'success',
			});
			currentStep.value = 1;
			selectedSlotId.value = null;
			slots.value = [];
		} catch (error: unknown) {
			const message =
				typeof error === 'object' &&
				error !== null &&
				'data' in error &&
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				typeof (error as any).data?.message === 'string'
					? // eslint-disable-next-line @typescript-eslint/no-explicit-any
						(error as any).data.message
					: undefined;

			toast.add({
				title: 'Nie udało się zarezerwować',
				description: message || 'Sprawdź dane i spróbuj ponownie.',
				color: 'error',
			});
		}
	};
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel pacjenta"
			description="Umów konsultację w kilku krokach."
		/>

		<h1 class="text-2xl font-bold">
			Krok {{ currentStep }}: {{ visitSignupStep[currentStep - 1] }}
		</h1>

		<UStepper v-model="activeStep" :items="visitSteps" class="w-full" disabled>
			<template #content="{ item }">
				<UCard>
					<section v-if="item.id === 1" class="flex flex-col gap-4">
						<div class="flex w-full flex-col items-center gap-3">
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
								:description="specsError.message"
							/>
						</div>
						<div class="flex flex-row justify-between gap-3">
							<UButton
								label="Dalej"
								color="info"
								:disabled="!schemaState.specializationId || specsPending"
								class="w-full cursor-pointer"
								@click="goNext"
							/>
						</div>
					</section>

					<section v-else-if="item.id === 2" class="flex flex-col gap-4">
						<div class="flex w-full flex-col items-center gap-3">
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
								/>
							</UFormField>
							<p class="text-sm text-neutral-600">
								Rodzaj: konsultacja (procedury ustala recepcja po wywiadzie).
							</p>
						</div>
						<div class="flex flex-row justify-between gap-3">
							<UButton
								label="Cofnij"
								variant="outline"
								color="neutral"
								class="w-full cursor-pointer"
								@click="goPrev"
							/>
							<UButton
								label="Dalej"
								color="info"
								class="w-full cursor-pointer"
								@click="goNext"
							/>
						</div>
					</section>

					<section v-else-if="item.id === 3" class="flex flex-col gap-4">
						<div class="flex flex-col gap-4">
							<div
								class="grid gap-4 md:grid-cols-[minmax(240px,280px)_1fr] md:items-start"
							>
								<!-- Left: calendar + time window + search -->
								<div class="space-y-3">
									<!-- @vue-ignore -->
									<UCalendar
										v-model="selectedDateRange"
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
										icon="carbon:search"
										:loading="slotsPending"
										class="w-full cursor-pointer justify-center"
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

									<div v-else class="flex flex-row flex-wrap gap-3">
										<UCard
											v-for="day in daysWithSlots"
											:key="day"
											:class="[
												'w-fit shrink-0 cursor-pointer transition',
												selectedDay === day &&
													'border-primary-500 bg-primary-50 ring-primary-200 ring-2',
											]"
											@click="selectedDay = day"
										>
											<div class="flex flex-col items-center gap-1">
												<p class="text-base font-semibold text-gray-900">
													{{ formatDayMonth(day) }}
												</p>
												<p class="text-sm text-gray-700 capitalize">
													{{ formatWeekday(day) }}
												</p>
												<p class="text-xs text-gray-600">
													{{ slotsByDay[day]?.length ?? 0 }} wizyt
												</p>
											</div>
										</UCard>
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

								<div v-else class="flex flex-col gap-2">
									<UCard
										v-for="slot in slotsForSelectedDay"
										:key="slot.id"
										:class="[
											'w-full cursor-pointer transition',
											selectedSlotId === slot.id &&
												'border-green-400 bg-green-50 ring-2 ring-green-200',
										]"
										@click="selectSlot(slot.id)"
									>
										<div class="flex flex-col gap-1">
											<p class="text-sm font-semibold text-gray-900">
												{{ slot.doctorName }}
											</p>
											<p class="text-xs text-gray-600">
												{{ slot.specializationName || 'Specjalizacja' }}
											</p>
											<p class="text-sm text-gray-800">
												{{ formatDateTime(slot.start) }}
											</p>
										</div>
									</UCard>

									<p
										v-if="selectedDay && !slotsForSelectedDay.length"
										class="text-sm text-neutral-500"
									>
										Brak terminów w wybranym dniu.
									</p>
								</div>
							</div>
						</div>

						<div class="flex flex-row justify-between gap-3">
							<UButton
								label="Cofnij"
								variant="outline"
								color="neutral"
								class="w-full cursor-pointer"
								@click="goPrev"
							/>
							<UButton
								label="Zatwierdź termin"
								color="info"
								class="w-full cursor-pointer"
								:disabled="!selectedSlotId"
								@click="goNext"
							/>
						</div>
					</section>

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

						<div class="flex flex-row justify-between gap-3">
							<UButton
								label="Cofnij"
								variant="outline"
								class="w-full cursor-pointer"
								color="neutral"
								@click="goPrev"
							/>
							<UButton
								label="Potwierdź wizytę"
								color="success"
								class="w-full cursor-pointer"
								:disabled="!selectedSlotId"
								@click="bookVisit"
							/>
						</div>
					</section>
				</UCard>
			</template>
		</UStepper>

		<PageFooter />
	</PageContainer>
</template>
