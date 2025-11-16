<template>
	<div class="flex flex-col gap-4 px-4 pb-4">
		<!-- Top part -->
		<div class="grid grid-cols-2 gap-4">
			<UCard>
				<div class="flex items-center justify-between pb-6">
					<h1 class="text-2xl font-bold">Nadchodzące wizyty</h1>
					<UButton
						variant="soft"
						color="neutral"
						class="w-fit cursor-pointer"
						@click="viewVisit()"
					>
						Pokaż wszystkie
					</UButton>
				</div>

				<div class="flex flex-col gap-4">
					<div v-if="upcomingLoading" class="flex flex-col gap-4">
						<UCard v-for="skeleton in 2" :key="`upcoming-skeleton-${skeleton}`">
							<div class="flex animate-pulse items-center gap-4">
								<div class="h-12 w-12 rounded-full bg-blue-100" />
								<div class="flex flex-1 flex-col gap-2">
									<div class="h-4 w-1/3 rounded bg-gray-200" />
									<div class="h-3 w-1/4 rounded bg-gray-200" />
									<div class="flex gap-4">
										<div class="h-3 w-16 rounded bg-gray-200" />
										<div class="h-3 w-16 rounded bg-gray-200" />
										<div class="h-5 w-20 rounded bg-gray-200" />
									</div>
								</div>
							</div>
						</UCard>
					</div>

					<UAlert
						v-else-if="upcomingError"
						title="Nie udało się pobrać wizyt"
						color="error"
						variant="soft"
						:description="upcomingErrorMessage"
					/>

					<div
						v-else-if="showUpcomingEmptyState"
						class="flex flex-col items-center justify-center gap-2 py-8 text-center"
					>
						<Icon
							name="carbon:calendar-remove"
							class-name="h-10 w-10 text-gray-400"
						/>
						<p class="text-sm text-gray-500">Brak zaplanowanych wizyt.</p>
					</div>

					<UCard
						v-for="visit in upcomingCards"
						v-else
						:key="visit.appointmentId"
					>
						<div class="flex items-center justify-between gap-4">
							<div class="flex items-center gap-4">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-3xl"
								>
									<Icon
										name="carbon:calendar"
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

							<UButton
								variant="soft"
								color="neutral"
								icon="carbon:view"
								size="xl"
								class="cursor-pointer"
								@click="viewVisit(visit.appointmentId)"
							/>
						</div>
						<p v-if="visit.notes" class="mt-3 text-sm text-gray-600">
							{{ visit.notes }}
						</p>
					</UCard>
				</div>
			</UCard>

			<UCard>
				<div class="flex items-center justify-between pb-6">
					<h1 class="text-2xl font-bold">Ostatnie wyniki badań</h1>
					<UButton variant="soft" color="neutral" class="w-fit cursor-pointer">
						Pokaż wszystkie
					</UButton>
				</div>
				<div class="flex flex-col gap-4">
					<div v-if="recentLoading" class="flex flex-col gap-4">
						<UCard v-for="skeleton in 2" :key="`recent-skeleton-${skeleton}`">
							<div class="flex animate-pulse items-center gap-4">
								<div class="h-12 w-12 rounded-full bg-yellow-100" />
								<div class="flex flex-1 flex-col gap-2">
									<div class="h-4 w-1/3 rounded bg-gray-200" />
									<div class="h-3 w-1/4 rounded bg-gray-200" />
									<div class="h-3 w-2/3 rounded bg-gray-200" />
								</div>
							</div>
						</UCard>
					</div>

					<UAlert
						v-else-if="recentError"
						title="Nie udało się pobrać wyników"
						color="error"
						variant="soft"
						:description="recentErrorMessage"
					/>

					<div
						v-else-if="showRecentEmptyState"
						class="flex flex-col items-center justify-center gap-2 py-8 text-center"
					>
						<Icon name="carbon:result" class-name="h-10 w-10 text-gray-400" />
						<p class="text-sm text-gray-500">Brak dostępnych wyników badań.</p>
					</div>

					<UCard
						v-for="result in recentResultCards"
						v-else
						:key="result.testId"
					>
						<div class="flex items-center justify-between gap-4">
							<div class="flex items-center gap-4">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-3xl"
								>
									<Icon
										name="carbon:result"
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

							<UButton
								variant="soft"
								color="neutral"
								icon="carbon:view"
								size="xl"
								class="cursor-pointer"
								:disabled="!result.filePath"
								:to="result.filePath ?? undefined"
								target="_blank"
							/>
						</div>
					</UCard>
				</div>
			</UCard>
		</div>

		<div>
			<UCard>
				<div class="flex items-center justify-between pb-6">
					<h1 class="text-2xl font-bold">Aktywne recepty</h1>
					<UButton
						variant="soft"
						color="neutral"
						class="w-fit cursor-pointer"
						@click="viewPrescription()"
					>
						Pokaz wszystkie
					</UButton>
				</div>
				<div class="flex flex-col gap-4">
					<div v-if="activeLoading" class="flex flex-col gap-4">
						<UCard v-for="skeleton in 2" :key="`active-skeleton-${skeleton}`">
							<div class="flex animate-pulse items-start gap-4">
								<div class="h-12 w-12 rounded-full bg-green-100" />
								<div class="flex flex-1 flex-col gap-2">
									<div class="h-4 w-1/3 rounded bg-gray-200" />
									<div class="h-3 w-1/4 rounded bg-gray-200" />
									<div class="flex flex-col gap-2">
										<div class="h-3 w-1/2 rounded bg-gray-200" />
										<div class="h-3 w-3/4 rounded bg-gray-200" />
									</div>
								</div>
							</div>
						</UCard>
					</div>

					<UAlert
						v-else-if="activeError"
						title="Nie udalo sie pobrac recept"
						color="error"
						variant="soft"
						:description="activeErrorMessage"
					/>

					<div
						v-else-if="showActiveEmptyState"
						class="flex flex-col items-center justify-center gap-2 py-8 text-center"
					>
						<Icon name="carbon:pills" class-name="h-10 w-10 text-gray-400" />
						<p class="text-sm text-gray-500">Brak aktywnych recept.</p>
					</div>

					<UCard
						v-for="prescription in activeCards"
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
									class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-3xl"
								>
									<Icon
										name="carbon:pills"
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
								<UButton
									variant="soft"
									color="neutral"
									icon="carbon:view"
									size="xl"
									class="cursor-pointer"
									@click="
										viewPrescription(prescription.prescriptionId ?? undefined)
									"
								/>
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
	</div>
</template>

<script lang="ts" setup>
	import { Icon } from '#components';
	import { computed } from 'vue';

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

	type PrescriptionStatus = 'active' | 'fulfilled';
	type Medication = {
		name?: string;
		dosage?: string;
		instructions?: string;
		[key: string]: unknown;
	};
	type Prescription = {
		prescriptionId: number | null;
		medications: Medication[] | string | null;
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
		filePath: string | null;
	};

	type VisitStatusColor = 'primary' | 'success' | 'error' | 'neutral';
	type PrescriptionStatusColor =
		| 'primary'
		| 'success'
		| 'error'
		| 'warning'
		| 'neutral';

	type DateInput = string | Date | null;

	const props = withDefaults(
		defineProps<{
			upcomingVisits?: Visit[];
			upcomingLoading?: boolean;
			upcomingError?: Error | null;
			activePrescriptions?: Prescription[];
			activeLoading?: boolean;
			activeError?: Error | null;
			recentResults?: RecentResult[];
			recentLoading?: boolean;
			recentError?: Error | null;
		}>(),
		{
			upcomingVisits: () => [],
			upcomingLoading: false,
			upcomingError: null,
			activePrescriptions: () => [],
			activeLoading: false,
			activeError: null,
			recentResults: () => [],
			recentLoading: false,
			recentError: null,
		}
	);

	const emit = defineEmits<{
		(e: 'viewVisit' | 'viewPrescription', id?: number): void;
	}>();

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

	const upcomingCards = computed(() => props.upcomingVisits.slice(0, 2));
	const showUpcomingEmptyState = computed(
		() =>
			!props.upcomingLoading &&
			!props.upcomingError &&
			props.upcomingVisits.length === 0
	);
	const upcomingErrorMessage = computed(
		() =>
			props.upcomingError?.message ??
			'Nie udalo sie pobrac nadchodzacych wizyt.'
	);

	const activeCards = computed(() => props.activePrescriptions.slice(0, 2));
	const showActiveEmptyState = computed(
		() =>
			!props.activeLoading &&
			!props.activeError &&
			props.activePrescriptions.length === 0
	);
	const activeErrorMessage = computed(
		() => props.activeError?.message ?? 'Nie udalo sie pobrac aktywnych recept.'
	);
	const recentResultCards = computed(() => props.recentResults.slice(0, 2));
	const showRecentEmptyState = computed(
		() =>
			!props.recentLoading &&
			!props.recentError &&
			props.recentResults.length === 0
	);
	const recentErrorMessage = computed(
		() => props.recentError?.message ?? 'Nie udalo sie pobrac wynikow badan.'
	);

	const normalizeDate = (value: DateInput) => {
		if (!value) return null;
		const date = value instanceof Date ? value : new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	};

	const formatDate = (value: DateInput) => {
		const date = normalizeDate(value);
		return date
			? date.toLocaleDateString('pl-PL', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
				})
			: 'Brak danych';
	};

	const formatTime = (value: DateInput) => {
		const date = normalizeDate(value);
		return date
			? date.toLocaleTimeString('pl-PL', {
					hour: '2-digit',
					minute: '2-digit',
				})
			: 'Brak danych';
	};

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

	const getMedicationLines = (medications: Prescription['medications']) => {
		if (!medications) return [];
		if (Array.isArray(medications)) {
			return medications
				.map((entry) => {
					if (typeof entry === 'string') return entry;
					if (entry && typeof entry === 'object') {
						const { name, dosage, instructions, ...rest } = entry as Medication;
						const parts = [name, dosage, instructions]
							.filter((value) => value != null && value !== '')
							.map(String);
						if (parts.length > 0) return parts.join(' - ');
						const fallback = Object.values(rest)
							.filter((value) => value != null && value !== '')
							.map(String)
							.join(' - ');
						return fallback || 'Brak danych o leku';
					}
					return String(entry);
				})
				.filter((line) => line.trim().length > 0);
		}
		if (typeof medications === 'string') return [medications];
		return [JSON.stringify(medications)];
	};

	const viewVisit = (appointmentId?: number) =>
		emit('viewVisit', appointmentId);
	const viewPrescription = (prescriptionId?: number) =>
		emit('viewPrescription', prescriptionId);
</script>

<style></style>
