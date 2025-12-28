<script lang="ts" setup>
	import type { FormSubmitEvent } from '@nuxt/ui';
	import * as z from 'zod';
	import { authClient } from '~~/lib/auth-client';

	useHead({
		title: 'Rejestracja',
	});

	const toast = useToast();
	const session = authClient.useSession();
	const show = ref(false);
	const isSubmitting = ref(false);
	const turnstile = ref();

	const passwordCriteria = [
		{
			label: 'Co najmniej 12 znaków',
			test: (value: string) => value.length >= 12,
		},
		{
			label: 'Przynajmniej jedna wielka litera',
			test: (value: string) => /[A-Z]/.test(value),
		},
		{
			label: 'Przynajmniej jedna mała litera',
			test: (value: string) => /[a-z]/.test(value),
		},
		{
			label: 'Przynajmniej jedna cyfra',
			test: (value: string) => /\d/.test(value),
		},
		{
			label: 'Przynajmniej jeden znak specjalny',
			test: (value: string) => /[^A-Za-z0-9]/.test(value),
		},
	] as const;

	const schema = z
		.object({
			email: z.email('Nieprawidłowy adres email'),
			name: z.string().min(2, 'Imię musi mieć przynajmniej 2 znaki'),
			surname: z.string().min(2, 'Nazwisko musi mieć przynajmniej 2 znaki'),
			pesel: z
				.string()
				.length(11, 'PESEL musi mieć dokładnie 11 znaków')
				.regex(/^\d+$/, 'PESEL musi składać się tylko z cyfr'),
			phone: z
				.string()
				.min(9, 'Numer telefonu musi mieć przynajmniej 9 znaków')
				.max(15, 'Numer telefonu może mieć maksymalnie 15 znaków')
				.regex(
					/^\+?\d+$/,
					'Numer telefonu musi składać się tylko z cyfr i opcjonalnie zaczynać się od +'
				),
			address: z.string().min(5, 'Adres musi zawierać przynajmniej 5 znaków'),
			password: z
				.string()
				.min(12, 'Hasło musi mieć przynajmniej 12 znaków')
				.regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
				.regex(/[a-z]/, 'Hasło musi zawierać małą literę')
				.regex(/\d/, 'Hasło musi zawierać cyfrę')
				.regex(/[^A-Za-z0-9]/, 'Hasło musi zawierać znak specjalny'),
			confirmPassword: z.string().min(1, 'Powtórz hasło'),
		})
		.superRefine((data, ctx) => {
			if (data.password !== data.confirmPassword) {
				ctx.addIssue({
					code: 'custom',
					message: 'Hasła muszą być identyczne',
					path: ['confirmPassword'],
				});
			}
		});

	type Schema = z.output<typeof schema>;

	const state = reactive<Partial<Schema>>({
		email: '',
		name: '',
		surname: '',
		pesel: '',
		phone: '',
		address: '',
		password: '',
		confirmPassword: '',
	});

	const passwordStrength = computed(() => {
		const password = state.password ?? '';
		const requirements = passwordCriteria.map((criterion) => ({
			...criterion,
			passed: criterion.test(password),
		}));

		const passedCount = requirements.filter(
			(criterion) => criterion.passed
		).length;
		const score = password
			? Math.round((passedCount / requirements.length) * 100)
			: 0;

		let label = 'Brak hasła';
		let barClass = 'bg-gray-300';
		let textClass = 'text-neutral-500';

		if (password) {
			if (score < 40) {
				label = 'Słabe';
				barClass = 'bg-red-500';
				textClass = 'text-red-600';
			} else if (score < 80) {
				label = 'Średnie';
				barClass = 'bg-amber-500';
				textClass = 'text-amber-600';
			} else {
				label = 'Silne';
				barClass = 'bg-emerald-500';
				textClass = 'text-emerald-600';
			}
		}

		return {
			requirements,
			label,
			barClass,
			textClass,
			width: `${score}%`,
		};
	});

	const handleRegisterSubmit = async (event: FormSubmitEvent<Schema>) => {
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

			if (turnstileError.value || !turnstileData.value?.success) {
				toast.add({
					title: 'Weryfikacja nie powiodła się',
					description: 'Odśwież stronę i spróbuj ponownie.',
					color: 'error',
					icon: 'carbon:error',
				});
				return;
			}

			try {
				const data = await $fetch<{
					status: string;
					message: string;
					patient: Record<string, unknown>;
				}>('/api/auth/register', {
					method: 'POST',
					body: {
						email: event.data.email,
						name: event.data.name,
						surname: event.data.surname,
						pesel: event.data.pesel,
						phone: event.data.phone,
						password: event.data.password,
						address: event.data.address,
					},
				});

				toast.add({
					title: 'Zarejestrowano',
					description:
						data.message ||
						'Proces rejestracji powiódł się. Sprawdź swoją skrzynkę email, aby potwierdzić konto.',
					color: 'success',
					icon: 'carbon:checkmark',
				});
				await navigateTo('/login');
			} catch (error) {
				let errorMessage = 'Wystąpił błąd podczas rejestracji.';

				if (error && typeof error === 'object') {
					const fetchError = error as {
						statusCode?: number;
						statusMessage?: string;
						response?: { status?: number };
						data?: { statusMessage?: string };
					};

					const statusCode =
						fetchError.statusCode || fetchError.response?.status;
					const statusMessage =
						fetchError.statusMessage || fetchError.data?.statusMessage;

					if (statusCode === 400) {
						errorMessage =
							statusMessage ||
							'Błąd walidacji danych. Sprawdź poprawność wprowadzonych danych.';
					} else if (statusCode === 409) {
						errorMessage =
							statusMessage ||
							'Użytkownik o podanym email lub PESEL już istnieje.';
					} else if (statusCode === 500) {
						errorMessage = 'Wystąpił błąd serwera. Spróbuj ponownie później.';
					} else if (statusMessage) {
						errorMessage = statusMessage;
					}
				}

				console.error('Error signing up:', error);
				toast.add({
					title: 'Wystąpił problem podczas rejestracji',
					description: errorMessage,
					color: 'error',
					icon: 'carbon:error',
				});
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
				<div class="grid w-full grid-cols-2 gap-4">
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

					<UFormField label="Nazwisko" name="surname" class="w-full">
						<UInput
							v-model="state.surname"
							type="text"
							class="w-full"
							placeholder="Nazwisko"
							required
							autocomplete="name"
						/>
					</UFormField>
				</div>

				<div class="grid w-full grid-cols-2 gap-4">
					<UFormField label="PESEL" name="pesel" class="w-full">
						<UInput
							v-model="state.pesel"
							type="text"
							class="w-full"
							placeholder="PESEL"
							required
							autocomplete="pesel"
						/>
					</UFormField>

					<UFormField label="Numer telefonu" name="phone" class="w-full">
						<UInput
							v-model="state.phone"
							type="text"
							class="w-full"
							placeholder="123123123"
							required
							autocomplete="phone"
						/>
					</UFormField>
				</div>

				<UFormField label="Adres" name="address" class="w-full">
					<UInput
						v-model="state.address"
						type="text"
						class="w-full"
						placeholder="Ulica, numer domu/mieszkania, kod pocztowy, miasto"
						required
						autocomplete="street-address"
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
						autocomplete="new-password"
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
					<div class="mt-2 w-full space-y-2">
						<div class="flex items-center justify-between text-sm font-medium">
							<span>Siła hasła:</span>
							<span :class="passwordStrength.textClass">
								{{ passwordStrength.label }}
							</span>
						</div>
						<div class="h-2 w-full rounded-full bg-gray-200">
							<div
								class="h-full rounded-full transition-all duration-200"
								:class="passwordStrength.barClass"
								:style="{ width: passwordStrength.width }"
							/>
						</div>
						<ul class="space-y-1 text-sm">
							<li
								v-for="requirement in passwordStrength.requirements"
								:key="requirement.label"
								class="flex items-center gap-2"
								:class="
									requirement.passed ? 'text-emerald-600' : 'text-neutral-500'
								"
							>
								<UIcon
									:name="
										requirement.passed ? 'carbon:checkmark' : 'carbon:close'
									"
									class="h-4 w-4"
									:class="
										requirement.passed ? 'text-emerald-500' : 'text-neutral-400'
									"
								/>
								{{ requirement.label }}
							</li>
						</ul>
					</div>
				</UFormField>

				<UFormField label="Powtórz hasło" name="confirmPassword" class="w-full">
					<UInput
						v-model="state.confirmPassword"
						placeholder="Powtórz hasło"
						class="w-full"
						:type="show ? 'text' : 'password'"
						required
						autocomplete="new-password"
					/>
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
