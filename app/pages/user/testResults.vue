<script lang="ts" setup>
	definePageMeta({
		layout: 'user',
	});

	useHead({
		title: 'Wyniki Badań',
	});

	type TestResult = {
		testId: number;
		testType: string;
		result: string;
		testDate: string;
	};

	const { data, pending, error, refresh } = await useLazyFetch<TestResult[]>(
		'/api/patient/results',
		{
			server: false,
		}
	);

	const toast = useToast();
	const recentTestResultsCount = computed(() => {
		if (!data.value) return 0;
		const threshold = new Date();
		threshold.setDate(threshold.getDate() - 30);
		return data.value.filter((result) => {
			const testDate = new Date(result.testDate);
			return testDate != null && testDate >= threshold;
		}).length;
	});

	const { copy } = useClipboard();

	const handleRefresh = async () => {
		await refresh();
		toast.add({
			title: 'Odświeżono wyniki badań',
			description: 'Lista wyników została zaktualizowana.',
			color: 'success',
			icon: 'lucide:check',
		});
	};

	const handleCopyResult = async (value: string) => {
		await copy(value);
		toast.add({
			title: 'Skopiowano wynik',
			description: 'Wynik badania został zapisany w schowku.',
			color: 'success',
			icon: 'lucide:copy',
		});
	};
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Wyniki Badań"
			description="Tutaj znajdziesz swoje kody do wyników badań laboratoryjnych."
		/>
		<ClientOnly>
			<div class="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
				<UCard>
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-3xl"
						>
							<Icon
								name="lucide:file-text"
								class-name="w-6 h-6 text-yellow-600"
							/>
						</div>
						<div v-auto-animate>
							<USkeleton v-if="pending" class="h-8 w-8" />
							<p v-else class="text-2xl font-bold text-gray-800">
								{{ data?.length ?? 0 }}
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
							<Icon name="lucide:clock" class-name="w-6 h-6 text-orange-600" />
						</div>
						<div v-auto-animate>
							<USkeleton v-if="pending" class="h-8 w-8" />
							<p v-else class="text-2xl font-bold text-gray-800">
								{{ recentTestResultsCount }}
							</p>
							<p class="text-sm text-gray-600">Ostatnie 30 dni</p>
						</div>
					</div>
				</UCard>
			</div>

			<div class="mt-2">
				<div class="flex flex-col gap-4">
					<div class="flex items-center justify-between">
						<h2 class="text-2xl font-bold">Wyniki badań</h2>
						<UButton
							v-if="!pending && !error"
							variant="soft"
							color="neutral"
							icon="lucide:refresh-cw"
							class="cursor-pointer"
							@click="handleRefresh"
						>
							Odśwież
						</UButton>
					</div>

					<UAlert
						v-if="error"
						title="Nie udało się pobrać wyników badań"
						color="error"
						variant="soft"
						:description="getErrorMessage(error, 'Spróbuj ponownie później.')"
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
							<Icon
								name="lucide:file-text"
								class-name="h-10 w-10 text-gray-400"
							/>
							<p class="text-sm text-gray-500">Brak wyników badań.</p>
						</div>

						<div v-else class="flex flex-col gap-4">
							<UCard v-for="test in data" :key="test.testId">
								<div class="flex items-start gap-4">
									<div
										class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100"
									>
										<Icon
											name="lucide:file-text"
											class-name="h-6 w-6 text-yellow-600"
										/>
									</div>
									<div class="flex flex-1 flex-col gap-2">
										<div
											class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
										>
											<div class="flex flex-wrap items-center gap-2">
												<p class="text-lg font-semibold text-gray-900">
													{{ test.testType ?? 'Nieznany rodzaj badania' }}
												</p>
												<UButton
													size="xs"
													variant="ghost"
													icon="lucide:copy"
													class="cursor-pointer"
													:disabled="!test.result"
													@click="handleCopyResult(test.result ?? '')"
												>
													Kopiuj kod
												</UButton>
											</div>
											<p class="text-xs tracking-wider text-gray-500 uppercase">
												{{ useDateShort(test.testDate) }}
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
			</div>
		</ClientOnly>
	</PageContainer>
</template>
