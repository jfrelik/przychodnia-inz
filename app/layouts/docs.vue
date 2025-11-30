<script lang="ts" setup>
	import { useToast } from '#imports';
	import type { NavigationMenuItem } from '@nuxt/ui';
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
				active: route.path === '/doctor/home',
				to: '/doctor/home',
			},
			{
				label: 'Wizyty',
				icon: 'carbon:calendar',
				class: 'cursor-pointer',
				active: route.path === '/doctor/visits',
				to: '/doctor/visits',
			},
			{
				label: 'Pacjenci',
				icon: 'carbon:stethoscope',
				class: 'cursor-pointer',
				active: route.path === '/doctor/patients',
				to: '/doctor/patients',
			},
			{
				label: 'Dyspozycja',
				icon: 'carbon:calendar-heat-map',
				class: 'cursor-pointer',
				active: route.path === '/doctor/disposition',
				to: '/doctor/disposition',
			},
			{
				label: 'Badania',
				icon: 'carbon:document',
				class: 'cursor-pointer',
				active: route.path === '/doctor/testResults',
				to: '/doctor/testResults',
			},
		],
	]);
</script>

<template>
	<UApp>
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
						label="Obsłuż wizytę"
						icon="carbon:calendar-add"
						class="cursor-pointer justify-center"
						to="/doctor/handleAppointment"
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
