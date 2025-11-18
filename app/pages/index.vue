<script setup lang="ts">
	import { computed, ref } from 'vue';

	const patientsCount = 1240;
	const visitsToday = 87;

	const specializations = [
		{
			name: 'Kardiologia',
			icon: 'lucide:heart-pulse',
			nextVisit: 'Najbliższa wizyta: jutro, godz. 09:30',
			description: 'Diagnostyka chorób serca i układu krążenia.',
		},
		{
			name: 'Dermatologia',
			icon: 'lucide:scissors',
			nextVisit: 'Najbliższa wizyta: dziś, godz. 16:00',
			description: 'Leczenie chorób skóry oraz konsultacje estetyczne.',
		},
		{
			name: 'Pediatria',
			icon: 'lucide:baby',
			nextVisit: 'Najbliższa wizyta: pojutrze, godz. 11:00',
			description: 'Kompleksowa opieka dla najmłodszych pacjentów.',
		},
		{
			name: 'Ortopedia',
			icon: 'lucide:bone',
			nextVisit: 'Najbliższa wizyta: dziś, godz. 14:30',
			description: 'Diagnostyka i leczenie schorzeń układu kostno-stawowego.',
		},
		{
			name: 'Okulistyka',
			icon: 'lucide:eye',
			nextVisit: 'Najbliższa wizyta: jutro, godz. 13:00',
			description: 'Badania i konsultacje z zakresu zdrowia oczu.',
		},
		{
			name: 'Neurologia',
			icon: 'lucide:brain',
			nextVisit: 'Najbliższa wizyta: za 3 dni, godz. 10:00',
			description: 'Pomoc w schorzeniach układu nerwowego i bólach głowy.',
		},
		{
			name: 'Stomatologia',
			icon: 'lucide:apple',
			nextVisit: 'Najbliższa wizyta: dziś, godz. 17:15',
			description: 'Profilaktyka i leczenie stomatologiczne dla całej rodziny.',
		},
	];

	const specializationOptions = specializations.map((spec) => ({
		label: spec.name,
		value: spec.name,
		icon: spec.icon,
	}));

	const selectedSpecName = ref(specializationOptions[0]?.value ?? '');

	const selectedSpec = computed(() =>
		specializations.find((spec) => spec.name === selectedSpecName.value)
	);

	const nextVisitInfo = computed(
		() => selectedSpec.value?.nextVisit ?? 'Brak danych'
	);
</script>

<template>
	<div class="flex min-h-screen w-full flex-col bg-gray-50">
		<AppHeader />

		<section class="bg-gradient-to-br from-blue-50 to-blue-100">
			<div
				class="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[1.1fr_minmax(300px,0.9fr)] lg:items-center"
			>
				<div class="space-y-6">
					<span
						class="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm font-semibold text-blue-700 shadow-sm"
					>
						<UIcon name="lucide:stethoscope" class="text-lg" />
						Zadbaj o zdrowie z nami
					</span>
					<h1
						class="text-4xl font-extrabold tracking-tight text-blue-900 md:text-5xl"
					>
						Twoja klinika dostępna zawsze i wszędzie
					</h1>
					<p class="max-w-xl text-lg text-slate-700">
						Rejestruj wizyty, monitoruj postępy leczenia i kontaktuj się ze
						specjalistami w jednym, bezpiecznym miejscu. Zacznij dbać o zdrowie
						swojej rodziny już teraz.
					</p>
					<div class="grid gap-4 md:grid-cols-2">
						<div
							class="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm"
						>
							<UIcon name="lucide:clock" class="mt-1 text-xl text-blue-600" />
							<span class="text-slate-700">
								Szybkie umawianie konsultacji w dogodnym terminie.
							</span>
						</div>
						<div
							class="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm"
						>
							<UIcon
								name="lucide:shield-check"
								class="mt-1 text-xl text-blue-600"
							/>
							<span class="text-slate-700">
								Pełna kontrola nad dokumentacją i zaleceniami lekarza.
							</span>
						</div>
					</div>
				</div>

				<div class="rounded-2xl bg-white p-8 shadow-xl">
					<div class="space-y-6">
						<div>
							<h2 class="text-2xl font-bold text-blue-900">
								Dołącz w kilka minut
							</h2>
							<p class="mt-2 text-slate-600">
								Utwórz konto, aby rezerwować wizyty online i otrzymywać
								przypomnienia o terminach.
							</p>
						</div>
						<ul class="space-y-3 text-slate-700">
							<li class="flex items-start gap-3">
								<UIcon
									name="lucide:check"
									class="mt-1 text-xl text-green-500"
								/>
								<span>
									Wybieraj spośród topowych specjalistów i dostępnych usług.
								</span>
							</li>
							<li class="flex items-start gap-3">
								<UIcon
									name="lucide:check"
									class="mt-1 text-xl text-green-500"
								/>
								<span>
									Przechowuj historię leczenia i wyniki badań w jednym miejscu.
								</span>
							</li>
							<li class="flex items-start gap-3">
								<UIcon
									name="lucide:check"
									class="mt-1 text-xl text-green-500"
								/>
								<span>Otrzymuj powiadomienia i przypomnienia o wizytach.</span>
							</li>
						</ul>
						<div class="space-y-3">
							<UButton size="xl" block to="/register">
								Rozpocznij rejestrację
							</UButton>
							<p class="text-center text-sm text-slate-600">
								Masz już konto?
								<NuxtLink
									to="/login"
									class="font-semibold text-blue-700 hover:underline"
								>
									Zaloguj się
								</NuxtLink>
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="bg-white px-6 py-12">
			<div class="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
				<div
					class="rounded-2xl border border-blue-100 bg-blue-50 p-8 text-center shadow-sm"
				>
					<p class="text-4xl font-extrabold text-blue-800">
						{{ patientsCount }}
					</p>
					<p
						class="mt-2 text-sm font-semibold tracking-wide text-blue-700 uppercase"
					>
						Pacjentów pod opieką
					</p>
					<p class="mt-3 text-slate-600">
						Zaufali nam pacjenci z całego kraju i doceniają łatwość korzystania
						z aplikacji.
					</p>
				</div>
				<div
					class="rounded-2xl border border-blue-100 bg-blue-50 p-8 text-center shadow-sm"
				>
					<p class="text-4xl font-extrabold text-blue-800">{{ visitsToday }}</p>
					<p
						class="mt-2 text-sm font-semibold tracking-wide text-blue-700 uppercase"
					>
						Wizyt dzisiaj
					</p>
					<p class="mt-3 text-slate-600">
						Dbamy o płynne zarządzanie terminarzem, abyś mógł skupić się na
						zdrowiu.
					</p>
				</div>
			</div>
		</section>

		<section
			class="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 px-6 py-12 text-white"
		>
			<div
				class="mx-auto flex max-w-5xl flex-col gap-6 rounded-2xl bg-white/10 p-8 backdrop-blur"
			>
				<div>
					<h2 class="text-3xl font-bold">Sprawdź dostępność specjalistów</h2>
					<p class="mt-2 text-blue-100">
						Wybierz interesującą Cię specjalizację i sprawdź najbliższy wolny
						termin.
					</p>
				</div>
				<div
					class="grid gap-6 md:grid-cols-[minmax(240px,280px)_1fr] md:items-start"
				>
					<div class="space-y-3">
						<label
							class="text-sm font-semibold tracking-wide text-blue-100 uppercase"
						>
							Specjalizacja
						</label>
						<USelect
							v-model="selectedSpecName"
							:items="specializationOptions"
							class="w-full"
						>
							<template #item="{ item }">
								<div class="flex items-center gap-2">
									<UIcon :name="item.icon" class="text-xl text-blue-600" />
									<span>{{ item.label }}</span>
								</div>
							</template>
						</USelect>
					</div>
					<div class="rounded-xl bg-white/90 p-6 text-slate-800 shadow-lg">
						<div class="flex items-start gap-3">
							<UIcon
								:name="selectedSpec?.icon || 'svg-spinners:ring-resize'"
								class="text-3xl text-blue-600"
							/>
							<div>
								<p class="text-lg font-bold text-blue-900">
									{{ selectedSpec?.name }}
								</p>
								<p class="text-sm text-slate-600">
									{{ selectedSpec?.description }}
								</p>
							</div>
						</div>
						<p class="mt-4 text-base font-semibold text-blue-900">
							{{ nextVisitInfo }}
						</p>
						<p class="mt-2 text-sm text-slate-600">
							Zarezerwuj wizytę w dogodnym terminie po zalogowaniu.
						</p>
					</div>
				</div>
			</div>
		</section>

		<section class="px-6 py-16">
			<div class="mx-auto max-w-6xl">
				<h2 class="text-center text-3xl font-bold text-blue-900">
					Nasze specjalizacje
				</h2>
				<p class="mt-3 text-center text-slate-600">
					Współpracujemy z doświadczonymi lekarzami, aby zapewnić kompleksową
					opiekę medyczną.
				</p>
				<div
					class="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
				>
					<div
						v-for="spec in specializations"
						:key="spec.name"
						class="flex h-full flex-col gap-3 rounded-xl bg-white p-6 text-center shadow"
					>
						<UIcon :name="spec.icon" class="mx-auto text-4xl text-blue-600" />
						<span class="text-xl font-semibold text-blue-900">
							{{ spec.name }}
						</span>
						<p class="text-sm text-slate-600">{{ spec.description }}</p>
					</div>
				</div>
			</div>
		</section>

		<section class="bg-white px-6 py-16">
			<h2 class="text-center text-3xl font-bold text-blue-900">
				Dlaczego warto wybrać naszą opiekę?
			</h2>
			<div
				class="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3"
			>
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

		<section class="bg-gray-100 px-6 py-16">
			<h2 class="text-center text-3xl font-bold text-blue-900">
				Opinie naszych pacjentów
			</h2>
			<div
				class="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2"
			>
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

		<AppFooter />
	</div>
</template>
