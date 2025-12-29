<script lang="ts" setup>
	import { computed } from 'vue';

	type TestResult = {
		testId: number;
		testType: string | null;
		result: string | null;
		testDate: string | Date | null;
	};

	const { data, pending, error, refresh } = await useFetch<TestResult[]>(
		'/api/patient/results',
		{
			key: 'patient-test-results',
		}
	);

	const results = computed(() => data.value ?? []);
	const showEmptyState = computed(
		() => !pending.value && !error.value && results.value.length === 0
	);
	const errorMessage = computed(
		() => error.value?.message ?? 'Spróbuj ponownie później.'
	);

	const normalizeDate = (value: TestResult['testDate']) => {
		if (!value) return null;
		const date = value instanceof Date ? value : new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	};

	const formatDate = (value: TestResult['testDate']) => {
		const date = normalizeDate(value);
		return date
			? date.toLocaleDateString('pl-PL', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
				})
			: 'Brak danych';
	};

	const formatTime = (value: TestResult['testDate']) => {
		const date = normalizeDate(value);
		return date
			? date.toLocaleTimeString('pl-PL', {
					hour: '2-digit',
					minute: '2-digit',
				})
			: 'Brak danych';
	};
</script>

<template>
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<h2 class="text-2xl font-bold">Wyniki badań</h2>
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
			title="Nie udało się pobrać wyników badań"
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
						<div class="h-12 w-12 rounded-full bg-yellow-100" />
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
				<Icon name="carbon:result" class-name="h-10 w-10 text-gray-400" />
				<p class="text-sm text-gray-500">Brak wyników badań.</p>
			</div>

			<div v-else class="flex flex-col gap-4">
				<UCard v-for="test in results" :key="test.testId">
					<div class="flex items-start gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100"
						>
							<Icon name="carbon:result" class-name="h-6 w-6 text-yellow-600" />
						</div>
						<div class="flex flex-1 flex-col gap-2">
							<div
								class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
							>
								<p class="text-lg font-semibold text-gray-900">
									{{ test.testType ?? 'Nieznany rodzaj badania' }}
								</p>
								<p class="text-xs tracking-wider text-gray-500 uppercase">
									{{ formatDate(test.testDate) }}
								</p>
							</div>
							<p class="text-sm whitespace-pre-line text-gray-700">
								{{ test.result ?? 'Brak opisu wyniku.' }}
							</p>
						</div>
					</div>
				</UCard>
			</div>
		</div>
	</div>
</template>

<style></style>
