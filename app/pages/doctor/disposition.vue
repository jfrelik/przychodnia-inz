<script lang="ts" setup>
	import type { FormSubmitEvent } from '#ui/types';
	import {
		CalendarDate,
		type DateValue,
		getLocalTimeZone,
		today,
	} from '@internationalized/date';
	import { z } from 'zod';

	type AnyDate = Pick<DateValue, 'year' | 'month' | 'day'>;

	definePageMeta({
		layout: 'docs',
	});

	useHead({
		title: 'Dyspozycje',
	});

	const toast = useToast();

	type Disposition = {
		scheduleId: string;
		day: string;
		timeStart: string;
		timeEnd: string;
		doctorUserId: string;
	};

	const todayDate = today(getLocalTimeZone());
	const minDate = todayDate.add({ days: 1 });
	const minDateKey = `${minDate.year}-${String(minDate.month).padStart(2, '0')}-${String(minDate.day).padStart(2, '0')}`;
	const initialMonthValue = `${minDate.year}-${String(minDate.month).padStart(2, '0')}`;
	const selectedMonth = ref(initialMonthValue);
	const selectedDates = ref<CalendarDate[]>([]);

	const formState = ref<{
		dates: Record<string, { start: number; end: number }[]>;
	}>({
		dates: {},
	});
	const pastDispositionDates = ref(new Set<string>());

	const dateKey = (date: AnyDate) =>
		`${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;

	const formatDateLabel = (date: AnyDate) => {
		const jsDate = new Date(date.year, date.month - 1, date.day);

		return new Intl.DateTimeFormat('pl-PL', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
		}).format(jsDate);
	};

	const monthOptions = computed(() => {
		const options: Array<{ label: string; value: string }> = [];
		const start = new CalendarDate(todayDate.year, todayDate.month, 1);

		for (let i = 0; i < 2; i++) {
			const monthDate = start.add({ months: i });
			const label = new Intl.DateTimeFormat('pl-PL', {
				month: 'long',
				year: 'numeric',
			}).format(new Date(monthDate.year, monthDate.month - 1, 1));
			const value = `${monthDate.year}-${String(monthDate.month).padStart(2, '0')}`;
			options.push({ label, value });
		}

		return options;
	});

	const periodStartDate = computed(() => {
		const [year, month] = selectedMonth.value
			.split('-')
			.map((v) => Number.parseInt(v, 10)) as [number, number];
		return new CalendarDate(year, month, 1);
	});
	const periodStart = computed(() => dateKey(periodStartDate.value));
	const periodEnd = computed(() =>
		dateKey(periodStartDate.value.add({ months: 1, days: -1 }))
	);
	const calendarPlaceholder = computed(() => periodStartDate.value);
	const dispositionQuery = computed(() => ({
		startDate: periodStart.value,
		endDate: periodEnd.value,
	}));

	const { data: existingDispositions } = await useFetch<Disposition[]>(
		'/api/doctor/dispositions',
		{
			query: dispositionQuery,
			watch: [periodStart, periodEnd],
			default: () => [],
		}
	);

	const parseHour = (time: string) => {
		const hour = Number.parseInt(time.split(':')[0] ?? '0', 10);
		return Number.isFinite(hour) ? hour : 7;
	};

	const sortDates = (dates: CalendarDate[]) =>
		dates.sort((a, b) => dateKey(a).localeCompare(dateKey(b)));

	watch(
		existingDispositions,
		(list) => {
			if (!list || list.length === 0) {
				formState.value.dates = {};
				selectedDates.value = [];
				pastDispositionDates.value = new Set<string>();
				return;
			}

			const nextDates: Record<string, { start: number; end: number }[]> = {};
			const calendarDates: CalendarDate[] = [];
			const pastKeys = new Set<string>();

			for (const item of list) {
				if (item.day < minDateKey) {
					pastKeys.add(item.day);
					continue;
				}
				const [y, m, d] = item.day
					.split('-')
					.map((x) => Number.parseInt(x, 10));
				if (!y || !m || !d) continue;

				const calDate = new CalendarDate(y, m, d);
				const k = dateKey(calDate);

				if (!nextDates[k]) {
					nextDates[k] = [];
					calendarDates.push(calDate);
				}

				nextDates[k]!.push({
					start: parseHour(item.timeStart),
					end: parseHour(item.timeEnd),
				});
			}

			formState.value.dates = nextDates;
			selectedDates.value = sortDates(calendarDates);
			pastDispositionDates.value = pastKeys;
		},
		{ immediate: true }
	);

	watch(selectedMonth, () => {
		formState.value.dates = {};
		selectedDates.value = [];
		pastDispositionDates.value = new Set<string>();
	});

	const timeframeSchema = z
		.object({
			start: z
				.number()
				.min(7, 'Minimalna godzina to 7')
				.max(23, 'Maksymalna godzina to 23'),
			end: z
				.number()
				.min(7, 'Minimalna godzina to 7')
				.max(23, 'Maksymalna godzina to 23'),
		})
		.refine((data) => data.end > data.start, {
			message: 'Godzina zakończenia musi być późniejsza niż rozpoczęcia',
			path: ['end'],
		});

	const daySchema = z.array(timeframeSchema).superRefine((ranges, ctx) => {
		if (ranges.length <= 1) return;

		const sorted = ranges
			.map((r, index) => ({ ...r, index }))
			.sort((a, b) => a.start - b.start);

		for (let i = 1; i < sorted.length; i++) {
			const prev = sorted[i - 1];
			const curr = sorted[i];

			if (curr && prev && curr.start < prev.end) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Przedziały czasowe nie mogą na siebie nachodzić',
					path: [String(curr.index), 'start'],
				});
			}
		}
	});

	const schema = z.object({
		dates: z.record(z.string(), daySchema).superRefine((val, ctx) => {
			if (Object.keys(val).length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Wybierz przynajmniej jeden dzień w kalendarzu',
					path: ['_form'],
				});
			}
		}),
	});

	type DispositionForm = z.infer<typeof schema>;

	const modalOpen = ref(false);
	const modalDate = ref<CalendarDate | null>(null);
	const modalRanges = ref<{ start: number; end: number }[]>([]);
	const modalMode = ref<'add' | 'edit'>('add');
	const pendingDateKey = ref<string | null>(null);

	const displayDates = computed(() =>
		selectedDates.value.filter(
			(date) => (formState.value.dates[dateKey(date)]?.length ?? 0) > 0
		)
	);
	const isEditableDate = (date: AnyDate) => dateKey(date) >= minDateKey;
	const isPastDisposition = (date: AnyDate) =>
		pastDispositionDates.value.has(dateKey(date));

	const formatTimeRange = (range: { start: number; end: number }) =>
		`${String(range.start).padStart(2, '0')}:00 - ${String(range.end).padStart(2, '0')}:00`;

	const validateRanges = (ranges: { start: number; end: number }[]) => {
		const result = daySchema.safeParse(ranges);
		if (result.success) return true;

		const message = result.error.issues[0]?.message ?? 'Nieprawidłowe godziny';
		toast.add({
			title: 'Nieprawidłowe godziny',
			description: message,
			color: 'error',
		});
		return false;
	};

	const openDateModal = (date: AnyDate, mode: 'add' | 'edit') => {
		const key = dateKey(date);
		const calDate = new CalendarDate(date.year, date.month, date.day);
		const existing = formState.value.dates[key];
		modalDate.value = calDate;
		modalRanges.value = existing?.length
			? existing.map((r) => ({ ...r }))
			: [{ start: 8, end: 16 }];
		modalMode.value = mode;
		pendingDateKey.value = mode === 'add' ? key : null;
		modalOpen.value = true;
	};

	const cancelModal = () => {
		modalOpen.value = false;
		if (modalMode.value === 'add' && pendingDateKey.value) {
			const key = pendingDateKey.value;
			selectedDates.value = selectedDates.value.filter(
				(d) => dateKey(d) !== key
			);
			const { [key]: _removed, ...next } = formState.value.dates;
			formState.value.dates = next;
		}
		pendingDateKey.value = null;
	};

	const confirmDateModal = () => {
		if (!modalDate.value) return;
		if (!validateRanges(modalRanges.value)) return;

		const key = dateKey(modalDate.value);
		formState.value.dates[key] = modalRanges.value.map((r) => ({ ...r }));

		if (!selectedDates.value.some((d) => dateKey(d) === key)) {
			const convertedDates = selectedDates.value.map(
				(d) => new CalendarDate(d.year, d.month, d.day)
			);
			const modalDateCopy = new CalendarDate(
				modalDate.value.year,
				modalDate.value.month,
				modalDate.value.day
			);
			selectedDates.value = sortDates([...convertedDates, modalDateCopy]);
		}

		modalOpen.value = false;
		pendingDateKey.value = null;
	};

	const addModalTimeframe = () => {
		modalRanges.value.push({ start: 8, end: 16 });
	};

	const removeModalTimeframe = (index: number) => {
		modalRanges.value.splice(index, 1);
	};

	const removeDate = (date: AnyDate, updateSelection = true) => {
		const key = dateKey(date);
		const { [key]: _, ...next } = formState.value.dates;
		void _;
		formState.value.dates = next;
		if (updateSelection) {
			selectedDates.value = selectedDates.value.filter(
				(d) => dateKey(d) !== key
			);
		}
	};

	const toCalendarDate = (d: AnyDate): CalendarDate =>
		new CalendarDate(d.year, d.month, d.day);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleCalendarUpdate = (nextDates: any) => {
		// Ignore DateRange since we use multiple selection mode
		if (nextDates && !Array.isArray(nextDates)) return;
		const dates = (nextDates ?? []) as AnyDate[];
		const next = dates.map(toCalendarDate);
		const nextKeys = new Set(next.map((d) => dateKey(d)));
		const prevKeys = new Set(selectedDates.value.map((d) => dateKey(d)));
		const removedDates = selectedDates.value.filter(
			(d) => !nextKeys.has(dateKey(d))
		);
		const lockedRemoved = removedDates.filter((d) => !isEditableDate(d));
		const editableRemoved = removedDates.filter((d) => isEditableDate(d));

		if (lockedRemoved.length) {
			toast.add({
				title: 'Nie można odwołać dyspozycji',
				description: 'Dyspozycje można odwołać od jutra.',
				color: 'error',
			});
			for (const d of lockedRemoved) {
				next.push(toCalendarDate(d));
			}
		}

		const uniqueNext = [...new Map(next.map((d) => [dateKey(d), d])).values()];
		const addedDates = uniqueNext.filter((d) => !prevKeys.has(dateKey(d)));

		selectedDates.value = sortDates(uniqueNext);

		for (const removed of editableRemoved) {
			removeDate(removed, false);
		}

		if (addedDates.length > 0) {
			openDateModal(addedDates[0]!, 'add');
		}
	};

	const onSubmit = async (event: FormSubmitEvent<DispositionForm>) => {
		const { dates } = event.data;

		const payload = {
			periodStart: periodStart.value,
			periodEnd: periodEnd.value,
			days: Object.entries(dates).flatMap(([date, ranges]) =>
				ranges.map(({ start, end }) => ({
					date,
					startHour: start,
					endHour: end,
				}))
			),
		};

		try {
			await $fetch('/api/doctor/dispositions', {
				method: 'POST',
				body: payload,
			});

			toast.add({
				title: 'Dyspozycje zapisane',
				description: 'Twoje dyspozycje zostały zapisane.',
				color: 'success',
			});
		} catch (error) {
			toast.add({
				title: 'Błąd zapisu dyspozycji',
				description: getErrorMessage(
					error,
					'Podczas zapisu dyspozycji wystąpił błąd.'
				),
				color: 'error',
			});
		}
	};
</script>

<template>
	<PageContainer class="space-y-6">
		<PageHeader
			title="Panel dyspozycji"
			description="Wprowadź dyspozycje na najbliższy podany okres."
		/>

		<UForm :schema="schema" :state="formState" @submit="onSubmit">
			<div
				class="grid gap-6 lg:grid-cols-[minmax(280px,1.1fr)_minmax(260px,0.9fr)]"
			>
				<UCard :ui="{ body: 'p-6' }" class="flex-none">
					<div class="flex flex-col gap-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="text-lg font-semibold text-gray-900">
									Kalendarz dyspozycji
								</p>
								<p class="text-sm text-gray-500">
									Kliknij dzień, aby ustawić godziny pracy od jutra.
								</p>
							</div>
							<div class="flex flex-wrap items-center gap-3">
								<USelect
									v-model="selectedMonth"
									:items="monthOptions"
									class="min-w-48"
								/>
							</div>
						</div>
						<div class="flex w-full justify-center">
							<UCalendar
								:model-value="selectedDates as DateValue[]"
								multiple
								class="w-full max-w-xl"
								:week-starts-on="1"
								:month-controls="false"
								:year-controls="false"
								:min-value="minDate"
								:placeholder="calendarPlaceholder"
								@update:model-value="handleCalendarUpdate"
							>
								<template #day="{ day }">
									<div class="flex h-8 w-8 items-center justify-center">
										<span
											:class="
												isPastDisposition(day)
													? 'bg-info-100 text-info-700 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold'
													: 'flex h-7 w-7 items-center justify-center text-sm text-current'
											"
										>
											{{ day.day }}
										</span>
									</div>
								</template>
							</UCalendar>
						</div>
					</div>
				</UCard>

				<UCard :ui="{ body: 'p-6' }" class="flex-none">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="text-lg font-semibold text-gray-900">Zaplanowane dni</p>
							<p class="text-sm text-gray-500">
								Podgląd godzin pracy przed zapisem.
							</p>
						</div>
						<UBadge
							variant="soft"
							color="secondary"
							:label="`${displayDates.length} dni`"
						/>
					</div>

					<div class="mt-4">
						<UScrollArea class="max-h-96 pr-2">
							<div
								v-if="displayDates.length"
								v-auto-animate
								class="space-y-3 pr-1"
							>
								<div
									v-for="date in displayDates"
									:key="dateKey(date)"
									class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
								>
									<div class="flex items-start justify-between gap-3">
										<div>
											<p class="text-sm font-semibold text-gray-900">
												{{ formatDateLabel(date) }}
											</p>
											<p class="text-xs text-gray-500">
												{{ dateKey(date) }}
											</p>
										</div>
										<div class="flex gap-2">
											<UButton
												size="xs"
												variant="soft"
												icon="lucide:edit-3"
												:disabled="!isEditableDate(date)"
												@click.prevent="openDateModal(date, 'edit')"
											>
												Edytuj
											</UButton>
											<UButton
												size="xs"
												variant="ghost"
												color="error"
												icon="lucide:trash-2"
												:disabled="!isEditableDate(date)"
												@click.prevent="removeDate(date)"
											>
												Usuń
											</UButton>
										</div>
									</div>

									<div v-auto-animate class="mt-3 flex flex-wrap gap-2">
										<span
											v-for="(range, idx) in formState.dates[dateKey(date)]"
											:key="idx"
											class="border-secondary-200 bg-secondary-50 text-secondary-700 rounded-full border px-3 py-1 text-xs"
										>
											{{ formatTimeRange(range) }}
										</span>
									</div>
								</div>
							</div>

							<div
								v-else
								class="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500"
							>
								Brak dyspozycji. Wybierz dzień w kalendarzu, aby dodać godziny
								pracy.
							</div>
						</UScrollArea>
					</div>
				</UCard>
			</div>

			<div class="mt-6 flex flex-wrap items-center justify-between gap-3">
				<p class="text-sm text-gray-500">
					Zapisz dyspozycje po ustawieniu godzin.
				</p>
				<UButton
					type="submit"
					color="primary"
					icon="lucide:save"
					:disabled="!displayDates.length"
				>
					Zapisz dyspozycje
				</UButton>
			</div>
		</UForm>

		<UModal
			v-model:open="modalOpen"
			title="Ustal godziny pracy"
			:description="modalDate ? formatDateLabel(modalDate) : ''"
		>
			<template #body>
				<div v-auto-animate class="space-y-4">
					<div
						v-for="(range, idx) in modalRanges"
						:key="idx"
						class="rounded-lg border border-gray-200 bg-gray-50 p-3"
					>
						<div class="grid grid-cols-2 items-start gap-3">
							<UFormField :name="`modal.${idx}.start`" label="Od">
								<UInputNumber
									v-model="modalRanges[idx]!.start"
									:min="7"
									:max="23"
									:step="1"
								/>
							</UFormField>
							<UFormField :name="`modal.${idx}.end`" label="Do">
								<UInputNumber
									v-model="modalRanges[idx]!.end"
									:min="7"
									:max="23"
									:step="1"
								/>
							</UFormField>
						</div>

						<div class="mt-2 flex justify-end">
							<UButton
								v-if="modalRanges.length > 1"
								size="xs"
								variant="ghost"
								color="error"
								icon="lucide:trash-2"
								@click.prevent="removeModalTimeframe(idx)"
							>
								Usuń przedział
							</UButton>
						</div>
					</div>

					<div class="flex justify-start">
						<UButton
							size="xs"
							variant="soft"
							icon="lucide:plus"
							@click.prevent="addModalTimeframe"
						>
							Dodaj przedział
						</UButton>
					</div>
				</div>
			</template>

			<template #footer>
				<div class="flex w-full justify-end gap-2">
					<UButton variant="ghost" @click="cancelModal">Anuluj</UButton>
					<UButton color="primary" @click="confirmDateModal">
						Zapisz godziny
					</UButton>
				</div>
			</template>
		</UModal>
	</PageContainer>
</template>
