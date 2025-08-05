<script lang="ts" setup>
	import { Icon } from '#components';
	import { authClient } from '~~/lib/auth-client';

	const toast = useToast();
	const session = authClient.useSession();

	const currentTab = ref('overwiev');
	const tabs = [
		{ label: 'Informacje ogólne', value: 'overwiev' },
		{ label: 'Wizyty', value: 'visits' },
		{ label: 'Recepty', value: 'prescriptions' },
		{ label: 'Wyniki', value: 'results' },
		{ label: 'Porady lekarskie', value: 'recommendations' },
		{ label: 'Mój profil', value: 'profile' },
	];

	const handleSignout = async () => {
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						console.log('Logged out successfully');
						toast.add({
							title: 'Wylogowano',
							description: 'Proces wylogowywania powiódł się',
							color: 'success',
							icon: 'carbon:checkmark',
						});
						navigateTo('/');
					},
				},
			});
		} catch (error) {
			console.error('Error signing out:', error);
			toast.add({
				title: 'Wystąpił problem podczas wylogowywania',
				description: 'Błąd: ' + error,
				color: 'error',
				icon: 'carbon:error',
			});
		}
	};
</script>

<template>
	<div class="flex min-h-screen w-full flex-col">
		<PageHeader />
		<div class="flex w-full flex-col gap-4 p-4">
			<div class="">
				<h1 class="text-3xl font-bold">
					Witaj, {{ session?.data?.user?.name }}!
				</h1>
				<p class="mt-2 text-sm font-light">
					To jest Twój portal pacjenta. Tutaj możesz zarządzać swoimi danymi,
					umawiać się na wizyty i przeglądać historię leczenia.
				</p>
			</div>

			<div class="mt-4 flex w-full flex-wrap gap-4">
				<UCard class="w-1/5 cursor-pointer" @click="currentTab = 'visits'">
					<div class="flex items-center space-x-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-3xl"
						>
							<Icon name="carbon:calendar" class-name="w-6 h-6 text-blue-600" />
						</div>
						<div>
							<p class="text-2xl font-bold text-gray-800">3</p>
							<p class="text-sm text-gray-600">Nadchodzące wizyty</p>
						</div>
					</div>
				</UCard>

				<!-- Aktywne recepty -->
				<UCard
					class="w-1/5 cursor-pointer"
					@click="currentTab = 'prescriptions'"
				>
					<div class="flex items-center space-x-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-3xl"
						>
							<Icon name="carbon:pills" class-name="w-6 h-6 text-green-600" />
						</div>
						<div>
							<p class="text-2xl font-bold text-gray-800">2</p>
							<p class="text-sm text-gray-600">Aktywne recepty</p>
						</div>
					</div>
				</UCard>

				<!-- Wyniki testów -->
				<UCard class="w-1/5 cursor-pointer" @click="currentTab = 'results'">
					<div class="flex items-center space-x-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-3xl"
						>
							<Icon name="carbon:result" class-name="w-6 h-6 text-yellow-600" />
						</div>
						<div>
							<p class="text-2xl font-bold text-gray-800">5</p>
							<p class="text-sm text-gray-600">Wyniki testów</p>
						</div>
					</div>
				</UCard>

				<!-- Ilość wizyt -->
				<UCard class="w-1/5">
					<div class="flex items-center space-x-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-3xl"
						>
							<Icon
								name="carbon:user-multiple"
								class-name="w-6 h-6 text-purple-600"
							/>
						</div>
						<div>
							<p class="text-2xl font-bold text-gray-800">12</p>
							<p class="text-sm text-gray-600">Ilość wizyt</p>
						</div>
					</div>
				</UCard>
			</div>

			<UTabs
				v-model="currentTab"
				:items="tabs"
				:ui="{
					indicator: 'bg-blue-800',
				}"
			/>

			<UserOverwievTab v-if="currentTab === 'overwiev'" />
			<UserUpcomingVisitsTab v-if="currentTab === 'visits'" />
			<UserActivePrescriptionsTab v-if="currentTab === 'prescriptions'" />
			<UserTestResultsTab v-if="currentTab === 'results'" />
			<UserRecommendationsTab v-if="currentTab === 'recommendations'" />
		</div>

		<PageFooter />
	</div>
</template>
