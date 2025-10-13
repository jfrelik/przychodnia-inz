<script lang="ts" setup>
	import type { FormSubmitEvent } from '@nuxt/ui';
	import * as z from 'zod';
	import { authClient } from '~~/lib/auth-client';

	const toast = useToast();
	const session = authClient.useSession();
	const show = ref(false);

	const schema = z.object({
		email: z.string().email('Nieprawidłowy adres email'),
		password: z.string().min(8, 'Hasło musi mieć przynajmniej 8 znaków'),
	});

	type Schema = z.output<typeof schema>;

	const state = reactive<Partial<Schema>>({
		email: '',
		password: '',
	});

	const handleLoginSubmit = async (event: FormSubmitEvent<Schema>) => {
		const { data, error } = await authClient.signIn.email({
			email: event.data.email,
			password: event.data.password,
			callbackURL: '/user/home',
		});

		if (error) {
			console.error('Error signing in:', error);
			toast.add({
				title: 'Wystąpił problem podczas logowania',
				description: error.message,
				color: 'error',
				icon: 'carbon:error',
			});
		} else {
			console.log('Signed in successfully:', data);
			toast.add({
				title: 'Zalogowano',
				description: 'Proces logowania powiódł się',
				color: 'success',
				icon: 'carbon:checkmark',
			});

			const session = authClient.useSession();
			await new Promise<void>((resolve) => {
				if (session.value?.data?.user) {
					resolve();
					return;
				}
				const stop = watch(
					() => session.value?.data?.user,
					(user) => {
						if (user) {
							stop();
							resolve();
						}
					}
				);
			});

			if (session.value?.data?.user.role === 'admin') {
				await navigateTo('/admin/home');
			} else if (session.value?.data?.user.role === 'user') {
				await navigateTo('/user/home');
			} else {
				await navigateTo('/doctor/home');
			}
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
				<h1 class="text-2xl font-bold">Logowanie</h1>
			</div>

			<UForm
				:schema="schema"
				:state="state"
				class="flex flex-col items-center gap-4"
				novalidate
				@submit="handleLoginSubmit"
			>
				<UFormField label="Email" name="email" class="w-full">
					<UInput
						v-model="state.email"
						type="email"
						placeholder="Email"
						class="w-full"
						autocomplete="email"
						autofocus
					/>
				</UFormField>

				<UFormField label="Hasło" name="password" class="w-full">
					<UInput
						v-model="state.password"
						:type="show ? 'text' : 'password'"
						placeholder="Hasło"
						class="w-full"
						:ui="{ trailing: 'pe-1' }"
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
					Zaloguj
				</UButton>
			</UForm>

			<div class="flex flex-col items-center">
				<p class="pt-2">
					Nie masz konta?
					<ULink to="/register" class="text-primary">Zarejestruj się</ULink>
				</p>
				<ULink to="/change-password" class="text-primary">
					Nie pamiętasz hasła?
				</ULink>
			</div>
		</div>
		<ULink to="/" class="text-neutral-500">Powrót do strony głównej</ULink>
	</div>
</template>

<style></style>
