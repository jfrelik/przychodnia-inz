<script lang="ts" setup>
	import type { TableColumn } from '@nuxt/ui';
	import type {
		ColumnFiltersState,
		PaginationState,
		SortingState,
	} from '@tanstack/vue-table';
	import { getPaginationRowModel } from '@tanstack/vue-table';
	import type { FetchError } from 'ofetch';

	type Room = {
		roomId: number;
		number: number;
		appointmentCount: number;
	};

	definePageMeta({
		layout: 'admin',
	});

	useHead({
		title: 'Zarządzanie gabinetami',
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
		data: roomsData,
		pending,
		error,
		refresh,
	} = await useFetch<Room[]>('/api/admin/rooms', {
		default: () => [],
	});

	const rooms = computed(() => roomsData.value ?? []);

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
			accessorKey: 'appointmentCount',
			header: 'Przypisane wizyty',
			enableSorting: true,
		},
		{
			accessorKey: 'actions',
			header: 'Akcje',
		},
	];

	const createForm = reactive({
		number: null as number | null,
	});

	const editForm = reactive({
		number: null as number | null,
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
		isCreateModalOpen.value = true;
	};

	const closeCreateModal = () => {
		isCreateModalOpen.value = false;
		isCreatePending.value = false;
		createForm.number = null;
	};

	const handleCreate = async () => {
		if (!createForm.number) {
			toast.add({
				title: 'Nieprawidłowy numer',
				description: 'Podaj numer gabinetu.',
				color: 'warning',
				icon: 'i-lucide-alert-triangle',
			});
			return;
		}

		isCreatePending.value = true;

		const { error: createError } = await useFetch('/api/admin/rooms', {
			method: 'POST',
			body: { number: createForm.number },
		});

		isCreatePending.value = false;

		if (createError.value) {
			const statusCode = getFetchErrorStatus(createError.value);
			const statusMessage = getFetchErrorMessage(createError.value);

			if (statusCode === 409) {
				toast.add({
					title: 'Numer zajęty',
					description:
						statusMessage ??
						'Gabinet o tym numerze już istnieje. Wybierz inny numer.',
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
						'Podaj prawidłowy numer gabinetu i spróbuj ponownie.',
					color: 'warning',
					icon: 'i-lucide-alert-circle',
				});
				return;
			}

			toast.add({
				title: 'Dodawanie nie powiodło się',
				description:
					statusMessage ?? 'Wystąpił błąd podczas dodawania gabinetu.',
				color: 'error',
				icon: 'i-lucide-x-circle',
			});
			return;
		}

		toast.add({
			title: 'Dodano gabinet',
			description: 'Nowy gabinet został zapisany.',
			color: 'success',
			icon: 'i-lucide-check',
		});

		closeCreateModal();
		await refresh();
	};

	const openEditModal = (room: Room) => {
		selectedRoom.value = room;
		editForm.number = room.number;
		isEditModalOpen.value = true;
	};

	const closeEditModal = () => {
		isEditModalOpen.value = false;
		isEditPending.value = false;
		editForm.number = null;
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
				icon: 'i-lucide-alert-triangle',
			});
			return;
		}

		if (editForm.number === selectedRoom.value.number) {
			closeEditModal();
			return;
		}

		isEditPending.value = true;

		const { error: editError } = await useFetch(
			`/api/admin/rooms/${selectedRoom.value.roomId}`,
			{
				method: 'PATCH',
				body: { number: editForm.number },
			}
		);

		isEditPending.value = false;

		if (editError.value) {
			const statusCode = getFetchErrorStatus(editError.value);
			const statusMessage = getFetchErrorMessage(editError.value);

			if (statusCode === 409) {
				toast.add({
					title: 'Numer zajęty',
					description:
						statusMessage ??
						'Gabinet o tym numerze już istnieje. Wybierz inny numer.',
					color: 'warning',
					icon: 'i-lucide-alert-triangle',
				});
				return;
			}

			if (statusCode === 404) {
				toast.add({
					title: 'Gabinet nie istnieje',
					description:
						statusMessage ??
						'Wybrany gabinet nie istnieje lub został usunięty.',
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
						'Podaj prawidłowy numer gabinetu i spróbuj ponownie.',
					color: 'warning',
					icon: 'i-lucide-alert-circle',
				});
				return;
			}

			toast.add({
				title: 'Aktualizacja nie powiodła się',
				description:
					statusMessage ?? 'Wystąpił błąd podczas aktualizacji gabinetu.',
				color: 'error',
				icon: 'i-lucide-x-circle',
			});
			return;
		}

		toast.add({
			title: 'Zaktualizowano gabinet',
			description: 'Numer gabinetu został zmieniony.',
			color: 'success',
			icon: 'i-lucide-check',
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

		const { error: deleteError } = await useFetch(
			`/api/admin/rooms/${selectedRoom.value.roomId}`,
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
					title: 'Gabinet nie istnieje',
					description:
						statusMessage ??
						'Wybrany gabinet został już usunięty lub nie istnieje.',
					color: 'warning',
					icon: 'i-lucide-alert-circle',
				});
				return;
			}

			if (statusCode === 400) {
				toast.add({
					title: 'Nie można usunąć gabinetu',
					description:
						statusMessage ??
						'Gabinet ma przypisane wizyty i nie może zostać usunięty.',
					color: 'warning',
					icon: 'i-lucide-alert-triangle',
				});
				return;
			}

			toast.add({
				title: 'Usuwanie nie powiodło się',
				description:
					statusMessage ?? 'Wystąpił błąd podczas usuwania gabinetu.',
				color: 'error',
				icon: 'i-lucide-x-circle',
			});
			return;
		}

		toast.add({
			title: 'Usunięto gabinet',
			description: 'Gabinet został usunięty z systemu.',
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
				title="Zarządzanie gabinetami"
				description="Zarządzaj gabinetami przyjęć, aby organizować wizyty pacjentów."
			/>
			<UButton color="primary" icon="i-lucide-plus" @click="openCreateModal">
				Dodaj gabinet
			</UButton>
		</div>

		<UInput
			v-model="globalFilter"
			icon="i-lucide-search"
			placeholder="Szukaj gabinetów..."
			clearable
			class="max-w-sm"
		/>

		<UAlert
			v-if="error"
			color="error"
			icon="i-lucide-alert-triangle"
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
							Przeglądaj gabinety oraz liczbę przypisanych do nich wizyt.
						</p>
					</div>
					<UBadge
						variant="soft"
						color="primary"
						:label="`${rooms.length} pozycji`"
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
					:data="rooms"
					:columns="columns"
					:loading="pending"
					sticky="header"
					class="min-h-0 min-w-full flex-1 overflow-y-auto"
					:empty-state="{
						icon: 'i-lucide-door-open',
						label: 'Brak gabinetów',
						description: 'Dodaj pierwszy gabinet, aby rozpocząć.',
					}"
					:pagination-options="{
						getPaginationRowModel: getPaginationRowModel(),
					}"
				>
					<template #appointmentCount-cell="{ row }">
						<span class="text-right font-medium">
							{{ row.original.appointmentCount }}
						</span>
					</template>

					<template #actions-cell="{ row }">
						<div class="flex justify-end gap-2">
							<UButton
								size="xs"
								variant="ghost"
								icon="i-lucide-pencil"
								class="cursor-pointer"
								@click="openEditModal(row.original)"
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
								icon="i-lucide-door-open"
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
								icon="i-lucide-plus"
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
								icon="i-lucide-door-open"
								placeholder="Podaj nowy numer"
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
	</PageContainer>
</template>
