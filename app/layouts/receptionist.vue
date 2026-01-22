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
			await authClient.signOut();
			toast.add({
				title: 'Wylogowano',
				description: 'Proces wylogowywania powiódł się',
				color: 'success',
				icon: 'lucide:check',
			});
			navigateTo('/login?logout=true', { replace: true });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			toast.add({
				title: 'Błąd wylogowania',
				description: 'Błąd: ' + message,
				color: 'error',
				icon: 'lucide:circle-x',
			});
		}
	};

	const items = computed<NavigationMenuItem[][]>(() => [
		[
			{
				label: 'Strona główna',
				icon: 'lucide:home',
				active: route.path === '/receptionist/home',
				to: '/receptionist/home',
			},
			{
				label: 'Pacjenci',
				icon: 'lucide:user',
				active: route.path.startsWith('/receptionist/patients'),
				to: '/receptionist/patients',
			},
			{
				label: 'Lekarze',
				icon: 'lucide:users',
				active: route.path.startsWith('/receptionist/doctors'),
				to: '/receptionist/doctors',
			},
			{
				label: 'Dzisiejsze wizyty',
				icon: 'lucide:badge-check',
				active: route.path.startsWith('/receptionist/visits/today'),
				to: '/receptionist/visits/today',
			},
			{
				label: 'Przypisywanie pokoi',
				icon: 'lucide:file-cog',
				active: route.path.startsWith('/receptionist/assignRoom'),
				to: '/receptionist/assignRoom',
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
						name="lucide:hospital"
						class="text-primary mx-auto size-5"
					/>
				</template>

				<template #default="{ collapsed }">
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
							icon="lucide:log-out"
							@click="handleSignout"
						/>
						<UButton
							:label="collapsed ? undefined : 'Pomoc i Dokumentacja'"
							color="neutral"
							variant="ghost"
							class="mt-2 w-full"
							:block="collapsed"
							icon="lucide:info"
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
							icon="lucide:code"
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
