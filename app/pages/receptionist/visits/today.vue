<script setup lang="ts">
	import type { TableColumn } from '@nuxt/ui';

	definePageMeta({
		layout: 'receptionist',
	});

	useHead({
		title: 'Dzisiejsze wizyty',
	});

	const toast = useToast();

	type TodayVisit = {
		appointmentId: number;
		datetime: string;
		status: 'scheduled' | 'checked_in';
		isOnline: boolean;
		type: 'consultation' | 'procedure';
		patientName: string;
		patientEmail: string | null;
		doctorName: string;
		doctorEmail: string | null;
		roomNumber: number | null;
	};

	const { data, pending, error, refresh } = await useFetch(
		'/api/receptionist/visits/today',
		{
			key: 'receptionist-visits-today',
			default: () => [] as TodayVisit[],
		}
	);

	const visits = computed(() => data.value ?? []);
	const globalFilter = ref('');

	const columns: TableColumn<TodayVisit>[] = [
		{ accessorKey: 'datetime', header: 'Godzina', enableGlobalFilter: true },
		{ accessorKey: 'patientName', header: 'Pacjent', enableGlobalFilter: true },
		{ accessorKey: 'doctorName', header: 'Lekarz', enableGlobalFilter: true },
		{ accessorKey: 'roomNumber', header: 'Gabinet' },
		{ accessorKey: 'status', header: 'Status', enableGlobalFilter: true },
		{ id: 'actions', header: 'Akcje' },
	];

	const formatTime = (value: string | Date) => useTime(value);

	const statusLabels: Record<string, string> = {
		scheduled: 'Zaplanowana',
		checked_in: 'Tożsamość potwierdzona',
	};

	const showModal = ref(false);
	const selectedVisit = ref<TodayVisit | null>(null);
	const peselInput = ref('');
	const submitting = ref(false);

	const openCheckIn = (visit: TodayVisit) => {
		selectedVisit.value = visit;
		peselInput.value = '';
		showModal.value = true;
	};

	const confirmCheckIn = async () => {
		if (!selectedVisit.value) return;
		submitting.value = true;
		try {
			await $fetch('/api/receptionist/visits/checkin', {
				method: 'POST',
				body: {
					appointmentId: selectedVisit.value.appointmentId,
					pesel: peselInput.value,
				},
			});
			toast.add({
				title: 'Obecność zweryfikowana',
				color: 'success',
			});
			showModal.value = false;
			await refresh();
		} catch (err) {
			toast.add({
				title: 'Błąd',
				description: getErrorMessage(
					err,
					'Nie udało się zweryfikować obecności'
				),
				color: 'error',
			});
		} finally {
			submitting.value = false;
		}
	};
</script>

<template>
	<PageContainer class="min-h-0 flex-1">
		<PageHeader
			title="Dzisiejsze wizyty"
			description="Zweryfikuj obecność pacjentów na podstawie numeru PESEL."
		/>

		<UAlert
			v-if="error"
			color="error"
			icon="lucide:alert-triangle"
			description="Nie udało się pobrać listy wizyt."
		>
			<template #actions>
				<UButton variant="soft" @click="refresh()">Odśwież</UButton>
			</template>
		</UAlert>

		<div class="flex flex-wrap items-center gap-3 pb-4">
			<UInput
				v-model="globalFilter"
				icon="lucide:search"
				placeholder="Szukaj po pacjencie lub lekarzu"
				clearable
				class="w-full max-w-md"
			/>
		</div>

		<UCard
			class="flex min-h-0 flex-1 flex-col"
			:ui="{ body: 'p-5 flex-1 flex flex-col min-h-0 gap-4' }"
		>
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-lg font-semibold">Lista wizyt</h2>
					<p class="text-sm text-neutral-500">Wizyty zaplanowane na dziś.</p>
				</div>
				<UBadge
					variant="soft"
					color="primary"
					:label="`${visits?.length ?? 0} wizyt`"
				/>
			</div>

			<UTable
				v-model:global-filter="globalFilter"
				:data="visits"
				:columns="columns"
				:loading="pending"
				sticky="header"
				class="min-h-0 min-w-full flex-1 overflow-y-auto"
				:empty-state="{
					icon: 'lucide:calendar',
					label: 'Brak wizyt',
					description: 'Brak wizyt na dziś.',
				}"
			>
				<template #datetime-cell="{ row }">
					{{ formatTime(row.original.datetime) }}
				</template>
				<template #roomNumber-cell="{ row }">
					<span v-if="row.original.roomNumber" class="font-medium">
						{{ row.original.roomNumber }}
					</span>
					<span v-else class="text-neutral-400">—</span>
				</template>
				<template #status-cell="{ row }">
					<UBadge
						:color="
							row.original.status === 'checked_in' ? 'success' : 'primary'
						"
						variant="subtle"
					>
						{{ statusLabels[row.original.status] || row.original.status }}
					</UBadge>
				</template>
				<template #actions-cell="{ row }">
					<UButton
						size="sm"
						color="primary"
						variant="solid"
						icon="lucide:badge-check"
						:disabled="row.original.status === 'checked_in'"
						class="cursor-pointer"
						@click="openCheckIn(row.original)"
					>
						Potwierdź obecność
					</UButton>
				</template>
			</UTable>
		</UCard>

		<UModal
			v-model:open="showModal"
			title="Potwierdź przybycie pacjenta"
			prevent-close
		>
			<template #body>
				<div v-if="selectedVisit" class="space-y-2 text-sm text-neutral-700">
					<p>
						<span class="font-semibold">Pacjent:</span>
						{{ selectedVisit.patientName }}
					</p>
					<p>
						<span class="font-semibold">Lekarz:</span>
						{{ selectedVisit.doctorName }}
					</p>
					<p>
						<span class="font-semibold">Godzina:</span>
						{{ formatTime(selectedVisit.datetime) }}
					</p>
					<p v-if="selectedVisit.roomNumber">
						<span class="font-semibold">Gabinet:</span>
						{{ selectedVisit.roomNumber }}
					</p>
				</div>
				<UForm class="mt-4 space-y-4" @submit.prevent="confirmCheckIn">
					<UFormField label="PESEL" description="Zweryfikuj numer z dokumentem">
						<UInput
							v-model="peselInput"
							placeholder="11 cyfr"
							inputmode="numeric"
							maxlength="11"
						/>
					</UFormField>
				</UForm>
			</template>
			<template #footer>
				<div class="flex w-full justify-end gap-2">
					<UButton variant="soft" color="neutral" @click="showModal = false">
						Anuluj
					</UButton>
					<UButton
						type="submit"
						color="primary"
						:loading="submitting"
						class="cursor-pointer"
						@click="confirmCheckIn"
					>
						Potwierdź przybycie
					</UButton>
				</div>
			</template>
		</UModal>
	</PageContainer>
</template>
