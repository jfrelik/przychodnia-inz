<script lang="ts" setup>
	import type { FormSubmitEvent } from '#ui/types';
	import {
		CalendarDate,
		getLocalTimeZone,
		today,
	} from '@internationalized/date';
	import { ref, shallowRef, watch } from 'vue';
	import { z } from 'zod';

	definePageMeta({
		layout: 'docs',
	});

	useHead({
		title: 'Panel doktora',
	});

	const toast = useToast();
	const dispositionReminder = ref(true);

	const todayDate = today(getLocalTimeZone());
	const nextMonth = todayDate.add({ months: 1 });
	const minDate = new CalendarDate(nextMonth.year, nextMonth.month, 1);
	const maxDate = minDate.add({ months: 1, days: -1 });

	const value = shallowRef<CalendarDate[]>([]);

	const formState = ref<{
		dates: Record<string, { start: number; end: number }[]>;
	}>({
		dates: {},
	});

	const dateKey = (date: CalendarDate) =>
		`${date.year}-${String(date.month).padStart(2, '0')}-${String(
			date.day
		).padStart(2, '0')}`;

	watch(
		value,
		(newDates) => {
			const current = formState.value.dates;
			const next: typeof current = {};

			for (const d of newDates) {
				const k = dateKey(d);
				next[k] = current[k] ?? [{ start: 7, end: 17 }];
			}

			formState.value.dates = next;
		},
		{ deep: true }
	);

	const formatDateLabel = (date: CalendarDate) => {
		const jsDate = new Date(date.year, date.month - 1, date.day);

		return new Intl.DateTimeFormat('pl-PL', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
		}).format(jsDate);
	};

	const timeframeSchema = z
		.object({
			start: z
				.number()
				.min(7, 'Minimalna godzina to 7')
				.max(17, 'Maksymalna godzina to 17'),
			end: z
				.number()
				.min(7, 'Minimalna godzina to 7')
				.max(17, 'Maksymalna godzina to 17'),
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

	const addTimeframe = (date: CalendarDate) => {
		const key = dateKey(date);
		if (!formState.value.dates[key]) {
			formState.value.dates[key] = [];
		}

		formState.value.dates[key].push({
			start: 7,
			end: 17,
		});
	};

	const removeTimeframe = (date: CalendarDate, index: number) => {
		const key = dateKey(date);
		const ranges = formState.value.dates[key];
		if (!ranges) return;

		ranges.splice(index, 1);
	};

	const onSubmit = async (event: FormSubmitEvent<DispositionForm>) => {
		const { dates } = event.data;

		const payload = {
			periodStart: `${minDate.year}-${String(minDate.month).padStart(
				2,
				'0'
			)}-${String(minDate.day).padStart(2, '0')}`,
			periodEnd: `${maxDate.year}-${String(maxDate.month).padStart(
				2,
				'0'
			)}-${String(maxDate.day).padStart(2, '0')}`,
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

			dispositionReminder.value = false;
		} catch (error) {
			toast.add({
				title: 'Błąd zapisu dyspozycji',
				description: 'Podczas zapisu dyspozycji wystąpił błąd.',
				color: 'error',
			});
		}
	};
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel dyspozycji"
			description="Wprowadź dyspozycje na najbliższy podany okres."
		/>

		<UAlert
			v-if="dispositionReminder"
			color="error"
			title="Uzupełnij dyspozycję"
			description="Wymagane jest uzupełnienie dyspozycji na nadchodzący okres."
			icon="carbon:warning"
		/>

		<UCard :ui="{ body: 'p-6' }">
			<div class="flex w-full justify-center">
				<UCalendar
					v-model="value"
					multiple
					class="w-2/3"
					:min-value="minDate"
					:max-value="maxDate"
					:placeholder="minDate"
				/>
			</div>
		</UCard>

		<UForm class="mt-4" :schema="schema" :state="formState" @submit="onSubmit">
			<div v-if="value.length" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
				<UCard v-for="date in value" :key="dateKey(date)" :ui="{ body: 'p-2' }">
					<div class="mb-2 text-sm font-semibold">
						{{ formatDateLabel(date) }}
					</div>

					<!-- One row per timeframe -->
					<div
						v-for="(range, idx) in formState.dates[dateKey(date)]"
						:key="idx"
						class="mb-3 pb-3"
					>
						<div class="grid grid-cols-2 items-start gap-3">
							<UFormField
								:name="`dates.${dateKey(date)}.${idx}.start`"
								label="Godzina rozpoczęcia"
							>
								<UInputNumber
									v-model="formState.dates[dateKey(date)]![idx]!.start"
									:min="7"
									:max="17"
									:step="1"
								/>
							</UFormField>

							<UFormField
								:name="`dates.${dateKey(date)}.${idx}.end`"
								label="Godzina zakończenia"
							>
								<UInputNumber
									v-model="formState.dates[dateKey(date)]![idx]!.end"
									:min="7"
									:max="17"
									:step="1"
								/>
							</UFormField>
						</div>

						<div class="mt-2 flex justify-center">
							<UButton
								v-if="formState.dates[dateKey(date)]!.length > 1"
								size="xs"
								variant="ghost"
								color="error"
								icon="carbon:trash-can"
								@click.prevent="removeTimeframe(date, idx)"
							>
								Usuń przedział
							</UButton>
						</div>
					</div>

					<div class="mt-2 flex justify-center">
						<UButton
							size="xs"
							variant="ghost"
							icon="carbon:add"
							@click.prevent="addTimeframe(date)"
						>
							Dodaj przedział czasowy
						</UButton>
					</div>
				</UCard>
			</div>

			<div class="mt-6 flex justify-center">
				<UButton type="submit">Zapisz dyspozycje</UButton>
			</div>
		</UForm>
	</PageContainer>
</template>
