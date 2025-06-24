<script lang="ts" setup>
	import { authClient } from '~~/lib/auth-client';

	const session = authClient.useSession();
	const name = ref('');
	const email = ref('');
	const password = ref('');
	const show = ref(false);

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
		class="flex min-h-screen w-full flex-col items-center justify-center gap-10"
	>
		<div class="flex items-center gap-2 text-3xl font-bold">
			<UIcon name="carbon:hospital" class="h-8 w-8" />
			Nazwa Przychodni
		</div>
		<div
			class="inline-block w-1/3 flex-col items-center rounded-xl border-1 border-gray-300 p-6 shadow-xl"
		>
			<div class="flex flex-col items-center pb-6">
				<h1 class="text-2xl font-bold">Rejestracja</h1>
			</div>

			<Form
				novalidate
				class="flex flex-col items-center gap-4"
				@submit="handleRegisterSubmit"
			>
				<UFormField label="Email" class="w-full">
					<UInput
						v-model="email"
						type="email"
						class="w-full"
						placeholder="Email"
						required
						autocomplete="email"
						autofocus
					/>
				</UFormField>

				<UFormField label="Imię" class="w-full">
					<UInput
						v-model="name"
						type="text"
						class="w-full"
						placeholder="Imię"
						required
						autocomplete="name"
					/>
				</UFormField>

				<UFormField label="Hasło" class="w-full">
					<UInput
						v-model="password"
						placeholder="Hasło"
						class="w-full"
						:type="show ? 'text' : 'password'"
						:ui="{ trailing: 'pe-1' }"
						required
					>
						<template #trailing>
							<UButton
								variant="link"
								size="sm"
								color="neutral"
								:icon="show ? 'carbon:view-off' : 'carbon:view'"
								:aria-label="show ? 'Schowaj hasło' : 'Pokaż hasło'"
								:aria-pressed="show"
								aria-controls="password"
								@click="show = !show"
							/>
						</template>
					</UInput>
				</UFormField>

				<UButton type="submit" class="w-full cursor-pointer justify-center">
					Zarejestruj
				</UButton>
			</Form>
			<div class="flex flex-col items-center">
				<p class="pt-2">
					Już masz konto?
					<ULink to="/login" class="text-primary">Zaloguj się</ULink>
				</p>
			</div>
		</div>
		<ULink to="/" class="text-neutral-500">Powrót do strony głównej</ULink>
	</div>
</template>

<style></style>
