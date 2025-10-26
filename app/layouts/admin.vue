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
				icon: 'i-lucide-house',
				active: route.path === '/admin/home',
				to: '/admin/home',
			},
			{
				label: 'Pacjenci',
				icon: 'i-lucide-user',
				badge: '0',
				active: route.path === '/admin/patients',
				to: '/admin/patients',
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
					},
					{
						label: 'Logi aktywności',
						icon: 'i-lucide-logs',
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
		<UDashboardGroup class="flex-1">
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
							class="w-full"
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
			<UContainer class="mx-auto flex min-h-screen w-full px-6 py-8">
				<slot />
			</UContainer>
		</UDashboardGroup>
	</UApp>
</template>
