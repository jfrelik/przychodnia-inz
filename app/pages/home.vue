<script lang="ts" setup>
	import { authClient } from '~~/lib/auth-client';

	const toast = useToast();
	const session = authClient.useSession();

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
		<div class="flex w-full flex-col p-8">
			<UButton class="w-fit" @click="handleSignout">Logout</UButton>

			<DevOnly>
				<p>Your session data is:</p>
				<pre>{{ JSON.stringify(session, null, 2) }}</pre>
			</DevOnly>
		</div>
		<PageFooter />
	</div>
</template>
