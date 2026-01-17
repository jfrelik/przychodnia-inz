<script lang="ts" setup>
	import type { FormSubmitEvent } from '@nuxt/ui';
	import * as z from 'zod';
	import { requestPasswordReset, resetPassword } from '~~/lib/auth-client';

	useHead({
		title: 'Zmiana hasła',
	});

	const toast = useToast();
	const route = useRoute();
	const router = useRouter();
	const requestURL = useRequestURL();

	const showPassword = ref(false);
	const isRequesting = ref(false);
	const isResetting = ref(false);
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

	const requestSchema = z.object({
		email: z.email('Nieprawidłowy adres email'),
	});

	type RequestSchema = z.output<typeof requestSchema>;

	const resetSchema = z
		.object({
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

	type ResetSchema = z.output<typeof resetSchema>;

	const requestState = reactive<Partial<RequestSchema>>({
		email: '',
	});

	const resetState = reactive<Partial<ResetSchema>>({
		password: '',
		confirmPassword: '',
	});

	const token = computed(() => {
		const value = route.query.token;
		return typeof value === 'string' ? value : '';
	});

	const hasValidToken = computed(() => Boolean(token.value));

	const resetError = computed(() => {
		const value = route.query.error;
		return typeof value === 'string' ? value : '';
	});

	watch(
		resetError,
		(value) => {
			// Ensure this only runs on client side
			if (!import.meta.client) {
				return;
			}
			if (value === 'INVALID_TOKEN') {
				toast.add({
					title: 'Link do zmiany hasła wygasł',
					description: 'Wygeneruj nowy link i spróbuj ponownie.',
					color: 'error',
					icon: 'lucide:clock',
				});
			}
		},
		{ immediate: true }
	);

	const passwordStrength = computed(() => {
		const password = resetState.password ?? '';
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

	const redirectTo = `${requestURL.origin}/change-password`;

	const handleRequestSubmit = async (event: FormSubmitEvent<RequestSchema>) => {
		event.preventDefault();
		if (isRequesting.value) {
			return;
		}

		isRequesting.value = true;
		try {
			const token = turnstile.value;
			if (!token) {
				toast.add({
					title: 'Weryfikacja nie powiodła się',
					description: 'Odśwież stronę i spróbuj ponownie.',
					color: 'error',
					icon: 'lucide:circle-x',
				});
				return;
			}

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
					icon: 'lucide:circle-x',
				});
				return;
			}

			const { data, error } = await requestPasswordReset({
				email: event.data.email,
				redirectTo,
			});

			if (error) {
				console.error('Error requesting password reset:', error);
				toast.add({
					title: 'Nie udało się wysłać wiadomości',
					description: error.message ?? 'Spróbuj ponownie za chwilę.',
					color: 'error',
					icon: 'lucide:circle-x',
				});
				return;
			}

			toast.add({
				title: 'Sprawdź skrzynkę',
				description:
					data?.message ??
					'Jeśli adres email istnieje w systemie, wysłaliśmy link do zmiany hasła.',
				color: 'success',
				icon: 'lucide:check',
			});
			requestState.email = '';
		} catch (err) {
			console.error('Unexpected error requesting password reset:', err);
			toast.add({
				title: 'Nie udało się wysłać wiadomości',
				description: 'Spróbuj ponownie za chwilę.',
				color: 'error',
				icon: 'lucide:circle-x',
			});
		} finally {
			isRequesting.value = false;
		}
	};

	const handleResetSubmit = async (event: FormSubmitEvent<ResetSchema>) => {
		event.preventDefault();
		if (isResetting.value) {
			return;
		}

		if (!token.value) {
			toast.add({
				title: 'Brakuje tokenu',
				description: 'Użyj linku z wiadomości email, aby zmienić hasło.',
				color: 'error',
				icon: 'lucide:circle-x',
			});
			return;
		}

		isResetting.value = true;
		try {
			const { data, error } = await resetPassword({
				newPassword: event.data.password,
				token: token.value,
			});

			if (error) {
				console.error('Error resetting password:', error);
				toast.add({
					title: 'Nie udało się zmienić hasła',
					description: error.message ?? 'Spróbuj ponownie.',
					color: 'error',
					icon: 'lucide:circle-x',
				});
				return;
			}

			if (data?.status) {
				toast.add({
					title: 'Hasło zostało zmienione',
					description: 'Możesz zalogować się używając nowego hasła.',
					color: 'success',
					icon: 'lucide:check',
				});
			}

			resetState.password = '';
			resetState.confirmPassword = '';

			await router.replace({ path: '/login' });
		} catch (err) {
			console.error('Unexpected error resetting password:', err);
			toast.add({
				title: 'Nie udało się zmienić hasła',
				description: 'Spróbuj ponownie.',
				color: 'error',
				icon: 'lucide:circle-x',
			});
		} finally {
			isResetting.value = false;
		}
	};
</script>

<template>
	<div
		class="flex min-h-screen w-full flex-col items-center justify-center gap-10"
	>
		<div class="flex items-center gap-2 text-3xl font-bold">
			<UIcon name="lucide:hospital" class="h-8 w-8" />
			Nazwa Przychodni
		</div>
		<div
			class="inline-block w-1/3 flex-col items-center rounded-xl border border-gray-300 p-6 shadow-xl"
		>
			<div class="flex flex-col items-center pb-6 text-center">
				<h1 class="text-2xl font-bold">
					{{ hasValidToken ? 'Ustaw nowe hasło' : 'Odzyskaj dostęp' }}
				</h1>
				<p class="text-neutral-500">
					{{
						hasValidToken
							? 'Wprowadź nowe hasło spełniające nowoczesne wymagania.'
							: 'Wpisz swój adres email, aby otrzymać link do zmiany hasła.'
					}}
				</p>
			</div>

			<UAlert
				v-if="resetError === 'INVALID_TOKEN'"
				variant="soft"
				color="error"
				title="Link jest nieaktualny"
				description="Wygeneruj nowy link do zmiany hasła, aby kontynuować."
				class="mb-4"
			/>

			<UForm
				v-if="!hasValidToken"
				:schema="requestSchema"
				:state="requestState"
				class="flex flex-col items-center gap-4"
				@submit="handleRequestSubmit"
			>
				<UFormField label="Email" name="email" class="w-full">
					<UInput
						v-model="requestState.email"
						type="email"
						placeholder="Adres email"
						class="w-full"
						required
						autocomplete="email"
					/>
					<NuxtTurnstile v-model="turnstile" class="mt-4" />
				</UFormField>

				<UButton
					type="submit"
					:disabled="!turnstile"
					:loading="isRequesting"
					class="w-full cursor-pointer justify-center"
				>
					Wyślij link resetujący
				</UButton>
			</UForm>

			<UForm
				v-else
				:schema="resetSchema"
				:state="resetState"
				class="flex flex-col items-center gap-4"
				@submit="handleResetSubmit"
			>
				<UFormField label="Nowe hasło" name="password" class="w-full">
					<UInput
						v-model="resetState.password"
						placeholder="Nowe hasło"
						class="w-full"
						:type="showPassword ? 'text' : 'password'"
						:ui="{ trailing: 'pe-1' }"
						required
						autocomplete="new-password"
					>
						<template #trailing>
							<UButton
								variant="link"
								size="sm"
								color="neutral"
								:icon="showPassword ? 'lucide:eye-off' : 'lucide:eye'"
								:aria-label="showPassword ? 'Schowaj hasło' : 'Pokaż hasło'"
								:aria-pressed="showPassword"
								aria-controls="new-password"
								@click="showPassword = !showPassword"
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
									:name="requirement.passed ? 'lucide:check' : 'lucide:x'"
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
						v-model="resetState.confirmPassword"
						placeholder="Powtórz hasło"
						class="w-full"
						:type="showPassword ? 'text' : 'password'"
						required
						autocomplete="new-password"
					/>
				</UFormField>

				<UButton
					type="submit"
					:loading="isResetting"
					class="w-full cursor-pointer justify-center"
				>
					Ustaw nowe hasło
				</UButton>
			</UForm>

			<div class="mt-4 flex flex-col items-center text-sm text-neutral-500">
				<template v-if="hasValidToken">
					<p>
						Pamiętaj, aby zachować poufność hasła. Po zmianie możesz się
						zalogować ponownie.
					</p>
				</template>
				<template v-else>
					<p>
						Na link możesz czekać kilka minut. Sprawdź folder spam, jeśli
						wiadomość nie dotarła.
					</p>
				</template>
			</div>
		</div>
		<div class="flex gap-4 text-neutral-500">
			<ULink to="/login">Powrót do logowania</ULink>
		</div>
	</div>
</template>
