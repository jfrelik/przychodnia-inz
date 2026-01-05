<script lang="ts" setup>
	import { useToast } from '#imports';
	import type { NavigationMenuItem } from '@nuxt/ui';
	import { pl } from '@nuxt/ui/locale';
	import { authClient } from '~~/lib/auth-client';

	const route = useRoute();
	const runtimeConfig = useRuntimeConfig();
	const toast = useToast();

	const handleSignout = async () => {
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						toast.add({
							title: 'Wylogowano',
							description: 'Proces wylogowywania powiódł się',
							color: 'success',
							icon: 'carbon:checkmark',
						});
						navigateTo('/');
					},
				},
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			toast.add({
				title: 'Błąd wylogowania',
				description: 'Błąd: ' + message,
				color: 'error',
				icon: 'carbon:error',
			});
		}
	};

	const items = computed<NavigationMenuItem[][]>(() => [
		[
			{
				label: 'Strona Główna',
				icon: 'carbon:home',
				class: 'cursor-pointer',
				active: route.path === '/user/home',
				to: '/user/home',
			},
			{
				label: 'Wizyty',
				icon: 'carbon:calendar',
				class: 'cursor-pointer',
				active: route.path === '/user/visits',
				to: '/user/visits',
			},
			{
				label: 'Recepty',
				icon: 'carbon:pills',
				class: 'cursor-pointer',
				active: route.path === '/user/prescriptions',
				to: '/user/prescriptions',
			},
			{
				label: 'Wyniki Badań',
				icon: 'carbon:document',
				class: 'cursor-pointer',
				active: route.path === '/user/testResults',
				to: '/user/testResults',
			},
			{
				label: 'Porady Lekarskie',
				icon: 'carbon:user-feedback',
				class: 'cursor-pointer',
				active: route.path === '/user/recommendations',
				to: '/user/recommendations',
			},
		],
	]);
</script>

<template>
	<UApp :locale="pl">
		<UDashboardGroup class="flex h-screen min-h-0">
			<UDashboardSidebar
				collapsible
				:ui="{ footer: 'border-t border-default' }"
			>
				<template #header="{ collapsed }">
					<div v-if="!collapsed" class="flex items-center gap-3">
						<img class="h-5 w-auto shrink-0" src="/hospital.png" />
						Przychodnia
					</div>
					<UIcon
						v-else
						name="i-simple-icons-nuxtdotjs"
						class="text-primary mx-auto size-5"
					/>
				</template>

				<template #default="{ collapsed }">
					<UButton
						label="Umów wizytę"
						icon="carbon:calendar-add"
						class="cursor-pointer justify-center"
						to="/user/newAppointment"
					/>
					<UNavigationMenu
						:collapsed="collapsed"
						:items="items[0]"
						orientation="vertical"
					/>
				</template>

				<template #footer="{ collapsed }">
					<div class="">
						<UButton
							:label="collapsed ? undefined : 'Wyloguj się'"
							color="neutral"
							variant="ghost"
							class="w-full cursor-pointer"
							:block="collapsed"
							icon="i-lucide-log-out"
							@click="handleSignout"
						/>
						<UButton
							:label="collapsed ? undefined : 'Pomoc i Dokumentacja'"
							color="neutral"
							variant="ghost"
							class="mt-2 w-full"
							:block="collapsed"
							icon="i-lucide-info"
							:to="'https://github.com/jfrelik/przychodnia-inz'"
							target="_blank"
						/>
						<UButton
							:label="
								collapsed
									? undefined
									: `Wersja ${runtimeConfig.public.appVersion}`
							"
							color="neutral"
							variant="ghost"
							class="mt-2 w-full"
							:block="collapsed"
							icon="i-lucide-code"
							disabled
						/>
					</div>
				</template>
			</UDashboardSidebar>
			<UContainer
				class="mx-auto flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto px-6 py-8"
			>
				<slot />
			</UContainer>
		</UDashboardGroup>
	</UApp>
</template>

<style></style>
