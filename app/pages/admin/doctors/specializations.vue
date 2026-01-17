<script lang="ts" setup>
	import type { TableColumn } from '@nuxt/ui';
	import type {
		ColumnFiltersState,
		PaginationState,
		SortingState,
	} from '@tanstack/vue-table';
	import { getPaginationRowModel } from '@tanstack/vue-table';

	interface Specialization {
		id: number;
		name: string;
		description: string;
		icon: string;
	}

	definePageMeta({
		layout: 'admin',
	});

	useHead({
		title: 'Specjalizacje medyczne',
	});

	const toast = useToast();

	const { data, pending, error, refresh } = await useLazyFetch<
		Specialization[]
	>('/api/admin/specializations', {
		default: () => [],
		server: false,
	});

	const tableKey = ref(0);

	watch(
		() => data.value,
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

	const columns: TableColumn<Specialization>[] = [
		{
			accessorKey: 'icon',
			header: 'Ikona',
			enableSorting: false,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'name',
			header: 'Specjalizacja',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'description',
			header: 'Opis',
			enableSorting: false,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'actions',
			header: 'Akcje',
		},
	];

	const createForm = reactive({
		name: '',
		description: '',
		icon: '',
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
		createForm.description = '';
		createForm.icon = '';
	};

	const isRenameModalOpen = ref(false);
	const isDeleteModalOpen = ref(false);
	const isRenamePending = ref(false);
	const isDeletePending = ref(false);

	const selectedSpecialization = ref<Specialization | null>(null);
	const renameForm = reactive({
		name: '',
		description: '',
		icon: '',
	});

	const iconPattern = /^lucide:[a-z0-9-]+$/;
	const createIconValue = computed(() => createForm.icon.trim());
	const renameIconValue = computed(() => renameForm.icon.trim());
	const isCreateIconValid = computed(() =>
		iconPattern.test(createIconValue.value)
	);
	const isRenameIconValid = computed(() =>
		iconPattern.test(renameIconValue.value)
	);

	const handleCreate = async () => {
		const trimmedName = createForm.name.trim();
		const trimmedDescription = createForm.description.trim();
		const trimmedIcon = createForm.icon.trim();

		if (!trimmedName) {
			toast.add({
				title: 'Nieprawidłowa nazwa',
				description: 'Podaj nazwę specjalizacji.',
				color: 'warning',
				icon: 'lucide:alert-triangle',
			});
			return;
		}
		if (trimmedDescription.length < 5) {
			toast.add({
				title: 'Nieprawidłowy opis',
				description: 'Opis specjalizacji musi mieć co najmniej 5 znaków.',
				color: 'warning',
				icon: 'lucide:alert-triangle',
			});
			return;
		}
		if (!iconPattern.test(trimmedIcon)) {
			toast.add({
				title: 'Nieprawidłowa ikona',
				description:
					'Nazwa ikonki musi zaczynać się od "lucide:" i zawierać tylko małe litery.',
				color: 'warning',
				icon: 'lucide:alert-triangle',
			});
			return;
		}

		isCreatePending.value = true;

		try {
			await $fetch('/api/admin/specializations', {
				method: 'POST',
				body: {
					name: trimmedName,
					description: trimmedDescription,
					icon: trimmedIcon,
				},
			});

			toast.add({
				title: 'Dodano specjalizację',
				description: 'Nowa specjalizacja została zapisana.',
				color: 'success',
				icon: 'lucide:check',
			});

			closeCreateModal();
			refresh();
		} catch (error) {
			toast.add({
				title: 'Dodawanie nie powiodło się',
				description: getErrorMessage(
					error,
					'Wystąpił błąd podczas dodawania specjalizacji.'
				),
				color: 'error',
				icon: 'lucide:x-circle',
			});
		} finally {
			isCreatePending.value = false;
		}
	};

	const openRenameModal = (item: Specialization) => {
		selectedSpecialization.value = item;
		renameForm.name = item.name;
		renameForm.description = item.description;
		renameForm.icon = item.icon;
		isRenameModalOpen.value = true;
	};

	const closeRenameModal = () => {
		isRenameModalOpen.value = false;
		isRenamePending.value = false;
		renameForm.name = '';
		renameForm.description = '';
		renameForm.icon = '';
		selectedSpecialization.value = null;
	};

	const handleRename = async () => {
		if (!selectedSpecialization.value) {
			return;
		}

		const trimmedName = renameForm.name.trim();
		const trimmedDescription = renameForm.description.trim();
		const trimmedIcon = renameForm.icon.trim();

		if (!trimmedName) {
			toast.add({
				title: 'Nieprawidłowa nazwa',
				description: 'Podaj nazwę specjalizacji.',
				color: 'warning',
				icon: 'lucide:alert-triangle',
			});
			return;
		}
		if (trimmedDescription.length < 5) {
			toast.add({
				title: 'Nieprawidłowy opis',
				description: 'Opis specjalizacji musi mieć co najmniej 5 znaków.',
				color: 'warning',
				icon: 'lucide:alert-triangle',
			});
			return;
		}
		if (!iconPattern.test(trimmedIcon)) {
			toast.add({
				title: 'Nieprawidłowa ikona',
				description:
					'Nazwa ikonki musi zaczynać się od "lucide:" i zawierać tylko małe litery.',
				color: 'warning',
				icon: 'lucide:alert-triangle',
			});
			return;
		}

		if (
			trimmedName === selectedSpecialization.value.name &&
			trimmedDescription === selectedSpecialization.value.description &&
			trimmedIcon === selectedSpecialization.value.icon
		) {
			closeRenameModal();
			return;
		}

		isRenamePending.value = true;

		try {
			await $fetch(
				`/api/admin/specializations/${selectedSpecialization.value.id}`,
				{
					method: 'PATCH',
					body: {
						name: trimmedName,
						description: trimmedDescription,
						icon: trimmedIcon,
					},
				}
			);
		} catch (error) {
			toast.add({
				title: 'Aktualizacja nie powiodła się',
				description: getErrorMessage(
					error,
					'Wystąpił błąd podczas aktualizacji specjalizacji.'
				),
				color: 'error',
				icon: 'lucide:x-circle',
			});
			isRenamePending.value = false;
			return;
		}

		toast.add({
			title: 'Zaktualizowano specjalizację',
			description: 'Nazwa specjalizacji została zmieniona.',
			color: 'success',
			icon: 'lucide:check',
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

		try {
			await $fetch(
				`/api/admin/specializations/${selectedSpecialization.value.id}`,
				{
					method: 'DELETE',
				}
			);
		} catch (error) {
			toast.add({
				title: 'Usuwanie nie powiodło się',
				description: getErrorMessage(
					error,
					'Wystąpił błąd podczas usuwania specjalizacji.'
				),
				color: 'error',
				icon: 'lucide:x-circle',
			});
			isDeletePending.value = false;
			return;
		}

		toast.add({
			title: 'Usunięto specjalizację',
			description: 'Specjalizacja została usunięta z systemu.',
			color: 'success',
			icon: 'lucide:check',
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
			<UButton color="primary" icon="lucide:plus" @click="openCreateModal">
				Dodaj specjalizację
			</UButton>
		</div>

		<UInput
			v-model="globalFilter"
			icon="lucide:search"
			placeholder="Szukaj specjalizacji..."
			clearable
			class="max-w-sm"
		/>

		<UAlert
			v-if="error"
			color="error"
			icon="lucide:alert-triangle"
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
					<ClientOnly>
						<UBadge
							variant="soft"
							color="primary"
							:label="`${data.length} pozycji`"
						/>
					</ClientOnly>
				</div>
			</template>

			<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
				<ClientOnly>
					<UTable
						:key="tableKey"
						ref="table"
						v-model:global-filter="globalFilter"
						v-model:column-filters="columnFilters"
						v-model:sorting="sorting"
						v-model:pagination="pagination"
						:data="data"
						:columns="columns"
						:loading="pending"
						sticky="header"
						class="min-h-0 min-w-full flex-1 overflow-y-auto"
						empty="Nie ma specjalizacji."
						:pagination-options="{
							getPaginationRowModel: getPaginationRowModel(),
						}"
					>
						<template #icon-cell="{ row }">
							<div class="flex items-center gap-2">
								<UIcon :name="row.original.icon" class="text-primary text-lg" />
							</div>
						</template>
						<template #description-cell="{ row }">
							<span
								class="block max-w-md truncate"
								:title="row.original.description"
							>
								{{ row.original.description }}
							</span>
						</template>

						<template #actions-cell="{ row }">
							<div class="flex justify-end gap-2">
								<UButton
									size="xs"
									variant="ghost"
									icon="lucide:pencil"
									class="cursor-pointer"
									@click="openRenameModal(row.original)"
								>
									Edytuj
								</UButton>
								<UButton
									size="xs"
									color="error"
									variant="ghost"
									icon="lucide:trash"
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
				</ClientOnly>
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
								icon="lucide:stethoscope"
								placeholder="Podaj nową nazwę"
							/>
						</UFormField>
						<UFormField label="Ikona" name="icon">
							<UInput
								v-model="renameForm.icon"
								:disabled="isRenamePending"
								placeholder="lucide:heart-pulse"
								icon="lucide:heart-pulse"
							/>
							<div
								class="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500"
							>
								<a
									href="https://lucide.dev/icons"
									target="_blank"
									rel="noopener noreferrer"
									class="text-primary hover:underline"
								>
									Przeglądaj ikony Lucide
								</a>
								<div class="flex items-center gap-2">
									<span>Podgląd:</span>
									<UIcon
										v-if="isRenameIconValid"
										:name="renameIconValue"
										class="text-primary text-lg"
									/>
									<span v-else class="text-neutral-400">Brak</span>
								</div>
							</div>
						</UFormField>
						<UFormField label="Opis" name="description">
							<UTextarea
								v-model="renameForm.description"
								:disabled="isRenamePending"
								placeholder="Krótki opis specjalizacji"
								:rows="3"
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
								icon="lucide:trash"
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
								icon="lucide:stethoscope"
							/>
						</UFormField>
						<UFormField label="Ikona" name="icon">
							<UInput
								v-model="createForm.icon"
								placeholder="lucide:heart-pulse"
								:disabled="isCreatePending"
								icon="lucide:heart-pulse"
							/>
							<div
								class="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500"
							>
								<a
									href="https://lucide.dev/icons"
									target="_blank"
									rel="noopener noreferrer"
									class="text-primary hover:underline"
								>
									Przeglądaj ikony Lucide
								</a>
								<div class="flex items-center gap-2">
									<span>Podgląd:</span>
									<UIcon
										v-if="isCreateIconValid"
										:name="createIconValue"
										class="text-primary text-lg"
									/>
									<span v-else class="text-neutral-400">Brak</span>
								</div>
							</div>
						</UFormField>
						<UFormField label="Opis" name="description">
							<UTextarea
								v-model="createForm.description"
								placeholder="Krótki opis specjalizacji"
								:disabled="isCreatePending"
								:rows="3"
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
								icon="lucide:plus"
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
