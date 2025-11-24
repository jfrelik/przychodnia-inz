<script lang="ts" setup>
	import type { CalendarDate } from '@internationalized/date';
	import { getLocalTimeZone, today } from '@internationalized/date';
	import type { StepperItem } from '@nuxt/ui';
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

	const visitSignupStepper = [
		{
			slot: 'specializationChoice' as const,
			title: 'Wybór specjalizacji',
			icon: 'carbon:choices',
			id: 1,
		},
		{
			slot: 'visitTypeChoice' as const,
			title: 'Wybór rodzaju wizyty',
			icon: 'carbon:types',
			id: 2,
		},
		{
			slot: 'visitTimeChoice' as const,
			title: 'Wybór terminu wizyty',
			icon: 'carbon:calendar',
			id: 3,
		},
		{
			slot: 'confirmVisitDetails' as const,
			title: 'Zatwierdzenie wizyty',
			icon: 'carbon:checkbox-checked',
			id: 4,
		},
	] satisfies StepperItem[];

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

	const visitSteps: StepperItem[] = [
		{
			id: 1,
			title: 'Wybór specjalizacji',
			description: 'Podaj interesującą Cię specjalizację',
			icon: 'carbon:choices',
		},
		{
			id: 2,
			title: 'Rodzaj wizyty',
			description: 'Stacjonarna czy telefoniczna?',
			icon: 'carbon:types',
		},
		{
			id: 3,
			title: 'Termin',
			description: 'Wybierz datę i godzinę',
			icon: 'carbon:calendar',
		},
		{
			id: 4,
			title: 'Zatwierdzenie',
			description: 'Podsumowanie wizyty',
			icon: 'carbon:checkbox-checked',
		},
	];

	const activeStep = computed({
		get: () => currentStep.value - 1,
		set: (index: number) => {
			currentStep.value = index + 1;
		},
	});

	const goNext = () => {
		if (currentStep.value === 3 && !selectedVisitId.value) return;
		if (currentStep.value < visitSteps.length) currentStep.value++;
	};
	const goPrev = () => {
		if (currentStep.value > 1) currentStep.value--;
	};
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel pacjenta"
			description="Witamy w panelu pacjenta. Wpisz opis."
		/>

		<h1 class="text-2xl font-bold">
			Krok {{ currentStep }}: {{ visitSignupStep[currentStep - 1] }}
		</h1>

		<UStepper v-model="activeStep" :items="visitSteps" class="w-full" disabled>
			<template #content="{ item }">
				<UCard>
					<section v-if="item.id === 1" class="flex flex-col gap-3">
						<div class="flex w-full flex-col items-center gap-3">
							<UFormField
								label="Specjalizacja"
								name="specialization"
								class="w-1/2"
							>
								<USelect
									v-model="schemaState.specialization"
									:items="specializations.map((s) => s.name)"
									class="w-full cursor-pointer"
									placeholder="Wybierz specjalizację"
								/>
							</UFormField>
							<p v-if="schemaState.specialization !== ''">
								{{ selectedSpecializationDescription }}
							</p>
						</div>
						<div class="flex flex-row justify-between gap-3">
							<UButton
								label="Dalej"
								color="info"
								:disabled="!schemaState.specialization"
								class="w-full cursor-pointer"
								@click="goNext"
							/>
						</div>
					</section>

					<section v-else-if="item.id === 2" class="flex flex-col gap-3">
						<div class="flex w-full flex-col items-center gap-3">
							<UFormField label="Rodzaj wizyty" name="visitType" class="w-1/2">
								<USelect
									v-model="schemaState.visitType"
									:disabled="currentStep === 2 ? false : true"
									:items="visitTypes.map((v) => v.name)"
									placeholder="Wybierz rodzaj wizyty"
									class="w-full cursor-pointer"
								/>
							</UFormField>
						</div>
						<div class="flex flex-row justify-between gap-3">
							<UButton
								label="Cofnij"
								variant="outline"
								color="neutral"
								class="w-full cursor-pointer"
								@click="goPrev"
							/>
							<UButton
								label="Dalej"
								color="info"
								class="w-full cursor-pointer"
								:disabled="!schemaState.visitType"
								@click="goNext"
							/>
						</div>
					</section>

					<section v-else-if="item.id === 3" class="flex flex-col gap-3">
						<!-- @vue-ignore -->
						<UCalendar
							v-model="selectedVisitDateRange"
							range
							class=""
							:disabled="currentStep === 3 ? false : true"
							:is-date-unavailable="unavailableDates"
						/>

						<UButton
							label="Szukaj wizyty"
							icon="carbon:search"
							:disabled="currentStep === 3 ? false : true"
							class="cursor-pointer justify-center"
						/>

						<div class="flex w-full flex-col items-center gap-3">
							<UCard
								v-for="visit in availableVisits"
								:key="visit.id"
								:class="[
									'w-full',
									selectedVisitId === visit.id
										? 'border-green-400 bg-green-50 ring-2 ring-green-200'
										: 'border-gray-200',
								]"
							>
								<div class="flex flex-row items-center justify-between gap-3">
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
										:color="selectedVisitId === visit.id ? 'success' : 'info'"
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

						<div class="flex flex-row justify-between gap-3">
							<UButton
								label="Cofnij"
								variant="outline"
								color="neutral"
								class="w-full cursor-pointer"
								@click="goPrev"
							/>
							<UButton
								label="Zatwierdź termin"
								color="info"
								class="w-full cursor-pointer"
								:disabled="!selectedVisitId"
								@click="goNext"
							/>
						</div>
					</section>

					<section v-else-if="item.id === 4" class="flex flex-col gap-4">
						<div>
							<p class="text-lg font-semibold text-gray-900">
								Podsumowanie wizyty
							</p>
							<p class="text-sm text-gray-500">
								Sprawdź, czy poniższe dane są poprawne przed potwierdzeniem
								wizyty.
							</p>
						</div>

						<UCard class="w-full">
							<div class="space-y-4">
								<div>
									<p
										class="text-xs font-medium tracking-wide text-gray-500 uppercase"
									>
										Specjalizacja
									</p>
									<p class="text-sm font-medium text-gray-900">
										{{ schemaState.specialization || 'Nie wybrano' }}
									</p>
								</div>

								<div>
									<p
										class="text-xs font-medium tracking-wide text-gray-500 uppercase"
									>
										Rodzaj wizyty
									</p>
									<p class="text-sm font-medium text-gray-900">
										{{ schemaState.visitType || 'Nie wybrano' }}
									</p>
								</div>

								<div>
									<p
										class="text-xs font-medium tracking-wide text-gray-500 uppercase"
									>
										Termin wizyty
									</p>
									<p
										v-if="selectedVisitId"
										class="text-sm font-medium text-gray-900"
									>
										{{
											availableVisits.find(
												(visit) => visit.id === selectedVisitId
											)?.date
										}}
										·
										{{
											availableVisits.find(
												(visit) => visit.id === selectedVisitId
											)?.time
										}}
									</p>
									<p v-else class="text-sm text-gray-500">
										Nie wybrano terminu wizyty
									</p>
								</div>
							</div>
						</UCard>

						<div class="flex flex-row justify-between gap-3">
							<UButton
								label="Cofnij"
								variant="outline"
								class="w-full cursor-pointer"
								color="neutral"
								@click="goPrev"
							/>
							<UButton
								label="Potwierdź wizytę"
								color="success"
								class="w-full cursor-pointer"
								:disabled="!selectedVisitId"
							/>
						</div>
					</section>
				</UCard>
			</template>
		</UStepper>

		<PageFooter />
	</PageContainer>
</template>

<style></style>
