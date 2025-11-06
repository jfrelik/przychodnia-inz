<script lang="ts" setup>
	import * as z from 'zod';

	const toast = useToast();

	const schema = z.object({
		specialization: z
			.string()
			.min(1, 'Wybór specjalizacji jest wymagany do zarezerwowania wizyty'),
		visitType: z
			.string()
			.min(1, 'Wybór rodzaju wizyty jest wymagany do zarezerwowania wizyty'),
	});
	type Schema = z.output<typeof schema>;
	const schemaState = ref<Schema>({
		specialization: '',
		visitType: '',
	});

	const visitSignupStep = [
		'Wybór specjalizacji',
		'Wybór rodzaju wizyty',
		'Wybór terminu wizyty',
		'Dane dodatkowe',
		'Zatwierdzenie wizyty',
	];
	const currentStep = ref(1);

	const specializations = [
		{
			name: 'Kardiologia',
			description: 'Problemy z sercem, nadciśnienie, kołatania, duszność.',
		},
		{
			name: 'Dermatologia',
			description:
				'Zmiany skórne, trądzik, uczulenia, swędzenie, problemy z włosami lub paznokciami.',
		},
		{
			name: 'Pediatria',
			description:
				'Infekcje u dziecka, gorączka, bóle brzucha, kontrola rozwoju, szczepienia.',
		},
		{
			name: 'Ortopedia',
			description:
				'Bóle kręgosłupa lub stawów, urazy, skręcenia, ograniczona ruchomość.',
		},
		{
			name: 'Okulistyka',
			description:
				'Pogorszenie widzenia, pieczenie lub zaczerwienienie oczu, stany zapalne.',
		},
		{
			name: 'Neurologia',
			description:
				'Częste bóle lub zawroty głowy, drętwienia, zaburzenia równowagi, napady.',
		},
		{
			name: 'Stomatologia',
			description:
				'Ból zęba, ubytki, krwawienie dziąseł, potrzeba kontroli lub higienizacji.',
		},
	];

	const selectedSpecializationDescription = computed(
		() =>
			specializations.find(
				(specialization) =>
					specialization.name === schemaState.value.specialization
			)?.description ?? ''
	);

	const visitTypes = [
		{
			name: 'Wizyta w placówce',
			description: 'Wizyta odbywa się osobiście w placówce medycznej.',
		},
		{
			name: 'Konsultacja telefoniczna',
			description: 'Konsultacja odbywa się zdalnie, przez telefon.',
		},
	];

	const selectedVisitTypeDescription = computed(
		() =>
			visitTypes.find(
				(visitType) => visitType.name === schemaState.value.visitType
			)?.description ?? ''
	);

	function incrementStep() {
		if (currentStep.value < visitSignupStep.length) {
			currentStep.value++;
		}
	}

	function decrementStep() {
		if (currentStep.value > 1) {
			currentStep.value--;
		}
	}
</script>

<template>
	<div class="flex w-full flex-col">
		<PageHeader />
		<div class="flex w-full flex-col gap-4 p-4">
			<div>info at the top of page</div>
			<div class="flex w-full flex-col items-center gap-4">
				<h1 class="text-2xl font-bold">
					Krok {{ currentStep }}: {{ visitSignupStep[currentStep - 1] }}
				</h1>
				<UForm
					:schema="schema"
					:state="schemaState"
					class="flex w-1/2 flex-col gap-4"
				>
					<div v-if="currentStep >= 1" class="flex w-full flex-col gap-4">
						<div class="grid w-full grid-cols-2 gap-12">
							<div class="flex w-full flex-col justify-between gap-4">
								<p class="font-semibold">
									Wybierz specjalizację z poniższej listy:
								</p>
								<UFormField label="Specjalizacja" name="specialization">
									<USelect
										v-model="schemaState.specialization"
										:disabled="currentStep === 1 ? false : true"
										:items="specializations.map((s) => s.name)"
										placeholder="Wybierz specjalizację"
										class="w-full cursor-pointer"
									/>
								</UFormField>
							</div>
							<div class="flex w-full flex-col justify-between gap-4">
								<h1 class="font-semibold">Opis specjalizacji:</h1>
								<p v-if="schemaState.specialization !== ''">
									{{ selectedSpecializationDescription }}
								</p>
							</div>
						</div>

						<UButton
							v-if="currentStep === 1"
							class="w-full cursor-pointer justify-center"
							:disabled="schemaState.specialization == '' ? true : false"
							label="Zatwierdź"
							color="info"
							@click="incrementStep"
						/>
					</div>
					<div v-if="currentStep >= 2" class="flex w-full flex-col gap-4">
						test2
						<div v-if="currentStep === 2" class="grid grid-cols-2 gap-4">
							<UButton
								class="w-full cursor-pointer justify-center"
								label="Cofnij"
								variant="outline"
								color="neutral"
								@click="decrementStep"
							/>
							<UButton
								class="w-full cursor-pointer justify-center"
								label="Zatwierdź"
								color="info"
								@click="incrementStep"
							/>
						</div>
					</div>
					<div v-if="currentStep >= 3" class="flex w-full flex-col gap-4">
						test3
						<div v-if="currentStep === 3" class="grid grid-cols-2 gap-4">
							<UButton
								class="w-full cursor-pointer justify-center"
								label="Cofnij"
								variant="outline"
								color="neutral"
								@click="decrementStep"
							/>
							<UButton
								class="w-full cursor-pointer justify-center"
								label="Zatwierdź"
								color="info"
								@click="incrementStep"
							/>
						</div>
					</div>
					<div v-if="currentStep >= 4" class="flex w-full flex-col gap-4">
						test4
						<div v-if="currentStep === 4" class="grid grid-cols-2 gap-4">
							<UButton
								class="w-full cursor-pointer justify-center"
								label="Cofnij"
								variant="outline"
								color="neutral"
								@click="decrementStep"
							/>
							<UButton
								class="w-full cursor-pointer justify-center"
								label="Zatwierdź"
								color="info"
								@click="incrementStep"
							/>
						</div>
					</div>
					<div v-if="currentStep >= 5" class="flex w-full flex-col gap-4">
						test5
						<div v-if="currentStep === 5" class="grid grid-cols-2 gap-4">
							<UButton
								class="w-full cursor-pointer justify-center"
								label="Cofnij"
								variant="outline"
								color="neutral"
								@click="decrementStep"
							/>
							<!-- This button will trigger a popover or some shit idk -->
							<UButton
								class="w-full cursor-pointer justify-center"
								label="Zatwierdź"
								color="info"
								@click="incrementStep"
							/>
						</div>
					</div>
				</UForm>
			</div>
		</div>
		<PageFooter />
	</div>
</template>

<style></style>
