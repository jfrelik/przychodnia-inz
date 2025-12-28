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
				label: 'Strona główna',
				icon: 'i-lucide-house',
				active: route.path === '/admin/home',
				to: '/admin/home',
			},
			{
				label: 'Pacjenci',
				icon: 'i-lucide-user',
				to: '/admin/patients',
				active: route.path === '/admin/patients',
			},
			{
				label: 'Wizyty',
				icon: 'i-lucide-calendar',
				to: '/admin/appointments',
				active: route.path === '/admin/appointments',
			},
			{
				label: 'Recepcjoniści',
				icon: 'i-lucide-clipboard-list',
				to: '/admin/receptionists',
				active: route.path === '/admin/receptionists',
			},
			{
				label: 'Lekarze',
				icon: 'i-lucide-syringe',
				defaultOpen: false,
				class: 'cursor-pointer',
				children: [
					{
						label: 'Lista lekarzy',
						active: route.path === '/admin/doctors',
						to: '/admin/doctors',
					},
					{
						label: 'Specjalizacje',
						active: route.path === '/admin/specializations',
						to: '/admin/doctors/specializations',
					},
				],
			},
			{
				label: 'Ustawienia',
				icon: 'i-lucide-settings',
				defaultOpen: false,
				class: 'cursor-pointer',
				children: [
					{
						label: 'Administratorzy',
						active: route.path === '/admin/admins',
						to: '/admin/admins',
					},
					{
						label: 'Gabinety',
						active: route.path === '/admin/rooms',
						to: '/admin/rooms',
					},
					{
						label: 'Logi aktywności',
						active: route.path === '/admin/logs',
						to: '/admin/logs',
					},
				],
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
					<div class="flex w-full items-center gap-3">
						<div v-if="!collapsed" class="flex items-center gap-3">
							<img class="h-5 w-auto shrink-0" src="/hospital.png" />
							Przychodnia
						</div>
						<UTooltip
							:text="collapsed ? 'Rozwiń menu' : 'Zwiń menu'"
							:content="{ side: 'right', sideOffset: 8 }"
						>
							<UDashboardSidebarCollapse
								:class="!collapsed && 'ml-auto'"
								class="cursor-pointer"
							/>
						</UTooltip>
					</div>
				</template>

				<template #default="{ collapsed }">
					<UNavigationMenu
						:collapsed="collapsed"
						:items="items[0]"
						orientation="vertical"
						tooltip
						popover
					/>
				</template>

				<template #footer="{ collapsed }">
					<div>
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
							:label="collapsed ? undefined : 'Pomoc i dokumentacja'"
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
				<div class="mb-4 flex items-center gap-2 lg:hidden">
					<UTooltip text="Menu" :content="{ side: 'bottom', sideOffset: 8 }">
						<UDashboardSidebarToggle class="cursor-pointer border" />
					</UTooltip>
				</div>
				<slot />
			</UContainer>
		</UDashboardGroup>
	</UApp>
</template>
