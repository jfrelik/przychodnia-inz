<script lang="ts" setup>
	definePageMeta({
		layout: 'user',
	});

	useHead({
		title: 'Panel pacjenta',
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
		roomNumber: number | null;
	};

	type PrescriptionStatus = 'active' | 'fulfilled';
	type Prescription = {
		prescriptionId: number | null;
		medications: string[];
		issuedAt: string | Date | null;
		status: PrescriptionStatus | null;
		appointmentId: number | null;
		appointmentDatetime: string | Date | null;
		doctorId: string | null;
		doctorName: string | null;
		doctorEmail: string | null;
	};

	type RecentResult = {
		testId: number;
		testType: string;
		result: string;
		testDate: string | Date | null;
	};

	type VisitStatusColor = 'primary' | 'success' | 'error' | 'neutral';
	type PrescriptionStatusColor =
		| 'primary'
		| 'success'
		| 'error'
		| 'warning'
		| 'neutral';

	type DateInput = string | Date | null;
	type DashboardData = {
		upcomingVisits: Visit[];
		recentResults: RecentResult[];
		activePrescriptions: Prescription[];
	};

	const router = useRouter();

	const {
		data: dashboardData,
		pending: dashboardPending,
		error: dashboardError,
	} = await useLazyFetch<DashboardData>('/api/patient/dashboard', {
		server: false,
	});

	const visitStatusMeta: Record<
		VisitStatus,
		{ label: string; color: VisitStatusColor }
	> = {
		scheduled: { label: 'Zaplanowana', color: 'primary' },
		completed: { label: 'Zakonczona', color: 'success' },
		canceled: { label: 'Odwolana', color: 'error' },
	};

	const prescriptionStatusMeta: Record<
		PrescriptionStatus,
		{ label: string; color: PrescriptionStatusColor }
	> = {
		active: { label: 'Aktywna', color: 'primary' },
		fulfilled: { label: 'Zrealizowana', color: 'success' },
	};

	const upcomingVisits = computed(
		() => dashboardData.value?.upcomingVisits ?? []
	);
	const recentResults = computed(
		() => dashboardData.value?.recentResults ?? []
	);
	const activePrescriptions = computed(
		() => dashboardData.value?.activePrescriptions ?? []
	);

	const formatDate = (value: DateInput) => useDateShort(value);
	const formatTime = (value: DateInput) => useTime(value);

	const getDoctorLabel = (visit: Visit) =>
		visit.doctorName ? `dr ${visit.doctorName}` : 'Lekarz w trakcie przydzialu';
	const getLocationLabel = (visit: Visit) =>
		visit.roomNumber
			? `Gabinet ${visit.roomNumber}`
			: 'Bez przydzielonego gabinetu';
	const getStatusLabel = (status: VisitStatus) =>
		visitStatusMeta[status]?.label ?? 'Nieznany status';
	const getStatusColor = (status: VisitStatus): VisitStatusColor =>
		visitStatusMeta[status]?.color ?? 'neutral';

	const getPrescriptionDoctorLabel = (prescription: Prescription) =>
		prescription.doctorName
			? `dr ${prescription.doctorName}`
			: 'Lekarz w trakcie przydzialu';
	const getPrescriptionStatusLabel = (status: Prescription['status']) =>
		(status && prescriptionStatusMeta[status]?.label) ?? 'Nieznany status';
	const getPrescriptionStatusColor = (
		status: Prescription['status']
	): PrescriptionStatusColor =>
		(status && prescriptionStatusMeta[status]?.color) ?? 'neutral';

	const getMedicationLines = (medications: Prescription['medications']) =>
		(medications ?? []).filter((line) => line.trim().length > 0);

	const viewVisit = () => router.push('/user/visits');
	const viewResults = () => router.push('/user/testResults');
	const viewPrescription = () => router.push('/user/prescriptions');
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel pacjenta"
			description="Witamy w panelu pacjenta."
		/>
		<ClientOnly>
			<div class="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-2">
				<UCard>
					<div
						class="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between"
					>
						<h1 class="text-2xl font-bold">Nadchodzące wizyty</h1>
						<UButton
							variant="soft"
							color="neutral"
							class="w-full cursor-pointer sm:w-fit"
							@click="viewVisit()"
						>
							Pokaż wszystkie
						</UButton>
					</div>

					<div v-auto-animate class="flex flex-col gap-4">
						<USkeleton v-if="dashboardPending" class="h-32 w-full" />

						<UAlert
							v-else-if="dashboardError"
							title="Nie udało się pobrać wizyt"
							color="error"
							variant="soft"
							:description="
								getErrorMessage(
									dashboardError,
									'Nie udało się pobrać nadchodzących wizyt.'
								)
							"
						/>

						<div
							v-else-if="upcomingVisits.length === 0"
							class="flex flex-col items-center justify-center gap-2 py-8 text-center"
						>
							<Icon
								name="lucide:calendar"
								class-name="h-10 w-10 text-gray-400"
							/>
							<p class="text-sm text-gray-500">Brak zaplanowanych wizyt.</p>
						</div>

						<UCard
							v-for="visit in upcomingVisits"
							v-else
							:key="visit.appointmentId"
						>
							<div class="flex items-center justify-between gap-4">
								<div class="flex items-center gap-4">
									<div
										class="hidden h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-3xl sm:flex"
									>
										<Icon
											name="lucide:calendar"
											class-name="w-6 h-6 text-blue-600"
										/>
									</div>

									<div class="flex flex-col">
										<h1 class="text-xl font-bold">
											{{ getDoctorLabel(visit) }}
										</h1>
										<p class="text-sm text-gray-500">
											{{ getLocationLabel(visit) }}
										</p>
										<div
											class="flex flex-row flex-wrap gap-3 text-sm text-gray-600"
										>
											<p>{{ formatDate(visit.datetime) }}</p>
											<p>{{ formatTime(visit.datetime) }}</p>
											<UBadge
												variant="subtle"
												:color="getStatusColor(visit.status)"
											>
												{{ getStatusLabel(visit.status) }}
											</UBadge>
										</div>
									</div>
								</div>
							</div>
							<p v-if="visit.notes" class="mt-3 text-sm text-gray-600">
								{{ visit.notes }}
							</p>
						</UCard>
					</div>
				</UCard>

				<UCard>
					<div
						class="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between"
					>
						<h1 class="text-2xl font-bold">Ostatnie wyniki badań</h1>
						<UButton
							variant="soft"
							color="neutral"
							class="w-full cursor-pointer sm:w-fit"
							@click="viewResults()"
						>
							Pokaż wszystkie
						</UButton>
					</div>
					<div v-auto-animate class="flex flex-col gap-4">
						<USkeleton v-if="dashboardPending" class="h-32 w-full" />

						<UAlert
							v-else-if="dashboardError"
							title="Nie udało się pobrać wyników"
							color="error"
							variant="soft"
							:description="
								getErrorMessage(
									dashboardError,
									'Nie udało się pobrać wyników badań.'
								)
							"
						/>

						<div
							v-else-if="recentResults.length === 0"
							class="flex flex-col items-center justify-center gap-2 py-8 text-center"
						>
							<Icon
								name="lucide:file-text"
								class-name="h-10 w-10 text-gray-400"
							/>
							<p class="text-sm text-gray-500">
								Brak dostępnych wyników badań.
							</p>
						</div>

						<UCard v-for="result in recentResults" v-else :key="result.testId">
							<div class="flex items-center justify-between gap-4">
								<div class="flex items-center gap-4">
									<div
										class="hidden h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-3xl sm:flex"
									>
										<Icon
											name="lucide:file-text"
											class-name="w-6 h-6 text-yellow-600"
										/>
									</div>
									<div class="flex flex-col">
										<h1 class="text-xl font-bold">
											{{ result.testType }}
										</h1>
										<p class="text-sm text-gray-500">
											Data badania: {{ formatDate(result.testDate) }}
										</p>
										<p class="text-sm text-gray-600">
											{{ result.result }}
										</p>
									</div>
								</div>
							</div>
						</UCard>
					</div>
				</UCard>
			</div>

			<div class="mt-4">
				<UCard>
					<div
						class="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between"
					>
						<h1 class="text-2xl font-bold">Aktywne recepty</h1>
						<UButton
							variant="soft"
							color="neutral"
							class="w-full cursor-pointer sm:w-fit"
							@click="viewPrescription()"
						>
							Pokaż wszystkie
						</UButton>
					</div>
					<div v-auto-animate class="flex flex-col gap-4">
						<USkeleton v-if="dashboardPending" class="h-32 w-full" />
						<UAlert
							v-else-if="dashboardError"
							title="Nie udalo sie pobrac recept"
							color="error"
							variant="soft"
							:description="
								getErrorMessage(
									dashboardError,
									'Nie udało się pobrać aktywnych recept.'
								)
							"
						/>

						<div
							v-else-if="activePrescriptions.length === 0"
							class="flex flex-col items-center justify-center gap-2 py-8 text-center"
						>
							<Icon name="lucide:pill" class-name="h-10 w-10 text-gray-400" />
							<p class="text-sm text-gray-500">Brak aktywnych recept.</p>
						</div>

						<UCard
							v-for="prescription in activePrescriptions"
							v-else
							:key="
								prescription.prescriptionId ??
								prescription.appointmentId ??
								`active-${prescription.doctorId}`
							"
						>
							<div class="flex flex-col gap-4 md:flex-row md:items-center">
								<div class="flex flex-1 items-center gap-4">
									<div
										class="hidden h-12 w-12 items-center justify-center rounded-full bg-green-100 text-3xl sm:flex"
									>
										<Icon
											name="lucide:pill"
											class-name="w-6 h-6 text-green-600"
										/>
									</div>
									<div class="flex flex-col">
										<h1 class="text-xl font-bold">
											{{ getPrescriptionDoctorLabel(prescription) }}
										</h1>
										<p class="text-sm text-gray-500">
											Wystawiona: {{ formatDate(prescription.issuedAt) }}
											{{ formatTime(prescription.issuedAt) }}
										</p>
									</div>
								</div>
								<div class="flex flex-col items-start gap-2 md:items-end">
									<UBadge
										variant="subtle"
										:color="getPrescriptionStatusColor(prescription.status)"
									>
										{{ getPrescriptionStatusLabel(prescription.status) }}
									</UBadge>
								</div>
							</div>
							<div class="mt-3">
								<p class="text-sm font-semibold text-gray-700">Zalecane leki</p>
								<ul
									v-if="getMedicationLines(prescription.medications).length"
									class="mt-1 list-disc space-y-1 pl-4"
								>
									<li
										v-for="(line, index) in getMedicationLines(
											prescription.medications
										)"
										:key="index"
										class="text-sm text-gray-600"
									>
										{{ line }}
									</li>
								</ul>
								<p v-else class="mt-1 text-sm text-gray-500">
									Brak szczegolow dotyczacych lekow.
								</p>
							</div>
						</UCard>
					</div>
				</UCard>
			</div>
		</ClientOnly>
	</PageContainer>
</template>

<style></style>
