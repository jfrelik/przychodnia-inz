<script lang="ts" setup>
	import type { TableColumn } from '@nuxt/ui';
	import type {
		ColumnFiltersState,
		PaginationState,
		SortingState,
	} from '@tanstack/vue-table';
	import { getPaginationRowModel } from '@tanstack/vue-table';
	import type { FetchError } from 'ofetch';

	type Specialization = {
		id: number;
		name: string;
		doctorCount: number;
	};

	definePageMeta({
		layout: 'admin',
	});

	useHead({
		title: 'Specjalizacje medyczne',
	});

	type FetchErrorLike = FetchError<unknown> | null;

	const getFetchErrorStatus = (fetchError: FetchErrorLike) =>
		fetchError?.statusCode ??
		fetchError?.status ??
		fetchError?.response?.status ??
		(fetchError?.data as { statusCode?: number } | undefined)?.statusCode;

	const getFetchErrorMessage = (fetchError: FetchErrorLike) =>
		(
			fetchError?.data as
				| { statusMessage?: string; message?: string }
				| undefined
		)?.statusMessage ??
		(fetchError?.data as { message?: string } | undefined)?.message ??
		fetchError?.statusMessage ??
		fetchError?.message;

	const toast = useToast();

	const {
		data: specializationsData,
		pending,
		error,
		refresh,
	} = await useFetch<Specialization[]>('/api/admin/specializations', {
		default: () => [],
	});

	const specializations = computed(() => specializationsData.value ?? []);

	const table = ref();
	const globalFilter = ref('');
	const columnFilters = ref<ColumnFiltersState>([]);
	const sorting = ref<SortingState>([]);
	const pagination = ref<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const columns: TableColumn<Specialization>[] = [
		{
			accessorKey: 'name',
			header: 'Specjalizacja',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'doctorCount',
			header: 'Przypisani lekarze',
			enableSorting: true,
		},
		{
			accessorKey: 'actions',
			header: 'Akcje',
		},
	];

	const createForm = reactive({
		name: '',
	});
	const isCreatePending = ref(false);
	const isCreateModalOpen = ref(false);

	const openCreateModal = () => {
		isCreateModalOpen.value = true;
	};

	const closeCreateModal = () => {
		isCreateModalOpen.value = false;
		isCreatePending.value = false;
		createForm.name = '';
	};

	const isRenameModalOpen = ref(false);
	const isDeleteModalOpen = ref(false);
	const isRenamePending = ref(false);
	const isDeletePending = ref(false);

	const selectedSpecialization = ref<Specialization | null>(null);
	const renameForm = reactive({
		name: '',
	});

	const handleCreate = async () => {
		const trimmedName = createForm.name.trim();

		if (!trimmedName) {
			toast.add({
				title: 'Nieprawidłowa nazwa',
				description: 'Podaj nazwę specjalizacji.',
				color: 'warning',
				icon: 'i-lucide-alert-triangle',
			});
			return;
		}

		isCreatePending.value = true;

		const { error: createError } = await useFetch(
			'/api/admin/specializations',
			{
				method: 'POST',
				body: { name: trimmedName },
			}
		);

		isCreatePending.value = false;

		if (createError.value) {
			const statusCode = getFetchErrorStatus(createError.value);
			const statusMessage = getFetchErrorMessage(createError.value);

			if (statusCode === 409) {
				toast.add({
					title: 'Nazwa zajęta',
					description:
						statusMessage ??
						'Specjalizacja o tej nazwie już istnieje. Wybierz inną nazwę.',
					color: 'warning',
					icon: 'i-lucide-alert-triangle',
				});
				return;
			}

			if (statusCode === 400) {
				toast.add({
					title: 'Nieprawidłowe dane',
					description:
						statusMessage ??
						'Podaj prawidłową nazwę specjalizacji i spróbuj ponownie.',
					color: 'warning',
					icon: 'i-lucide-alert-circle',
				});
				return;
			}

			toast.add({
				title: 'Dodawanie nie powiodło się',
				description:
					statusMessage ?? 'Wystąpił błąd podczas dodawania specjalizacji.',
				color: 'error',
				icon: 'i-lucide-x-circle',
			});
			return;
		}

		toast.add({
			title: 'Dodano specjalizację',
			description: 'Nowa specjalizacja została zapisana.',
			color: 'success',
			icon: 'i-lucide-check',
		});

		closeCreateModal();
		await refresh();
	};

	const openRenameModal = (item: Specialization) => {
		selectedSpecialization.value = item;
		renameForm.name = item.name;
		isRenameModalOpen.value = true;
	};

	const closeRenameModal = () => {
		isRenameModalOpen.value = false;
		isRenamePending.value = false;
		renameForm.name = '';
		selectedSpecialization.value = null;
	};

	const handleRename = async () => {
		if (!selectedSpecialization.value) {
			return;
		}

		const trimmedName = renameForm.name.trim();

		if (!trimmedName) {
			toast.add({
				title: 'Nieprawidłowa nazwa',
				description: 'Podaj nazwę specjalizacji.',
				color: 'warning',
				icon: 'i-lucide-alert-triangle',
			});
			return;
		}

		if (trimmedName === selectedSpecialization.value.name) {
			closeRenameModal();
			return;
		}

		isRenamePending.value = true;

		const { error: renameError } = await useFetch(
			`/api/admin/specializations/${selectedSpecialization.value.id}`,
			{
				method: 'PATCH',
				body: { name: trimmedName },
			}
		);

		isRenamePending.value = false;

		if (renameError.value) {
			const statusCode = getFetchErrorStatus(renameError.value);
			const statusMessage = getFetchErrorMessage(renameError.value);

			if (statusCode === 409) {
				toast.add({
					title: 'Nazwa zajęta',
					description:
						statusMessage ??
						'Specjalizacja o tej nazwie już istnieje. Wybierz inną nazwę.',
					color: 'warning',
					icon: 'i-lucide-alert-triangle',
				});
				return;
			}

			if (statusCode === 404) {
				toast.add({
					title: 'Specjalizacja nie istnieje',
					description:
						statusMessage ??
						'Wybrana specjalizacja nie istnieje lub została usunięta.',
					color: 'warning',
					icon: 'i-lucide-alert-circle',
				});
				return;
			}

			if (statusCode === 400) {
				toast.add({
					title: 'Nieprawidłowe dane',
					description:
						statusMessage ??
						'Podaj prawidłową nazwę specjalizacji i spróbuj ponownie.',
					color: 'warning',
					icon: 'i-lucide-alert-circle',
				});
				return;
			}

			toast.add({
				title: 'Aktualizacja nie powiodła się',
				description:
					statusMessage ?? 'Wystąpił błąd podczas aktualizacji specjalizacji.',
				color: 'error',
				icon: 'i-lucide-x-circle',
			});
			return;
		}

		toast.add({
			title: 'Zaktualizowano specjalizację',
			description: 'Nazwa specjalizacji została zmieniona.',
			color: 'success',
			icon: 'i-lucide-check',
		});

		closeRenameModal();
		await refresh();
	};

	const openDeleteModal = (item: Specialization) => {
		selectedSpecialization.value = item;
		isDeleteModalOpen.value = true;
	};

	const closeDeleteModal = () => {
		isDeleteModalOpen.value = false;
		isDeletePending.value = false;
		selectedSpecialization.value = null;
	};

	const handleDelete = async () => {
		if (!selectedSpecialization.value) {
			return;
		}

		isDeletePending.value = true;

		const { error: deleteError } = await useFetch(
			`/api/admin/specializations/${selectedSpecialization.value.id}`,
			{
				method: 'DELETE',
			}
		);

		isDeletePending.value = false;

		if (deleteError.value) {
			const statusCode = getFetchErrorStatus(deleteError.value);
			const statusMessage = getFetchErrorMessage(deleteError.value);

			if (statusCode === 404) {
				toast.add({
					title: 'Specjalizacja nie istnieje',
					description:
						statusMessage ??
						'Wybrana specjalizacja została już usunięta lub nie istnieje.',
					color: 'warning',
					icon: 'i-lucide-alert-circle',
				});
				return;
			}

			toast.add({
				title: 'Usuwanie nie powiodło się',
				description:
					statusMessage ?? 'Wystąpił błąd podczas usuwania specjalizacji.',
				color: 'error',
				icon: 'i-lucide-x-circle',
			});
			return;
		}

		toast.add({
			title: 'Usunięto specjalizację',
			description: 'Specjalizacja została usunięta z systemu.',
			color: 'success',
			icon: 'i-lucide-check',
		});

		closeDeleteModal();
		await refresh();
	};
</script>

<template>
	<PageContainer class="min-h-0 flex-1">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<PageHeader
				title="Specjalizacje medyczne"
				description="Zarządzaj listą specjalizacji, aby ułatwić przypisywanie lekarzy do właściwych dziedzin."
			/>
			<UButton color="primary" icon="i-lucide-plus" @click="openCreateModal">
				Dodaj specjalizację
			</UButton>
		</div>

		<UInput
			v-model="globalFilter"
			icon="i-lucide-search"
			placeholder="Szukaj specjalizacji..."
			clearable
			class="max-w-sm"
		/>

		<UAlert
			v-if="error"
			color="error"
			icon="i-lucide-alert-triangle"
			description="Nie udało się pobrać specjalizacji. Spróbuj ponownie."
		>
			<template #actions>
				<UButton variant="soft" color="neutral" @click="refresh()">
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
						<h2 class="text-lg font-semibold">Lista specjalizacji</h2>
						<p class="text-sm text-neutral-500">
							Przeglądaj istniejące specjalizacje oraz liczbę przypisanych do
							nich lekarzy.
						</p>
					</div>
					<UBadge
						variant="soft"
						color="primary"
						:label="`${specializations.length} pozycji`"
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
					:data="specializations"
					:columns="columns"
					:loading="pending"
					sticky="header"
					class="min-h-0 min-w-full flex-1 overflow-y-auto"
					:empty-state="{
						icon: 'i-lucide-file-search',
						label: 'Brak specjalizacji',
						description: 'Dodaj pierwszą specjalizację, aby rozpocząć.',
					}"
					:pagination-options="{
						getPaginationRowModel: getPaginationRowModel(),
					}"
				>
					<template #doctorCount-cell="{ row }">
						<span class="text-right font-medium">
							{{ row.original.doctorCount }}
						</span>
					</template>

					<template #actions-cell="{ row }">
						<div class="flex justify-end gap-2">
							<UButton
								size="xs"
								variant="ghost"
								icon="i-lucide-pencil"
								class="cursor-pointer"
								@click="openRenameModal(row.original)"
							>
								Edytuj
							</UButton>
							<UButton
								size="xs"
								color="error"
								variant="ghost"
								icon="i-lucide-trash"
								class="cursor-pointer"
								@click="openDeleteModal(row.original)"
							>
								Usuń
							</UButton>
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

		<UModal v-model:open="isRenameModalOpen">
			<template #content>
				<UCard>
					<template #header>
						<h3 class="text-lg font-semibold">Edytuj specjalizację</h3>
					</template>

					<UForm class="flex flex-col gap-4" @submit.prevent="handleRename">
						<UFormField label="Nazwa specjalizacji" name="name">
							<UInput
								v-model="renameForm.name"
								:disabled="isRenamePending"
								icon="i-lucide-stethoscope"
								placeholder="Podaj nową nazwę"
							/>
						</UFormField>

						<div class="flex justify-end gap-2">
							<UButton type="button" variant="ghost" @click="closeRenameModal">
								Anuluj
							</UButton>
							<UButton type="submit" :loading="isRenamePending">
								Zapisz zmiany
							</UButton>
						</div>
					</UForm>
				</UCard>
			</template>
		</UModal>

		<UModal v-model:open="isDeleteModalOpen">
			<template #content>
				<UCard>
					<template #header>
						<h3 class="text-lg font-semibold text-red-600">
							Usuń specjalizację
						</h3>
					</template>

					<p class="text-sm text-neutral-600">
						Czy na pewno chcesz usunąć specjalizację
						<strong>{{ selectedSpecialization?.name }}</strong>
						? Operacja jest nieodwracalna.
					</p>

					<template #footer>
						<div class="flex justify-end gap-2">
							<UButton type="button" variant="ghost" @click="closeDeleteModal">
								Anuluj
							</UButton>
							<UButton
								color="error"
								:loading="isDeletePending"
								icon="i-lucide-trash"
								@click="handleDelete"
							>
								Usuń
							</UButton>
						</div>
					</template>
				</UCard>
			</template>
		</UModal>

		<UModal v-model:open="isCreateModalOpen">
			<template #content>
				<UCard>
					<template #header>
						<h3 class="text-lg font-semibold">Dodaj specjalizację</h3>
					</template>

					<UForm
						id="create-specialization-form"
						class="flex flex-col gap-4"
						@submit.prevent="handleCreate"
					>
						<UFormField label="Nazwa specjalizacji" name="name">
							<UInput
								v-model="createForm.name"
								placeholder="np. Kardiolog"
								:disabled="isCreatePending"
								icon="i-lucide-stethoscope"
							/>
						</UFormField>
					</UForm>

					<template #footer>
						<div class="flex justify-end gap-2">
							<UButton type="button" variant="ghost" @click="closeCreateModal">
								Anuluj
							</UButton>
							<UButton
								type="submit"
								form="create-specialization-form"
								:loading="isCreatePending"
								icon="i-lucide-plus"
							>
								Dodaj specjalizację
							</UButton>
						</div>
					</template>
				</UCard>
			</template>
		</UModal>
	</PageContainer>
</template>
