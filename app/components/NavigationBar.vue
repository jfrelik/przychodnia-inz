<script setup lang="ts">
	import { authClient } from '~~/lib/auth-client';

	const toast = useToast();
	const session = authClient.useSession();

	const handleSignout = async () => {
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
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
			toast.add({
				title: 'Błąd wylogowania',
				description: 'Błąd: ' + error,
				color: 'error',
				icon: 'carbon:error',
			});
		}
	};

	// Dynamic menu with logout action if logged in
	const menuItems = computed(() => [
		[
			{ label: 'Strona główna', to: '/' },
			{ label: 'Kontakt', to: '/kontakt' },
			{ label: 'Dojazd', to: '/dojazd' },
		],
		[
			session.value.data?.user
				? { label: 'Wyloguj', action: handleSignout }
				: { label: 'Zaloguj', to: '/login' },
		],
	]);
</script>

<template>
	<UNavigationMenu :items="menuItems" class="w-full">
		<template #item="{ item }">
			<UButton
				v-if="item.action"
				color="primary"
				variant="ghost"
				class="w-full cursor-pointer justify-start p-0 text-left hover:bg-gray-50"
				@click="item.action"
			>
				{{ item.label }}
			</UButton>

			<ULink
				v-else
				:to="item.to"
				class="block w-full cursor-pointer text-left text-sm hover:bg-gray-100"
			>
				{{ item.label }}
			</ULink>
		</template>
	</UNavigationMenu>
</template>

<style></style>
