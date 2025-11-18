<script lang="ts" setup>
	import type { CalendarDate } from '@internationalized/date';
	import { getLocalTimeZone, today } from '@internationalized/date';
	import * as z from 'zod';

	definePageMeta({
		layout: 'user',
	});

	useHead({
		title: 'Panel pacjenta',
	});

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
		'Informacje dodatkowe',
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

	// selected visit id
	const selectedVisitId = ref<number | null>(null);

	const availableVisits = [
		{
			id: 1,
			date: 'Wtorek, 12 marca',
			time: '09:30',
			doctor: 'dr n. med. Anna Kowalska',
			specialization: 'Kardiologia',
			location: 'Gabinet 201 · ul. Lipowa 10',
		},
		{
			id: 2,
			date: 'Czwartek, 14 marca',
			time: '12:15',
			doctor: 'dr Tomasz Nowak',
			specialization: 'Dermatologia',
			location: 'Gabinet 104 · ul. Lipowa 10',
		},
		{
			id: 3,
			date: 'Piątek, 15 marca',
			time: '15:45',
			doctor: 'dr Katarzyna Zielińska',
			specialization: 'Pediatria',
			location: 'Gabinet 305 · ul. Lipowa 10',
		},
	];

	const tz = getLocalTimeZone();
	const todayDate = today(tz);

	const selectedVisitDateRange = ref({
		start: todayDate,
		end: todayDate.add({ weeks: 1 }),
	});

	// disable every date before today
	const unavailableDates = (date: CalendarDate) => {
		return date.compare(todayDate) < 0;
	};

	// toggle selection of visit
	const selectVisit = (id: number) => {
		if (selectedVisitId.value === id) {
			// clicking the same = unselect
			selectedVisitId.value = null;
		} else {
			selectedVisitId.value = id;
		}
	};

	function incrementStep() {
		// on step 3 user must have picked a visit
		if (currentStep.value === 3 && selectedVisitId.value === null) {
			return;
		}

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
	<PageContainer>
		<PageHeader
			title="Panel pacjenta"
			description="Witamy w panelu pacjenta. Wpisz opis."
		/>
		<div class="flex w-full flex-col gap-4">
			<div class="m-4 flex flex-col">info at the top of page</div>

			<div class="flex w-full flex-col items-center gap-4">
				<h1 class="text-2xl font-bold">
					Krok {{ currentStep }}: {{ visitSignupStep[currentStep - 1] }}
				</h1>

				<UForm
					:schema="schema"
					:state="schemaState"
					class="mb-4 flex w-full flex-col gap-4"
				>
					<!-- STEP 1 -->
					<div
						v-if="currentStep >= 1"
						class="mx-auto flex w-1/2 flex-col gap-4"
					>
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
							:disabled="schemaState.specialization == ''"
							label="Zatwierdź"
							color="info"
							@click="incrementStep"
						/>
					</div>

					<!-- STEP 2 -->
					<div v-if="currentStep >= 2" class="bg-info-100 w-full py-4">
						<div class="mx-auto flex w-1/2 flex-col gap-4">
							<div class="grid w-full grid-cols-2 gap-12">
								<div class="flex w-full flex-col gap-4">
									<p class="font-semibold">Wybierz rodzaj wizyty:</p>
									<UFormField label="Rodzaj wizyty" name="visitType">
										<USelect
											v-model="schemaState.visitType"
											:disabled="currentStep === 2 ? false : true"
											:items="visitTypes.map((v) => v.name)"
											placeholder="Wybierz rodzaj wizyty"
											class="w-full cursor-pointer"
										/>
									</UFormField>
								</div>

								<div class="flex w-full flex-col gap-4">
									<h1 class="font-semibold">Opis rodzaju wizyty:</h1>
									<p v-if="schemaState.visitType !== ''">
										{{ selectedVisitTypeDescription }}
									</p>
								</div>
							</div>

							<div v-if="currentStep === 2" class="grid grid-cols-2 gap-12">
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
									:disabled="schemaState.visitType === '' ? true : false"
									@click="incrementStep"
								/>
							</div>
						</div>
					</div>

					<!-- STEP 3 -->
					<div v-if="currentStep >= 3" class="w-full py-4">
						<div class="mx-auto flex w-1/2 flex-col gap-4">
							<p class="font-semibold">Znajdź termin swojej wizyty:</p>
							<div class="flex flex-col items-center gap-4">
								<!-- @vue-ignore -->
								<UCalendar
									v-model="selectedVisitDateRange"
									range
									class="w-1/2"
									:disabled="currentStep === 3 ? false : true"
									:is-date-unavailable="unavailableDates"
								/>

								<UButton
									label="Szukaj wizyty"
									icon="carbon:search"
									:disabled="currentStep === 3 ? false : true"
									class="w-1/2 cursor-pointer justify-center"
								/>
							</div>

							<div class="flex flex-col items-center gap-4">
								<div class="w-full space-y-4">
									<UCard
										v-for="visit in availableVisits"
										:key="visit.id"
										:class="[
											'',
											selectedVisitId === visit.id
												? 'border-green-400 bg-green-50 ring-2 ring-green-200'
												: 'border-gray-200',
										]"
									>
										<div
											class="flex flex-row items-center justify-between gap-3"
										>
											<div class="flex flex-col">
												<p class="text-lg font-semibold text-gray-900">
													{{ visit.date }} · {{ visit.time }}
												</p>
												<p class="text-sm text-gray-600">
													{{ visit.specialization }}
												</p>
												<p class="text-sm text-gray-600">
													<span class="font-medium text-gray-900">
														{{ visit.doctor }}
													</span>
													· {{ visit.location }}
												</p>
											</div>
											<UButton
												size="sm"
												:color="
													selectedVisitId === visit.id ? 'success' : 'info'
												"
												class="w-full cursor-pointer justify-center md:w-auto"
												:label="
													selectedVisitId === visit.id
														? 'Anuluj wybór'
														: 'Wybierz termin'
												"
												:disabled="currentStep === 3 ? false : true"
												@click="selectVisit(visit.id)"
											/>
										</div>
									</UCard>
								</div>
							</div>

							<div v-if="currentStep === 3" class="grid grid-cols-2 gap-12">
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
									:disabled="selectedVisitId === null"
									@click="incrementStep"
								/>
							</div>
						</div>
					</div>

					<!-- STEP 4 -->
					<div v-if="currentStep >= 4" class="bg-info-100 w-full py-4">
						<div class="mx-auto flex w-1/2 flex-col gap-4">
							test4
							<div v-if="currentStep === 4" class="grid grid-cols-2 gap-12">
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
					</div>

					<!-- STEP 5 -->
					<div v-if="currentStep >= 5" class="w-full py-4">
						<div class="mx-auto flex w-1/2 flex-col gap-4">
							test5
							<div v-if="currentStep === 5" class="grid grid-cols-2 gap-12">
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
					</div>
				</UForm>
			</div>
		</div>
		<PageFooter />
	</PageContainer>
</template>

<style></style>
