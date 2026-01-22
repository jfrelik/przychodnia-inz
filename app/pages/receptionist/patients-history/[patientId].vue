<script lang="ts" setup>
	definePageMeta({
		layout: 'receptionist',
	});

	useHead({
		title: 'Historia wizyt pacjenta',
	});

	type DirectoryUser = {
		userId: string;
		name: string;
		email: string;
		role: string;
		isDoctor: boolean;
		licenseNumber: string | null;
		specializationName: string | null;
		createdAt: string | Date;
	};

	type PatientAppointment = {
		appointmentId: number;
		datetime: string;
		status: string;
		type: string | null;
		isOnline: boolean | null;
		notes: string | null;
		doctorId: string;
		doctorName: string | null;
		doctorEmail: string | null;
		specializationId: number | null;
		specializationName: string | null;
		roomId: number | null;
		roomNumber: number | null;
	};

	const route = useRoute();
	const router = useRouter();

	const patientId = computed(() => route.params.patientId as string);

	const {
		data: directoryData,
		pending: patientPending,
		error: patientError,
		refresh: refreshPatients,
	} = await useFetch<DirectoryUser[]>('/api/receptionist/users', {
		default: () => [],
	});

	const patient = computed(() => {
		const user = (directoryData.value ?? []).find(
			(u) => u.userId === patientId.value && u.role === 'user'
		);
		if (!user) return null;
		return {
			userId: user.userId,
			name: user.name,
			email: user.email,
		};
	});

	const {
		data: appointmentsData,
		pending: appointmentsPending,
		error: appointmentsError,
		refresh: refreshAppointments,
	} = await useLazyFetch<PatientAppointment[]>(
		() => `/api/receptionist/patients/${patientId.value}/appointments`,
		{
			server: false,
			default: () => [],
			watch: [patientId],
		}
	);

	const backToPatients = () => {
		router.push('/receptionist/patients');
	};

	const goToNewAppointment = () => {
		router.push(`/receptionist/appointments/${patientId.value}`);
	};

	const formatDateTime = (iso: string) => useDateTimeShort(iso);

	const getStatusBadge = (status: string) => {
		const map: Record<string, { color: string; label: string }> = {
			scheduled: { color: 'info', label: 'Zaplanowana' },
			checked_in: { color: 'primary', label: 'Tożsamość potwierdzona' },
			confirmed: { color: 'primary', label: 'Potwierdzona' },
			in_progress: { color: 'warning', label: 'W trakcie' },
			completed: { color: 'success', label: 'Zakończona' },
			canceled: { color: 'error', label: 'Anulowana' },
			no_show: { color: 'neutral', label: 'Nieobecność' },
		};
		return map[status] ?? { color: 'neutral', label: status };
	};

	const getTypeBadge = (type: string | null, isOnline: boolean | null) => {
		if (type === 'procedure') {
			return {
				color: 'secondary',
				label: 'Procedura',
				icon: 'lucide:activity',
			};
		}
		if (isOnline) {
			return { color: 'info', label: 'Online', icon: 'lucide:video' };
		}
		return {
			color: 'primary',
			label: 'Stacjonarna',
			icon: 'lucide:building-2',
		};
	};

	const upcomingAppointments = computed(() =>
		(appointmentsData.value ?? []).filter(
			(a) => new Date(a.datetime) >= new Date() && a.status !== 'canceled'
		)
	);

	const pastAppointments = computed(() =>
		(appointmentsData.value ?? []).filter(
			(a) => new Date(a.datetime) < new Date() || a.status === 'canceled'
		)
	);

	const toast = useToast();
	const cancellingId = ref<number | null>(null);
	const showCancelModal = ref(false);
	const appointmentToCancel = ref<PatientAppointment | null>(null);

	const canCancel = (appt: PatientAppointment) => {
		return (
			['scheduled', 'checked_in'].includes(appt.status) &&
			new Date(appt.datetime) >= new Date()
		);
	};

	const openCancelModal = (appt: PatientAppointment) => {
		appointmentToCancel.value = appt;
		showCancelModal.value = true;
	};

	const closeCancelModal = () => {
		showCancelModal.value = false;
		appointmentToCancel.value = null;
	};

	const confirmCancelAppointment = async () => {
		if (!appointmentToCancel.value) return;

		cancellingId.value = appointmentToCancel.value.appointmentId;
		try {
			await $fetch(
				`/api/receptionist/appointments/${appointmentToCancel.value.appointmentId}`,
				{
					method: 'PATCH',
					body: { status: 'canceled' },
				}
			);
			toast.add({
				title: 'Wizyta anulowana',
				description: 'Pacjent otrzyma powiadomienie e-mail.',
				color: 'success',
			});
			closeCancelModal();
			await refreshAppointments();
		} catch (error) {
			toast.add({
				title: 'Błąd',
				description: getErrorMessage(error, 'Nie udało się anulować wizyty.'),
				color: 'error',
			});
		} finally {
			cancellingId.value = null;
		}
	};
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Historia wizyt pacjenta"
			description="Przeglądaj wszystkie wizyty pacjenta."
		/>

		<div class="mb-4 flex flex-col gap-3">
			<UAlert
				v-if="patientError"
				color="error"
				title="Nie udało się pobrać danych pacjenta"
				:description="patientError.message"
			>
				<template #actions>
					<UButton variant="soft" @click="refreshPatients()">Odśwież</UButton>
				</template>
			</UAlert>

			<UCard v-else>
				<div
					class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
				>
					<div class="flex flex-col gap-1">
						<p class="text-sm text-neutral-500">Pacjent</p>
						<p class="text-lg font-semibold">
							{{ patient?.name || 'Nie znaleziono pacjenta' }}
						</p>
						<p class="text-sm text-neutral-600">
							{{ patient?.email || patientId }}
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						<UButton
							variant="solid"
							color="primary"
							icon="lucide:calendar-plus"
							class="cursor-pointer"
							@click="goToNewAppointment"
						>
							Umów wizytę
						</UButton>
						<UButton
							variant="ghost"
							color="neutral"
							icon="lucide:arrow-left"
							class="cursor-pointer"
							@click="backToPatients"
						>
							Wróć do listy
						</UButton>
						<UBadge v-if="patientPending" variant="soft" color="primary">
							Ładowanie...
						</UBadge>
					</div>
				</div>
			</UCard>
		</div>

		<template v-if="patient">
			<UAlert
				v-if="appointmentsError"
				color="error"
				title="Nie udało się pobrać wizyt"
				:description="appointmentsError.message"
			>
				<template #actions>
					<UButton variant="soft" @click="refreshAppointments()">
						Odśwież
					</UButton>
				</template>
			</UAlert>

			<div
				v-else-if="appointmentsPending"
				class="flex items-center justify-center py-8"
			>
				<UIcon
					name="lucide:loader-2"
					class="text-primary-500 h-6 w-6 animate-spin"
				/>
				<span class="ml-2 text-neutral-600">Ładowanie wizyt...</span>
			</div>

			<div v-else class="flex flex-col gap-6">
				<div v-if="upcomingAppointments.length > 0">
					<h3 class="mb-3 text-lg font-semibold text-gray-900">
						Nadchodzące wizyty ({{ upcomingAppointments.length }})
					</h3>
					<div class="flex flex-col gap-3">
						<UCard
							v-for="appt in upcomingAppointments"
							:key="appt.appointmentId"
							class="border-l-primary-500 border-l-4"
						>
							<div class="flex flex-col gap-2">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<div class="flex items-center gap-2">
										<UIcon
											name="lucide:calendar"
											class="text-primary-500 h-4 w-4"
										/>
										<span class="font-medium">
											{{ formatDateTime(appt.datetime) }}
										</span>
									</div>
									<div class="flex gap-2">
										<UBadge
											:color="
												getTypeBadge(appt.type, appt.isOnline).color as any
											"
											variant="soft"
										>
											<UIcon
												:name="getTypeBadge(appt.type, appt.isOnline).icon"
												class="mr-1 h-3 w-3"
											/>
											{{ getTypeBadge(appt.type, appt.isOnline).label }}
										</UBadge>
										<UBadge
											:color="getStatusBadge(appt.status).color as any"
											variant="soft"
										>
											{{ getStatusBadge(appt.status).label }}
										</UBadge>
									</div>
								</div>
								<div class="flex flex-col gap-1 text-sm text-gray-600">
									<div class="flex items-center gap-2">
										<UIcon name="lucide:user" class="h-4 w-4 text-gray-400" />
										<span>
											{{ appt.doctorName || 'Nieznany lekarz' }}
											<span
												v-if="appt.specializationName"
												class="text-gray-400"
											>
												({{ appt.specializationName }})
											</span>
										</span>
									</div>
									<div v-if="appt.roomNumber" class="flex items-center gap-2">
										<UIcon
											name="lucide:door-open"
											class="h-4 w-4 text-gray-400"
										/>
										<span>Gabinet {{ appt.roomNumber }}</span>
									</div>
								</div>
								<div v-if="canCancel(appt)" class="mt-2 flex justify-end">
									<UButton
										variant="soft"
										color="error"
										size="sm"
										icon="lucide:x-circle"
										@click="openCancelModal(appt)"
									>
										Anuluj wizytę
									</UButton>
								</div>
							</div>
						</UCard>
					</div>
				</div>

				<div>
					<h3 class="mb-3 text-lg font-semibold text-gray-900">
						Historia wizyt ({{ pastAppointments.length }})
					</h3>

					<div
						v-if="pastAppointments.length === 0"
						class="rounded-lg border border-dashed p-6 text-center text-neutral-500"
					>
						<UIcon name="lucide:calendar-x" class="mx-auto mb-2 h-8 w-8" />
						<p>Brak historii wizyt</p>
					</div>

					<div v-else class="flex flex-col gap-3">
						<UCard
							v-for="appt in pastAppointments"
							:key="appt.appointmentId"
							:class="[
								'border-l-4',
								appt.status === 'completed'
									? 'border-l-success-500'
									: appt.status === 'canceled'
										? 'border-l-error-500'
										: 'border-l-neutral-300',
							]"
						>
							<div class="flex flex-col gap-2">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<div class="flex items-center gap-2">
										<UIcon
											name="lucide:calendar"
											class="h-4 w-4 text-gray-400"
										/>
										<span class="font-medium text-gray-700">
											{{ formatDateTime(appt.datetime) }}
										</span>
									</div>
									<div class="flex gap-2">
										<UBadge
											:color="
												getTypeBadge(appt.type, appt.isOnline).color as any
											"
											variant="soft"
										>
											{{ getTypeBadge(appt.type, appt.isOnline).label }}
										</UBadge>
										<UBadge
											:color="getStatusBadge(appt.status).color as any"
											variant="soft"
										>
											{{ getStatusBadge(appt.status).label }}
										</UBadge>
									</div>
								</div>
								<div class="flex flex-col gap-1 text-sm text-gray-600">
									<div class="flex items-center gap-2">
										<UIcon name="lucide:user" class="h-4 w-4 text-gray-400" />
										<span>
											{{ appt.doctorName || 'Nieznany lekarz' }}
											<span
												v-if="appt.specializationName"
												class="text-gray-400"
											>
												({{ appt.specializationName }})
											</span>
										</span>
									</div>
									<div v-if="appt.notes" class="flex items-start gap-2">
										<UIcon
											name="lucide:file-text"
											class="mt-0.5 h-4 w-4 text-gray-400"
										/>
										<span class="text-gray-500">{{ appt.notes }}</span>
									</div>
								</div>
							</div>
						</UCard>
					</div>
				</div>

				<div
					v-if="
						upcomingAppointments.length === 0 && pastAppointments.length === 0
					"
					class="rounded-lg border border-dashed p-8 text-center text-neutral-500"
				>
					<UIcon name="lucide:calendar-x" class="mx-auto mb-3 h-12 w-12" />
					<p class="text-lg font-medium">Brak wizyt</p>
					<p class="mt-1 text-sm">
						Ten pacjent nie ma jeszcze żadnych wizyt w systemie.
					</p>
					<UButton
						class="mt-4"
						color="primary"
						icon="lucide:calendar-plus"
						@click="goToNewAppointment"
					>
						Umów pierwszą wizytę
					</UButton>
				</div>
			</div>
		</template>

		<UAlert
			v-else-if="!patientPending && !patientError"
			color="warning"
			title="Nie znaleziono pacjenta"
			description="Wybrany użytkownik nie istnieje lub nie jest pacjentem."
		>
			<template #actions>
				<UButton variant="soft" color="warning" @click="backToPatients">
					Wróć do listy
				</UButton>
			</template>
		</UAlert>

		<UModal v-model:open="showCancelModal" title="Anuluj wizytę">
			<template #body>
				<div v-if="appointmentToCancel" class="space-y-3">
					<p class="text-sm text-neutral-600">
						Czy na pewno chcesz anulować tę wizytę? Pacjent otrzyma
						powiadomienie e-mail.
					</p>
					<div class="rounded-lg bg-neutral-50 p-3 text-sm">
						<p>
							<span class="font-medium">Data:</span>
							{{ formatDateTime(appointmentToCancel.datetime) }}
						</p>
						<p>
							<span class="font-medium">Lekarz:</span>
							{{ appointmentToCancel.doctorName || 'Nieznany' }}
						</p>
						<p v-if="appointmentToCancel.specializationName">
							<span class="font-medium">Specjalizacja:</span>
							{{ appointmentToCancel.specializationName }}
						</p>
					</div>
				</div>
			</template>
			<template #footer>
				<div class="flex w-full justify-end gap-2">
					<UButton variant="soft" color="neutral" @click="closeCancelModal">
						Nie, zachowaj
					</UButton>
					<UButton
						color="error"
						:loading="cancellingId !== null"
						@click="confirmCancelAppointment"
					>
						Tak, anuluj wizytę
					</UButton>
				</div>
			</template>
		</UModal>
	</PageContainer>
</template>
