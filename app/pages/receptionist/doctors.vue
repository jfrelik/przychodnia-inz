<script setup lang="ts">
	definePageMeta({
		layout: 'receptionist',
	});

	useHead({
		title: 'Lekarze i dzisiejsze dyspozycje',
	});

	const toast = useToast();
	const globalFilter = ref('');
	const selectedDoctorId = ref<string | null>(null);

	const { data, error, refresh } = await useFetch(
		'/api/receptionist/assignRoom',
		{
			key: 'receptionist-doctors-day',
			default: () => ({ day: '', timeframes: [] }),
		}
	);

	const timeframes = computed(() => data.value?.timeframes ?? []);

	const doctors = computed(() => {
		const map = new Map<
			string,
			{
				doctorId: string;
				name: string;
				email: string;
				specialization: string;
				slotsCount: number;
			}
		>();
		for (const tf of timeframes.value) {
			if (!tf.doctorId) continue;
			const existing = map.get(tf.doctorId);
			if (existing) {
				existing.slotsCount++;
			} else {
				map.set(tf.doctorId, {
					doctorId: tf.doctorId,
					name: tf.doctorName ?? 'Lekarz',
					email: tf.doctorEmail ?? '',
					specialization: tf.specializationName ?? 'Brak specjalizacji',
					slotsCount: 1,
				});
			}
		}
		const list = Array.from(map.values());
		const filter = globalFilter.value.trim().toLowerCase();
		if (!filter) return list;
		return list.filter(
			(doc) =>
				doc.name.toLowerCase().includes(filter) ||
				doc.specialization.toLowerCase().includes(filter) ||
				doc.email.toLowerCase().includes(filter)
		);
	});

	const toggleDoctorFilter = (doctorId: string) => {
		selectedDoctorId.value =
			selectedDoctorId.value === doctorId ? null : doctorId;
	};

	const filteredTimeframes = computed(() => {
		if (!selectedDoctorId.value) return timeframes.value;
		return timeframes.value.filter(
			(tf) => tf.doctorId === selectedDoctorId.value
		);
	});

	const formatTime = (time: string) => time.slice(0, 5);

	watch(
		error,
		(err) => {
			if (!err) return;
			toast.add({
				title: 'Nie udało się pobrać dyspozycji',
				color: 'error',
			});
		},
		{ immediate: true }
	);
</script>

<template>
	<PageContainer class="flex min-h-screen flex-col">
		<PageHeader
			title="Lekarze"
			description="Dzisiejsze dyspozycje lekarzy w widoku dziennym."
		/>

		<div class="flex flex-wrap items-center gap-3 pb-4">
			<UInput
				v-model="globalFilter"
				icon="lucide:search"
				placeholder="Szukaj po nazwisku, specjalizacji lub e-mail"
				clearable
				class="w-full max-w-lg"
			/>
			<USelect
				v-model="selectedDoctorId"
				:items="[
					{ label: 'Wszyscy lekarze', value: null },
					...doctors.map((d) => ({ label: d.name, value: d.doctorId })),
				]"
				placeholder="Filtruj po lekarzu"
				class="w-full max-w-sm"
				clearable
			/>
			<UButton
				variant="soft"
				color="neutral"
				icon="lucide:refresh-ccw"
				class="cursor-pointer"
				@click="refresh()"
			>
				Odśwież
			</UButton>
		</div>

		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<UCard class="lg:col-span-1">
				<template #header>
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-lg font-semibold">Lekarze</h2>
							<p class="text-sm text-neutral-500">
								Lista lekarzy z dzisiejszymi dyspozycjami.
							</p>
						</div>
						<UBadge
							variant="soft"
							color="primary"
							:label="`${doctors.length} lekarzy`"
						/>
					</div>
				</template>

				<div class="flex flex-col divide-y divide-neutral-200">
					<div
						v-for="doctor in doctors"
						:key="doctor.doctorId"
						class="flex cursor-pointer items-start justify-between gap-3 py-3 transition-colors hover:bg-neutral-50"
						:class="{
							'bg-primary-50': selectedDoctorId === doctor.doctorId,
						}"
						@click="toggleDoctorFilter(doctor.doctorId)"
					>
						<div class="flex items-start gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full"
								:class="
									selectedDoctorId === doctor.doctorId
										? 'bg-primary-500 text-white'
										: 'bg-primary-100 text-primary-700'
								"
							>
								<UIcon name="lucide:user" class="h-5 w-5" />
							</div>
							<div>
								<p class="font-semibold">{{ doctor.name }}</p>
								<p class="text-sm text-neutral-500">
									{{ doctor.specialization }}
								</p>
								<p class="text-xs text-neutral-400">
									{{ doctor.email || 'Brak e-maila' }}
								</p>
							</div>
						</div>
						<UBadge
							:color="
								selectedDoctorId === doctor.doctorId ? 'primary' : 'neutral'
							"
							variant="subtle"
						>
							{{ doctor.slotsCount }}
							{{ doctor.slotsCount === 1 ? 'slot' : 'slotów' }}
						</UBadge>
					</div>
					<p
						v-if="!doctors.length"
						class="py-6 text-center text-sm text-neutral-500"
					>
						Brak lekarzy na dziś
					</p>
				</div>
			</UCard>

			<UCard class="lg:col-span-2">
				<template #header>
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-lg font-semibold">Dzisiejsze dyspozycje</h2>
							<p class="text-sm text-neutral-500">
								Godziny przyjęć z przypisanymi gabinetami.
							</p>
						</div>
						<UBadge variant="soft" color="primary">
							{{ filteredTimeframes.length }} slotów
						</UBadge>
					</div>
				</template>

				<div
					v-if="filteredTimeframes.length === 0"
					class="py-12 text-center text-neutral-500"
				>
					<UIcon name="lucide:calendar-x" class="mx-auto mb-2 h-8 w-8" />
					<p>Brak dyspozycji na dziś</p>
				</div>

				<div v-else class="flex flex-col gap-3">
					<div
						v-for="tf in filteredTimeframes"
						:key="tf.scheduleId"
						class="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-neutral-50"
					>
						<div class="flex items-center gap-4">
							<div
								class="bg-primary-50 text-primary-700 flex flex-col items-center rounded-lg px-3 py-2"
							>
								<span class="text-lg font-bold">
									{{ formatTime(tf.start) }}
								</span>
								<span class="text-primary-500 text-xs">
									{{ formatTime(tf.end) }}
								</span>
							</div>
							<div>
								<p class="font-medium">{{ tf.doctorName || 'Lekarz' }}</p>
								<p class="text-sm text-neutral-500">
									{{ tf.specializationName || 'Brak specjalizacji' }}
								</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<UBadge
								v-if="tf.roomNumber"
								color="success"
								variant="soft"
								class="gap-1"
							>
								<UIcon name="lucide:door-open" class="h-3 w-3" />
								Gabinet {{ tf.roomNumber }}
							</UBadge>
							<UBadge v-else color="warning" variant="soft">
								Brak gabinetu
							</UBadge>
						</div>
					</div>
				</div>
			</UCard>
		</div>
	</PageContainer>
</template>
