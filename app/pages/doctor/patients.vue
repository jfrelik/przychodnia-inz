<script lang="ts" setup>
	definePageMeta({
		layout: 'docs',
	});

	useHead({
		title: 'Panel doktora',
	});

	const toast = useToast();
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel pacjentów"
			description="Przeglądaj informacje o swoich pacjentach."
		/>
		<UCard :ui="{ body: 'p-6' }">content</UCard>
	</PageContainer>
</template>
