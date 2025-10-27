<script lang="ts" setup>
	import { computed } from 'vue';

	type PrescriptionStatus = 'active' | 'fulfilled';
	type StatusColor = 'primary' | 'success' | 'error' | 'warning' | 'neutral';

	type Medication = {
		name?: string;
		dosage?: string;
		instructions?: string;
		[key: string]: unknown;
	};

	type Prescription = {
		prescriptionId: number | null;
		medications: Medication[] | string | null;
		issuedAt: string | Date | null;
		status: PrescriptionStatus | null;
		appointmentId: number | null;
		appointmentDatetime: string | Date | null;
		doctorId: string | null;
		doctorName: string | null;
		doctorEmail: string | null;
	};

	const { data, pending, error, refresh } = await useFetch<Prescription[]>(
		'/api/patient/prescriptions',
		{
			key: 'patient-prescriptions',
		}
	);

	const prescriptions = computed(() => data.value ?? []);
	const showEmptyState = computed(
		() => !pending.value && !error.value && prescriptions.value.length === 0
	);
	const errorMessage = computed(
		() => error.value?.message ?? 'Spróbuj ponownie później.'
	);

	const statusMeta: Record<
		NonNullable<Prescription['status']>,
		{ label: string; color: StatusColor }
	> = {
		active: { label: 'Aktywna', color: 'primary' },
		fulfilled: { label: 'Zrealizowana', color: 'success' },
	};

	const normalizeDate = (
		value: Prescription['issuedAt'] | Prescription['appointmentDatetime']
	) => {
		if (!value) return null;
		const date = value instanceof Date ? value : new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	};

	const formatDate = (
		value: Prescription['issuedAt'] | Prescription['appointmentDatetime']
	) => {
		const date = normalizeDate(value);
		return date
			? date.toLocaleDateString('pl-PL', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
				})
			: 'Brak danych';
	};

	const formatTime = (
		value: Prescription['issuedAt'] | Prescription['appointmentDatetime']
	) => {
		const date = normalizeDate(value);
		return date
			? date.toLocaleTimeString('pl-PL', {
					hour: '2-digit',
					minute: '2-digit',
				})
			: 'Brak danych';
	};

	const getStatusLabel = (status: Prescription['status']) =>
		status && statusMeta[status]?.label
			? statusMeta[status].label
			: 'Nieznany status';
	const getStatusColor = (status: Prescription['status']): StatusColor =>
		status && statusMeta[status]?.color ? statusMeta[status].color : 'neutral';
	const getDoctorLabel = (prescription: Prescription) =>
		prescription.doctorName
			? `dr ${prescription.doctorName}`
			: 'Lekarz w trakcie przydziału';

	const getMedicationLines = (medications: Prescription['medications']) => {
		if (!medications) return [];
		if (Array.isArray(medications))
			return medications
				.map((item) => {
					if (typeof item === 'string') return item;
					if (item && typeof item === 'object') {
						const { name, dosage, instructions, ...rest } = item as Medication;
						const parts = [name, dosage, instructions]
							.filter(Boolean)
							.map(String);
						if (parts.length > 0) return parts.join(' • ');
						const fallback = Object.values(rest)
							.filter((value) => value != null && value !== '')
							.map(String)
							.join(' • ');
						return fallback || 'Brak danych o leku';
					}
					return String(item);
				})
				.filter((line) => line.trim().length > 0);
		if (typeof medications === 'string') return [medications];
		return [JSON.stringify(medications)];
	};
</script>

<template>
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<h2 class="text-2xl font-bold">Recepty</h2>
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
			title="Nie udało się pobrać recept"
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
					<div class="flex animate-pulse items-start gap-4">
						<div class="h-12 w-12 rounded-full bg-green-100" />
						<div class="flex flex-1 flex-col gap-3">
							<div class="h-4 w-1/3 rounded bg-gray-200" />
							<div class="h-3 w-1/4 rounded bg-gray-200" />
							<div class="h-3 w-1/2 rounded bg-gray-200" />
							<div class="flex flex-col gap-2">
								<div class="h-3 w-3/4 rounded bg-gray-200" />
								<div class="h-3 w-2/3 rounded bg-gray-200" />
							</div>
						</div>
					</div>
				</UCard>
			</div>

			<div
				v-else-if="showEmptyState"
				class="flex flex-col items-center justify-center gap-2 py-12 text-center"
			>
				<Icon name="carbon:pills" class-name="h-10 w-10 text-gray-400" />
				<p class="text-sm text-gray-500">Brak wystawionych recept.</p>
			</div>

			<div v-else class="flex flex-col gap-4">
				<UCard
					v-for="(prescription, index) in prescriptions"
					:key="
						prescription.prescriptionId ??
						prescription.appointmentId ??
						`fallback-${index}`
					"
				>
					<div class="flex items-start gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100"
						>
							<Icon name="carbon:pills" class-name="h-6 w-6 text-green-600" />
						</div>
						<div class="flex flex-1 flex-col gap-2">
							<div
								class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
							>
								<p class="text-lg font-semibold text-gray-900">
									{{ getDoctorLabel(prescription) }}
								</p>
								<UBadge
									variant="subtle"
									:color="getStatusColor(prescription.status)"
								>
									{{ getStatusLabel(prescription.status) }}
								</UBadge>
							</div>
							<p class="text-sm text-gray-500">
								Wystawiona:
								{{ formatDate(prescription.issuedAt) }}
								o
								{{ formatTime(prescription.issuedAt) }}
							</p>
							<p
								v-if="prescription.appointmentDatetime"
								class="text-sm text-gray-500"
							>
								Na wizytę:
								{{ formatDate(prescription.appointmentDatetime) }}
								o
								{{ formatTime(prescription.appointmentDatetime) }}
							</p>
							<p v-if="prescription.doctorEmail" class="text-sm text-gray-500">
								Kontakt: {{ prescription.doctorEmail }}
							</p>
							<div class="mt-2">
								<p class="text-sm font-semibold text-gray-700">Zalecane leki</p>
								<ul
									v-if="getMedicationLines(prescription.medications).length"
									class="mt-1 list-disc space-y-1 pl-4"
								>
									<li
										v-for="(line, lineIndex) in getMedicationLines(
											prescription.medications
										)"
										:key="lineIndex"
										class="text-sm text-gray-600"
									>
										{{ line }}
									</li>
								</ul>
								<p v-else class="mt-1 text-sm text-gray-500">
									Brak szczegółów dotyczących leków.
								</p>
							</div>
						</div>
					</div>
				</UCard>
			</div>
		</div>
	</div>
</template>

<style></style>
