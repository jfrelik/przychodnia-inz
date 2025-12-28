<script lang="ts" setup>
	import type { FormSubmitEvent } from '@nuxt/ui';
	import * as z from 'zod';
	import { authClient } from '~~/lib/auth-client';

	useHead({
		title: 'Logowanie',
	});

	const toast = useToast();
	const session = authClient.useSession();
	const show = ref(false);
	const isSubmitting = ref(false);
	const turnstile = ref();
	const route = useRoute();

	const resetError = computed(() => {
		const value = route.query.error;
		return typeof value === 'string' ? value.toLowerCase() : '';
	});

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
		event.preventDefault();
		if (isSubmitting.value) {
			return;
		}

		const token = turnstile.value;
		if (!token) {
			toast.add({
				title: 'Weryfikacja nie powiodła się',
				description: 'Odśwież stronę i spróbuj ponownie.',
				color: 'error',
				icon: 'carbon:error',
			});
			return;
		}

		isSubmitting.value = true;
		try {
			const { data: turnstileData, error: turnstileError } = await useFetch(
				'/_turnstile/validate',
				{
					method: 'POST',
					body: { token },
				}
			);

			if (turnstileError.value) {
				console.error('Turnstile validation error:', turnstileError.value);
				toast.add({
					title: 'Nie udało się zweryfikować zabezpieczenia',
					description:
						'Sprawdź połączenie z internetem lub spróbuj ponownie za chwilę.',
					color: 'error',
					icon: 'carbon:warning',
				});
				return;
			}

			if (!turnstileData.value?.success) {
				turnstile.value = null;
				toast.add({
					title: 'Weryfikacja wygasła',
					description: 'Zabezpieczenie wygasło. Wykonaj ponownie weryfikację.',
					color: 'warning',
					icon: 'carbon:warning',
				});
				return;
			}

			const { data, error } = await authClient.signIn.email({
				email: event.data.email,
				password: event.data.password,
			});

			if (error) {
				console.error('Error signing in:', error);
				if (error.code === 'EMAIL_NOT_VERIFIED') {
					toast.add({
						title: 'Email niezweryfikowany',
						description:
							'Email nie dotarł? Kliknij przycisk poniżej, aby wysłać go ponownie.',
						color: 'warning',
						icon: 'carbon:warning',
						actions: [
							{
								icon: 'i-lucide-refresh-cw',
								label: 'Wyślij ponownie',
								color: 'neutral',
								variant: 'outline',
								onClick: async (e) => {
									e?.stopPropagation();
									await authClient.sendVerificationEmail({
										email: event.data.email,
										callbackURL: '/login',
									});
									toast.add({
										title: 'Email wysłany',
										description:
											'Sprawdź swoją skrzynkę odbiorczą (oraz folder spam).',
										color: 'success',
										icon: 'carbon:checkmark',
									});
								},
							},
						],
					});
					return;
				}
				toast.add({
					title: 'Wystąpił problem podczas logowania',
					description: error.message,
					color: 'error',
					icon: 'carbon:error',
				});
			} else {
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

				switch (session.value?.data?.user.role) {
					case 'admin':
						await navigateTo('/admin/home');
						break;
					case 'user':
						await navigateTo('/user/home');
						break;
					case 'doctor':
						await navigateTo('/doctor/home');
						break;
					case 'receptionist':
						await navigateTo('/receptionist/home');
						break;
					default:
						await navigateTo('/');
				}
			}
		} finally {
			isSubmitting.value = false;
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
			class="inline-block w-1/3 flex-col items-center rounded-xl border border-gray-300 p-6 shadow-xl"
		>
			<div class="flex flex-col items-center pb-6">
				<h1 class="text-2xl font-bold">Logowanie</h1>
			</div>

			<UAlert
				v-if="resetError === 'invalid_token'"
				variant="soft"
				color="error"
				title="Nieprawidłowy token weryfikacyjny"
				description="Jeszcze raz otwórz link z wiadomości e-mail"
				class="mb-4 w-full"
			/>

			<UAlert
				v-if="resetError === 'token_expired'"
				variant="soft"
				color="error"
				title="Token weryfikacyjny wygasł"
				description=""
				class="mb-4 w-full"
			/>

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

				<div class="w-full">
					<NuxtTurnstile v-model="turnstile" class="w-full" />
				</div>

				<UButton
					type="submit"
					:disabled="!turnstile"
					:loading="isSubmitting"
					class="w-full cursor-pointer justify-center"
				>
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
