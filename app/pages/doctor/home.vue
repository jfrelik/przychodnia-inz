<script lang="ts" setup>
	import { Icon } from '#components';

	definePageMeta({
		layout: 'docs',
	});

	useHead({
		title: 'Panel doktora',
	});

	const toast = useToast();

	const dispositionReminder = ref(true);
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel doktora"
			description="Witamy w panelu doktora. Tutaj możesz przeglądać swoje wizyty, pacjentów oraz powiązane dane"
		/>
		<UAlert
			v-if="dispositionReminder"
			color="error"
			title="Uzupełnij dyspozycję"
			description="Przejdź do panelu dyspozycji, aby wpisać swoją dostępność w nadchodzący okres."
			icon="carbon:warning"
		/>
		<div class="grid grid-cols-2 gap-4">
			<UCard :ui="{ body: 'p-6' }">
				<h1 class="text-2xl font-bold">Godziny pracy dzisiaj</h1>
				<p>8:00-16:00</p>
			</UCard>
			<UCard :ui="{ body: 'p-6' }">
				<h1 class="text-2xl font-bold">Pozostałe wizyty</h1>
				<p>Stacjonarne: 4</p>
				<p>Telefoniczne: 6</p>
			</UCard>
		</div>
		<UCard :ui="{ body: 'p-6' }">
			<div class="flex items-center justify-between pb-6">
				<h1 class="text-2xl font-bold">Najbliższa wizyta</h1>
				<UButton variant="soft" color="neutral" class="w-fit cursor-pointer">
					Pokaż wszystkie
				</UButton>
			</div>
			<!-- sample upcoming visit -->
			<UCard>
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100"
						>
							<Icon name="carbon:calendar" class-name="w-6 h-6 text-blue-600" />
						</div>

						<div class="flex flex-col">
							<h2 class="text-xl font-bold">Jan Nowak</h2>
							<p class="text-sm text-gray-500">Gabinet 12</p>

							<div
								class="mt-1 flex flex-row flex-wrap gap-3 text-sm text-gray-600"
							>
								<p>12.12.2025</p>
								<p>10:30</p>
								<UBadge variant="subtle" color="info">Stacjonarna</UBadge>
							</div>
						</div>
					</div>
					<div class="flex gap-4">
						<UButton
							variant="soft"
							color="neutral"
							label="Przyjmij teraz"
							icon="carbon:play"
							class="cursor-pointer"
							to="handleAppointment"
						/>
						<UButton
							variant="soft"
							color="neutral"
							icon="carbon:view"
							size="xl"
							class="cursor-pointer"
						/>
					</div>
				</div>
			</UCard>
		</UCard>
	</PageContainer>
</template>
