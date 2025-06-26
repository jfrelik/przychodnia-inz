<script lang="ts" setup>
	import { authClient } from '~~/lib/auth-client';

	const session = authClient.useSession();

	const handleSignout = async () => {
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						navigateTo('/');
					},
				},
			});
		} catch (error) {
			console.error('Error signing out:', error);
		}
	};
</script>

<template>
	<div class="flex min-h-screen w-full flex-col">
		<PageHeader />
		<div class="flex w-full flex-col">
			<button @click="handleSignout">Logout</button>

			<DevOnly>
				<p>Your session data is:</p>
				<pre>{{ JSON.stringify(session, null, 2) }}</pre>
			</DevOnly>
		</div>
		<PageFooter />
	</div>
</template>
