<script lang="ts" setup>
	import { Icon } from '#components';
	import { computed } from 'vue';

	definePageMeta({
		layout: 'user',
	});

	useHead({
		title: 'Panel pacjenta',
	});

	type TestResult = {
		testId: number;
		testType: string;
		result: string;
		testDate: string | Date | null;
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
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel pacjenta"
			description="Witamy w panelu pacjenta. Wpisz opis."
		/>
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
		</div>

		<div class="mt-2">
			<UserDetailsTestResult />
		</div>
	</PageContainer>
</template>

<style></style>
