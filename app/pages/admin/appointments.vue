<script setup lang="ts">
	import type { TableColumn } from '@nuxt/ui';
	import type {
		ColumnFiltersState,
		PaginationState,
		SortingState,
	} from '@tanstack/vue-table';
	import { getPaginationRowModel } from '@tanstack/vue-table';

	type Appointment = {
		appointmentId: number;
		datetime: Date;
		status: string;
		notes: string | null;
		patientId: string;
		patientFirstName: string;
		patientLastName: string;
		patientPesel: string;
		doctorId: string;
		doctorName: string;
		roomId: number;
		roomNumber: number;
	};

	definePageMeta({
		layout: 'admin',
	});

	useHead({
		title: 'Wizyty',
	});

	const {
		data: appointmentsData,
		pending,
		error,
		refresh,
	} = await useFetch<Appointment[]>('/api/admin/appointments', {
		default: () => [],
	});

	const appointments = computed(() => appointmentsData.value ?? []);

	const table = ref();
	const globalFilter = ref('');
	const columnFilters = ref<ColumnFiltersState>([]);
	const sorting = ref<SortingState>([]);
	const pagination = ref<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const columns: TableColumn<Appointment>[] = [
		{
			accessorKey: 'datetime',
			header: 'Data i godzina',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'patientName',
			header: 'Pacjent',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'patientPesel',
			header: 'PESEL',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'doctorName',
			header: 'Lekarz',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'roomNumber',
			header: 'Sala',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'status',
			header: 'Status',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'notes',
			header: 'Notatki',
			enableSorting: false,
			enableGlobalFilter: true,
		},
	];

	const getStatusLabel = (status: string) => {
		const labels: Record<string, string> = {
			scheduled: 'Zaplanowana',
			completed: 'Zakończona',
			canceled: 'Anulowana',
		};
		return labels[status] || status;
	};

	const getStatusColor = (
		status: string
	): 'primary' | 'success' | 'error' | 'neutral' => {
		const colors: Record<string, 'primary' | 'success' | 'error' | 'neutral'> =
			{
				scheduled: 'primary',
				completed: 'success',
				canceled: 'error',
			};
		return colors[status] || 'neutral';
	};
</script>

<template>
	<PageContainer class="min-h-0 flex-1">
		<PageHeader
			title="Wizyty"
			description="Przeglądaj wszystkie umówione wizyty w systemie."
		/>

		<UInput
			v-model="globalFilter"
			icon="i-lucide-search"
			placeholder="Szukaj wizyt..."
			clearable
			class="max-w-sm"
		/>

		<UAlert
			v-if="error"
			color="error"
			icon="i-lucide-alert-triangle"
			description="Nie udało się pobrać listy wizyt."
		>
			<template #actions>
				<UButton variant="soft" @click="refresh()">Ponów próbę</UButton>
			</template>
		</UAlert>

		<UCard
			class="flex min-h-0 flex-1 flex-col"
			:ui="{ body: 'flex flex-1 flex-col min-h-0 gap-4 p-5' }"
		>
			<template #header>
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-lg font-semibold">Lista wizyt</h2>
						<p class="text-sm text-neutral-500">
							Wszystkie wizyty zarejestrowane w systemie
						</p>
					</div>
					<UBadge
						variant="soft"
						color="primary"
						:label="`${appointments.length} pozycji`"
					/>
				</div>
			</template>

			<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
				<UTable
					ref="table"
					v-model:global-filter="globalFilter"
					v-model:column-filters="columnFilters"
					v-model:sorting="sorting"
					v-model:pagination="pagination"
					:data="appointments"
					sticky="header"
					:columns="columns"
					:loading="pending"
					class="min-h-0 min-w-full flex-1 overflow-y-auto"
					:empty-state="{
						icon: 'i-lucide-calendar-x',
						label: 'Brak wizyt',
					}"
					:pagination-options="{
						getPaginationRowModel: getPaginationRowModel(),
					}"
				>
					<template #datetime-cell="{ row }">
						{{
							new Date(row.original.datetime).toLocaleString('pl-PL', {
								dateStyle: 'short',
								timeStyle: 'short',
							})
						}}
					</template>

					<template #patientName-cell="{ row }">
						{{ row.original.patientFirstName }}
						{{ row.original.patientLastName }}
					</template>

					<template #status-cell="{ row }">
						<UBadge
							:color="getStatusColor(row.original.status)"
							:label="getStatusLabel(row.original.status)"
							variant="soft"
						/>
					</template>

					<template #notes-cell="{ row }">
						{{ row.original.notes || '—' }}
					</template>
				</UTable>
				<div class="flex justify-center pt-4">
					<UPagination
						:default-page="
							(table?.tableApi?.getState().pagination.pageIndex || 0) + 1
						"
						:items-per-page="table?.tableApi?.getState().pagination.pageSize"
						:total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
						@update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
					/>
				</div>
			</div>
		</UCard>
	</PageContainer>
</template>
