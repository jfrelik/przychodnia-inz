<script lang="ts" setup>
	import { pl } from '@nuxt/ui/locale';
</script>

<template>
	<UApp :locale="pl">
		<div class="max-w flex items-center justify-center">
			<slot />
		</div>
	</UApp>
</template>
