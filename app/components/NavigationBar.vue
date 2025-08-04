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

	const menuItems = computed(() => {
		const role = session.value.data?.user.role;

		const roleNavItems: { label: string; to: string }[] = [];

		if (role === 'admin') {
			roleNavItems.push({ label: 'Portal administratora', to: '/admin/home' });
		} else if (role === 'doctor') {
			roleNavItems.push({ label: 'Portal doktora', to: '/doctor/home' });
		} else if (role === 'user') {
			roleNavItems.push({ label: 'Portal pacjenta', to: '/user/home' });
		}

		return [
			{ label: 'Strona główna', to: '/' },
			...roleNavItems,
			session.value.data?.user
				? { label: 'Wyloguj', action: handleSignout }
				: { label: 'Zaloguj', to: '/login' },
		];
	});
</script>

<template>
	<nav class="flex w-full gap-2 px-4 py-2">
		<template v-for="item in menuItems" :key="item.label">
			<UButton
				v-if="item.action || item.to == '/login'"
				color="primary"
				variant="outline"
				class="ml-auto cursor-pointer"
				:to="item.to"
				@click="item.action"
			>
				{{ item.label }}
			</UButton>
			<UButton
				v-else
				:to="item.to"
				class="cursor-pointer"
				color="primary"
				variant="soft"
			>
				{{ item.label }}
			</UButton>
		</template>
	</nav>
</template>
