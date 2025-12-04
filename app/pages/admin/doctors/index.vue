<script setup lang="ts">
	import type { TableColumn } from '@nuxt/ui';
	import type {
		ColumnFiltersState,
		PaginationState,
		SortingState,
	} from '@tanstack/vue-table';
	import { getPaginationRowModel } from '@tanstack/vue-table';
	type Doctor = {
		userId: string;
		userName: string;
		userEmail: string;
		specializationId: number | null;
		specializationName: string | null;
		licenseNumber: string;
	};

	type Specialization = {
		id: number;
		name: string;
	};

	definePageMeta({
		layout: 'admin',
	});

	useHead({
		title: 'Panel lekarzy',
	});

	const toast = useToast();

	const {
		data: doctorsData,
		pending,
		error,
		refresh,
	} = await useFetch<Doctor[]>('/api/admin/doctors', {
		default: () => [],
	});

	const { data: specializationsData } = await useFetch<Specialization[]>(
		'/api/admin/specializations',
		{
			default: () => [],
		}
	);

	const doctors = computed(() => doctorsData.value ?? []);
	const specializations = computed(() => specializationsData.value ?? []);

	const specializationOptions = computed(() => [
		{ label: 'Brak specjalizacji', value: null },
		...specializations.value.map((s) => ({
			label: s.name,
			value: s.id,
		})),
	]);

	const table = ref();
	const globalFilter = ref('');
	const columnFilters = ref<ColumnFiltersState>([]);
	const sorting = ref<SortingState>([]);
	const pagination = ref<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const columns: TableColumn<Doctor>[] = [
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
			accessorKey: 'specializationName',
			header: 'Specjalizacja',
			enableSorting: true,
			enableGlobalFilter: true,
		},
		{
			accessorKey: 'licenseNumber',
			header: 'Numer licencji',
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
		specializationId: null as number | null,
		licenseNumber: '',
	});

	const editForm = reactive({
		specializationId: null as number | null,
		licenseNumber: '',
	});

	const isCreateModalOpen = ref(false);
	const isEditModalOpen = ref(false);
	const isDeleteModalOpen = ref(false);

	const isCreatePending = ref(false);
	const isEditPending = ref(false);
	const isDeletePending = ref(false);

	const selectedDoctor = ref<Doctor | null>(null);

	const openCreateModal = () => {
		isCreateModalOpen.value = true;
	};

	const closeCreateModal = () => {
		isCreateModalOpen.value = false;
		isCreatePending.value = false;
		createForm.email = '';
		createForm.name = '';
		createForm.specializationId = null;
		createForm.licenseNumber = '';
	};

	const openEditModal = (doctor: Doctor) => {
		selectedDoctor.value = doctor;
		editForm.specializationId = doctor.specializationId;
		editForm.licenseNumber = doctor.licenseNumber;
		isEditModalOpen.value = true;
	};

	const closeEditModal = () => {
		isEditModalOpen.value = false;
		isEditPending.value = false;
		editForm.specializationId = null;
		editForm.licenseNumber = '';
		selectedDoctor.value = null;
	};

	const openDeleteModal = (doctor: Doctor) => {
		selectedDoctor.value = doctor;
		isDeleteModalOpen.value = true;
	};

	const closeDeleteModal = () => {
		isDeleteModalOpen.value = false;
		isDeletePending.value = false;
		selectedDoctor.value = null;
	};

	const handleCreate = async () => {
		const trimmedEmail = createForm.email.trim();
		const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
			toast.add({
				title: 'Nieprawidłowy adres email',
				description: 'Podaj poprawny adres email lekarza.',
				color: 'warning',
				icon: 'i-lucide-alert-triangle',
			});
			return;
		}

		const trimmedName = createForm.name.trim();

		if (!trimmedName || trimmedName.length < 2) {
			toast.add({
				title: 'Nieprawidłowe imię i nazwisko',
				description: 'Imię i nazwisko lekarza musi mieć co najmniej 2 znaki.',
				color: 'warning',
				icon: 'i-lucide-alert-triangle',
			});
			return;
		}

		const trimmedLicense = createForm.licenseNumber.trim();

		if (!trimmedLicense) {
			toast.add({
				title: 'Nieprawidłowy numer licencji',
				description: 'Podaj numer licencji lekarza.',
				color: 'warning',
				icon: 'i-lucide-alert-triangle',
			});
			return;
		}

		createForm.email = trimmedEmail;
		createForm.name = trimmedName;
		createForm.licenseNumber = trimmedLicense;

		isCreatePending.value = true;

		const { error: createError } = await useFetch('/api/admin/doctors', {
			method: 'POST',
			body: {
				email: trimmedEmail,
				name: trimmedName,
				specializationId: createForm.specializationId,
				licenseNumber: trimmedLicense,
			},
		});

		isCreatePending.value = false;

		if (createError.value) {
			toast.add({
				title: 'Dodawanie nie powiodło się',
				description:
					createError.value.message ??
					'Wystąpił nieoczekiwany błąd podczas dodawania lekarza.',
				color: 'error',
				icon: 'i-lucide-x-circle',
			});
			return;
		}

		toast.add({
			title: 'Dodano lekarza',
			description:
				'Konto lekarza utworzono i wysłano link do resetu hasła na podany email.',
			color: 'success',
			icon: 'i-lucide-check',
		});

		closeCreateModal();
		await refresh();
	};

	const handleEdit = async () => {
		if (!selectedDoctor.value) {
			return;
		}

		const payload: Record<string, unknown> = {};

		if (editForm.specializationId !== selectedDoctor.value.specializationId) {
			payload.specializationId = editForm.specializationId;
		}

		const trimmedLicense = editForm.licenseNumber.trim();

		if (!trimmedLicense) {
			toast.add({
				title: 'Nieprawidłowy numer licencji',
				description: 'Numer licencji nie może być pusty.',
				color: 'warning',
				icon: 'i-lucide-alert-triangle',
			});
			return;
		}

		if (trimmedLicense !== selectedDoctor.value.licenseNumber) {
			payload.licenseNumber = trimmedLicense;
		}

		if (Object.keys(payload).length === 0) {
			closeEditModal();
			return;
		}

		isEditPending.value = true;

		const { error: editError } = await useFetch(
			`/api/admin/doctors/${selectedDoctor.value.userId}`,
			{
				method: 'PATCH',
				body: payload,
			}
		);

		isEditPending.value = false;

		if (editError.value) {
			toast.add({
				title: 'Aktualizacja nie powiodła się',
				description:
					editError.value.message ??
					'Wystąpił błąd podczas aktualizacji danych lekarza.',
				color: 'error',
				icon: 'i-lucide-x-circle',
			});
			return;
		}

		toast.add({
			title: 'Zaktualizowano lekarza',
			description: 'Dane lekarza zostały zapisane.',
			color: 'success',
			icon: 'i-lucide-check',
		});

		closeEditModal();
		await refresh();
	};

	const handleDelete = async () => {
		if (!selectedDoctor.value) {
			return;
		}

		isDeletePending.value = true;

		const { error: deleteError } = await useFetch(
			`/api/admin/doctors/${selectedDoctor.value.userId}`,
			{
				method: 'DELETE',
			}
		);

		isDeletePending.value = false;

		if (deleteError.value) {
			toast.add({
				title: 'Usuwanie nie powiodło się',
				description:
					deleteError.value.message ??
					'Wystąpił błąd podczas usuwania lekarza.',
				color: 'error',
				icon: 'i-lucide-x-circle',
			});
			return;
		}

		toast.add({
			title: 'Usunięto lekarza',
			description: 'Lekarz został usunięty z systemu.',
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
				title="Panel lekarzy"
				description="Zarządzaj kontami lekarzy, ich specjalizacjami oraz numerami licencji."
			/>
			<UButton
				color="primary"
				icon="i-lucide-user-plus"
				@click="openCreateModal"
			>
				Dodaj lekarza
			</UButton>
		</div>

		<UInput
			v-model="globalFilter"
			icon="i-lucide-search"
			placeholder="Szukaj lekarzy..."
			clearable
			class="max-w-sm"
		/>

		<UAlert
			v-if="error"
			color="error"
			icon="i-lucide-alert-triangle"
			description="Nie udało się pobrać listy lekarzy. Spróbuj ponownie."
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
						<h2 class="text-lg font-semibold">Lista lekarzy</h2>
						<p class="text-sm text-neutral-500">
							Przeglądaj konta lekarzy oraz zarządzaj ich specjalizacjami.
						</p>
					</div>
					<UBadge
						variant="soft"
						color="primary"
						:label="`${doctors.length} pozycji`"
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
					:data="doctors"
					sticky="header"
					:columns="columns"
					:loading="pending"
					class="min-h-0 min-w-full flex-1 overflow-y-auto"
					:empty-state="{
						icon: 'i-lucide-user-x',
						label: 'Brak lekarzy',
						description: 'Dodaj pierwszego lekarza, aby rozpocząć.',
					}"
					:pagination-options="{
						getPaginationRowModel: getPaginationRowModel(),
					}"
				>
					<template #specializationName-cell="{ row }">
						<span
							:class="row.original.specializationName ? '' : 'text-gray-500'"
						>
							{{ row.original.specializationName ?? 'Brak' }}
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
						<h3 class="text-lg font-semibold">Dodaj lekarza</h3>
					</template>

					<UForm
						id="create-doctor-form"
						class="flex flex-col gap-4"
						@submit.prevent="handleCreate"
					>
						<UFormField label="Email" name="email" required>
							<UInput
								v-model="createForm.email"
								type="email"
								:disabled="isCreatePending"
								icon="i-lucide-mail"
								placeholder="np. lekarz@example.com"
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
						<UFormField label="Specjalizacja" name="specializationId">
							<USelect
								v-model="createForm.specializationId"
								:items="specializationOptions"
								:disabled="isCreatePending"
								placeholder="Wybierz specjalizację"
							/>
						</UFormField>
						<UFormField label="Numer licencji" name="licenseNumber">
							<UInput
								v-model="createForm.licenseNumber"
								:disabled="isCreatePending"
								icon="i-lucide-file-badge"
								placeholder="np. LEK123456"
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
								form="create-doctor-form"
								:loading="isCreatePending"
							>
								Dodaj lekarza
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
						<h3 class="text-lg font-semibold">Edytuj lekarza</h3>
					</template>

					<UForm
						id="edit-doctor-form"
						class="flex flex-col gap-4"
						@submit.prevent="handleEdit"
					>
						<UFormField label="Imię i nazwisko" name="userName">
							<UInput
								:model-value="selectedDoctor?.userName ?? ''"
								disabled
								icon="i-lucide-user"
							/>
						</UFormField>
						<UFormField label="Email" name="userEmail">
							<UInput
								:model-value="selectedDoctor?.userEmail ?? ''"
								disabled
								icon="i-lucide-mail"
							/>
						</UFormField>
						<UFormField label="Specjalizacja" name="specializationId">
							<USelect
								v-model="editForm.specializationId"
								:items="specializationOptions"
								:disabled="isEditPending"
							/>
						</UFormField>
						<UFormField label="Numer licencji" name="licenseNumber">
							<UInput
								v-model="editForm.licenseNumber"
								:disabled="isEditPending"
								icon="i-lucide-file-badge"
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
								form="edit-doctor-form"
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
						<h3 class="text-lg font-semibold text-red-600">Usuń lekarza</h3>
					</template>

					<p class="text-sm text-neutral-600">
						Czy na pewno chcesz usunąć lekarza
						<strong>{{ selectedDoctor?.userName }}</strong>
						? Użytkownik straci dostęp do panelu lekarza. Operacja jest
						nieodwracalna.
					</p>

					<template #footer>
						<div class="flex justify-end gap-2">
							<UButton type="button" variant="ghost" @click="closeDeleteModal">
								Anuluj
							</UButton>
							<UButton
								color="error"
								icon="i-lucide-trash"
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
