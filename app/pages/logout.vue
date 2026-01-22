<script setup lang="ts">
	import { authClient } from '~~/lib/auth-client';

	useHead({ title: 'Wylogowanie' });

	const status = ref<'pending' | 'success' | 'error'>('pending');
	const errorMessage = ref<string | null>(null);

	onMounted(async () => {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					status.value = 'success';
				},
				onError: (error) => {
					status.value = 'error';
					errorMessage.value =
						error instanceof Error ? error.message : 'Wystąpił nieznany błąd';
				},
			},
		});
	});
</script>

<template>
	<PageContainer class="flex min-h-screen items-center justify-center p-4">
		<ClientOnly>
			<UCard class="w-full max-w-lg" :ui="{ body: 'space-y-4 p-6' }">
				<div v-auto-animate class="flex flex-col gap-4">
					<div class="flex items-center gap-3">
						<div
							:class="[
								'flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md transition-all duration-300',
								status === 'success'
									? 'scale-105 bg-green-500'
									: status === 'error'
										? 'scale-105 bg-red-500'
										: 'bg-primary-500 animate-pulse',
							]"
						>
							<Icon
								v-if="status === 'pending'"
								name="lucide:loader-2"
								class="animate-spin text-xl"
							/>
							<Icon
								v-else-if="status === 'success'"
								name="lucide:check-circle"
								class="text-3xl"
							/>
							<Icon
								v-else-if="status === 'error'"
								name="lucide:alert-octagon"
								class="text-3xl"
							/>
						</div>
						<div class="space-y-1">
							<h1
								v-if="status === 'pending'"
								class="text-xl font-semibold text-neutral-600"
							>
								Wylogowywanie...
							</h1>
							<h1
								v-else-if="status === 'success'"
								class="text-xl font-semibold text-neutral-600"
							>
								Wylogowano pomyślnie
							</h1>
							<h1
								v-else-if="status === 'error'"
								class="text-xl font-semibold text-neutral-600"
							>
								Błąd wylogowania
							</h1>

							<p v-if="errorMessage" class="text-xs text-neutral-500">
								{{ errorMessage }}
							</p>
						</div>
					</div>

					<div v-if="status !== 'pending'" class="flex flex-wrap gap-3">
						<UButton
							color="primary"
							to="/login"
							variant="solid"
							icon="lucide:log-in"
						>
							Przejdź do logowania
						</UButton>
						<UButton variant="soft" to="/" icon="lucide:home">
							Strona główna
						</UButton>
					</div>
					<div v-else class="flex items-center gap-2 text-sm text-neutral-500">
						<span>Proszę czekać...</span>
					</div>
				</div>
			</UCard>
		</ClientOnly>
	</PageContainer>
</template>
