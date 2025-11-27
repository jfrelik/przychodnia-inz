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
			title="Panel doktora"
			description="Witamy w panelu doktora. Wpisz opis."
		/>
		<UCard :ui="{ body: 'p-6' }">content</UCard>
	</PageContainer>
</template>
