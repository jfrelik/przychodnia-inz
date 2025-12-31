<script lang="ts" setup>
	import type { TableColumn } from '@nuxt/ui';

	type TimeframeRow = {
		scheduleId: string;
		day: string;
		start: string;
		end: string;
		doctorId: string;
		doctorName: string;
		doctorEmail: string;
		specializationId: number | null;
		specializationName: string;
		roomId: number | null;
		roomNumber: number | null;
		compatibleRooms: { roomId: number; number: number }[];
	};

	type AssignRoomResponse = {
		day: string;
		timeframes: TimeframeRow[];
	};

	definePageMeta({
		layout: 'receptionist',
	});

	useHead({
		title: 'Przypisywanie pokoi',
	});

	const toast = useToast();
	const globalFilter = ref('');

	const { data, error, pending, refresh } = await useFetch<AssignRoomResponse>(
		'/api/receptionist/assignRoom',
		{
			key: 'receptionist-assign-room',
			// query: { day: '2026-01-01' },
			default: () => ({ day: '', timeframes: [] }),
		}
	);

	const timeframes = computed(() => data.value?.timeframes ?? []);

	const selectedRooms = ref<Record<string, number | null>>({});
	const saving = ref<Record<string, boolean>>({});

	watch(
		timeframes,
		(list) => {
			const next: Record<string, number | null> = { ...selectedRooms.value };
			for (const tf of list) {
				if (next[tf.scheduleId] === undefined) {
					next[tf.scheduleId] = tf.roomId ?? null;
				}
			}
			selectedRooms.value = next;
		},
		{ immediate: true }
	);

	const formatTime = (value: string) => value.slice(0, 5);
	const formatRange = (row: TimeframeRow) =>
		`${formatTime(row.start)} - ${formatTime(row.end)}`;

	const columns: TableColumn<TimeframeRow>[] = [
		{
			accessorKey: 'doctorName',
			header: 'Lekarz',
			enableGlobalFilter: true,
		},
		{
			id: 'specialization',
			header: 'Specjalizacja',
			accessorFn: (row) => row.specializationName ?? '',
			enableGlobalFilter: true,
		},
		{
			id: 'timeframe',
			header: 'Przedział czasowy',
			accessorFn: (row) => `${formatTime(row.start)}-${formatTime(row.end)}`,
			enableGlobalFilter: true,
		},
		{
			id: 'room',
			header: 'Pokój',
			accessorFn: (row) =>
				row.roomNumber ? `Gabinet ${row.roomNumber}` : 'Nieprzypisany',
			enableGlobalFilter: true,
		},
		{ id: 'actions', header: 'Przypisz pokój' },
	];

	const roomOptions = (row: TimeframeRow) => [
		{ label: 'Brak przydziału', value: null },
		...row.compatibleRooms.map((r) => ({
			label: `Gabinet ${r.number}`,
			value: r.roomId,
		})),
	];

	const assignRoom = async (row: TimeframeRow) => {
		const roomId = selectedRooms.value[row.scheduleId] ?? null;
		const selectedLabel = roomOptions(row).find(
			(option) => option.value === roomId
		)?.label;

		saving.value[row.scheduleId] = true;
		try {
			await $fetch('/api/receptionist/assignRoom', {
				method: 'POST',
				body: { scheduleId: row.scheduleId, roomId },
			});
			toast.add({
				title: 'Zapisano przydział pokoju',
				description: roomId
					? (selectedLabel ?? 'Przypisano gabinet')
					: 'Usunięto przydział pokoju',
				color: 'success',
			});
			selectedRooms.value[row.scheduleId] = roomId;
			await refresh();
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Nie udało się zapisać przydziału';
			toast.add({
				title: 'Błąd przydziału',
				description: message,
				color: 'error',
			});
		} finally {
			saving.value[row.scheduleId] = false;
		}
	};
</script>

<template>
	<PageContainer class="min-h-0 flex-1">
		<PageHeader
			title="Przypisywanie pokoi"
			description="Przypisz pokoje lekarzom pracującym dzisiaj, zgodnie ze specjalizacją."
		/>

		<UAlert
			v-if="error"
			color="error"
			icon="i-lucide-alert-triangle"
			title="Nie udało się pobrać danych"
			description="Sprawdź połączenie i spróbuj ponownie."
			class="mb-4"
		/>

		<UCard class="flex min-h-0 flex-1 flex-col" :ui="{ body: 'p-4' }">
			<div class="flex flex-wrap items-center justify-between gap-3 pb-4">
				<div>
					<h2 class="text-lg font-semibold">Dzisiejsze dyspozycje</h2>
					<p class="text-sm text-neutral-500">
						Każdy przedział czasowy lekarza jako oddzielny wiersz.
					</p>
					<UInput
						v-model="globalFilter"
						icon="i-lucide-search"
						placeholder="Szukaj lekarza, specjalizacji lub pokoju"
						clearable
						class="mt-4 w-full"
					/>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<UButton
						variant="soft"
						color="neutral"
						icon="i-lucide-refresh-ccw"
						class="cursor-pointer"
						@click="refresh()"
					>
						Odśwież
					</UButton>
				</div>
			</div>

			<UTable
				v-model:global-filter="globalFilter"
				:columns="columns"
				:data="timeframes"
				:loading="pending"
				sticky="header"
				class="min-h-0 min-w-full flex-1 overflow-y-auto"
				:empty-state="{
					icon: 'i-lucide-clock',
					label: 'Brak dyspozycji na dzisiaj',
					description: 'Lekarze nie mają dyspozycji w tym dniu.',
				}"
			>
				<template #doctorName-cell="{ row }">
					<div class="flex flex-col">
						<span class="font-medium">{{ row.original.doctorName }}</span>
						<span class="text-xs text-neutral-500">
							{{ row.original.doctorEmail || 'Brak e-maila' }}
						</span>
					</div>
				</template>

				<template #specialization-cell="{ row }">
					<UBadge variant="subtle" color="primary">
						{{ row.original.specializationName }}
					</UBadge>
				</template>

				<template #timeframe-cell="{ row }">
					{{ formatRange(row.original) }}
				</template>

				<template #room-cell="{ row }">
					<span v-if="row.original.roomNumber">
						Gabinet {{ row.original.roomNumber }}
					</span>
					<span v-else class="text-neutral-500">Nieprzypisany</span>
				</template>

				<template #actions-cell="{ row }">
					<div class="flex flex-col gap-2">
						<USelect
							v-model="selectedRooms[row.original.scheduleId]"
							:items="roomOptions(row.original)"
							value-attribute="value"
							option-attribute="label"
							:disabled="!row.original.compatibleRooms.length"
							class="min-w-[180px]"
							placeholder="Wybierz pokój"
						/>
						<UButton
							size="sm"
							color="primary"
							icon="carbon:edit"
							variant="ghost"
							:loading="saving[row.original.scheduleId]"
							:disabled="!row.original.compatibleRooms.length"
							class="cursor-pointer justify-center"
							@click="assignRoom(row.original)"
						>
							Zapisz
						</UButton>
						<p
							v-if="!row.original.compatibleRooms.length"
							class="text-xs text-neutral-500"
						>
							Brak pokojów dla tej specjalizacji.
						</p>
					</div>
				</template>
			</UTable>
		</UCard>
	</PageContainer>
</template>
