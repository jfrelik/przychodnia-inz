<template>
	<div class="flex w-full flex-col gap-6 p-4">
		<div class="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
			<UCard>
				<div class="flex items-center gap-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-3xl"
					>
						<Icon name="carbon:result" class-name="w-6 h-6 text-yellow-600" />
					</div>
					<div>
						<p class="text-2xl font-bold text-gray-800">
							{{ totalTestResultsCount }}
						</p>
						<p class="text-sm text-gray-600">Łącznie wyników</p>
					</div>
				</div>
			</UCard>

			<UCard>
				<div class="flex items-center gap-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-3xl"
					>
						<Icon name="carbon:time" class-name="w-6 h-6 text-orange-600" />
					</div>
					<div>
						<p class="text-2xl font-bold text-gray-800">
							{{ recentTestResultsCount }}
						</p>
						<p class="text-sm text-gray-600">Ostatnie 30 dni</p>
					</div>
				</div>
			</UCard>

			<UCard>
				<div class="flex items-center gap-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-lime-100 text-3xl"
					>
						<Icon name="carbon:download" class-name="w-6 h-6 text-lime-600" />
					</div>
					<div>
						<p class="text-2xl font-bold text-gray-800">
							{{ downloadableTestResultsCount }}
						</p>
						<p class="text-sm text-gray-600">Wyniki do pobrania</p>
					</div>
				</div>
			</UCard>
		</div>

		<div class="mt-2">
			<UserDetailsTestResult />
		</div>
	</div>
</template>

<script lang="ts" setup>
	import { Icon } from '#components';
	import { computed } from 'vue';

	type TestResult = {
		testId: number;
		testDate: string | Date | null;
		filePath: string | null;
	};

	const { data } = await useFetch<TestResult[]>('/api/patient/results', {
		key: 'patient-test-results-summary',
	});

	const results = computed(() => data.value ?? []);

	const parseDate = (value: TestResult['testDate']) => {
		if (!value) return null;
		const date = value instanceof Date ? value : new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	};

	const totalTestResultsCount = computed(() => results.value.length);
	const recentTestResultsCount = computed(() => {
		const threshold = new Date();
		threshold.setDate(threshold.getDate() - 30);
		return results.value.filter((result) => {
			const testDate = parseDate(result.testDate);
			return testDate != null && testDate >= threshold;
		}).length;
	});
	const downloadableTestResultsCount = computed(
		() =>
			results.value.filter(
				(result) =>
					typeof result.filePath === 'string' && result.filePath !== ''
			).length
	);
</script>

<style></style>
