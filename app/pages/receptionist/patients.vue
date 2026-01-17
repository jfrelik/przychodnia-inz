<script setup lang="ts">
	import type { TableColumn } from '@nuxt/ui';

	definePageMeta({
		layout: 'receptionist',
	});

	useHead({
		title: 'Pacjenci',
	});

	const toast = useToast();
	const router = useRouter();

	type Patient = {
		userId: string;
		name: string | null;
		email: string;
		role: string;
	};

	const { data, pending, error, refresh } = await useFetch(
		'/api/receptionist/users',
		{
			key: 'receptionist-patients',
			default: () => [] as Patient[],
		}
	);

	const patients = computed(() =>
		(data.value ?? []).filter((user) => user.role === 'user')
	);

	const columns: TableColumn<Patient>[] = [
		{
			accessorKey: 'name',
			header: 'Imię i nazwisko',
			enableGlobalFilter: true,
		},
		{ accessorKey: 'email', header: 'E-mail', enableGlobalFilter: true },
		{ id: 'actions', header: 'Akcje' },
	];

	const globalFilter = ref('');

	const scheduleForPatient = (userId: string) => {
		router.push(`/receptionist/appointments/${userId}`);
	};

	const viewPatientHistory = (userId: string) => {
		router.push(`/receptionist/patients-history/${userId}`);
	};

	watch(
		error,
		(err) => {
			if (!err) return;
			toast.add({
				title: 'Nie udało się pobrać pacjentów',
				color: 'error',
			});
		},
		{ immediate: true }
	);
</script>

<template>
	<PageContainer class="min-h-0 flex-1">
		<PageHeader
			title="Pacjenci"
			description="Lista pacjentów z możliwością umówienia wizyty."
		/>

		<div class="flex flex-wrap gap-3 pb-4">
			<UInput
				v-model="globalFilter"
				icon="lucide:search"
				placeholder="Szukaj po imieniu lub nazwisku"
				clearable
				class="w-full max-w-md"
			/>
		</div>

		<UAlert
			v-if="error"
			color="error"
			icon="lucide:alert-triangle"
			description="Nie udało się pobrać listy pacjentów. Spróbuj ponownie."
		>
			<template #actions>
				<UButton variant="soft" @click="refresh()">Odśwież</UButton>
			</template>
		</UAlert>

		<UCard
			class="flex min-h-0 flex-1 flex-col"
			:ui="{ body: 'p-5 flex-1 flex flex-col min-h-0 gap-4' }"
		>
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-lg font-semibold">Lista pacjentów</h2>
					<p class="text-sm text-neutral-500">
						Wybierz pacjenta aby umówić wizytę.
					</p>
				</div>
				<UBadge
					variant="soft"
					color="primary"
					:label="`${patients.length} pozycji`"
				/>
			</div>

			<UTable
				v-model:global-filter="globalFilter"
				:data="patients"
				:columns="columns"
				:loading="pending"
				sticky="header"
				class="min-h-0 min-w-full flex-1 overflow-y-auto"
				:empty-state="{
					icon: 'lucide:user',
					label: 'Brak pacjentów',
					description: 'Nie znaleziono pacjentów spełniających kryteria.',
				}"
			>
				<template #actions-header>
					<span class="sr-only">Akcje</span>
				</template>
				<template #actions-cell="{ row }">
					<div class="flex gap-2">
						<UButton
							variant="solid"
							color="primary"
							icon="lucide:calendar-plus"
							class="cursor-pointer"
							@click="scheduleForPatient(row.original.userId)"
						>
							Umów wizytę
						</UButton>
						<UButton
							variant="outline"
							color="neutral"
							icon="lucide:calendar"
							class="cursor-pointer"
							@click="viewPatientHistory(row.original.userId)"
						>
							Wizyty
						</UButton>
					</div>
				</template>
			</UTable>
		</UCard>
	</PageContainer>
</template>
