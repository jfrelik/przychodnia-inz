<script setup lang="ts">
	useHead({ title: 'Weryfikacja adresu e-mail' });

	const route = useRoute();
	const tokenParam = computed(() => route.query.token);

	const { data, pending, status, error } = await useLazyFetch(
		'/api/auth/verify-email',
		{
			server: false,
			query: {
				token: tokenParam.value,
			},
		}
	);
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
								v-if="pending"
								name="lucide:loader-2"
								class="animate-spin text-xl"
							/>
							<template v-else>
								<Icon
									v-if="status === 'success'"
									name="lucide:check-circle"
									class="text-3xl"
								/>
								<Icon
									v-if="status === 'error'"
									name="lucide:alert-octagon"
									class="text-3xl"
								/>
							</template>
						</div>
						<div class="space-y-1">
							<h1
								v-if="data?.emailVerified === true"
								class="text-xl font-semibold text-neutral-600"
							>
								Adres e-mail został pomyślnie zweryfikowany.
							</h1>
							<h1
								v-else-if="data?.emailVerified === false || status === 'error'"
								class="text-xl font-semibold text-neutral-600"
							>
								Adres e-mail nie został zweryfikowany.
							</h1>

							<p v-if="error?.data?.message" class="text-xs text-neutral-500">
								{{ error?.data?.message }}
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
						<span class="lucide:loader-2 animate-spin" />
						<span>Proszę czekać...</span>
					</div>
				</div>
			</UCard>
		</ClientOnly>
	</PageContainer>
</template>
