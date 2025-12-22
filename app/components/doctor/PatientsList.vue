<script lang="ts" setup>
	import { computed } from 'vue';

	type VisitStatus = 'scheduled' | 'completed' | 'canceled';
	type PatientItem = {
		patientId: string;
		patientName: string | null;
		patientEmail: string | null;
		lastAppointmentId: number;
		lastAppointmentDatetime: string | Date;
		lastAppointmentStatus: VisitStatus;
	};

	type StatusColor = 'primary' | 'success' | 'error' | 'neutral';

	const { data, pending, error, refresh } = await useFetch<PatientItem[]>(
		'/api/doctor/patients',
		{ key: 'doctor-patients' }
	);

	const patients = computed(() => data.value ?? []);
	const showEmptyState = computed(
		() => !pending.value && !error.value && patients.value.length === 0
	);
	const errorMessage = computed(
		() => error.value?.message ?? 'Spróbuj ponownie później.'
	);

	const statusMeta: Record<VisitStatus, { label: string; color: StatusColor }> =
		{
			scheduled: { label: 'Zaplanowana', color: 'primary' },
			completed: { label: 'Zakończona', color: 'success' },
			canceled: { label: 'Odwołana', color: 'error' },
		};

	const normalizeDate = (value: PatientItem['lastAppointmentDatetime']) => {
		const date = value instanceof Date ? value : new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	};

	const formatDate = (value: PatientItem['lastAppointmentDatetime']) => {
		const date = normalizeDate(value);
		return date
			? date.toLocaleDateString('pl-PL', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
				})
			: 'Brak danych';
	};

	const formatTime = (value: PatientItem['lastAppointmentDatetime']) => {
		const date = normalizeDate(value);
		return date
			? date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
			: 'Brak danych';
	};

	const getStatusLabel = (status: VisitStatus) =>
		statusMeta[status]?.label ?? 'Nieznany status';
	const getStatusColor = (status: VisitStatus): StatusColor =>
		statusMeta[status]?.color ?? 'neutral';
	const getPatientLabel = (patient: PatientItem) =>
		patient.patientName ?? 'Pacjent w trakcie przydziału';
	const getContactLabel = (patient: PatientItem) =>
		patient.patientEmail ?? 'Brak danych kontaktowych';
</script>

<template>
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<h2 class="text-2xl font-bold">Pacjenci z wizytami</h2>
			<UButton
				v-if="!pending && !error"
				variant="soft"
				color="neutral"
				icon="carbon:renew"
				class="cursor-pointer"
				@click="refresh()"
			>
				Odśwież
			</UButton>
		</div>

		<UAlert
			v-if="error"
			title="Nie udało się pobrać pacjentów"
			color="error"
			variant="soft"
			:description="errorMessage"
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

		<div v-else>
			<div v-if="pending" class="flex flex-col gap-4">
				<UCard v-for="placeholder in 3" :key="placeholder">
					<div class="flex animate-pulse items-center gap-4">
						<div class="h-12 w-12 rounded-full bg-blue-100" />
						<div class="flex flex-1 flex-col gap-2">
							<div class="h-4 w-1/3 rounded bg-gray-200" />
							<div class="h-3 w-1/4 rounded bg-gray-200" />
							<div class="flex gap-4">
								<div class="h-3 w-16 rounded bg-gray-200" />
								<div class="h-3 w-16 rounded bg-gray-200" />
								<div class="h-5 w-20 rounded bg-gray-200" />
							</div>
						</div>
					</div>
				</UCard>
			</div>

			<div
				v-else-if="showEmptyState"
				class="flex flex-col items-center justify-center gap-2 py-12 text-center"
			>
				<Icon
					name="carbon:user-multiple"
					class-name="h-10 w-10 text-gray-400"
				/>
				<p class="text-sm text-gray-500">Brak pacjentów z przypisaną wizytą.</p>
			</div>

			<div v-else class="flex flex-col gap-4">
				<UCard v-for="patient in patients" :key="patient.patientId">
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100"
						>
							<Icon name="carbon:user" class-name="h-6 w-6 text-blue-600" />
						</div>
						<div class="flex flex-1 flex-col gap-1">
							<p class="text-lg font-semibold text-gray-900">
								{{ getPatientLabel(patient) }}
							</p>
							<p class="text-sm text-gray-500">
								{{ getContactLabel(patient) }}
							</p>
							<div
								class="flex flex-wrap items-center gap-3 text-sm text-gray-600"
							>
								<span>{{ formatDate(patient.lastAppointmentDatetime) }}</span>
								<span>{{ formatTime(patient.lastAppointmentDatetime) }}</span>
								<UBadge
									variant="subtle"
									:color="getStatusColor(patient.lastAppointmentStatus)"
								>
									{{ getStatusLabel(patient.lastAppointmentStatus) }}
								</UBadge>
							</div>
						</div>
						<UButton
							v-if="patient.lastAppointmentStatus === 'scheduled'"
							variant="soft"
							color="info"
							icon="carbon:play"
							class="cursor-pointer"
							:to="`/doctor/handleAppointment/${patient.lastAppointmentId}`"
						>
							Przyjmij teraz
						</UButton>
					</div>
				</UCard>
			</div>
		</div>
	</div>
</template>
