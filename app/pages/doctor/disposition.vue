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
			title="Panel dyspozycji"
			description="Wprowadź dyspozycje na najbliższy podany okres."
		/>
		<UCard :ui="{ body: 'p-6' }">content</UCard>
	</PageContainer>
</template>
