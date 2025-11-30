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
			title="Panel wizyt"
			description="Przeglądaj informacje o nadchodzących i przeszłych wizytach."
		/>
		<UCard :ui="{ body: 'p-6' }">content</UCard>
	</PageContainer>
</template>
