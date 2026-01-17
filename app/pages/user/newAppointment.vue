<script lang="ts" setup>
	definePageMeta({
		layout: 'user',
	});

	useHead({
		title: 'Umawianie wizyty',
	});
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Umawianie wizyty"
			description="Umów konsultację w kilku krokach."
		/>
		<ClientOnly>
			<AppointmentBookingForm api-base-path="/api/patient" />
		</ClientOnly>
	</PageContainer>
</template>
