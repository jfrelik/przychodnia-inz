<script setup lang="ts">
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
	<div>
		<h1>Register form</h1>
		<form novalidate @submit="handleRegisterSubmit">
			<input
				v-model="email"
				type="email"
				placeholder="Email"
				required
				autocomplete="email"
				autofocus
			/>

			<input
				v-model="name"
				type="text"
				placeholder="Name"
				required
				autocomplete="name"
			/>

			<input
				v-model="password"
				type="password"
				placeholder="Password"
				required
			/>
			<button type="submit">Register</button>
		</form>

		<h1>Login form</h1>
		<form novalidate @submit="handleLoginSubmit">
			<input
				v-model="email"
				type="email"
				placeholder="Email"
				required
				autocomplete="email"
				autofocus
			/>

			<input
				v-model="password"
				type="password"
				placeholder="Password"
				required
			/>
			<button type="submit">Login</button>
		</form>
	</div>
</template>
