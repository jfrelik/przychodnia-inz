<script lang="ts" setup>
	import type { FormSubmitEvent, StepperItem } from '@nuxt/ui';
	import { computed, ref } from 'vue';
	import * as z from 'zod';

	definePageMeta({
		layout: 'docs',
	});

	useHead({
		title: 'Panel doktora',
	});

	const toast = useToast();

	const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
	const ACCEPTED_FILE_TYPES = ['application/pdf'];

	const formatBytes = (bytes: number, decimals = 2) => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return (
			Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
		);
	};

	const schema = z.object({
		visitGoal: z.string().min(1, 'Cel wizyty jest wymagany'),
		symptoms: z.string().optional(),
		diagnosisDescription: z.string().optional(),
		prescribedMedications: z.string().optional(),
		recommendations: z.string().optional(),
		proceduresPerformed: z.string().optional(),
		examResultsFile: z
			.instanceof(File, {
				message: 'Dodaj plik z wynikami badań (PDF).',
			})
			.refine((file) => file.size <= MAX_FILE_SIZE, {
				message: `Plik jest za duży. Maksymalny rozmiar to ${formatBytes(MAX_FILE_SIZE)}.`,
			})
			.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), {
				message: 'Dozwolone są tylko pliki PDF.',
			})
			.optional(),
	});

	type Schema = z.output<typeof schema>;

	const schemaState = ref<Schema>({
		visitGoal: '',
		symptoms: '',
		diagnosisDescription: '',
		prescribedMedications: '',
		recommendations: '',
		proceduresPerformed: '',
		examResultsFile: undefined,
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

	async function handleSubmit(event: FormSubmitEvent<Schema>) {
		try {
			// TODO: submit logic
			console.log(event.data);
		} catch (error) {
			// TODO: error handling
			console.error(error);
		}
	}
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
				<UForm :schema="schema" :state="schemaState">
					<UCard :ui="{ body: 'p-6' }">
						<!-- Step1: Cel wizyty i opis objawów -->
						<section
							v-if="item.id === 1"
							class="mb-3 flex w-full justify-center"
						>
							<div class="mx-auto flex w-1/2 flex-col gap-3">
								<UFormField
									name="visitGoal"
									label="Cel wizyty"
									description="Opisz cel wizyty podany przez pacjenta"
								>
									<UInput
										v-model="schemaState.visitGoal"
										placeholder="Opis powodu wizyty"
										class="w-full"
									/>
								</UFormField>

								<UFormField
									name="symptoms"
									label="Opis objawów"
									description="Opisz objawy podane przez pacjenta"
								>
									<UTextarea
										v-model="schemaState.symptoms"
										placeholder="Opis objawów"
										class="w-full"
										:rows="5"
									/>
								</UFormField>
							</div>
						</section>

						<!-- Step2: Załącz wyniki badań -->
						<section
							v-else-if="item.id === 2"
							class="mb-3 flex w-full justify-center"
						>
							<div class="mx-auto flex w-1/2 flex-col gap-3">
								<UFormField
									name="examResultsFile"
									label="Załącz wyniki badań"
									description="Dodaj plik PDF z wynikami badań pacjenta"
								>
									<UFileUpload
										v-model="schemaState.examResultsFile"
										accept="application/pdf"
										layout="list"
										size="xl"
										class="w-full"
										icon="carbon:document-attachment"
										description="Pliki .pdf, max 20MB"
									/>
								</UFormField>
							</div>
						</section>

						<!-- Step3: Diagnoza -->
						<section
							v-else-if="item.id === 3"
							class="mb-3 flex w-full justify-center"
						>
							<div class="mx-auto flex w-1/2 flex-col gap-3">
								<UFormField
									name="diagnosisDescription"
									label="Opis diagnozy"
									description="Opisz diagnozę postawioną pacjentowi"
								>
									<UTextarea
										v-model="schemaState.diagnosisDescription"
										placeholder="Opis diagnozy"
										class="w-full"
										:rows="5"
									/>
								</UFormField>
							</div>
						</section>

						<!-- Step4: Recepta -->
						<section
							v-else-if="item.id === 4"
							class="mb-3 flex w-full justify-center"
						>
							<div class="mx-auto flex w-1/2 flex-col gap-3">
								<UFormField
									name="prescribedMedications"
									label="Przepisane leki"
									description="Wypisz informacje o przepisanych lekach"
								>
									<UTextarea
										v-model="schemaState.prescribedMedications"
										placeholder="Nazwa leku, dawka, schemat przyjmowania"
										class="w-full"
										:rows="5"
									/>
								</UFormField>
							</div>
						</section>

						<!-- Step5: Zalecenia -->
						<section
							v-else-if="item.id === 5"
							class="mb-3 flex w-full justify-center"
						>
							<div class="mx-auto flex w-1/2 flex-col gap-3">
								<UFormField
									name="recommendations"
									label="Zalecenia dla pacjenta"
									description="Opisz zalecenia"
								>
									<UTextarea
										v-model="schemaState.recommendations"
										placeholder="Opisz zalecenia dla pacjenta"
										class="w-full"
										:rows="5"
									/>
								</UFormField>
							</div>
						</section>

						<!-- Step6: Wykonane procedury -->
						<section
							v-else-if="item.id === 6"
							class="mb-3 flex w-full justify-center"
						>
							<div class="mx-auto flex w-1/2 flex-col gap-3">
								<UFormField
									name="proceduresPerformed"
									label="Wykonane procedury"
									description="Wpisz wszystkie procedury wykonane w trakcie wizyty"
								>
									<UTextarea
										v-model="schemaState.proceduresPerformed"
										placeholder="Opisz wykonane procedury medyczne"
										class="w-full"
										:rows="5"
									/>
								</UFormField>
							</div>
						</section>

						<!-- Step7: Podsumowanie wizyty -->
						<section v-else-if="item.id === 7" class="mb-3 w-full">
							<div class="mx-auto flex w-full flex-col gap-4">
								<h2 class="text-lg font-semibold">Podsumowanie wizyty</h2>
								<p class="text-sm text-gray-500">
									Sprawdź poniższe informacje przed zakończeniem wizyty.
								</p>

								<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
									<!-- Kolumna 1 -->
									<div class="space-y-4">
										<div>
											<p class="text-xs font-semibold text-gray-500 uppercase">
												Cel wizyty
											</p>
											<p class="text-sm">
												{{ schemaState.visitGoal || 'Brak danych' }}
											</p>
										</div>

										<div>
											<p class="text-xs font-semibold text-gray-500 uppercase">
												Objawy
											</p>
											<p class="text-sm whitespace-pre-line">
												{{ schemaState.symptoms || 'Brak danych' }}
											</p>
										</div>

										<div>
											<p class="text-xs font-semibold text-gray-500 uppercase">
												Diagnoza
											</p>
											<p class="text-sm whitespace-pre-line">
												{{ schemaState.diagnosisDescription || 'Brak danych' }}
											</p>
										</div>
									</div>

									<!-- Kolumna 2 -->
									<div class="space-y-4">
										<div>
											<p class="text-xs font-semibold text-gray-500 uppercase">
												Wyniki badań
											</p>
											<p v-if="schemaState.examResultsFile" class="text-sm">
												{{ schemaState.examResultsFile.name }}
												({{ formatBytes(schemaState.examResultsFile.size) }})
											</p>
											<p v-else class="text-sm text-gray-400">
												Brak załączonych wyników badań
											</p>
										</div>

										<div>
											<p class="text-xs font-semibold text-gray-500 uppercase">
												Przepisane leki
											</p>
											<p class="text-sm whitespace-pre-line">
												{{ schemaState.prescribedMedications || 'Brak danych' }}
											</p>
										</div>

										<div>
											<p class="text-xs font-semibold text-gray-500 uppercase">
												Zalecenia
											</p>
											<p class="text-sm whitespace-pre-line">
												{{ schemaState.recommendations || 'Brak danych' }}
											</p>
										</div>

										<div>
											<p class="text-xs font-semibold text-gray-500 uppercase">
												Wykonane procedury
											</p>
											<p class="text-sm whitespace-pre-line">
												{{ schemaState.proceduresPerformed || 'Brak danych' }}
											</p>
										</div>
									</div>
								</div>
							</div>
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
								v-if="currentStep !== 7"
								label="Dalej"
								color="info"
								class="w-full cursor-pointer"
								:disabled="currentStep === visitSteps.length"
								@click="goNext"
							/>
							<UButton
								v-if="currentStep === 7"
								label="Zatwierdź i zakończ wizytę"
								color="success"
								class="w-full cursor-pointer"
								submit
							/>
						</div>
					</UCard>
				</UForm>
			</template>
		</UStepper>
	</PageContainer>
</template>
