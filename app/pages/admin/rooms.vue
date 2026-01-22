<script lang="ts" setup>
	import type { TableColumn } from '@nuxt/ui';
	import type {
		ColumnFiltersState,
		PaginationState,
		SortingState,
	} from '@tanstack/vue-table';
	import { getPaginationRowModel } from '@tanstack/vue-table';

	type Room = {
		roomId: number;
		number: number;
		appointmentCount: number;
		specializationIds: number[];
		specializationNames: string[];
	};

	type Specialization = {
		id: number;
		name: string;
		doctorCount: number;
	};

	definePageMeta({
		layout: 'admin',
	});

	useHead({
		title: 'Zarządzanie gabinetami',
	});

	const toast = useToast();

	const {
		data: roomsData,
		pending,
		error,
		refresh,
	} = await useLazyFetch<Room[]>('/api/admin/rooms', {
		default: () => [],
		server: false,
	});

	const rooms = computed(() => roomsData.value ?? []);

	const { data: specializationsData } = await useLazyFetch<Specialization[]>(
		'/api/admin/specializations',
		{ default: () => [], server: false }
	);

	const specializations = computed(() => specializationsData.value ?? []);

	const tableKey = ref(0);

	watch(
		() => roomsData.value,
		() => {
			tableKey.value++;
		},
		{ deep: false }
	);

	const specializationOptions = computed(() =>
		specializations.value.map((s) => ({ label: s.name, value: s.id }))
	);

	const table = ref();
	const globalFilter = ref('');
	const columnFilters = ref<ColumnFiltersState>([]);
	const sorting = ref<SortingState>([]);
	const pagination = ref<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const columns: TableColumn<Room>[] = [
		{
			accessorKey: 'number',
			header: 'Numer gabinetu',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'specializationNames',
			header: 'Specjalizacje',
			enableSorting: false,
		},
		{
			accessorKey: 'actions',
			header: 'Akcje',
		},
	];

	const createForm = reactive({
		number: null as number | null,
		specializations: [] as number[],
	});

	const editForm = reactive({
		number: null as number | null,
		specializations: [] as number[],
	});

	const isCreateModalOpen = ref(false);
	const isEditModalOpen = ref(false);
	const isDeleteModalOpen = ref(false);

	const isCreatePending = ref(false);
	const isEditPending = ref(false);
	const isDeletePending = ref(false);

	const selectedRoom = ref<Room | null>(null);

	const openCreateModal = () => {
		createForm.number = null;
		createForm.specializations = [];
		isCreateModalOpen.value = true;
	};

	const closeCreateModal = () => {
		isCreateModalOpen.value = false;
		isCreatePending.value = false;
		createForm.number = null;
		createForm.specializations = [];
	};

	const handleCreate = async () => {
		if (!createForm.number) {
			toast.add({
				title: 'Nieprawidłowy numer',
				description: 'Podaj numer gabinetu.',
				color: 'warning',
				icon: 'lucide:alert-triangle',
			});
			return;
		}

		isCreatePending.value = true;

		try {
			await $fetch('/api/admin/rooms', {
				method: 'POST',
				body: {
					number: createForm.number,
					specializations:
						createForm.specializations.length > 0
							? createForm.specializations
							: undefined,
				},
			});
		} catch (error) {
			toast.add({
				title: 'Dodawanie nie powiodło się',
				description: getErrorMessage(
					error,
					'Wystąpił błąd podczas dodawania gabinetu.'
				),
				color: 'error',
				icon: 'lucide:x-circle',
			});
			isCreatePending.value = false;
			return;
		}

		isCreatePending.value = false;

		toast.add({
			title: 'Dodano gabinet',
			description: 'Nowy gabinet został zapisany.',
			color: 'success',
			icon: 'lucide:check',
		});

		closeCreateModal();
		await refresh();
	};

	const openEditModal = (room: Room) => {
		selectedRoom.value = room;
		editForm.number = room.number;
		editForm.specializations = [...room.specializationIds];
		isEditModalOpen.value = true;
	};

	const closeEditModal = () => {
		isEditModalOpen.value = false;
		isEditPending.value = false;
		editForm.number = null;
		editForm.specializations = [];
		selectedRoom.value = null;
	};

	const handleEdit = async () => {
		if (!selectedRoom.value) {
			return;
		}

		if (!editForm.number) {
			toast.add({
				title: 'Nieprawidłowy numer',
				description: 'Podaj numer gabinetu.',
				color: 'warning',
				icon: 'lucide:alert-triangle',
			});
			return;
		}

		const numberChanged = editForm.number !== selectedRoom.value.number;

		const currentSpecsSorted = [...selectedRoom.value.specializationIds].sort(
			(a, b) => a - b
		);
		const newSpecsSorted = [...editForm.specializations].sort((a, b) => a - b);
		const specsChanged =
			currentSpecsSorted.length !== newSpecsSorted.length ||
			currentSpecsSorted.some((id, idx) => id !== newSpecsSorted[idx]);

		if (!numberChanged && !specsChanged) {
			closeEditModal();
			return;
		}

		const payload: { number?: number; specializations?: number[] } = {};
		if (numberChanged) {
			payload.number = editForm.number;
		}
		if (specsChanged) {
			payload.specializations = editForm.specializations;
		}

		isEditPending.value = true;

		try {
			await $fetch(`/api/admin/rooms/${selectedRoom.value.roomId}`, {
				method: 'PATCH',
				body: payload,
			});
		} catch (error) {
			toast.add({
				title: 'Aktualizacja nie powiodła się',
				description: getErrorMessage(
					error,
					'Wystąpił błąd podczas aktualizacji gabinetu.'
				),
				color: 'error',
				icon: 'lucide:x-circle',
			});
			isEditPending.value = false;
			return;
		}

		isEditPending.value = false;

		toast.add({
			title: 'Zaktualizowano gabinet',
			description: 'Gabinet został zaktualizowany.',
			color: 'success',
			icon: 'lucide:check',
		});

		closeEditModal();
		await refresh();
	};

	const openDeleteModal = (room: Room) => {
		selectedRoom.value = room;
		isDeleteModalOpen.value = true;
	};

	const closeDeleteModal = () => {
		isDeleteModalOpen.value = false;
		isDeletePending.value = false;
		selectedRoom.value = null;
	};

	const handleDelete = async () => {
		if (!selectedRoom.value) {
			return;
		}

		isDeletePending.value = true;

		try {
			await $fetch(`/api/admin/rooms/${selectedRoom.value.roomId}`, {
				method: 'DELETE',
			});
		} catch (error) {
			toast.add({
				title: 'Usuwanie nie powiodło się',
				description: getErrorMessage(
					error,
					'Wystąpił błąd podczas usuwania gabinetu.'
				),
				color: 'error',
				icon: 'lucide:x-circle',
			});
			isDeletePending.value = false;
			return;
		}

		isDeletePending.value = false;

		toast.add({
			title: 'Usunięto gabinet',
			description: 'Gabinet został usunięty z systemu.',
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
				title="Zarządzanie gabinetami"
				description="Zarządzaj gabinetami przyjęć, aby organizować wizyty pacjentów."
			/>
			<UButton color="primary" icon="lucide:plus" @click="openCreateModal">
				Dodaj gabinet
			</UButton>
		</div>

		<UInput
			v-model="globalFilter"
			icon="lucide:search"
			placeholder="Szukaj gabinetów..."
			clearable
			class="max-w-sm"
		/>

		<UAlert
			v-if="error"
			color="error"
			icon="lucide:alert-triangle"
			description="Nie udało się pobrać listy gabinetów. Spróbuj ponownie."
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
						<h2 class="text-lg font-semibold">Lista gabinetów</h2>
						<p class="text-sm text-neutral-500">
							Przeglądaj gabinety oraz przypisane do nich specjalizacje.
						</p>
					</div>
					<ClientOnly>
						<UBadge
							variant="soft"
							color="primary"
							:label="`${rooms.length} pozycji`"
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
						:data="rooms"
						:columns="columns"
						:loading="pending"
						sticky="header"
						class="min-h-0 min-w-full flex-1 overflow-y-auto"
						empty="Nie ma gabinetów."
						:pagination-options="{
							getPaginationRowModel: getPaginationRowModel(),
						}"
					>
						<template #specializationNames-cell="{ row }">
							<div class="flex flex-wrap gap-1">
								<UBadge
									v-for="name in row.original.specializationNames"
									:key="name"
									variant="soft"
									color="primary"
									size="sm"
									:label="name"
								/>
								<span
									v-if="row.original.specializationNames.length === 0"
									class="text-neutral-400"
								>
									Brak
								</span>
							</div>
						</template>

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
						<h3 class="text-lg font-semibold">Dodaj gabinet</h3>
					</template>

					<UForm
						id="create-room-form"
						class="flex flex-col gap-4"
						@submit.prevent="handleCreate"
					>
						<UFormField label="Numer gabinetu" name="number">
							<UInput
								v-model.number="createForm.number"
								type="number"
								placeholder="np. 101"
								:disabled="isCreatePending"
								icon="lucide:door-open"
							/>
						</UFormField>

						<UFormField label="Specjalizacje" name="specializations">
							<USelectMenu
								v-model="createForm.specializations"
								:items="specializationOptions"
								multiple
								placeholder="Wybierz specjalizacje..."
								:disabled="isCreatePending"
								value-key="value"
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
								form="create-room-form"
								:loading="isCreatePending"
								icon="lucide:plus"
							>
								Dodaj gabinet
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
						<h3 class="text-lg font-semibold">Edytuj gabinet</h3>
					</template>

					<UForm class="flex flex-col gap-4" @submit.prevent="handleEdit">
						<UFormField label="Numer gabinetu" name="number">
							<UInput
								v-model.number="editForm.number"
								type="number"
								:disabled="isEditPending"
								icon="lucide:door-open"
								placeholder="Podaj nowy numer"
							/>
						</UFormField>

						<UFormField label="Specjalizacje" name="specializations">
							<USelectMenu
								v-model="editForm.specializations"
								:items="specializationOptions"
								multiple
								placeholder="Wybierz specjalizacje..."
								:disabled="isEditPending"
								value-key="value"
							/>
						</UFormField>

						<div class="flex justify-end gap-2">
							<UButton type="button" variant="ghost" @click="closeEditModal">
								Anuluj
							</UButton>
							<UButton type="submit" :loading="isEditPending">
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
						<h3 class="text-lg font-semibold text-red-600">Usuń gabinet</h3>
					</template>

					<p class="text-sm text-neutral-600">
						Czy na pewno chcesz usunąć gabinet numer
						<strong>{{ selectedRoom?.number }}</strong>
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
	</PageContainer>
</template>
