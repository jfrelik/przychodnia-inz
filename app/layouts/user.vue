<script lang="ts" setup>
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
				label: 'Strona Główna',
				icon: 'lucide:home',
				class: 'cursor-pointer',
				active: route.path === '/user/home',
				to: '/user/home',
			},
			{
				label: 'Wizyty',
				icon: 'lucide:calendar',
				class: 'cursor-pointer',
				active: route.path === '/user/visits',
				to: '/user/visits',
			},
			{
				label: 'Recepty',
				icon: 'lucide:pill',
				class: 'cursor-pointer',
				active: route.path === '/user/prescriptions',
				to: '/user/prescriptions',
			},
			{
				label: 'Wyniki Badań',
				icon: 'lucide:file',
				class: 'cursor-pointer',
				active: route.path === '/user/testResults',
				to: '/user/testResults',
			},
			{
				label: 'Zalecenia Lekarskie',
				icon: 'lucide:message-square',
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
				class="hidden lg:flex"
				:ui="{ footer: 'border-t border-default' }"
			>
				<template #header>
					<div class="flex w-full items-center gap-3">
						<img class="h-5 w-auto shrink-0" src="/hospital.png" />
						Przychodnia
					</div>
				</template>

				<template #default>
					<UButton
						label="Umów wizytę"
						icon="lucide:calendar-plus"
						class="cursor-pointer justify-center"
						to="/user/newAppointment"
					/>
					<UNavigationMenu :items="items[0]" orientation="vertical" />
				</template>

				<template #footer>
					<div class="flex flex-col gap-2">
						<div class="flex justify-end">
							<FontSizeSelector :collapsed="false" />
						</div>

						<UButton
							label="Wyloguj się"
							color="neutral"
							variant="ghost"
							class="w-full cursor-pointer"
							icon="lucide:log-out"
							@click="handleSignout"
						/>

						<UButton
							:label="`Wersja ${runtimeConfig.public.appVersion}`"
							color="neutral"
							variant="ghost"
							class="w-full"
							icon="lucide:code"
							disabled
						/>
					</div>
				</template>
			</UDashboardSidebar>

			<!-- Mobile sidebar -->
			<UDashboardSidebar
				collapsible
				class="lg:hidden"
				:ui="{ footer: 'border-t border-default' }"
			>
				<template #header="{ collapsed }">
					<div class="flex w-full items-center gap-3">
						<div v-if="!collapsed" class="flex items-center gap-3">
							<img class="h-5 w-auto shrink-0" src="/hospital.png" />
							Przychodnia
						</div>
						<UIcon
							v-else
							name="lucide:hospital"
							class="text-primary mx-auto size-5"
						/>
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
					<UButton
						label="Umów wizytę"
						icon="lucide:calendar-plus"
						class="cursor-pointer justify-center"
						to="/user/newAppointment"
					/>
					<UNavigationMenu
						:collapsed="collapsed"
						:items="items[0]"
						orientation="vertical"
						tooltip
						popover
					/>
				</template>

				<template #footer="{ collapsed }">
					<div class="flex flex-col gap-2">
						<FontSizeSelector
							:collapsed="collapsed ?? false"
							popover-side="top"
						/>

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
							:label="
								collapsed
									? undefined
									: `Wersja ${runtimeConfig.public.appVersion}`
							"
							color="neutral"
							variant="ghost"
							class="w-full"
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

<style></style>
