<script setup lang="ts">
	import type { TableColumn } from '@nuxt/ui';
	import type {
		ColumnFiltersState,
		PaginationState,
		SortingState,
	} from '@tanstack/vue-table';
	import { getPaginationRowModel } from '@tanstack/vue-table';
	import type { FetchError } from 'ofetch';
	import { authClient } from '~~/lib/auth-client';

	type Admin = {
		id: string;
		name: string;
		email: string;
		createdAt: Date;
	};

	definePageMeta({
		layout: 'admin',
	});

	useHead({
		title: 'Panel administratorów',
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
	const session = authClient.useSession();

	const {
		data: adminsData,
		pending,
		error,
		refresh,
	} = await useFetch<Admin[]>('/api/admin/admins', {
		default: () => [],
	});

	const admins = computed(() => adminsData.value ?? []);

	const table = ref();
	const globalFilter = ref('');
	const columnFilters = ref<ColumnFiltersState>([]);
	const sorting = ref<SortingState>([]);
	const pagination = ref<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const columns: TableColumn<Admin>[] = [
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
			accessorKey: 'createdAt',
			header: 'Data utworzenia',
			enableSorting: true,
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
		name: '',
	});

	const isCreateModalOpen = ref(false);
	const isEditModalOpen = ref(false);
	const isDeleteModalOpen = ref(false);

	const isCreatePending = ref(false);
	const isEditPending = ref(false);
	const isDeletePending = ref(false);

	const selectedAdmin = ref<Admin | null>(null);

	const openCreateModal = () => {
		isCreateModalOpen.value = true;
	};

	const closeCreateModal = () => {
		isCreateModalOpen.value = false;
		isCreatePending.value = false;
		createForm.email = '';
		createForm.name = '';
	};

	const openEditModal = (admin: Admin) => {
		selectedAdmin.value = admin;
		editForm.name = admin.name;
		isEditModalOpen.value = true;
	};

	const closeEditModal = () => {
		isEditModalOpen.value = false;
		isEditPending.value = false;
		editForm.name = '';
		selectedAdmin.value = null;
	};

	const openDeleteModal = (admin: Admin) => {
		selectedAdmin.value = admin;
		isDeleteModalOpen.value = true;
	};

	const closeDeleteModal = () => {
		isDeleteModalOpen.value = false;
		isDeletePending.value = false;
		selectedAdmin.value = null;
	};

	const handleCreate = async () => {
		const trimmedEmail = createForm.email.trim();
		const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
			toast.add({
				title: 'Nieprawidłowy adres email',
				description: 'Podaj poprawny adres email administratora.',
				color: 'warning',
				icon: 'i-lucide-alert-triangle',
			});
			return;
		}

		const trimmedName = createForm.name.trim();

		if (!trimmedName || trimmedName.length < 2) {
			toast.add({
				title: 'Nieprawidłowe imię i nazwisko',
				description:
					'Imię i nazwisko administratora musi mieć co najmniej 2 znaki.',
				color: 'warning',
				icon: 'i-lucide-alert-triangle',
			});
			return;
		}

		createForm.email = trimmedEmail;
		createForm.name = trimmedName;

		isCreatePending.value = true;

		const { error: createError } = await useFetch('/api/admin/admins', {
			method: 'POST',
			body: {
				email: trimmedEmail,
				name: trimmedName,
			},
		});

		isCreatePending.value = false;

		if (createError.value) {
			const statusCode = getFetchErrorStatus(createError.value);
			const statusMessage = getFetchErrorMessage(createError.value);

			if (statusCode === 409) {
				toast.add({
					title: 'Adres email zajęty',
					description:
						statusMessage ??
						'Użytkownik o tym adresie email już istnieje. Wybierz inny adres.',
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
						'Sprawdź poprawność danych administratora i spróbuj ponownie.',
					color: 'warning',
					icon: 'i-lucide-alert-circle',
				});
				return;
			}

			toast.add({
				title: 'Dodawanie nie powiodło się',
				description:
					statusMessage ??
					'Wystąpił nieoczekiwany błąd podczas dodawania administratora.',
				color: 'error',
				icon: 'i-lucide-x-circle',
			});
			return;
		}

		toast.add({
			title: 'Dodano administratora',
			description:
				'Konto administratora utworzono i wysłano link do ustawienia hasła.',
			color: 'success',
			icon: 'i-lucide-check',
		});

		closeCreateModal();
		await refresh();
	};

	const handleEdit = async () => {
		if (!selectedAdmin.value) {
			return;
		}

		const trimmedName = editForm.name.trim();

		if (!trimmedName) {
			toast.add({
				title: 'Nieprawidłowe imię i nazwisko',
				description: 'Imię i nazwisko administratora nie może być puste.',
				color: 'warning',
				icon: 'i-lucide-alert-triangle',
			});
			return;
		}

		const payload: Record<string, unknown> = {};

		if (trimmedName !== selectedAdmin.value.name) {
			payload.name = trimmedName;
		}

		if (Object.keys(payload).length === 0) {
			closeEditModal();
			return;
		}

		isEditPending.value = true;

		const { error: editError } = await useFetch(
			`/api/admin/admins/${selectedAdmin.value.id}`,
			{
				method: 'PATCH',
				body: payload,
			}
		);

		isEditPending.value = false;

		if (editError.value) {
			const statusCode = getFetchErrorStatus(editError.value);
			const statusMessage = getFetchErrorMessage(editError.value);

			if (statusCode === 400) {
				toast.add({
					title: 'Nieprawidłowe dane',
					description:
						statusMessage ??
						'Wprowadzone zmiany są nieprawidłowe. Sprawdź dane i spróbuj ponownie.',
					color: 'warning',
					icon: 'i-lucide-alert-circle',
				});
				return;
			}

			if (statusCode === 404) {
				toast.add({
					title: 'Administrator niedostępny',
					description:
						statusMessage ??
						'Wybrany administrator nie istnieje lub został usunięty.',
					color: 'warning',
					icon: 'i-lucide-alert-circle',
				});
				return;
			}

			toast.add({
				title: 'Aktualizacja nie powiodła się',
				description:
					statusMessage ?? 'Wystąpił błąd podczas aktualizacji administratora.',
				color: 'error',
				icon: 'i-lucide-x-circle',
			});
			return;
		}

		toast.add({
			title: 'Zaktualizowano administratora',
			description: 'Dane administratora zostały zapisane.',
			color: 'success',
			icon: 'i-lucide-check',
		});

		closeEditModal();
		await refresh();
	};

	const handleDelete = async () => {
		if (!selectedAdmin.value) {
			return;
		}

		const currentUserId = session.value?.data?.user?.id;

		if (selectedAdmin.value.id === currentUserId) {
			toast.add({
				title: 'Nie możesz usunąć własnego konta',
				description: 'Nie możesz usunąć własnego konta administratora.',
				color: 'warning',
				icon: 'i-lucide-alert-triangle',
			});
			return;
		}

		isDeletePending.value = true;

		const { error: deleteError } = await useFetch(
			`/api/admin/admins/${selectedAdmin.value.id}`,
			{
				method: 'DELETE',
			}
		);

		isDeletePending.value = false;

		if (deleteError.value) {
			const statusCode = getFetchErrorStatus(deleteError.value);
			const statusMessage = getFetchErrorMessage(deleteError.value);

			if (statusCode === 403) {
				toast.add({
					title: 'Operacja zablokowana',
					description:
						statusMessage ??
						'Nie można usunąć ostatniego administratora ani własnego konta.',
					color: 'warning',
					icon: 'i-lucide-shield-alert',
				});
				return;
			}

			if (statusCode === 404) {
				toast.add({
					title: 'Administrator nie istnieje',
					description:
						statusMessage ??
						'Wybrany administrator został już usunięty lub nie istnieje.',
					color: 'warning',
					icon: 'i-lucide-alert-circle',
				});
				return;
			}

			toast.add({
				title: 'Usuwanie nie powiodło się',
				description:
					statusMessage ?? 'Wystąpił błąd podczas usuwania administratora.',
				color: 'error',
				icon: 'i-lucide-x-circle',
			});
			return;
		}

		toast.add({
			title: 'Usunięto administratora',
			description: 'Administrator został usunięty.',
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
				title="Panel administratorów"
				description="Zarządzaj kontami administratorów systemu."
			/>
			<UButton
				color="primary"
				icon="i-lucide-user-plus"
				@click="openCreateModal"
			>
				Dodaj administratora
			</UButton>
		</div>

		<UInput
			v-model="globalFilter"
			icon="i-lucide-search"
			placeholder="Szukaj administratorów..."
			clearable
			class="max-w-sm"
		/>

		<UAlert
			v-if="error"
			color="error"
			icon="i-lucide-alert-triangle"
			description="Nie udało się pobrać listy administratorów."
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
						<h2 class="text-lg font-semibold">Lista administratorów</h2>
						<p class="text-sm text-neutral-500">
							Przeglądaj konta administratorów oraz zarządzaj dostępem.
						</p>
					</div>
					<UBadge
						variant="soft"
						color="primary"
						:label="`${admins.length} pozycji`"
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
					:data="admins"
					sticky="header"
					:columns="columns"
					:loading="pending"
					class="min-h-0 min-w-full flex-1 overflow-y-auto"
					:empty-state="{
						icon: 'i-lucide-user-x',
						label: 'Brak administratorów',
						description: 'Dodaj pierwszego administratora, aby rozpocząć.',
					}"
					:pagination-options="{
						getPaginationRowModel: getPaginationRowModel(),
					}"
				>
					<template #createdAt-cell="{ row }">
						{{ new Date(row.original.createdAt).toLocaleDateString('pl-PL') }}
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
						<h3 class="text-lg font-semibold">Dodaj administratora</h3>
					</template>

					<UForm
						id="create-admin-form"
						class="flex flex-col gap-4"
						@submit.prevent="handleCreate"
					>
						<UFormField label="Email" name="email" required>
							<UInput
								v-model="createForm.email"
								type="email"
								:disabled="isCreatePending"
								icon="i-lucide-mail"
								placeholder="np. admin@example.com"
							/>
						</UFormField>
						<UFormField label="Imię i nazwisko" name="name" required>
							<UInput
								v-model="createForm.name"
								:disabled="isCreatePending"
								icon="i-lucide-user"
								placeholder="np. Jan Kowalski"
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
								form="create-admin-form"
								:loading="isCreatePending"
							>
								Dodaj administratora
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
						<h3 class="text-lg font-semibold">Edytuj administratora</h3>
					</template>

					<UForm
						id="edit-admin-form"
						class="flex flex-col gap-4"
						@submit.prevent="handleEdit"
					>
						<UFormField label="Email" name="email">
							<UInput
								:model-value="selectedAdmin?.email ?? ''"
								disabled
								icon="i-lucide-mail"
							/>
						</UFormField>
						<UFormField label="Imię i nazwisko" name="name" required>
							<UInput
								v-model="editForm.name"
								:disabled="isEditPending"
								icon="i-lucide-user"
							/>
						</UFormField>
					</UForm>

					<template #footer>
						<div class="flex justify-end gap-2">
							<UButton type="button" variant="ghost" @click="closeEditModal">
								Anuluj
							</UButton>
							<UButton
								type="submit"
								form="edit-admin-form"
								:loading="isEditPending"
							>
								Zapisz zmiany
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
							Usuń administratora
						</h3>
					</template>

					<div class="flex flex-col gap-4">
						<p class="text-sm text-neutral-600">
							Czy na pewno chcesz usunąć administratora
							<strong>{{ selectedAdmin?.name }}</strong>
							? Użytkownik utraci dostęp do panelu administratora. Operacja jest
							nieodwracalna.
						</p>

						<UAlert
							v-if="selectedAdmin?.id === session.value?.data?.user?.id"
							color="warning"
							icon="i-lucide-alert-triangle"
							description="Nie możesz usunąć własnego konta administratora."
						/>
					</div>

					<template #footer>
						<div class="flex justify-end gap-2">
							<UButton type="button" variant="ghost" @click="closeDeleteModal">
								Anuluj
							</UButton>
							<UButton
								color="error"
								icon="i-lucide-trash"
								:disabled="selectedAdmin?.id === session.value?.data?.user?.id"
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
