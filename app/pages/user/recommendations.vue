<script lang="ts" setup>
	definePageMeta({
		layout: 'user',
	});

	useHead({
		title: 'Zalecenia',
	});

	type Recommendation = {
		recommendationId: number | null;
		content: string | null;
		createdAt: string;
		appointmentId: number | null;
		appointmentDatetime: string;
		doctorId: string | null;
		doctorName: string | null;
		doctorEmail: string | null;
	};

	const { data, pending, error, refresh } = await useLazyFetch<
		Recommendation[]
	>('/api/patient/recommendations', {
		server: false,
	});

	const toast = useToast();

	const recentRecommendationsCount = computed(() => {
		if (!data.value) return 0;
		const threshold = new Date();
		threshold.setDate(threshold.getDate() - 30);
		return data.value?.filter((recommendation) => {
			return (
				recommendation.createdAt != null &&
				new Date(recommendation.createdAt) >= threshold
			);
		}).length;
	});

	const uniqueDoctorsCount = computed(() => {
		const ids = new Set<string>();
		if (!data.value) return 0;
		for (const recommendation of data.value) {
			const identifier =
				recommendation.doctorId ??
				recommendation.doctorEmail ??
				recommendation.doctorName ??
				null;
			if (identifier) ids.add(identifier);
		}
		return ids.size;
	});

	const handleRefresh = async () => {
		await refresh();
		toast.add({
			title: 'Odświeżono zalecenia',
			description: 'Lista zaleceń została zaktualizowana.',
			color: 'success',
			icon: 'lucide:check',
		});
	};
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Zalecenia"
			description="Tutaj znajdziesz swoje zalecenia od lekarzy."
		/>
		<ClientOnly>
			<div class="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
				<UCard>
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-3xl"
						>
							<Icon name="lucide:pen" class-name="w-6 h-6 text-blue-600" />
						</div>
						<div v-auto-animate>
							<USkeleton v-if="pending" class="h-8 w-8" />
							<p v-else class="text-2xl font-bold text-gray-800">
								{{ data?.length ?? 0 }}
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
							<Icon name="lucide:clock" class-name="w-6 h-6 text-sky-600" />
						</div>
						<div v-auto-animate>
							<USkeleton v-if="pending" class="h-8 w-8" />
							<p v-else class="text-2xl font-bold text-gray-800">
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
							<Icon name="lucide:user" class-name="w-6 h-6 text-purple-600" />
						</div>
						<div v-auto-animate>
							<USkeleton v-if="pending" class="h-8 w-8" />
							<p v-else class="text-2xl font-bold text-gray-800">
								{{ uniqueDoctorsCount }}
							</p>
							<p class="text-sm text-gray-600">Lekarze wystawiający</p>
						</div>
					</div>
				</UCard>
			</div>

			<div class="mt-2">
				<div class="flex flex-col gap-4">
					<div
						class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
					>
						<h2 class="text-2xl font-bold">Lista zaleceń lekarskich</h2>
						<UButton
							v-if="!pending && !error"
							variant="soft"
							color="neutral"
							icon="lucide:refresh-cw"
							class="w-full cursor-pointer sm:w-fit"
							@click="handleRefresh"
						>
							Odśwież
						</UButton>
					</div>

					<UAlert
						v-if="error"
						title="Nie udało się pobrać zaleceń"
						color="error"
						variant="soft"
						:description="
							getErrorMessage(error, 'Wystąpił nieoczekiwany błąd.')
						"
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

					<div v-else v-auto-animate>
						<div v-if="pending" class="flex flex-col gap-4">
							<USkeleton class="h-32 w-full" />
						</div>

						<div
							v-else-if="data?.length === 0"
							class="flex flex-col items-center justify-center gap-2 py-12 text-center"
						>
							<Icon name="lucide:pen" class-name="h-10 w-10 text-gray-400" />
							<p class="text-sm text-gray-500">Brak zaleceń lekarskich.</p>
						</div>

						<div v-else class="flex flex-col gap-4">
							<UCard v-for="(recommendation, index) in data" :key="index">
								<div class="flex items-start gap-4">
									<div
										class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100"
									>
										<Icon
											name="lucide:pen"
											class-name="h-6 w-6 text-blue-600"
										/>
									</div>
									<div class="flex flex-1 flex-col gap-2">
										<div
											class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
										>
											<p class="text-lg font-semibold text-gray-900">
												{{ recommendation.doctorName ?? 'Nieznany lekarz' }}
											</p>
											<p class="text-xs tracking-wider text-gray-500 uppercase">
												Wypisano:
												{{ useDate(recommendation.createdAt) }}
											</p>
										</div>
										<p
											v-if="recommendation.appointmentDatetime"
											class="text-sm text-gray-500"
										>
											Wizyta odbyta:
											{{ useDate(recommendation.appointmentDatetime) }}
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
			</div>
		</ClientOnly>
	</PageContainer>
</template>
