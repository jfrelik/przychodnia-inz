<script setup lang="ts">
	import { computed, ref } from 'vue';
	const patientsCount = 1240;
	const visitsToday = 87;

	const specializations = [
		{ name: 'Kardiologia', icon: 'lucide:heart-pulse' },
		{ name: 'Dermatologia', icon: 'lucide:scissors' },
		{ name: 'Pediatria', icon: 'lucide:baby' },
		{ name: 'Ortopedia', icon: 'lucide:bone' },
		{ name: 'Okulistyka', icon: 'lucide:eye' },
		{ name: 'Neurologia', icon: 'lucide:brain' },
		{ name: 'Stomatologia', icon: 'lucide:apple' },
	];

	const selectedSpecName = ref(specializations[0]?.name);

	const selectedSpec = computed(() =>
		specializations.find((s) => s.name === selectedSpecName.value)
	);
	const nextVisitInfo = computed(() => {
		switch (selectedSpec.value?.name) {
			case 'Kardiologia':
				return 'Najbliższa wizyta: jutro, godz. 09:30';
			case 'Dermatologia':
				return 'Najbliższa wizyta: dziś, godz. 16:00';
			case 'Pediatria':
				return 'Najbliższa wizyta: pojutrze, godz. 11:00';
			case 'Ortopedia':
				return 'Najbliższa wizyta: dziś, godz. 14:30';
			case 'Okulistyka':
				return 'Najbliższa wizyta: jutro, godz. 13:00';
			case 'Neurologia':
				return 'Najbliższa wizyta: za 3 dni, godz. 10:00';
			case 'Stomatologia':
				return 'Najbliższa wizyta: dziś, godz. 17:15';
			default:
				return 'Brak danych';
		}
	});
</script>

<template>
	<div class="flex min-h-screen w-full flex-col bg-gray-50">
		<PageHeader />

		<!-- Hero Section -->
		<section
			class="flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300 py-16"
		>
			<h1 class="mb-4 text-center text-5xl font-extrabold text-blue-900">
				Przychodnia Medyczna
			</h1>
			<p class="mb-8 max-w-2xl text-center text-xl text-blue-800">
				Nowoczesna aplikacja medyczna – szybkie umawianie wizyt, dostęp do
				specjalistów, statystyki i wygodne zarządzanie zdrowiem.
			</p>
			<div class="mb-8 flex gap-8">
				<div class="flex flex-col items-center rounded-xl bg-white p-6 shadow">
					<span class="text-3xl font-bold text-blue-700">
						{{ patientsCount }}
					</span>
					<span class="text-gray-600">Pacjentów pod opieką</span>
				</div>
				<div class="flex flex-col items-center rounded-xl bg-white p-6 shadow">
					<span class="text-3xl font-bold text-blue-700">
						{{ visitsToday }}
					</span>
					<span class="text-gray-600">Wizyt dzisiaj</span>
				</div>
			</div>
			<div class="flex w-full max-w-md flex-col items-center gap-4">
				<label class="text-lg font-semibold text-blue-900">
					Wybierz specjalizację:
				</label>
				{{ selectedSpecName }}
				<USelect
					v-model="selectedSpecName"
					:items="specializations"
					class="w-full"
				>
					<template #item="{ item }">
						<div class="flex items-center gap-2">
							<UIcon :name="item.icon" class="text-xl text-blue-600" />
							<span>{{ item.name }}</span>
						</div>
					</template>
				</USelect>
				<div
					class="mt-6 flex items-center gap-2 text-xl font-bold text-blue-900"
				>
					<UIcon
						:name="selectedSpec?.icon || 'svg-spinners:ring-resize'"
						class="text-2xl"
					/>
					{{ nextVisitInfo }}
				</div>
				<UButton size="xl" to="/register" class="mt-4">
					Zarejestruj się i umów wizytę
				</UButton>
			</div>
		</section>

		<!-- Specializations List -->
		<section class="px-8 py-12">
			<h2 class="mb-6 text-center text-3xl font-bold text-blue-900">
				Nasze specjalizacje
			</h2>
			<div
				class="grid grid-cols-1 justify-items-center gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
			>
				<div
					v-for="spec in specializations"
					:key="spec.name"
					class="flex w-full max-w-xs flex-col items-center rounded-xl bg-white p-6 shadow"
				>
					<UIcon :name="spec.icon" class="mb-2 text-4xl text-blue-600" />
					<span class="text-xl font-semibold text-blue-900">
						{{ spec.name }}
					</span>
				</div>
			</div>
		</section>

		<!-- Services Section -->
		<section class="bg-white px-8 py-12">
			<h2 class="mb-6 text-center text-3xl font-bold text-blue-900">
				Dlaczego warto wybrać naszą opiekę?
			</h2>
			<div class="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
				<div
					class="flex flex-col items-center rounded-xl bg-blue-50 p-6 text-center shadow"
				>
					<UIcon name="carbon:calendar" class="mb-2 text-3xl text-blue-700" />
					<span class="mb-2 text-lg font-bold">Szybkie umawianie wizyt</span>
					<span class="text-gray-700">
						Wybierz specjalistę i termin w kilka sekund.
					</span>
				</div>
				<div
					class="flex flex-col items-center rounded-xl bg-blue-50 p-6 text-center shadow"
				>
					<UIcon name="carbon:document" class="mb-2 text-3xl text-blue-700" />
					<span class="mb-2 text-lg font-bold">Historia leczenia online</span>
					<span class="text-gray-700">
						Wszystkie wizyty i wyniki badań w jednym miejscu.
					</span>
				</div>
				<div
					class="flex flex-col items-center rounded-xl bg-blue-50 p-6 text-center shadow"
				>
					<UIcon name="carbon:security" class="mb-2 text-3xl text-blue-700" />
					<span class="mb-2 text-lg font-bold">Bezpieczeństwo danych</span>
					<span class="text-gray-700">
						Twoje dane są chronione i dostępne tylko dla Ciebie.
					</span>
				</div>
			</div>
		</section>

		<!-- Opinions Section -->
		<section class="bg-gray-100 px-8 py-12">
			<h2 class="mb-6 text-center text-3xl font-bold text-blue-900">
				Opinie naszych pacjentów
			</h2>
			<div class="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
				<div class="rounded-xl bg-white p-6 shadow">
					<p class="text-gray-800 italic">
						"Bardzo szybka rejestracja i świetny kontakt z lekarzem!"
					</p>
					<div class="mt-4 flex items-center gap-2">
						<UIcon name="carbon:user" class="text-blue-600" />
						<span class="font-semibold text-blue-900">Anna, Warszawa</span>
					</div>
				</div>
				<div class="rounded-xl bg-white p-6 shadow">
					<p class="text-gray-800 italic">
						"Wszystkie wyniki badań mam zawsze pod ręką w aplikacji."
					</p>
					<div class="mt-4 flex items-center gap-2">
						<UIcon name="carbon:user" class="text-blue-600" />
						<span class="font-semibold text-blue-900">Marek, Gdańsk</span>
					</div>
				</div>
			</div>
		</section>
		<PageFooter />
	</div>
</template>
