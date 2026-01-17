<script lang="ts" setup>
	definePageMeta({
		layout: 'receptionist',
	});

	useHead({
		title: 'Nowa wizyta',
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

	const backToPatients = () => {
		router.push('/receptionist/patients');
	};

	const goToHistory = () => {
		router.push(`/receptionist/patients-history/${patientId.value}`);
	};
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Nowa wizyta dla pacjenta"
			description="Umów konsultację lub procedurę w imieniu pacjenta."
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
							variant="outline"
							color="neutral"
							icon="lucide:history"
							class="cursor-pointer"
							@click="goToHistory"
						>
							Historia wizyt
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

		<ClientOnly>
			<AppointmentBookingForm
				v-if="patient"
				:patient="patient"
				allow-procedures
				api-base-path="/api/receptionist"
			/>
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
		</ClientOnly>
	</PageContainer>
</template>
