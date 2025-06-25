<script setup lang="ts">
	import type { NavigationMenuItem } from '@nuxt/ui';

	const items = ref<NavigationMenuItem[][]>([
		[
			{
				label: 'Strona główna',
				icon: '',
				to: '/',
			},
			{
				label: 'Kontakt',
				icon: '',
				to: '/kontakt',
			},
			{
				label: 'Dojazd',
				icon: '',
				to: '/dojazd',
			},
		],
		[
			{
				label: 'Zaloguj',
				icon: '',
				to: '/login',
			},
		],
	]);
</script>

<template>
	<UNavigationMenu color="primary" :items="items" class="w-full" />
</template>

<style></style>
