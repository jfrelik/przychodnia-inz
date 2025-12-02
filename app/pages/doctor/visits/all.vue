<script lang="ts" setup>
	import { Icon } from '#components';
	import { computed } from 'vue';

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

	const { data } = await useFetch<Visit[]>('/api/doctor/visits', {
		key: 'doctor-visits-summary',
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
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel wizyt"
			description="Przeglądaj wszystkie swoje wizyty w jednym miejscu."
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
						<p class="text-sm text-gray-600">Zaplanowane wizyty</p>
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
						<p class="text-sm text-gray-600">Zakończone wizyty</p>
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
						<p class="text-sm text-gray-600">Odwołane wizyty</p>
					</div>
				</div>
			</UCard>
		</div>

		<div class="mt-2">
			<DoctorVisitsList />
		</div>
	</PageContainer>
</template>
