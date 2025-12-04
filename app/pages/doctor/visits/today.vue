<script lang="ts" setup>
	import { Icon } from '#components';
	import { createCalendar, createViewDay } from '@schedule-x/calendar';
	import '@schedule-x/theme-default/dist/index.css';
	import { ScheduleXCalendar } from '@schedule-x/vue';
	import 'temporal-polyfill/global';
	import { computed, onMounted, shallowRef, watch } from 'vue';

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

	const { data } = await useFetch<Visit[]>('/api/doctor/visits/today', {
		key: 'doctor-visits-today-summary',
	});

	const visits = computed(() => data.value ?? []);
	const scheduledVisitsCount = computed(
		() => visits.value.filter((v) => v.status === 'scheduled').length
	);
	const completedVisitsCount = computed(
		() => visits.value.filter((v) => v.status === 'completed').length
	);
	const canceledVisitsCount = computed(
		() => visits.value.filter((v) => v.status === 'canceled').length
	);

	const calendarApp = shallowRef<ReturnType<typeof createCalendar>>();

	const toZoned = (value: string | Date) => {
		if (typeof value === 'string') {
			return Temporal.ZonedDateTime.from(value);
		}
		const instant = Temporal.Instant.from(value.toISOString());
		return instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());
	};

	const toEvent = (visit: Visit) => {
		const start = toZoned(visit.datetime);
		return {
			id: visit.appointmentId,
			title: visit.patientName ? `Wizyta: ${visit.patientName}` : 'Wizyta',
			start,
			end: start.add({ minutes: 30 }),
			description: visit.notes ?? undefined,
		};
	};

	onMounted(() => {
		calendarApp.value = createCalendar({
			selectedDate: Temporal.Now.plainDateISO(),
			defaultView: 'day',
			views: [createViewDay()],
			dayBoundaries: { start: '07:00', end: '20:00' },
			weekOptions: {
				timeAxisFormatOptions: {
					hour: '2-digit',
					minute: '2-digit',
					hour12: false,
				},
			},
			firstDayOfWeek: 1,
			locale: 'pl-PL',
			timezone: 'Europe/Warsaw',
			minDate: Temporal.Now.plainDateISO(),
			maxDate: Temporal.Now.plainDateISO(),
		});

		watch(visits, (list) => calendarApp.value?.events.set(list.map(toEvent)), {
			immediate: true,
		});
	});
</script>

<template>
	<PageContainer class="flex min-h-screen flex-col">
		<PageHeader
			title="Panel dzisiejszych wizyt"
			description="Przeglądaj wizyty zaplanowane na dziś, przypisane do Ciebie."
		/>

		<div class="grid w-full grid-cols-3 gap-4">
			<UCard>
				<div class="flex items-center space-x-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-3xl"
					>
						<Icon name="carbon:calendar" class-name="w-6 h-6 text-blue-600" />
					</div>
					<div>
						<p class="text-2xl font-bold text-gray-800">
							{{ scheduledVisitsCount }}
						</p>
						<p class="text-sm text-gray-600">Zaplanowane na dziś</p>
					</div>
				</div>
			</UCard>

			<UCard>
				<div class="flex items-center space-x-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-3xl"
					>
						<Icon name="carbon:checkmark" class-name="w-6 h-6 text-green-600" />
					</div>
					<div>
						<p class="text-2xl font-bold text-gray-800">
							{{ completedVisitsCount }}
						</p>
						<p class="text-sm text-gray-600">Zakończone dziś</p>
					</div>
				</div>
			</UCard>

			<UCard>
				<div class="flex items-center space-x-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-3xl"
					>
						<Icon name="carbon:close" class-name="w-6 h-6 text-red-600" />
					</div>
					<div>
						<p class="text-2xl font-bold text-gray-800">
							{{ canceledVisitsCount }}
						</p>
						<p class="text-sm text-gray-600">Odwołane dziś</p>
					</div>
				</div>
			</UCard>
		</div>

		<ClientOnly>
			<ScheduleXCalendar
				v-if="calendarApp"
				:calendar-app="calendarApp"
				class="flex-1"
			/>
		</ClientOnly>
	</PageContainer>
</template>

<style scoped>
	.sx-vue-calendar-wrapper {
		height: 100%;
		max-height: none;
		min-height: 40vh;
	}
</style>
