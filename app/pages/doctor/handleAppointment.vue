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
			title="Panel obsługi wizyty"
			description="Tutaj możesz obsłużyć wizytę pacjenta."
		/>
		<UCard :ui="{ body: 'p-6' }">content</UCard>
	</PageContainer>
</template>
