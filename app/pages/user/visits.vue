<script lang="ts" setup>
	definePageMeta({
		layout: 'user',
	});

	useHead({
		title: 'Wizyty',
	});

	type VisitStatus = 'scheduled' | 'completed' | 'canceled';
	type Visit = {
		appointmentId: number;
		datetime: string | Date;
		status: VisitStatus;
		notes: string | null;
		doctorId: string;
		doctorName: string | null;
		doctorEmail: string | null;
		roomId: number | null;
		roomNumber: string | null;
	};

	type StatusColor = 'primary' | 'success' | 'error' | 'neutral';

	const { data, pending, error, refresh } = await useLazyFetch<Visit[]>(
		'/api/patient/visits',
		{
			server: false,
		}
	);

	const statusMeta: Record<VisitStatus, { label: string; color: StatusColor }> =
		{
			scheduled: { label: 'Zaplanowana', color: 'primary' },
			completed: { label: 'Zakończona', color: 'success' },
			canceled: { label: 'Odwołana', color: 'error' },
		};

	const normalizeDate = (value: Visit['datetime']) => {
		const date = value instanceof Date ? value : new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	};

	const formatDate = (value: Visit['datetime']) => {
		const date = normalizeDate(value);
		return date
			? date.toLocaleDateString('pl-PL', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
				})
			: 'Brak danych';
	};

	const formatTime = (value: Visit['datetime']) => {
		const date = normalizeDate(value);
		return date
			? date.toLocaleTimeString('pl-PL', {
					hour: '2-digit',
					minute: '2-digit',
				})
			: 'Brak danych';
	};

	const getStatusLabel = (status: VisitStatus) =>
		statusMeta[status]?.label ?? 'Nieznany status';
	const getStatusColor = (status: VisitStatus): StatusColor =>
		statusMeta[status]?.color ?? 'neutral';
	const getDoctorLabel = (visit: Visit) =>
		visit.doctorName ? `dr ${visit.doctorName}` : 'Lekarz w trakcie przydziału';
	const getLocationLabel = (visit: Visit) =>
		visit.roomNumber
			? `Gabinet ${visit.roomNumber}`
			: 'Brak przydzielonego gabinetu';

	const toast = useToast();
	const cancelLoading = ref<number | null>(null);
	const isCancelModalOpen = ref(false);
	const cancelTarget = ref<Visit | null>(null);

	const handleRefresh = async () => {
		await refresh();
		toast.add({
			title: 'Odświeżono wizyty',
			description: 'Lista wizyt została zaktualizowana.',
			color: 'success',
			icon: 'carbon:checkmark',
		});
	};

	const handleCancel = async (appointmentId: number) => {
		try {
			cancelLoading.value = appointmentId;
			await $fetch(`/api/patient/appointments/${appointmentId}`, {
				method: 'PATCH',
				body: { status: 'canceled' },
			});
			toast.add({
				title: 'Wizyta anulowana',
				color: 'success',
				icon: 'carbon:checkmark',
			});
			await refresh();
			isCancelModalOpen.value = false;
			cancelTarget.value = null;
		} catch (err) {
			toast.add({
				title: 'Błąd anulowania wizyty',
				description: getErrorMessage(err, 'Spróbuj ponownie później.'),
				color: 'error',
				icon: 'carbon:warning',
			});
		} finally {
			cancelLoading.value = null;
		}
	};

	const openCancelModal = (visit: Visit) => {
		cancelTarget.value = visit;
		isCancelModalOpen.value = true;
	};

	const closeCancelModal = () => {
		isCancelModalOpen.value = false;
		cancelTarget.value = null;
	};
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Wizyty"
			description="Tutaj znajdziesz informacje o swoich przyszłych wizytach lekarskich."
		/>
		<ClientOnly>
			<div class="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
				<UCard>
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-3xl"
						>
							<Icon name="carbon:calendar" class-name="h-6 w-6 text-blue-600" />
						</div>
						<div v-auto-animate class="min-h-8">
							<USkeleton v-if="pending" class="h-8 w-8" />
							<p v-else class="text-2xl font-bold text-gray-800">
								{{
									(data ?? []).filter((visit) => visit.status === 'scheduled')
										.length
								}}
							</p>
							<p class="text-sm text-gray-600">Nadchodzące wizyty</p>
						</div>
					</div>
				</UCard>

				<UCard>
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-3xl"
						>
							<Icon
								name="carbon:checkmark"
								class-name="h-6 w-6 text-green-600"
							/>
						</div>
						<div v-auto-animate class="min-h-8">
							<USkeleton v-if="pending" class="h-8 w-8" />
							<p v-else class="text-2xl font-bold text-gray-800">
								{{
									(data ?? []).filter((visit) => visit.status === 'completed')
										.length
								}}
							</p>
							<p class="text-sm text-gray-600">Zakończone wizyty</p>
						</div>
					</div>
				</UCard>

				<UCard>
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-3xl"
						>
							<Icon name="carbon:close" class-name="h-6 w-6 text-red-600" />
						</div>
						<div v-auto-animate class="min-h-8">
							<USkeleton v-if="pending" class="h-8 w-8" />
							<p v-else class="text-2xl font-bold text-gray-800">
								{{
									(data ?? []).filter((visit) => visit.status === 'canceled')
										.length
								}}
							</p>
							<p class="text-sm text-gray-600">Odwołane wizyty</p>
						</div>
					</div>
				</UCard>
			</div>

			<div class="mt-2">
				<div class="flex flex-col gap-4">
					<div
						class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
					>
						<h2 class="text-2xl font-bold">Nadchodzące wizyty</h2>
						<UButton
							v-if="!pending && !error"
							variant="soft"
							color="neutral"
							icon="carbon:renew"
							class="w-full cursor-pointer sm:w-fit"
							@click="handleRefresh"
						>
							Odśwież
						</UButton>
					</div>

					<UAlert
						v-if="error"
						title="Nie udało się pobrać wizyt"
						color="error"
						variant="soft"
						:description="error.message || 'Spróbuj ponownie później.'"
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
							v-else-if="
								!pending &&
								!error &&
								(data ?? []).filter((visit) => visit.status === 'scheduled')
									.length === 0
							"
							class="flex flex-col items-center justify-center gap-2 py-12 text-center"
						>
							<Icon
								name="carbon:calendar-remove"
								class-name="h-10 w-10 text-gray-400"
							/>
							<p class="text-sm text-gray-500">Brak zaplanowanych wizyt.</p>
						</div>

						<div v-else class="flex flex-col gap-4">
							<UCard
								v-for="visit in (data ?? []).filter(
									(item) => item.status === 'scheduled'
								)"
								:key="visit.appointmentId"
							>
								<div class="flex flex-col gap-4 sm:flex-row sm:items-start">
									<div class="flex flex-1 items-start gap-4">
										<div
											class="hidden h-12 w-12 items-center justify-center rounded-full bg-blue-100 sm:flex"
										>
											<Icon
												name="carbon:calendar"
												class-name="h-6 w-6 text-blue-600"
											/>
										</div>
										<div class="flex flex-1 flex-col gap-1">
											<p class="text-lg font-semibold text-gray-900">
												{{ getDoctorLabel(visit) }}
											</p>
											<p class="text-sm text-gray-500">
												{{ getLocationLabel(visit) }}
											</p>
											<div
												class="flex flex-col gap-1 text-sm text-gray-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
											>
												<span>{{ formatDate(visit.datetime) }}</span>
												<span>{{ formatTime(visit.datetime) }}</span>
												<UBadge
													variant="subtle"
													:color="getStatusColor(visit.status)"
												>
													{{ getStatusLabel(visit.status) }}
												</UBadge>
											</div>
										</div>
									</div>
									<div v-if="visit.status === 'scheduled'">
										<UButton
											color="error"
											variant="soft"
											size="sm"
											icon="carbon:trash-can"
											class="w-full cursor-pointer sm:w-fit"
											:loading="cancelLoading === visit.appointmentId"
											@click="openCancelModal(visit)"
										>
											Anuluj wizytę
										</UButton>
									</div>
								</div>
								<p v-if="visit.notes" class="mt-3 text-sm text-gray-600">
									{{ visit.notes }}
								</p>
							</UCard>
						</div>
					</div>
				</div>
			</div>
			<UModal v-model:open="isCancelModalOpen" title="Odwołać wizytę?">
				<template #body>
					<p class="text-sm text-neutral-600">
						Jeśli odwołasz wizytę, termin zwolni się w systemie.
					</p>
					<p
						v-if="cancelTarget"
						class="mt-3 text-sm font-semibold text-neutral-900"
					>
						{{ formatDate(cancelTarget.datetime) }}
						{{ formatTime(cancelTarget.datetime) }} •
						{{ getDoctorLabel(cancelTarget) }}
					</p>
				</template>
				<template #footer>
					<div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
						<UButton
							color="neutral"
							variant="soft"
							class="w-full cursor-pointer sm:w-fit"
							@click="closeCancelModal"
						>
							Zamknij
						</UButton>
						<UButton
							color="error"
							variant="soft"
							class="w-full cursor-pointer sm:w-fit"
							:loading="
								cancelTarget
									? cancelLoading === cancelTarget.appointmentId
									: false
							"
							@click="cancelTarget && handleCancel(cancelTarget.appointmentId)"
						>
							Odwołaj wizytę
						</UButton>
					</div>
				</template>
			</UModal>
		</ClientOnly>
	</PageContainer>
</template>
