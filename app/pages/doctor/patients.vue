<script lang="ts" setup>
	import { Icon } from '#components';
	import { computed } from 'vue';
	import PatientsList from '~/components/doctor/PatientsList.vue';

	definePageMeta({
		layout: 'docs',
	});

	useHead({
		title: 'Panel doktora',
	});

	type VisitStatus = 'scheduled' | 'completed' | 'canceled';
	type PatientItem = {
		patientId: string;
		patientName: string | null;
		patientEmail: string | null;
		lastAppointmentId: number;
		lastAppointmentDatetime: string | Date;
		lastAppointmentStatus: VisitStatus;
	};

	const { data } = await useFetch<PatientItem[]>('/api/doctor/patients', {
		key: 'doctor-patients-summary',
	});

	const patients = computed(() => data.value ?? []);
	const totalPatients = computed(() => patients.value.length);
	const scheduledCount = computed(
		() =>
			patients.value.filter((p) => p.lastAppointmentStatus === 'scheduled')
				.length
	);
	const completedCount = computed(
		() =>
			patients.value.filter((p) => p.lastAppointmentStatus === 'completed')
				.length
	);
	const canceledCount = computed(
		() =>
			patients.value.filter((p) => p.lastAppointmentStatus === 'canceled')
				.length
	);
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Pacjenci"
			description="Lista pacjentów, z którymi masz wizyty (przeszłe i przyszłe)."
		/>

		<div class="grid w-full grid-cols-4 gap-4">
			<UCard>
				<div class="flex items-center space-x-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-3xl"
					>
						<Icon
							name="carbon:user-multiple"
							class-name="w-6 h-6 text-blue-600"
						/>
					</div>
					<div>
						<p class="text-2xl font-bold text-gray-800">
							{{ totalPatients }}
						</p>
						<p class="text-sm text-gray-600">Łącznie pacjentów</p>
					</div>
				</div>
			</UCard>

			<UCard>
				<div class="flex items-center space-x-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-3xl"
					>
						<Icon name="carbon:calendar" class-name="w-6 h-6 text-blue-600" />
					</div>
					<div>
						<p class="text-2xl font-bold text-gray-800">
							{{ scheduledCount }}
						</p>
						<p class="text-sm text-gray-600">Z nadchodzącą wizytą</p>
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
							{{ completedCount }}
						</p>
						<p class="text-sm text-gray-600">Ostatnia wizyta zakończona</p>
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
							{{ canceledCount }}
						</p>
						<p class="text-sm text-gray-600">Ostatnia wizyta odwołana</p>
					</div>
				</div>
			</UCard>
		</div>

		<div class="mt-2">
			<PatientsList />
		</div>
	</PageContainer>
</template>
