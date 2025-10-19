<script lang="ts" setup>
	import type { FormSubmitEvent } from '@nuxt/ui';
	import * as z from 'zod';
	import { authClient } from '~~/lib/auth-client';

	const toast = useToast();
	const session = authClient.useSession();
	const show = ref(false);

	const schema = z.object({
		email: z.email('Nieprawidłowy adres email'),
		name: z.string().min(2, 'Imię musi mieć przynajmniej 2 znaki'),
		password: z.string().min(8, 'Hasło musi mieć przynajmniej 8 znaków'),
	});

	type Schema = z.output<typeof schema>;

	const state = reactive<Partial<Schema>>({
		email: '',
		name: '',
		password: '',
	});

	const handleRegisterSubmit = async (event: FormSubmitEvent<Schema>) => {
		event.preventDefault();
		const { data, error } = await authClient.signUp.email({
			email: event.data.email,
			password: event.data.password,
			name: event.data.name,
		});
		if (error) {
			console.error('Error signing up:', error);
			toast.add({
				title: 'Wystąpił problem podczas rejestracji',
				description: 'Błąd: ' + error.message,
				color: 'error',
				icon: 'carbon:error',
			});
		} else {
			toast.add({
				title: 'Zarejestrowano',
				description: 'Proces rejestracji powiódł się',
				color: 'success',
				icon: 'carbon:checkmark',
			});
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

			<UForm
				:schema="schema"
				:state="state"
				novalidate
				class="flex flex-col items-center gap-4"
				@submit="handleRegisterSubmit"
			>
				<UFormField label="Email" name="email" class="w-full">
					<UInput
						v-model="state.email"
						type="email"
						class="w-full"
						placeholder="Email"
						required
						autocomplete="email"
						autofocus
					/>
				</UFormField>

				<UFormField label="Imię" name="name" class="w-full">
					<UInput
						v-model="state.name"
						type="text"
						class="w-full"
						placeholder="Imię"
						required
						autocomplete="name"
					/>
				</UFormField>

				<UFormField label="Hasło" name="password" class="w-full">
					<UInput
						v-model="state.password"
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
			</UForm>
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
