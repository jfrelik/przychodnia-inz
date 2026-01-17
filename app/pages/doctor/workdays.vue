<script lang="ts" setup>
	import {
		createCalendar,
		createViewDay,
		createViewMonthAgenda,
		createViewMonthGrid,
		createViewWeek,
	} from '@schedule-x/calendar';
	import '@schedule-x/theme-default/dist/index.css';
	import { ScheduleXCalendar } from '@schedule-x/vue';
	import 'temporal-polyfill/global';

	definePageMeta({ layout: 'docs' });
	useHead({ title: 'Dni pracy' });

	type Disposition = {
		scheduleId: string;
		day: string;
		timeStart: string;
		timeEnd: string;
		doctorUserId: string;
	};

	const { data, pending } = await useFetch<Disposition[]>(
		'/api/doctor/dispositions',
		{
			key: 'doctor-workdays',
		}
	);

	const dispositions = computed(() => data.value ?? []);

	const calendarApp = shallowRef<ReturnType<typeof createCalendar>>();

	const toEvent = (item: Disposition) => {
		const tz = Temporal.Now.timeZoneId();
		const date = Temporal.PlainDate.from(item.day);
		const startTime = Temporal.PlainTime.from(item.timeStart);
		const endTime = Temporal.PlainTime.from(item.timeEnd);

		const start = date.toZonedDateTime({ timeZone: tz, plainTime: startTime });
		const end = date.toZonedDateTime({ timeZone: tz, plainTime: endTime });

		return {
			id: item.scheduleId,
			title: 'Dzień pracy',
			start,
			end,
		};
	};

	onMounted(() => {
		const weekView = createViewWeek();
		calendarApp.value = createCalendar({
			selectedDate: Temporal.Now.plainDateISO(),
			defaultView: weekView.name ?? 'week',
			views: [
				createViewDay(),
				weekView,
				createViewMonthGrid(),
				createViewMonthAgenda(),
			],
			dayBoundaries: { start: '07:00', end: '19:00' },
			weekOptions: {
				timeAxisFormatOptions: {
					hour: '2-digit',
					minute: '2-digit',
					hour12: false,
				},
			},
			locale: 'pl-PL',
			timezone: 'Europe/Warsaw',
		});

		watch(
			dispositions,
			(list) => calendarApp.value?.events.set(list.map(toEvent)),
			{ immediate: true }
		);
	});
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Dni pracy"
			description="Twoje zaplanowane dyspozycje wyświetlane w kalendarzu."
		/>

		<UCard>
			<template #header>
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold">Kalendarz dyspozycji</h2>
				</div>
			</template>

			<div v-if="pending" class="space-y-2">
				<div class="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
				<div class="h-3 w-1/4 animate-pulse rounded bg-gray-200" />
				<div class="h-96 animate-pulse rounded bg-gray-100" />
			</div>

			<ClientOnly v-else>
				<div class="h-[70vh] overflow-y-auto">
					<ScheduleXCalendar
						v-if="calendarApp"
						:calendar-app="calendarApp"
						class="h-full"
					/>
					<div v-else class="text-sm text-gray-500">
						Brak danych do wyświetlenia.
					</div>
				</div>
			</ClientOnly>
		</UCard>
	</PageContainer>
</template>

<style scoped>
	.sx-vue-calendar-wrapper {
		height: 100%;
		max-height: none;
		min-height: 40vh;
	}
</style>
