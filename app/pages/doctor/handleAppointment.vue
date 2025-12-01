<script lang="ts" setup>
	import type { StepperItem } from '@nuxt/ui';
	import { computed, ref } from 'vue';
	import * as z from 'zod';

	definePageMeta({
		layout: 'docs',
	});

	useHead({
		title: 'Panel doktora',
	});

	const toast = useToast();

	const schema = z.object({
		visitGoal: z.string().min(1, 'Cel wizyty jest wymagany'),
		symptoms: z.string().optional(),
		diagnosisDescription: z.string().optional(),
		prescribedMedications: z.string().optional(),
		recommendations: z.string().optional(),
		proceduresPerformed: z.string().optional(),
	});
	type Schema = z.output<typeof schema>;
	const schemaState = ref<Schema>({
		visitGoal: '',
		symptoms: '',
		diagnosisDescription: '',
		prescribedMedications: '',
		recommendations: '',
		proceduresPerformed: '',
	});

	const visitSteps: StepperItem[] = [
		{
			id: 1,
			title: 'Cel wizity i opis objawów',
			description: 'Krok 1',
			icon: 'carbon:user',
		},
		{
			id: 2,
			title: 'Załącz wyniki badań',
			description: 'Krok 2',
			icon: 'carbon:document-add',
		},
		{
			id: 3,
			title: 'Diagnoza',
			description: 'Krok 3',
			icon: 'carbon:stethoscope',
		},
		{
			id: 4,
			title: 'Recepta',
			description: 'Krok 4',
			icon: 'carbon:pills',
		},
		{
			id: 5,
			title: 'Zalecenia',
			description: 'Krok 5',
			icon: 'carbon:notebook-reference',
		},
		{
			id: 6,
			title: 'Wykonane procedury',
			description: 'Krok 6',
			icon: 'carbon:process',
		},
		{
			id: 7,
			title: 'Podsumowanie wizyty',
			description: 'Krok 7',
			icon: 'carbon:checkbox-checked',
		},
	];

	const currentStep = ref(1);

	const activeStep = computed({
		get: () => currentStep.value - 1,
		set: (index: number) => {
			currentStep.value = index + 1;
		},
	});

	const goNext = () => {
		if (currentStep.value < visitSteps.length) currentStep.value++;
	};

	const goPrev = () => {
		if (currentStep.value > 1) currentStep.value--;
	};
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel obsługi wizyty"
			description="Obsługa wizyty krok po kroku."
		/>
		<h1 class="text-2xl font-bold">
			Krok {{ currentStep }}: {{ visitSteps[currentStep - 1]?.title }}
		</h1>
		<UStepper v-model="activeStep" :items="visitSteps" class="w-full">
			<template #content="{ item }">
				<UCard>
					<div class="mb-4">content (krok {{ item.id }})</div>

					<!-- CONTENT GOES HERE -->
					<section v-if="item.id === 1" class="flex flex-col gap-3">
						<div class="flex w-full flex-col items-center gap-3"></div>
					</section>

					<div class="flex flex-row justify-between gap-3">
						<UButton
							label="Cofnij"
							variant="outline"
							color="neutral"
							class="w-full cursor-pointer"
							:disabled="currentStep === 1"
							@click="goPrev"
						/>
						<UButton
							label="Dalej"
							color="info"
							class="w-full cursor-pointer"
							:disabled="currentStep === visitSteps.length"
							@click="goNext"
						/>
					</div>
				</UCard>
			</template>
		</UStepper>
	</PageContainer>
</template>
