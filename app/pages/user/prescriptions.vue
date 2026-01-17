<script lang="ts" setup>
	definePageMeta({
		layout: 'user',
	});

	useHead({
		title: 'Recepty',
	});

	type PrescriptionStatus = 'active' | 'fulfilled';

	type Prescription = {
		prescriptionId: number | null;
		appointmentId: number | null;
		issuedAt: string | null;
		appointmentDatetime: string | null;
		doctorId: string | null;
		doctorName: string | null;
		doctorEmail: string | null;
		status: PrescriptionStatus | null;
		medications: string[];
	};

	const { data, pending, error, refresh } = await useLazyFetch(
		'/api/patient/prescriptions',
		{
			server: false,
		}
	);

	const toast = useToast();
	const isFulfillModalOpen = ref(false);
	const fulfillTarget = ref<Prescription | null>(null);
	const fulfillLoading = ref(false);

	const handleRefresh = async () => {
		await refresh();
		toast.add({
			title: 'Odświeżono recepty',
			description: 'Lista recept została zaktualizowana.',
			color: 'success',
			icon: 'lucide:check',
		});
	};

	const markAsFulfilled = async (prescription: Prescription) => {
		if (!prescription.prescriptionId || prescription.status !== 'active')
			return;
		try {
			fulfillLoading.value = true;
			await $fetch(
				`/api/patient/prescriptions/${prescription.prescriptionId}`,
				{
					method: 'PATCH',
					body: {
						status: 'fulfilled',
					},
				}
			);
			await refresh();
			toast.add({
				title: 'Recepta zrealizowana',
				description: 'Status recepty został zaktualizowany.',
				color: 'success',
				icon: 'lucide:check',
			});
			isFulfillModalOpen.value = false;
			fulfillTarget.value = null;
		} catch (error) {
			toast.add({
				title: 'Nie udało się zaktualizować recepty',
				description: getErrorMessage(error, 'Spróbuj ponownie później.'),
				color: 'error',
				icon: 'lucide:alert-triangle',
			});
		} finally {
			fulfillLoading.value = false;
		}
	};

	const openFulfillModal = (prescription: Prescription) => {
		fulfillTarget.value = prescription;
		isFulfillModalOpen.value = true;
	};

	const closeFulfillModal = () => {
		isFulfillModalOpen.value = false;
		fulfillTarget.value = null;
	};
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Recepty"
			description="Tutaj znajdziesz swoje wystawione recepty lekarskie."
		/>
		<ClientOnly>
			<div class="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
				<UCard>
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-3xl"
						>
							<Icon name="lucide:pill" class-name="h-6 w-6 text-green-600" />
						</div>
						<div v-auto-animate class="min-h-8">
							<USkeleton v-if="pending" class="h-8 w-8" />
							<p v-else class="text-2xl font-bold text-gray-800">
								{{ data?.filter((p) => p.status === 'active').length ?? 0 }}
							</p>
							<p class="text-sm text-gray-600">Aktywne recepty</p>
						</div>
					</div>
				</UCard>

				<UCard>
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-3xl"
						>
							<Icon name="lucide:check" class-name="h-6 w-6 text-emerald-600" />
						</div>
						<div v-auto-animate class="min-h-8">
							<USkeleton v-if="pending" class="h-8 w-8" />
							<p v-else class="text-2xl font-bold text-gray-800">
								{{ data?.filter((p) => p.status === 'fulfilled').length ?? 0 }}
							</p>
							<p class="text-sm text-gray-600">Zrealizowane recepty</p>
						</div>
					</div>
				</UCard>

				<UCard>
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-3xl"
						>
							<Icon
								name="lucide:file-plus"
								class-name="h-6 w-6 text-gray-700"
							/>
						</div>
						<div v-auto-animate class="min-h-8">
							<USkeleton v-if="pending" class="h-8 w-8" />
							<p v-else class="text-2xl font-bold text-gray-800">
								{{ data?.length ?? 0 }}
							</p>
							<p class="text-sm text-gray-600">Łącznie recept</p>
						</div>
					</div>
				</UCard>
			</div>

			<div class="mt-2">
				<div class="flex flex-col gap-4">
					<div class="flex items-center justify-between">
						<h2 class="text-2xl font-bold">Recepty</h2>
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
						title="Nie udało się pobrać recept"
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
								@click="handleRefresh"
							>
								Spróbuj ponownie
							</UButton>
						</template>
					</UAlert>

					<div v-else v-auto-animate>
						<USkeleton v-if="pending" class="h-32 w-full" />

						<div
							v-else-if="data?.length === 0"
							class="flex flex-col items-center justify-center gap-2 py-12 text-center"
						>
							<Icon name="lucide:pill" class-name="h-10 w-10 text-gray-400" />
							<p class="text-sm text-gray-500">Brak wystawionych recept.</p>
						</div>

						<div v-else class="flex flex-col gap-4">
							<UCard
								v-for="(prescription, index) in data"
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
										<Icon
											name="lucide:pill"
											class-name="h-6 w-6 text-green-600"
										/>
									</div>
									<div class="flex flex-1 flex-col gap-2">
										<div
											class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
										>
											<div class="flex flex-wrap items-center gap-2">
												<p class="text-lg font-semibold text-gray-900">
													{{ prescription.doctorName ?? 'Nieznany lekarz' }}
												</p>
												<UButton
													v-if="prescription.status === 'active'"
													size="xs"
													variant="soft"
													color="secondary"
													icon="lucide:check"
													:disabled="!prescription.prescriptionId"
													@click="openFulfillModal(prescription)"
												>
													Oznacz jako zrealizowaną
												</UButton>
											</div>
											<UBadge
												variant="subtle"
												:color="
													prescription.status === 'active'
														? 'primary'
														: prescription.status === 'fulfilled'
															? 'secondary'
															: 'neutral'
												"
											>
												{{
													prescription.status === 'active'
														? 'Aktywna'
														: prescription.status === 'fulfilled'
															? 'Zrealizowana'
															: 'Nieznany status'
												}}
											</UBadge>
										</div>
										<p class="text-sm text-gray-500">
											Wystawiona:
											{{ useDate(prescription.issuedAt!) }}
										</p>
										<p
											v-if="prescription.appointmentDatetime"
											class="text-sm text-gray-500"
										>
											Na wizytę:
											{{ useDate(prescription.appointmentDatetime) }}
										</p>

										<div class="mt-2">
											<p class="text-sm font-semibold text-gray-700">
												Zalecane leki
											</p>
											<ul
												v-if="
													prescription.medications &&
													prescription.medications.length > 0
												"
												class="mt-1 list-disc space-y-1 pl-4"
											>
												<li
													v-for="(
														medication, medIndex
													) in prescription.medications"
													:key="medIndex"
													class="text-sm text-gray-700"
												>
													{{ medication }}
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
			</div>
			<UModal v-model:open="isFulfillModalOpen" title="Zrealizować receptę?">
				<template #body>
					<p class="text-sm text-neutral-600">
						Potwierdź zmianę statusu recepty na zrealizowaną.
					</p>
					<p
						v-if="fulfillTarget"
						class="mt-3 text-sm font-semibold text-neutral-900"
					>
						{{ fulfillTarget.doctorName ?? 'Nieznany lekarz' }} •
						{{ useDate(fulfillTarget.issuedAt!) }}
					</p>
				</template>
				<template #footer>
					<div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
						<UButton
							color="neutral"
							variant="soft"
							class="w-full cursor-pointer sm:w-fit"
							@click="closeFulfillModal"
						>
							Zamknij
						</UButton>
						<UButton
							color="secondary"
							variant="soft"
							class="w-full sm:w-fit"
							:loading="fulfillLoading"
							@click="fulfillTarget && markAsFulfilled(fulfillTarget)"
						>
							Zrealizuj receptę
						</UButton>
					</div>
				</template>
			</UModal>
		</ClientOnly>
	</PageContainer>
</template>

<style></style>
