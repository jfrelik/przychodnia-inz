<script lang="ts" setup>
	const runtimeConfig = useRuntimeConfig();
</script>

<template>
	<div
		class="z-10 flex flex-col items-center gap-y-1 bg-black px-8 py-4 text-gray-400"
	>
		<p class="text-sm font-light">
			Projekt wykonany w ramach pracy inżynierskiej przez Jakuba Frelika i
			Macieja Cynkara
		</p>
		<p class="font-mono text-xs text-slate-400">
			V{{ runtimeConfig.public.appVersion }}
		</p>
	</div>
</template>
