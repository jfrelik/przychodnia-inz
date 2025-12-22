<script setup lang="ts">
	import type { TableColumn } from '@nuxt/ui';
	import type {
		ColumnFiltersState,
		PaginationState,
		SortingState,
	} from '@tanstack/vue-table';
	import { getPaginationRowModel } from '@tanstack/vue-table';
	import { h, resolveComponent } from 'vue';

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

	definePageMeta({
		layout: 'receptionist',
	});

	useHead({
		title: 'Pacjenci i lekarze',
	});

	const toast = useToast();
	const router = useRouter();
	const UButton = resolveComponent('UButton');

	const {
		data: directoryData,
		pending,
		error,
		refresh,
	} = await useFetch<DirectoryUser[]>('/api/receptionist/users', {
		default: () => [],
	});

	const allowedRoles = ['user', 'doctor'] as const;
	const directory = computed(() => directoryData.value ?? []);
	const filteredDirectory = computed(() =>
		directory.value.filter((item) =>
			allowedRoles.includes(item.role as (typeof allowedRoles)[number])
		)
	);

	const table = ref();
	const globalFilter = ref('');
	const roleFilter = ref<string | null>(null);
	const columnFilters = ref<ColumnFiltersState>([]);
	const sorting = ref<SortingState>([]);
	const pagination = ref<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const roleLabels: Record<string, string> = {
		admin: 'Administrator',
		doctor: 'Lekarz',
		receptionist: 'Recepcjonista',
		user: 'Pacjent',
	};

	const roleOptions = computed(() => {
		const values = new Set(filteredDirectory.value.map((item) => item.role));
		return Array.from(values).map((role) => ({
			label: roleLabels[role] ?? role,
			value: role,
		}));
	});

	watch(
		roleFilter,
		(value) => {
			const nextFilters = columnFilters.value.filter(
				(filter) => filter.id !== 'role'
			);

			if (value) {
				nextFilters.push({ id: 'role', value });
			}

			columnFilters.value = nextFilters;
		},
		{ immediate: true }
	);

	const columns: TableColumn<DirectoryUser>[] = [
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
			accessorKey: 'name',
			header: 'Imie i nazwisko',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'email',
			header: 'E-mail',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'role',
			header: 'Rola',
			enableSorting: true,
			filterFn: (row, id, value) => {
				if (!value) return true;
				return String(row.getValue(id)) === String(value);
			},
		},
	];

	const formatRole = (role: string) => roleLabels[role] ?? role;
	const formatDoctorValue = (value: string | null | undefined) =>
		value && value.trim().length ? value : 'Brak danych';

	const handleAction = (user: DirectoryUser) => {
		toast.add({
			title: 'Wybrano uzytkownika',
			description: `${user.name} (${formatRole(user.role)})`,
			color: 'primary',
			icon: 'i-lucide-user',
		});
	};

	const scheduleForPatient = (user: DirectoryUser) => {
		router.push(`/receptionist/appointments/${user.userId}`);
	};
</script>

<template>
	<PageContainer class="min-h-0 flex-1">
		<PageHeader
			title="Uzytkownicy i lekarze"
			description="Przegladaj liste kont pacjentow i lekarzy. Filtruj po roli i wyszukuj po imieniu."
		/>

		<div class="flex flex-wrap gap-3">
			<UInput
				v-model="globalFilter"
				icon="i-lucide-search"
				placeholder="Szukaj po imieniu lub nazwisku"
				clearable
				class="w-full max-w-md"
			/>
			<USelect
				v-model="roleFilter"
				:items="[{ label: 'Wszystkie role', value: null }, ...roleOptions]"
				placeholder="Filtruj po roli"
				class="w-full max-w-xs"
				clearable
			/>
		</div>

		<UAlert
			v-if="error"
			color="error"
			icon="i-lucide-alert-triangle"
			description="Nie udalo sie pobrac listy kont. Sprobuj ponownie."
		>
			<template #actions>
				<UButton variant="soft" @click="refresh()">Odswiez</UButton>
			</template>
		</UAlert>

		<UCard
			class="flex min-h-0 flex-1 flex-col"
			:ui="{ body: 'flex flex-1 flex-col min-h-0 gap-4 p-5' }"
		>
			<template #header>
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-lg font-semibold">Lista kont</h2>
						<p class="text-sm text-neutral-500">
							Pacjenci oraz lekarze z podstawowymi danymi kontaktowymi.
						</p>
					</div>
					<UBadge
						variant="soft"
						color="primary"
						:label="`${filteredDirectory.length} pozycji`"
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
					:data="filteredDirectory"
					:columns="columns"
					:loading="pending"
					sticky="header"
					class="min-h-0 min-w-full flex-1 overflow-y-auto"
					:empty-state="{
						icon: 'i-lucide-users',
						label: 'Brak wynikow',
						description: 'Utworz uzytkownikow lub zmien filtry wyszukiwania.',
					}"
					:pagination-options="{
						getPaginationRowModel: getPaginationRowModel(),
					}"
				>
					<template #role-cell="{ row }">
						<UBadge
							variant="subtle"
							color="primary"
							:label="formatRole(row.original.role)"
						/>
					</template>

					<template #expanded="{ row }">
						<div
							class="flex flex-col gap-3 rounded-md border border-neutral-200 p-3"
						>
							<div class="flex flex-wrap items-center justify-between gap-2">
								<UButton
									variant="soft"
									color="primary"
									icon="i-lucide-corner-right-up"
									class="cursor-pointer"
									@click="handleAction(row.original)"
								>
									Wybierz
								</UButton>
								<UButton
									v-if="row.original.role === 'user'"
									variant="solid"
									color="primary"
									icon="i-lucide-calendar-plus"
									class="cursor-pointer"
									@click="scheduleForPatient(row.original)"
								>
									Umow wizyte
								</UButton>
							</div>
							<div
								v-if="row.original.isDoctor"
								class="flex flex-col gap-1 text-sm text-neutral-700"
							>
								<div>
									<span class="font-semibold">Specjalizacja:</span>
									{{ formatDoctorValue(row.original.specializationName) }}
								</div>
								<div>
									<span class="font-semibold">Nr licencji:</span>
									{{ formatDoctorValue(row.original.licenseNumber) }}
								</div>
							</div>
							<p v-else class="text-sm text-neutral-500">
								Brak dodatkowych danych dla pacjenta.
							</p>
						</div>
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
