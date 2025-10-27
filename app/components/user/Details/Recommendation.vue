<script lang="ts" setup>
	import { computed } from 'vue';

	type Recommendation = {
		recommendationId: number | null;
		content: string | null;
		createdAt: string | Date | null;
		appointmentId: number | null;
		appointmentDatetime: string | Date | null;
		doctorId: string | null;
		doctorName: string | null;
		doctorEmail: string | null;
	};

	const { data, pending, error, refresh } = await useFetch<Recommendation[]>(
		'/api/patient/recommendations',
		{
			key: 'patient-recommendations',
		}
	);

	const recommendations = computed(() => data.value ?? []);
	const showEmptyState = computed(
		() => !pending.value && !error.value && recommendations.value.length === 0
	);
	const errorMessage = computed(
		() => error.value?.message ?? 'Spróbuj ponownie później.'
	);

	const normalizeDate = (
		value: Recommendation['createdAt'] | Recommendation['appointmentDatetime']
	) => {
		if (!value) return null;
		const date = value instanceof Date ? value : new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	};

	const formatDate = (
		value: Recommendation['createdAt'] | Recommendation['appointmentDatetime']
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
		value: Recommendation['createdAt'] | Recommendation['appointmentDatetime']
	) => {
		const date = normalizeDate(value);
		return date
			? date.toLocaleTimeString('pl-PL', {
					hour: '2-digit',
					minute: '2-digit',
				})
			: 'Brak danych';
	};

	const getDoctorLabel = (recommendation: Recommendation) =>
		recommendation.doctorName
			? `dr ${recommendation.doctorName}`
			: 'Lekarz w trakcie przydziału';
</script>

<template>
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<h2 class="text-2xl font-bold">Porady lekarskie</h2>
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
			title="Nie udało się pobrać zaleceń"
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
						<div class="h-12 w-12 rounded-full bg-blue-100" />
						<div class="flex flex-1 flex-col gap-3">
							<div class="h-4 w-1/3 rounded bg-gray-200" />
							<div class="h-3 w-1/4 rounded bg-gray-200" />
							<div class="h-16 w-full rounded bg-gray-200" />
						</div>
					</div>
				</UCard>
			</div>

			<div
				v-else-if="showEmptyState"
				class="flex flex-col items-center justify-center gap-2 py-12 text-center"
			>
				<Icon name="carbon:pen" class-name="h-10 w-10 text-gray-400" />
				<p class="text-sm text-gray-500">Brak zaleceń lekarskich.</p>
			</div>

			<div v-else class="flex flex-col gap-4">
				<UCard
					v-for="(recommendation, index) in recommendations"
					:key="
						recommendation.recommendationId ??
						recommendation.appointmentId ??
						`fallback-${index}`
					"
				>
					<div class="flex items-start gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100"
						>
							<Icon name="carbon:pen" class-name="h-6 w-6 text-blue-600" />
						</div>
						<div class="flex flex-1 flex-col gap-2">
							<div
								class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
							>
								<p class="text-lg font-semibold text-gray-900">
									{{ getDoctorLabel(recommendation) }}
								</p>
								<p class="text-xs tracking-wider text-gray-500 uppercase">
									{{ formatDate(recommendation.createdAt) }}
									•
									{{ formatTime(recommendation.createdAt) }}
								</p>
							</div>
							<p class="text-sm text-gray-500">
								{{ recommendation.doctorEmail ?? 'Brak danych kontaktowych' }}
							</p>
							<p
								v-if="recommendation.appointmentDatetime"
								class="text-sm text-gray-500"
							>
								Dotyczy wizyty:
								{{ formatDate(recommendation.appointmentDatetime) }}
								o
								{{ formatTime(recommendation.appointmentDatetime) }}
							</p>
							<p class="mt-2 text-sm whitespace-pre-line text-gray-700">
								{{ recommendation.content ?? 'Brak treści zalecenia.' }}
							</p>
						</div>
					</div>
				</UCard>
			</div>
		</div>
	</div>
</template>

<style></style>
