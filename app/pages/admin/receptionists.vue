<script setup lang="ts">
	import type { TableColumn } from '@nuxt/ui';
	import type {
		ColumnFiltersState,
		PaginationState,
		SortingState,
	} from '@tanstack/vue-table';
	import { getPaginationRowModel } from '@tanstack/vue-table';

	type Receptionist = {
		userId: string;
		userName: string;
		userEmail: string;
	};

	definePageMeta({
		layout: 'admin',
	});

	useHead({
		title: 'Panel recepcjonistów',
	});

	const toast = useToast();

	const {
		data: receptionistsData,
		pending,
		error,
		refresh,
	} = await useLazyFetch<Receptionist[]>('/api/admin/receptionists', {
		default: () => [],
		server: false,
	});

	const receptionists = computed(() => receptionistsData.value ?? []);

	const tableKey = ref(0);

	watch(
		() => receptionistsData.value,
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

	const columns: TableColumn<Receptionist>[] = [
		{
			accessorKey: 'userName',
			header: 'Imię i nazwisko',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'userEmail',
			header: 'Email',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'actions',
			header: 'Akcje',
		},
	];

	const createForm = reactive({
		email: '',
		name: '',
	});

	const editForm = reactive({
		note: '',
	});

	const isCreateModalOpen = ref(false);
	const isEditModalOpen = ref(false);
	const isDeleteModalOpen = ref(false);

	const isCreatePending = ref(false);
	const isEditPending = ref(false);
	const isDeletePending = ref(false);

	const selectedReceptionist = ref<Receptionist | null>(null);

	const openCreateModal = () => {
		isCreateModalOpen.value = true;
	};

	const closeCreateModal = () => {
		isCreateModalOpen.value = false;
		isCreatePending.value = false;
		createForm.email = '';
		createForm.name = '';
	};

	const openEditModal = (receptionist: Receptionist) => {
		selectedReceptionist.value = receptionist;
		isEditModalOpen.value = true;
	};

	const closeEditModal = () => {
		isEditModalOpen.value = false;
		isEditPending.value = false;
		editForm.note = '';
		selectedReceptionist.value = null;
	};

	const openDeleteModal = (receptionist: Receptionist) => {
		selectedReceptionist.value = receptionist;
		isDeleteModalOpen.value = true;
	};

	const closeDeleteModal = () => {
		isDeleteModalOpen.value = false;
		isDeletePending.value = false;
		selectedReceptionist.value = null;
	};

	const handleCreate = async () => {
		const trimmedEmail = createForm.email.trim();
		const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
			toast.add({
				title: 'Nieprawidłowy adres email',
				description: 'Podaj poprawny adres email recepcjonisty.',
				color: 'warning',
				icon: 'lucide:alert-triangle',
			});
			return;
		}

		const trimmedName = createForm.name.trim();

		if (!trimmedName || trimmedName.length < 2) {
			toast.add({
				title: 'Nieprawidłowe imię i nazwisko',
				description:
					'Imię i nazwisko recepcjonisty musi mieć co najmniej 2 znaki.',
				color: 'warning',
				icon: 'lucide:alert-triangle',
			});
			return;
		}

		createForm.email = trimmedEmail;
		createForm.name = trimmedName;

		isCreatePending.value = true;

		try {
			await $fetch('/api/admin/receptionists', {
				method: 'POST',
				body: {
					email: trimmedEmail,
					name: trimmedName,
				},
			});
		} catch (error) {
			toast.add({
				title: 'Dodawanie nie powiodło się',
				description: getErrorMessage(
					error,
					'Wystąpił nieoczekiwany błąd podczas dodawania recepcjonisty.'
				),
				color: 'error',
				icon: 'lucide:x-circle',
			});
			isCreatePending.value = false;
			return;
		}

		isCreatePending.value = false;

		toast.add({
			title: 'Dodano recepcjonistę',
			description:
				'Konto recepcjonisty utworzono i wysłano link do resetu hasła na podany email.',
			color: 'success',
			icon: 'lucide:check',
		});

		closeCreateModal();
		await refresh();
	};

	const handleEdit = async () => {
		if (!selectedReceptionist.value) {
			return;
		}

		isEditPending.value = true;

		toast.add({
			title: 'Brak pól do edycji',
			description: 'Aktualnie brak danych recepcjonisty do zmiany.',
			color: 'neutral',
			icon: 'lucide:info',
		});

		isEditPending.value = false;
		closeEditModal();
	};

	const handleDelete = async () => {
		if (!selectedReceptionist.value) {
			return;
		}

		isDeletePending.value = true;

		try {
			await $fetch(
				`/api/admin/receptionists/${selectedReceptionist.value.userId}`,
				{
					method: 'DELETE',
				}
			);
		} catch (error) {
			toast.add({
				title: 'Usuwanie nie powiodło się',
				description: getErrorMessage(
					error,
					'Wystąpił błąd podczas usuwania recepcjonisty.'
				),
				color: 'error',
				icon: 'lucide:x-circle',
			});
			isDeletePending.value = false;
			return;
		}

		isDeletePending.value = false;

		toast.add({
			title: 'Usunięto recepcjonistę',
			description: 'Recepcjonista został usunięty z systemu.',
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
				title="Panel recepcjonistów"
				description="Zarządzaj kontami recepcjonistów w systemie."
			/>
			<UButton color="primary" icon="lucide:user-plus" @click="openCreateModal">
				Dodaj recepcjonistę
			</UButton>
		</div>

		<UInput
			v-model="globalFilter"
			icon="lucide:search"
			placeholder="Szukaj recepcjonistów..."
			clearable
			class="max-w-sm"
		/>

		<UAlert
			v-if="error"
			color="error"
			icon="lucide:alert-triangle"
			description="Nie udało się pobrać listy recepcjonistów. Spróbuj ponownie."
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
						<h2 class="text-lg font-semibold">Lista recepcjonistów</h2>
						<p class="text-sm text-neutral-500">
							Przeglądaj konta recepcjonistów i zarządzaj dostępem.
						</p>
					</div>
					<ClientOnly>
						<UBadge
							variant="soft"
							color="primary"
							:label="`${receptionists.length} pozycji`"
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
						:data="receptionists"
						sticky="header"
						:columns="columns"
						:loading="pending"
						class="min-h-0 min-w-full flex-1 overflow-y-auto"
						empty="Nie ma recepcjonistów."
						:pagination-options="{
							getPaginationRowModel: getPaginationRowModel(),
						}"
					>
						<template #actions-cell="{ row }">
							<div class="flex justify-end gap-2">
								<UButton
									size="xs"
									variant="ghost"
									icon="lucide:pencil"
									class="cursor-pointer"
									@click="openEditModal(row.original)"
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

		<UModal v-model:open="isCreateModalOpen">
			<template #content>
				<UCard>
					<template #header>
						<h3 class="text-lg font-semibold">Dodaj recepcjonistę</h3>
					</template>

					<UForm
						id="create-receptionist-form"
						class="flex flex-col gap-4"
						@submit.prevent="handleCreate"
					>
						<UFormField label="Email" name="email" required>
							<UInput
								v-model="createForm.email"
								type="email"
								:disabled="isCreatePending"
								icon="lucide:mail"
								placeholder="np. recepcjonista@example.com"
							/>
						</UFormField>
						<UFormField label="Imię i nazwisko" name="name" required>
							<UInput
								v-model="createForm.name"
								:disabled="isCreatePending"
								icon="lucide:user"
								placeholder="np. Anna Nowak"
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
								form="create-receptionist-form"
								:loading="isCreatePending"
							>
								Dodaj recepcjonistę
							</UButton>
						</div>
					</template>
				</UCard>
			</template>
		</UModal>

		<UModal v-model:open="isEditModalOpen">
			<template #content>
				<UCard>
					<template #header>
						<h3 class="text-lg font-semibold">Edytuj recepcjonistę</h3>
					</template>

					<UForm
						id="edit-receptionist-form"
						class="flex flex-col gap-4"
						@submit.prevent="handleEdit"
					>
						<UFormField label="Imię i nazwisko" name="userName">
							<UInput
								:model-value="selectedReceptionist?.userName ?? ''"
								disabled
								icon="lucide:user"
							/>
						</UFormField>
						<UFormField label="Email" name="userEmail">
							<UInput
								:model-value="selectedReceptionist?.userEmail ?? ''"
								disabled
								icon="lucide:mail"
							/>
						</UFormField>
						<UAlert
							variant="subtle"
							icon="lucide:info"
							title="Brak pól do edycji"
							description="Aktualnie konto recepcjonisty nie posiada edytowalnych danych."
						/>
					</UForm>

					<template #footer>
						<div class="flex justify-end gap-2">
							<UButton type="button" variant="ghost" @click="closeEditModal">
								Anuluj
							</UButton>
							<UButton
								type="submit"
								form="edit-receptionist-form"
								:loading="isEditPending"
							>
								Zamknij
							</UButton>
						</div>
					</template>
				</UCard>
			</template>
		</UModal>

		<UModal v-model:open="isDeleteModalOpen">
			<template #content>
				<UCard>
					<template #header>
						<h3 class="text-lg font-semibold text-red-600">
							Usuń recepcjonistę
						</h3>
					</template>

					<p class="text-sm text-neutral-600">
						Czy na pewno chcesz usunąć recepcjonistę
						<strong>{{ selectedReceptionist?.userName }}</strong>
						? Użytkownik straci dostęp do panelu recepcjonisty. Operacja jest
						nieodwracalna.
					</p>

					<template #footer>
						<div class="flex justify-end gap-2">
							<UButton type="button" variant="ghost" @click="closeDeleteModal">
								Anuluj
							</UButton>
							<UButton
								color="error"
								icon="lucide:trash"
								:loading="isDeletePending"
								@click="handleDelete"
							>
								Usuń
							</UButton>
						</div>
					</template>
				</UCard>
			</template>
		</UModal>
	</PageContainer>
</template>
