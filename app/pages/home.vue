<script lang="ts" setup>
	import { authClient } from '~~/lib/auth-client';

	const session = authClient.useSession();

	const handleSignout = async () => {
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						navigateTo('/login');
					},
				},
			});
		} catch (error) {
			console.error('Error signing out:', error);
		}
	};
</script>

<template>
	<div>
		<h1>Home</h1>

		<button @click="handleSignout">Logout</button>

		<p>Your session data is:</p>
		<pre>{{ JSON.stringify(session, null, 2) }}</pre>
	</div>
</template>
