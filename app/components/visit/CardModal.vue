<script lang="ts" setup>
	export type VisitDetails = {
		appointmentId: number;
		datetime: string | Date;
		status: string;
		type: string;
		isOnline: boolean;
		notes: string | null;
		patientId?: string;
		patientName?: string | null;
		patientEmail?: string | null;
		doctorName?: string | null;
		roomId: number | null;
		roomNumber: string | null;
		recommendation: string | null;
		prescription: string[] | null;
	};

	const props = defineProps<{
		open: boolean;
		loading: boolean;
		error: string | null;
		visit: VisitDetails | null;
		showPatient?: boolean;
		showDoctor?: boolean;
	}>();

	const emit = defineEmits<{
		(e: 'update:open', value: boolean): void;
		(e: 'close'): void;
	}>();

	const isOpen = computed({
		get: () => props.open,
		set: (value) => emit('update:open', value),
	});

	const closeModal = () => {
		emit('close');
		emit('update:open', false);
	};

	const normalizeDate = (value: string | Date) => {
		const date = value instanceof Date ? value : new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	};

	const formatDateTime = (value: string | Date) => {
		const date = normalizeDate(value);
		return date
			? date.toLocaleString('pl-PL', {
					day: 'numeric',
					month: 'long',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
				})
			: 'Brak danych';
	};
</script>

<template>
	<UModal v-model:open="isOpen" class="sm:max-w-2xl">
		<template #content>
			<UCard>
				<template #header>
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">Karta wizyty</h3>
						<UButton
							icon="lucide:x"
							variant="ghost"
							color="neutral"
							size="sm"
							class="cursor-pointer"
							@click="closeModal"
						/>
					</div>
				</template>

				<div v-if="loading" class="flex flex-col gap-4">
					<USkeleton class="h-6 w-3/4" />
					<USkeleton class="h-4 w-1/2" />
					<USkeleton class="h-20 w-full" />
					<USkeleton class="h-20 w-full" />
				</div>

				<UAlert v-else-if="error" color="error" variant="soft" :title="error" />

				<div v-else-if="visit" class="flex flex-col gap-5">
					<!-- Patient info -->
					<div v-if="showPatient !== false">
						<h4
							class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400"
						>
							<UIcon name="lucide:user" class="h-4 w-4" />
							Pacjent
						</h4>
						<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
							{{ visit.patientName ?? 'Brak danych' }}
						</p>
					</div>

					<!-- Doctor info -->
					<div v-if="showDoctor && visit.doctorName">
						<h4
							class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400"
						>
							<UIcon name="lucide:stethoscope" class="h-4 w-4" />
							Lekarz
						</h4>
						<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
							{{ visit.doctorName }}
						</p>
					</div>

					<!-- Visit info -->
					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<h4
								class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400"
							>
								<UIcon name="lucide:calendar" class="h-4 w-4" />
								Data i godzina
							</h4>
							<p class="text-gray-900 dark:text-gray-100">
								{{ formatDateTime(visit.datetime) }}
							</p>
						</div>
						<div>
							<h4
								class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400"
							>
								<UIcon
									:name="visit.isOnline ? 'lucide:video' : 'lucide:map-pin'"
									class="h-4 w-4"
								/>
								Lokalizacja
							</h4>
							<p class="text-gray-900 dark:text-gray-100">
								{{
									visit.roomNumber
										? `Gabinet ${visit.roomNumber}`
										: 'Wizyta online'
								}}
							</p>
						</div>
					</div>

					<!-- Notes -->
					<div v-if="visit.notes">
						<h4
							class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400"
						>
							<UIcon name="lucide:file-text" class="h-4 w-4" />
							Notatki z wizyty
						</h4>
						<p
							class="rounded-lg bg-gray-50 p-3 whitespace-pre-wrap text-gray-900 dark:bg-gray-800 dark:text-gray-100"
						>
							{{ visit.notes }}
						</p>
					</div>

					<!-- Recommendation -->
					<div v-if="visit.recommendation">
						<h4
							class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400"
						>
							<UIcon name="lucide:clipboard-list" class="h-4 w-4" />
							Zalecenia
						</h4>
						<p
							class="rounded-lg bg-blue-50 p-3 whitespace-pre-wrap text-gray-900 dark:bg-blue-950 dark:text-gray-100"
						>
							{{ visit.recommendation }}
						</p>
					</div>

					<!-- Prescription -->
					<div v-if="visit.prescription && visit.prescription.length > 0">
						<h4
							class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400"
						>
							<UIcon name="lucide:pill" class="h-4 w-4" />
							Recepta
						</h4>
						<ul class="space-y-1 rounded-lg bg-green-50 p-3 dark:bg-green-950">
							<li
								v-for="(med, idx) in visit.prescription"
								:key="idx"
								class="flex items-start gap-2 text-gray-900 dark:text-gray-100"
							>
								<span
									class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500"
								/>
								{{ med }}
							</li>
						</ul>
					</div>

					<!-- No details message -->
					<UAlert
						v-if="
							!visit.notes &&
							!visit.recommendation &&
							(!visit.prescription || visit.prescription.length === 0)
						"
						color="neutral"
						variant="soft"
						title="Brak szczegółów"
						description="Ta wizyta nie zawiera dodatkowych notatek, zaleceń ani recepty."
					/>
				</div>

				<template #footer>
					<div class="flex justify-end">
						<UButton
							variant="soft"
							color="neutral"
							class="cursor-pointer"
							@click="closeModal"
						>
							Zamknij
						</UButton>
					</div>
				</template>
			</UCard>
		</template>
	</UModal>
</template>
