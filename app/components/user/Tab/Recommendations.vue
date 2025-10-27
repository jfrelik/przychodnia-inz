<template>
	<div class="flex w-full flex-col gap-6 p-4">
		<div class="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
			<UCard>
				<div class="flex items-center gap-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-3xl"
					>
						<Icon name="carbon:pen" class-name="w-6 h-6 text-blue-600" />
					</div>
					<div>
						<p class="text-2xl font-bold text-gray-800">
							{{ totalRecommendationsCount }}
						</p>
						<p class="text-sm text-gray-600">Łącznie zaleceń</p>
					</div>
				</div>
			</UCard>

			<UCard>
				<div class="flex items-center gap-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-3xl"
					>
						<Icon name="carbon:time" class-name="w-6 h-6 text-sky-600" />
					</div>
					<div>
						<p class="text-2xl font-bold text-gray-800">
							{{ recentRecommendationsCount }}
						</p>
						<p class="text-sm text-gray-600">Ostatnie 30 dni</p>
					</div>
				</div>
			</UCard>

			<UCard>
				<div class="flex items-center gap-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-3xl"
					>
						<Icon name="carbon:user" class-name="w-6 h-6 text-purple-600" />
					</div>
					<div>
						<p class="text-2xl font-bold text-gray-800">
							{{ uniqueDoctorsCount }}
						</p>
						<p class="text-sm text-gray-600">Lekarze wystawiający</p>
					</div>
				</div>
			</UCard>
		</div>

		<div class="mt-2">
			<UserDetailsRecommendation />
		</div>
	</div>
</template>

<script lang="ts" setup>
	import { Icon } from '#components';
	import { computed } from 'vue';

	type Recommendation = {
		recommendationId: number | null;
		createdAt: string | Date | null;
		doctorId: string | null;
		doctorEmail: string | null;
		doctorName: string | null;
	};

	const { data } = await useFetch<Recommendation[]>(
		'/api/patient/recommendations',
		{
			key: 'patient-recommendations-summary',
		}
	);

	const recommendations = computed(() => data.value ?? []);

	const parseDate = (value: Recommendation['createdAt']) => {
		if (!value) return null;
		const date = value instanceof Date ? value : new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	};

	const totalRecommendationsCount = computed(
		() => recommendations.value.length
	);
	const recentRecommendationsCount = computed(() => {
		const threshold = new Date();
		threshold.setDate(threshold.getDate() - 30);
		return recommendations.value.filter((recommendation) => {
			const createdAt = parseDate(recommendation.createdAt);
			return createdAt != null && createdAt >= threshold;
		}).length;
	});
	const uniqueDoctorsCount = computed(() => {
		const ids = new Set<string>();
		for (const recommendation of recommendations.value) {
			const identifier =
				recommendation.doctorId ??
				recommendation.doctorEmail ??
				recommendation.doctorName ??
				null;
			if (identifier) ids.add(identifier);
		}
		return ids.size;
	});
</script>

<style></style>
