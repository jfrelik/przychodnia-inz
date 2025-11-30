<script setup lang="ts">
	import type { TableColumn } from '@nuxt/ui';
	import type {
		ColumnFiltersState,
		PaginationState,
		SortingState,
	} from '@tanstack/vue-table';
	import { getPaginationRowModel } from '@tanstack/vue-table';

	type Patient = {
		userId: string;
		firstName: string;
		lastName: string;
		pesel: string;
		phone: string;
		address: string;
		email: string;
		createdAt: Date;
	};

	definePageMeta({
		layout: 'admin',
	});

	useHead({
		title: 'Panel pacjentów',
	});

	const {
		data: patientsData,
		pending,
		error,
		refresh,
	} = await useFetch<Patient[]>('/api/admin/patients', {
		default: () => [],
	});

	const patients = computed(() => patientsData.value ?? []);

	const table = ref();
	const globalFilter = ref('');
	const columnFilters = ref<ColumnFiltersState>([]);
	const sorting = ref<SortingState>([]);
	const pagination = ref<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const columns: TableColumn<Patient>[] = [
		{
			accessorKey: 'name',
			header: 'Imię i nazwisko',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'email',
			header: 'Email',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'pesel',
			header: 'PESEL',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'phone',
			header: 'Telefon',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'address',
			header: 'Adres',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'createdAt',
			header: 'Data rejestracji',
			enableSorting: true,
		},
	];
</script>

<template>
	<PageContainer class="min-h-0 flex-1">
		<PageHeader
			title="Panel pacjentów"
			description="Przeglądaj listę zarejestrowanych pacjentów i ich dane kontaktowe."
		/>

		<UInput
			v-model="globalFilter"
			icon="i-lucide-search"
			placeholder="Szukaj pacjentów..."
			clearable
			class="max-w-sm"
		/>

		<UAlert
			v-if="error"
			color="error"
			icon="i-lucide-alert-triangle"
			description="Nie udało się pobrać listy pacjentów."
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
						<h2 class="text-lg font-semibold">Lista pacjentów</h2>
						<p class="text-sm text-neutral-500">
							Wszyscy zarejestrowani pacjenci w systemie
						</p>
					</div>
					<UBadge
						variant="soft"
						color="primary"
						:label="`${patients.length} pozycji`"
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
					:data="patients"
					sticky="header"
					:columns="columns"
					:loading="pending"
					class="min-h-0 min-w-full flex-1 overflow-y-auto"
					:empty-state="{
						icon: 'i-lucide-user-x',
						label: 'Brak pacjentów',
					}"
					:pagination-options="{
						getPaginationRowModel: getPaginationRowModel(),
					}"
				>
					<template #name-cell="{ row }">
						{{ row.original.firstName }} {{ row.original.lastName }}
					</template>

					<template #createdAt-cell="{ row }">
						{{ new Date(row.original.createdAt).toLocaleDateString('pl-PL') }}
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
