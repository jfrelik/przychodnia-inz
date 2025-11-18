<script lang="ts" setup>
	import { Icon } from '#components';

	definePageMeta({
		layout: 'admin',
	});

	useHead({
		title: 'Panel administratora',
	});

	type Statistics = {
		totalAdmins: number;
		totalDoctors: number;
		totalPatients: number;
		totalLogs: number;
	};

	const defaultStatistics: Statistics = {
		totalAdmins: 0,
		totalDoctors: 0,
		totalPatients: 0,
		totalLogs: 0,
	};

	const { data, pending, error, refresh } = await useFetch<Statistics>(
		'/api/admin/statistics',
		{
			default: () => defaultStatistics,
		}
	);

	const statistics = computed(() => data.value ?? defaultStatistics);
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel administratora"
			description="Witamy w panelu administratora. Tutaj możesz zarządzać użytkownikami, przeglądać logi aktywności i konfigurować ustawienia systemu."
		/>
		<UAlert
			v-if="error"
			class="mb-4"
			color="error"
			icon="i-lucide-alert-triangle"
			description="Nie udało się pobrać statystyk. Spróbuj ponownie."
		>
			<template #actions>
				<UButton variant="soft" @click="refresh()">Odśwież</UButton>
			</template>
		</UAlert>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<UCard :ui="{ body: 'p-6' }">
				<div class="flex items-center space-x-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100"
					>
						<Icon name="i-lucide-users" class-name="h-6 w-6 text-blue-600" />
					</div>
					<div>
						<div class="text-2xl font-bold text-gray-800">
							<USkeleton v-if="pending" class="h-8 w-16" />
							<span v-else>{{ statistics.totalPatients }}</span>
						</div>
						<p class="text-sm text-gray-600">Pacjenci</p>
					</div>
				</div>
			</UCard>
			<UCard :ui="{ body: 'p-6' }">
				<div class="flex items-center space-x-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100"
					>
						<Icon
							name="i-lucide-stethoscope"
							class-name="h-6 w-6 text-green-600"
						/>
					</div>
					<div>
						<div class="text-2xl font-bold text-gray-800">
							<USkeleton v-if="pending" class="h-8 w-16" />
							<span v-else>{{ statistics.totalDoctors }}</span>
						</div>
						<p class="text-sm text-gray-600">Lekarze</p>
					</div>
				</div>
			</UCard>
			<UCard :ui="{ body: 'p-6' }">
				<div class="flex items-center space-x-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100"
					>
						<Icon name="i-lucide-shield" class-name="h-6 w-6 text-purple-600" />
					</div>
					<div>
						<div class="text-2xl font-bold text-gray-800">
							<USkeleton v-if="pending" class="h-8 w-16" />
							<span v-else>{{ statistics.totalAdmins }}</span>
						</div>
						<p class="text-sm text-gray-600">Administratorzy</p>
					</div>
				</div>
			</UCard>
			<UCard :ui="{ body: 'p-6' }">
				<div class="flex items-center space-x-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100"
					>
						<Icon
							name="i-lucide-file-text"
							class-name="h-6 w-6 text-yellow-600"
						/>
					</div>
					<div>
						<div class="text-2xl font-bold text-gray-800">
							<USkeleton v-if="pending" class="h-8 w-16" />
							<span v-else>{{ statistics.totalLogs }}</span>
						</div>
						<p class="text-sm text-gray-600">Wpisy w logach</p>
					</div>
				</div>
			</UCard>
		</div>
	</PageContainer>
</template>
