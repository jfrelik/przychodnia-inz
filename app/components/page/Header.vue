<script lang="ts" setup>
	defineProps({
		title: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
	});
</script>

<template>
	<div class="flex flex-col gap-2">
		<h1 class="text-3xl font-bold">{{ title }}</h1>
		<p class="text-neutral-500">{{ description }}</p>
	</div>
</template>
