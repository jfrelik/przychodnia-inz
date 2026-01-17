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
	} = await useLazyFetch<Doctor[]>('/api/admin/doctors', {
		default: () => [],
		server: false,
	});

	const { data: specializationsData } = await useLazyFetch<Specialization[]>(
		'/api/admin/specializations',
		{
			default: () => [],
			server: false,
		}
	);

	const doctors = computed(() => doctorsData.value ?? []);
	const specializations = computed(() => specializationsData.value ?? []);

	const tableKey = ref(0);

	watch(
		() => doctorsData.value,
		() => {
			tableKey.value++;
		},
		{ deep: false }
	);

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
				icon: 'lucide:alert-triangle',
			});
			return;
		}

		const trimmedName = createForm.name.trim();

		if (!trimmedName || trimmedName.length < 2) {
			toast.add({
				title: 'Nieprawidłowe imię i nazwisko',
				description: 'Imię i nazwisko lekarza musi mieć co najmniej 2 znaki.',
				color: 'warning',
				icon: 'lucide:alert-triangle',
			});
			return;
		}

		const trimmedLicense = createForm.licenseNumber.trim();

		if (!trimmedLicense) {
			toast.add({
				title: 'Nieprawidłowy numer licencji',
				description: 'Podaj numer licencji lekarza.',
				color: 'warning',
				icon: 'lucide:alert-triangle',
			});
			return;
		}

		createForm.email = trimmedEmail;
		createForm.name = trimmedName;
		createForm.licenseNumber = trimmedLicense;

		isCreatePending.value = true;

		try {
			await $fetch('/api/admin/doctors', {
				method: 'POST',
				body: {
					email: trimmedEmail,
					name: trimmedName,
					specializationId: createForm.specializationId,
					licenseNumber: trimmedLicense,
				},
			});
		} catch (error) {
			toast.add({
				title: 'Dodawanie nie powiodło się',
				description: getErrorMessage(
					error,
					'Wystąpił nieoczekiwany błąd podczas dodawania lekarza.'
				),
				color: 'error',
				icon: 'lucide:x-circle',
			});
			isCreatePending.value = false;
			return;
		}

		isCreatePending.value = false;

		toast.add({
			title: 'Dodano lekarza',
			description:
				'Konto lekarza utworzono i wysłano link do resetu hasła na podany email.',
			color: 'success',
			icon: 'lucide:check',
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
				icon: 'lucide:alert-triangle',
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

		try {
			await $fetch(`/api/admin/doctors/${selectedDoctor.value.userId}`, {
				method: 'PATCH',
				body: payload,
			});
		} catch (error) {
			toast.add({
				title: 'Aktualizacja nie powiodła się',
				description: getErrorMessage(
					error,
					'Wystąpił błąd podczas aktualizacji danych lekarza.'
				),
				color: 'error',
				icon: 'lucide:x-circle',
			});
			isEditPending.value = false;
			return;
		}

		isEditPending.value = false;

		toast.add({
			title: 'Zaktualizowano lekarza',
			description: 'Dane lekarza zostały zapisane.',
			color: 'success',
			icon: 'lucide:check',
		});

		closeEditModal();
		await refresh();
	};

	const handleDelete = async () => {
		if (!selectedDoctor.value) {
			return;
		}

		isDeletePending.value = true;

		try {
			await $fetch(`/api/admin/doctors/${selectedDoctor.value.userId}`, {
				method: 'DELETE',
			});
		} catch (error) {
			toast.add({
				title: 'Usuwanie nie powiodło się',
				description: getErrorMessage(
					error,
					'Wystąpił błąd podczas usuwania lekarza.'
				),
				color: 'error',
				icon: 'lucide:x-circle',
			});
			isDeletePending.value = false;
			return;
		}

		isDeletePending.value = false;

		toast.add({
			title: 'Usunięto lekarza',
			description: 'Lekarz został usunięty z systemu.',
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
				title="Panel lekarzy"
				description="Zarządzaj kontami lekarzy, ich specjalizacjami oraz numerami licencji."
			/>
			<UButton color="primary" icon="lucide:user-plus" @click="openCreateModal">
				Dodaj lekarza
			</UButton>
		</div>

		<UInput
			v-model="globalFilter"
			icon="lucide:search"
			placeholder="Szukaj lekarzy..."
			clearable
			class="max-w-sm"
		/>

		<UAlert
			v-if="error"
			color="error"
			icon="lucide:alert-triangle"
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
					<ClientOnly>
						<UBadge
							variant="soft"
							color="primary"
							:label="`${doctors.length} pozycji`"
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
						:data="doctors"
						sticky="header"
						:columns="columns"
						:loading="pending"
						class="min-h-0 min-w-full flex-1 overflow-y-auto"
						empty="Nie ma lekarzy."
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
								icon="lucide:mail"
								placeholder="np. lekarz@example.com"
							/>
						</UFormField>
						<UFormField label="Imię i nazwisko" name="name" required>
							<UInput
								v-model="createForm.name"
								:disabled="isCreatePending"
								icon="lucide:user"
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
								icon="lucide:file-badge"
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
								icon="lucide:user"
							/>
						</UFormField>
						<UFormField label="Email" name="userEmail">
							<UInput
								:model-value="selectedDoctor?.userEmail ?? ''"
								disabled
								icon="lucide:mail"
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
								icon="lucide:file-badge"
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
