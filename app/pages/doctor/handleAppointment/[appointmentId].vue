<script lang="ts" setup>
	import type { FormSubmitEvent, StepperItem } from '@nuxt/ui';
	import * as z from 'zod';

	definePageMeta({
		layout: 'docs',
	});

	useHead({
		title: 'Panel doktora',
	});

	const toast = useToast();
	const route = useRoute();
	const router = useRouter();
	const appointmentId = route.params.appointmentId as string;

	type AppointmentDetails = {
		appointmentId: number;
		datetime: string | Date;
		status: string;
		type: string;
		isOnline: boolean;
		notes: string | null;
		patientId: string;
		patientName: string | null;
		patientEmail: string | null;
		patientPhone: string | null;
		roomId: number | null;
		roomNumber: string | null;
		recommendation: string | null;
		prescription: unknown;
	};

	const formatDateTime = (value: string | Date) => useDateTimeShort(value);

	const {
		data: appointmentData,
		pending: appointmentPending,
		error: appointmentError,
		refresh: refreshAppointment,
	} = await useFetch<AppointmentDetails>(
		`/api/doctor/appointments/${appointmentId}`,
		{
			key: `doctor-appointment-${appointmentId}`,
		}
	);

	const appointment = computed(() => appointmentData.value ?? null);
	const allowSubmit = computed(
		() => appointment.value?.status === 'checked_in'
	);

	const statusLabels: Record<string, string> = {
		scheduled: 'Zaplanowana',
		checked_in: 'Zweryfikowana',
		completed: 'Zakończona',
		canceled: 'Odwołana',
	};

	const getStatusLabel = (status?: string) =>
		status ? (statusLabels[status] ?? status) : null;

	const schema = z.object({
		visitGoal: z.string().min(1, 'Cel wizyty jest wymagany'),
		symptoms: z.string().optional(),
		diagnosisDescription: z.string().optional(),
		prescribedMedications: z.string().optional(),
		recommendations: z.string().optional(),
		proceduresPerformed: z.string().optional(),
		examResultCodes: z.array(z.string()).optional(),
	});

	type Schema = z.output<typeof schema>;

	const schemaState = ref<Schema>({
		visitGoal: '',
		symptoms: '',
		diagnosisDescription: '',
		prescribedMedications: '',
		recommendations: '',
		proceduresPerformed: '',
		examResultCodes: [],
	});

	const newExamCode = ref('');
	const editingExamCodeIndex = ref<number | null>(null);
	const editingExamCodeValue = ref('');

	const resetExamCodeEditing = () => {
		editingExamCodeIndex.value = null;
		editingExamCodeValue.value = '';
	};

	const addExamCode = () => {
		const value = newExamCode.value.trim();
		if (!value) return;
		if (!schemaState.value.examResultCodes?.includes(value))
			schemaState.value.examResultCodes?.push(value);
		newExamCode.value = '';
	};

	const startEditingExamCode = (index: number) => {
		if (!schemaState.value.examResultCodes) return;
		editingExamCodeIndex.value = index;
		editingExamCodeValue.value = schemaState.value.examResultCodes[index] ?? '';
	};

	const saveExamCodeEdit = () => {
		if (
			editingExamCodeIndex.value === null ||
			!schemaState.value.examResultCodes
		)
			return;

		const value = editingExamCodeValue.value.trim();
		if (!value) {
			toast.add({
				title: 'Kod nie może być pusty',
				color: 'warning',
			});
			return;
		}

		const duplicateIndex = schemaState.value.examResultCodes.findIndex(
			(code, idx) => code === value && idx !== editingExamCodeIndex.value
		);
		if (duplicateIndex !== -1) {
			toast.add({
				title: 'Kod jest już na liście',
				description: 'Usuń lub edytuj istniejący kod.',
				color: 'warning',
			});
			return;
		}

		schemaState.value.examResultCodes[editingExamCodeIndex.value] = value;
		resetExamCodeEditing();
	};

	const cancelExamCodeEdit = () => resetExamCodeEditing();

	const removeExamCode = (index: number) => {
		if (!schemaState.value.examResultCodes) return;
		schemaState.value.examResultCodes.splice(index, 1);
		if (editingExamCodeIndex.value === index) {
			resetExamCodeEditing();
		} else if (
			editingExamCodeIndex.value !== null &&
			editingExamCodeIndex.value > index
		) {
			editingExamCodeIndex.value -= 1;
		}
	};

	const submitting = ref(false);

	const visitSteps: StepperItem[] = [
		{
			id: 1,
			title: 'Cel wizyty i opis objawów',
			description: 'Krok 1',
			icon: 'lucide:user',
		},
		{
			id: 2,
			title: 'Kody wyników badań',
			description: 'Krok 2',
			icon: 'lucide:file-plus',
		},
		{
			id: 3,
			title: 'Diagnoza',
			description: 'Krok 3',
			icon: 'lucide:stethoscope',
		},
		{ id: 4, title: 'Recepta', description: 'Krok 4', icon: 'lucide:pill' },
		{
			id: 5,
			title: 'Zalecenia',
			description: 'Krok 5',
			icon: 'lucide:book-open',
		},
		{
			id: 6,
			title: 'Wykonane procedury',
			description: 'Krok 6',
			icon: 'lucide:workflow',
		},
		{
			id: 7,
			title: 'Podsumowanie wizyty',
			description: 'Krok 7',
			icon: 'lucide:check-square',
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
			if (!allowSubmit.value) {
				toast.add({
					title: 'Brak check-in',
					description:
						'Recepcja musi zameldować pacjenta przed rozpoczęciem wizyty.',
					color: 'warning',
				});
				return;
			}

			submitting.value = true;

			const codes =
				event.data.examResultCodes
					?.map((code) => code.trim())
					.filter((code) => code.length > 0) ?? [];

			const payload = {
				...event.data,
				examResultCodes: codes.length ? codes : undefined,
			};

			await $fetch(`/api/doctor/appointments/${appointmentId}`, {
				method: 'PATCH',
				body: payload,
			});

			toast.add({
				title: 'Wizyta zakończona',
				description: 'Dane wizyty zostały zapisane.',
				color: 'success',
			});

			await refreshAppointment();
			currentStep.value = visitSteps.length;
			await router.push('/doctor/home');
		} catch (error) {
			toast.add({
				title: 'Nie udało się zapisać wizyty',
				description: getErrorMessage(error, 'Spróbuj ponownie.'),
				color: 'error',
			});
		} finally {
			submitting.value = false;
		}
	}
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel obsługi wizyty"
			description="Obsługa wizyty krok po kroku."
		/>

		<UCard class="mb-4">
			<div class="flex items-center justify-between">
				<div class="space-y-1">
					<p class="text-sm text-neutral-500">Pacjent</p>
					<p class="text-lg font-semibold">
						{{ appointment?.patientName || 'Ładowanie...' }}
					</p>
					<p
						v-if="appointment?.isOnline && appointment?.patientPhone"
						class="flex items-center gap-1 text-sm text-neutral-600"
					>
						<UIcon name="lucide:phone" class="h-4 w-4" />
						{{ appointment.patientPhone }}
					</p>
				</div>
				<div class="text-right text-sm text-neutral-600">
					<p>
						Data wizyty:
						<span class="font-medium">
							{{
								appointment?.datetime
									? formatDateTime(appointment.datetime)
									: 'Ładowanie...'
							}}
						</span>
					</p>
					<p v-if="appointment?.roomNumber">
						Gabinet:
						<span class="font-medium">{{ appointment.roomNumber }}</span>
					</p>
					<p v-else-if="appointment?.isOnline" class="text-primary-600">
						Teleporada
					</p>
					<p>
						Status:
						<span class="font-medium">
							{{
								getStatusLabel(appointment?.status) ||
								(appointmentPending ? '...' : 'Brak')
							}}
						</span>
					</p>
				</div>
			</div>

			<UAlert
				v-if="!allowSubmit && !appointmentPending"
				class="mt-3"
				color="warning"
				icon="lucide:alert-triangle"
				title="Tożsamość pacjenta nie została zweryfikowana"
				description="Przed odbyciem wizyty pacjent musi zgłosić się do recepcji."
			/>

			<UAlert
				v-if="appointmentError"
				class="mt-3"
				color="error"
				title="Nie uda?o si? pobra? danych wizyty"
				:description="appointmentError.message"
			>
				<template #actions>
					<UButton variant="soft" @click="refreshAppointment()">
						Od?wie?
					</UButton>
				</template>
			</UAlert>
		</UCard>

		<template v-if="allowSubmit">
			<h1 class="text-2xl font-bold">
				Krok {{ currentStep }}: {{ visitSteps[currentStep - 1]?.title }}
			</h1>
			<UStepper v-model="activeStep" :items="visitSteps" class="w-full">
				<template #content="{ item }">
					<UForm :schema="schema" :state="schemaState" @submit="handleSubmit">
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

							<!-- Step2: Kody wyników badań -->
							<section
								v-else-if="item.id === 2"
								class="mb-3 flex w-full justify-center"
							>
								<div class="mx-auto flex w-1/2 flex-col gap-3">
									<UFormField
										name="examResultCodes"
										label="Kody wyników badań"
										description="Dodaj jeden lub więcej kodów otrzymanych z laboratorium lub systemu badań"
									>
										<div class="space-y-3">
											<div class="flex items-center gap-2">
												<UInput
													v-model="newExamCode"
													placeholder="np. ABC12345"
													class="w-full"
													@keyup.enter.prevent="addExamCode"
												/>
												<UButton
													type="button"
													color="info"
													@click="addExamCode"
												>
													Dodaj
												</UButton>
											</div>
											<div
												v-if="schemaState.examResultCodes?.length"
												class="flex flex-col gap-2"
											>
												<div
													v-for="(code, index) in schemaState.examResultCodes"
													:key="`${code}-${index}`"
													class="flex items-center gap-2"
												>
													<template v-if="editingExamCodeIndex === index">
														<UInput
															v-model="editingExamCodeValue"
															placeholder="Edytuj kod"
															class="w-full"
															@keyup.enter.prevent="saveExamCodeEdit"
														/>
														<UButton
															color="success"
															variant="soft"
															size="sm"
															@click="saveExamCodeEdit"
														>
															Zapisz
														</UButton>
														<UButton
															color="neutral"
															variant="outline"
															size="sm"
															@click="cancelExamCodeEdit"
														>
															Anuluj
														</UButton>
													</template>
													<template v-else>
														<div class="flex w-full items-center gap-2">
															<span class="text-sm font-medium text-gray-800">
																{{ code }}
															</span>
															<div class="ml-auto flex items-center gap-2">
																<UButton
																	color="info"
																	variant="ghost"
																	size="sm"
																	icon="lucide:pencil"
																	@click="startEditingExamCode(index)"
																>
																	Edytuj
																</UButton>
																<UButton
																	color="error"
																	variant="ghost"
																	size="sm"
																	icon="lucide:trash-2"
																	@click="removeExamCode(index)"
																>
																	Usuń
																</UButton>
															</div>
														</div>
													</template>
												</div>
											</div>
											<p v-else class="text-sm text-gray-500">
												Brak dodanych kodów
											</p>
										</div>
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
										<div class="space-y-4">
											<div>
												<p
													class="text-xs font-semibold text-gray-500 uppercase"
												>
													Cel wizyty
												</p>
												<p class="text-sm">
													{{ schemaState.visitGoal || 'Brak danych' }}
												</p>
											</div>

											<div>
												<p
													class="text-xs font-semibold text-gray-500 uppercase"
												>
													Objawy
												</p>
												<p class="text-sm whitespace-pre-line">
													{{ schemaState.symptoms || 'Brak danych' }}
												</p>
											</div>

											<div>
												<p
													class="text-xs font-semibold text-gray-500 uppercase"
												>
													Diagnoza
												</p>
												<p class="text-sm whitespace-pre-line">
													{{
														schemaState.diagnosisDescription || 'Brak danych'
													}}
												</p>
											</div>
										</div>

										<div class="space-y-4">
											<div>
												<p
													class="text-xs font-semibold text-gray-500 uppercase"
												>
													Wyniki badań
												</p>
												<div
													v-if="schemaState.examResultCodes?.length"
													class="space-y-1"
												>
													<p
														v-for="(code, idx) in schemaState.examResultCodes"
														:key="`${code}-${idx}`"
														class="text-sm"
													>
														{{ code }}
													</p>
												</div>
												<p v-else class="text-sm text-gray-400">
													Brak kodów wyników badań
												</p>
											</div>

											<div>
												<p
													class="text-xs font-semibold text-gray-500 uppercase"
												>
													Przepisane leki
												</p>
												<p class="text-sm whitespace-pre-line">
													{{
														schemaState.prescribedMedications || 'Brak danych'
													}}
												</p>
											</div>

											<div>
												<p
													class="text-xs font-semibold text-gray-500 uppercase"
												>
													Zalecenia
												</p>
												<p class="text-sm whitespace-pre-line">
													{{ schemaState.recommendations || 'Brak danych' }}
												</p>
											</div>

											<div>
												<p
													class="text-xs font-semibold text-gray-500 uppercase"
												>
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
									:loading="submitting"
									type="submit"
								/>
							</div>
						</UCard>
					</UForm>
				</template>
			</UStepper>
		</template>
	</PageContainer>
</template>
