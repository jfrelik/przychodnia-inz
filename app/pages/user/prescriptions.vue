<script lang="ts" setup>
	import { Icon } from '#components';
	import { computed } from 'vue';

	definePageMeta({
		layout: 'user',
	});

	useHead({
		title: 'Panel pacjenta',
	});

	type PrescriptionStatus = 'active' | 'fulfilled';
	type Prescription = {
		prescriptionId: number | null;
		status: PrescriptionStatus | null;
	};

	const { data } = await useFetch<Prescription[]>(
		'/api/patient/prescriptions',
		{
			key: 'patient-prescriptions-summary',
		}
	);

	const prescriptions = computed(() => data.value ?? []);
	const activePrescriptionsCount = computed(
		() => prescriptions.value.filter((p) => p.status === 'active').length
	);
	const fulfilledPrescriptionsCount = computed(
		() => prescriptions.value.filter((p) => p.status === 'fulfilled').length
	);
	const totalPrescriptionsCount = computed(() => prescriptions.value.length);
</script>

<template>
	<PageContainer>
		<PageHeader
			title="Panel pacjenta"
			description="Witamy w panelu pacjenta. Wpisz opis."
		/>
		<div class="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
			<UCard>
				<div class="flex items-center gap-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-3xl"
					>
						<Icon name="carbon:pills" class-name="w-6 h-6 text-green-600" />
					</div>
					<div>
						<p class="text-2xl font-bold text-gray-800">
							{{ activePrescriptionsCount }}
						</p>
						<p class="text-sm text-gray-600">Aktywne recepty</p>
					</div>
				</div>
			</UCard>

			<UCard>
				<div class="flex items-center gap-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-3xl"
					>
						<Icon
							name="carbon:checkmark"
							class-name="w-6 h-6 text-emerald-600"
						/>
					</div>
					<div>
						<p class="text-2xl font-bold text-gray-800">
							{{ fulfilledPrescriptionsCount }}
						</p>
						<p class="text-sm text-gray-600">Zrealizowane recepty</p>
					</div>
				</div>
			</UCard>

			<UCard>
				<div class="flex items-center gap-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-3xl"
					>
						<Icon
							name="carbon:document-add"
							class-name="w-6 h-6 text-gray-700"
						/>
					</div>
					<div>
						<p class="text-2xl font-bold text-gray-800">
							{{ totalPrescriptionsCount }}
						</p>
						<p class="text-sm text-gray-600">Łącznie recept</p>
					</div>
				</div>
			</UCard>
		</div>

		<div class="mt-2">
			<UserDetailsPrescription />
		</div>
	</PageContainer>
</template>

<style></style>
