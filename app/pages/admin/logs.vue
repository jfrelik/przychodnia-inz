<script lang="ts" setup>
	import { PageHeader } from '#components';
	import type { TableColumn } from '@nuxt/ui';
	import type {
		ColumnFiltersState,
		PaginationState,
		SortingState,
	} from '@tanstack/vue-table';
	import { getPaginationRowModel } from '@tanstack/vue-table';
	const UButton = resolveComponent('UButton');

	type AuditLog = {
		logId: number;
		action: string;
		timestamp: string;
		ipAddress: string | null;
		userId: string | null;
		userName: string | null;
		userEmail: string | null;
	};

	definePageMeta({
		layout: 'admin',
	});

	useHead({
		title: 'Logi aktywności',
	});

	const {
		data: logs,
		error,
		refresh,
		pending,
	} = await useLazyFetch<AuditLog[]>('/api/admin/logs', {
		default: () => [],
		server: false,
	});

	const logsData = computed(() => logs.value ?? []);

	const tableKey = ref(0);

	watch(
		() => logs.value,
		() => {
			tableKey.value++;
		},
		{ deep: false }
	);

	const table = ref();
	const globalFilter = ref('');
	const columnFilters = ref<ColumnFiltersState>([]);
	const sorting = ref<SortingState>([]);
	const pagination = ref<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const columns: TableColumn<AuditLog>[] = [
		{
			id: 'expand',
			cell: ({ row }) =>
				h(UButton, {
					color: 'neutral',
					variant: 'ghost',
					icon: 'i-lucide-chevron-down',
					square: true,
					'aria-label': 'Expand',
					ui: {
						leadingIcon: [
							'transition-transform',
							row.getIsExpanded() ? 'duration-200 rotate-180' : '',
						],
					},
					onClick: () => row.toggleExpanded(),
				}),
			size: 50,
		},
		{
			accessorKey: 'timestamp',
			header: 'Data',
			cell: ({ row }) => {
				return new Date(row.getValue('timestamp')).toLocaleString('pl-PL', {
					day: 'numeric',
					month: 'short',
					hour: '2-digit',
					minute: '2-digit',
					hour12: false,
				});
			},
			size: 120,
			enableSorting: true,
		},
		{
			accessorKey: 'action',
			header: 'Działanie',
			cell: ({ row }) => {
				const value = String(row.getValue('action') ?? '');
				return h(
					'span',
					{
						class: 'block max-w-64 truncate',
						title: value,
					},
					value
				);
			},
			size: 300,
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'userName',
			header: 'Administrator',
			cell: ({ row }) => {
				const value = String(row.getValue('userName') ?? '');
				return h(
					'span',
					{
						class: 'block wrap-break-word whitespace-normal',
					},
					value
				);
			},
			size: 150,
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'userEmail',
			header: 'Email',
			cell: ({ row }) => {
				const value = String(row.getValue('userEmail') ?? '');
				return h(
					'span',
					{
						class: 'block wrap-break-word whitespace-normal',
					},
					value
				);
			},
			size: 200,
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'ipAddress',
			header: 'Adres IP',
			cell: ({ row }) => {
				const value = String(row.getValue('ipAddress') ?? '');
				return h(
					'span',
					{
						class: 'block wrap-break-word whitespace-normal',
					},
					value
				);
			},
			size: 120,
			enableSorting: true,
			enableGlobalFilter: true,
		},
	];
</script>

<template>
	<PageContainer class="min-h-0 flex-1">
		<div class="flex min-h-0 flex-1 flex-col gap-y-6">
			<PageHeader
				title="Logi aktywności"
				description="Przeglądaj logi działań administratorów w systemie."
			/>

			<UAlert
				v-if="error"
				color="error"
				icon="i-lucide-alert-triangle"
				title="Nie udało się pobrać logów"
				description="Spróbuj ponownie odświeżyć stronę."
			>
				<template #actions>
					<UButton color="neutral" variant="soft" @click="refresh()">
						Ponów próbę
					</UButton>
				</template>
			</UAlert>

			<UCard
				class="flex min-h-0 flex-1 flex-col"
				:ui="{ body: 'flex flex-1 flex-col min-h-0 gap-4 p-5' }"
			>
				<template #header>
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-lg font-semibold">Ostatnie działania</h2>
							<p class="text-sm text-neutral-500">
								Zobacz wszystkie działania administratorów w systemie.
							</p>
						</div>
						<UButton
							variant="soft"
							icon="i-lucide-refresh-cw"
							class="cursor-pointer"
							@click="refresh()"
						>
							Odśwież
						</UButton>
					</div>
				</template>

				<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
					<UInput
						v-model="globalFilter"
						icon="i-lucide-search"
						placeholder="Szukaj w logach..."
						clearable
						class="max-w-md"
					/>
					<ClientOnly>
						<UTable
							:key="tableKey"
							ref="table"
							v-model:global-filter="globalFilter"
							v-model:column-filters="columnFilters"
							v-model:sorting="sorting"
							v-model:pagination="pagination"
							:data="logsData"
							:columns
							:loading="pending"
							loading-color="primary"
							loading-animation="elastic"
							empty="Nie ma logów do wyświetlenia."
							sticky="header"
							class="min-h-0 min-w-full flex-1 overflow-y-auto"
							:pagination-options="{
								getPaginationRowModel: getPaginationRowModel(),
							}"
						>
							<template #expanded="{ row }">
								<div
									class="max-w-full overflow-hidden rounded-lg bg-neutral-50 p-4 text-sm wrap-break-word whitespace-pre-wrap"
								>
									{{ row.getValue('action') }}
								</div>
							</template>
						</UTable>
						<div class="flex justify-center pt-4">
							<UPagination
								:default-page="
									(table?.tableApi?.getState().pagination.pageIndex || 0) + 1
								"
								:items-per-page="
									table?.tableApi?.getState().pagination.pageSize
								"
								:total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
								@update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
							/>
						</div>
					</ClientOnly>
				</div>
			</UCard>
		</div>
	</PageContainer>
</template>
