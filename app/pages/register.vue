<script lang="ts" setup>
	import { authClient } from '~~/lib/auth-client';

	const session = authClient.useSession();
	const name = ref('');
	const email = ref('');
	const password = ref('');

	const handleRegisterSubmit = async (event: Event) => {
		event.preventDefault();
		const { data, error } = await authClient.signUp.email({
			email: email.value,
			password: password.value,
			name: name.value,
		});
		if (error) {
			console.error('Error signing up:', error);
		} else {
			console.log('Signed up successfully:', data);
			await navigateTo('/home');
		}
	};
</script>

<template>
	<div
		class="shadow-4xl inline-block flex-col items-center rounded-xl border-1 border-gray-300 p-6"
	>
		<h1>Register form</h1>
		<UForm
			novalidate
			class="flex flex-col items-center gap-4"
			@submit="handleRegisterSubmit"
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
				v-model="name"
				type="text"
				placeholder="Name"
				required
				autocomplete="name"
			/>

			<UInput
				v-model="password"
				type="password"
				placeholder="Password"
				required
			/>
			<UButton type="submit">Register</UButton>
		</UForm>
	</div>
</template>

<style></style>
