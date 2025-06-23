<script lang="ts" setup>
	import { authClient } from '~~/lib/auth-client';

	const session = authClient.useSession();
	const name = ref('');
	const email = ref('');
	const password = ref('');

	const handleLoginSubmit = async (event: Event) => {
		event.preventDefault();
		const { data, error } = await authClient.signIn.email({
			email: email.value,
			password: password.value,
		});
		if (error) {
			console.error('Error signing in:', error);
		} else {
			console.log('Signed in successfully:', data);
			await navigateTo('/home');
		}
	};
</script>

<template>
	<div
		class="shadow-4xl inline-block flex-col items-center rounded-xl border-1 border-gray-300 p-6"
	>
		<h1>Login form</h1>
		<UForm
			novalidate
			class="flex flex-col items-center gap-4"
			@submit="handleLoginSubmit"
		>
			<UInput
				v-model="email"
				type="email"
				placeholder="Email"
				required
				autocomplete="email"
				autofocus
			/>

			<UInput
				v-model="password"
				type="password"
				placeholder="Password"
				required
			/>
			<UButton type="submit">Login</UButton>
		</UForm>
	</div>
</template>

<style></style>
