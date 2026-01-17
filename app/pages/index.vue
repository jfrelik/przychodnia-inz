<script setup lang="ts">
	useHead({
		title: 'Przychodnia',
	});

	const { data, pending } = await useLazyFetch('/api/public/landing', {
		server: false,
		default: () => ({
			patientsCount: 0,
			visitsToday: 0,
			specializations: [],
		}),
	});

	const specializationOptions = computed(() =>
		data.value.specializations.map((spec) => ({
			label: spec.name,
			value: spec.id,
			icon: spec.icon ?? 'lucide:stethoscope',
		}))
	);

	const selectedSpecId = ref<number | undefined>(undefined);

	watch(
		() => data.value.specializations,
		(specializations) => {
			if (specializations.length > 0 && selectedSpecId.value === undefined) {
				selectedSpecId.value = specializations[0]!.id;
			}
		},
		{ immediate: true }
	);

	const effectiveSpecId = computed(() => {
		return selectedSpecId.value ?? data.value.specializations[0]?.id;
	});

	const selectedSpec = computed(() =>
		data.value.specializations.find((spec) => spec.id === effectiveSpecId.value)
	);

	const formatNextAvailableDate = (dateStr: string | null) => {
		if (!dateStr) return 'Brak wolnych terminów';
		const [y, m, d] = dateStr.split('-').map(Number);
		const date = new Date(y!, m! - 1, d);
		return `Najbliższy termin: ${date.toLocaleDateString('pl-PL', {
			dateStyle: 'long',
		})}`;
	};

	const nextVisitInfo = computed(() =>
		formatNextAvailableDate(selectedSpec.value?.nextAvailableDate ?? null)
	);
</script>

<template>
	<div class="flex min-h-screen w-full flex-col bg-gray-50">
		<AppHeader />

		<section class="bg-linear-to-br from-blue-50 to-blue-100">
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
					v-auto-animate
					class="rounded-2xl border border-blue-100 bg-blue-50 p-8 text-center shadow-sm"
				>
					<ClientOnly>
						<USkeleton
							v-if="pending"
							class="mx-auto h-12 w-32 rounded-lg bg-blue-200/70"
						/>
						<p v-else class="text-4xl font-extrabold text-blue-800">
							{{ data.patientsCount }}
						</p>
					</ClientOnly>

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
					v-auto-animate
					class="rounded-2xl border border-blue-100 bg-blue-50 p-8 text-center shadow-sm"
				>
					<ClientOnly>
						<USkeleton
							v-if="pending"
							class="mx-auto h-12 w-32 rounded-lg bg-blue-200/70"
						/>
						<p v-else class="text-4xl font-extrabold text-blue-800">
							{{ data.visitsToday }}
						</p>
					</ClientOnly>

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
			class="bg-linear-to-r from-blue-900 via-blue-800 to-blue-900 px-6 py-12 text-white"
		>
			<div
				v-auto-animate
				class="mx-auto flex max-w-5xl flex-col gap-6 rounded-2xl bg-white/10 p-8 backdrop-blur"
			>
				<div>
					<h2 class="text-3xl font-bold">Sprawdź dostępność specjalistów</h2>
					<p class="mt-2 text-blue-100">
						Wybierz interesującą Cię specjalizację i sprawdź najbliższy wolny
						termin.
					</p>
				</div>
				<ClientOnly>
					<template v-if="pending">
						<USkeleton class="h-40 rounded-xl bg-blue-200/70 p-6" />
					</template>
					<template v-else>
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
									v-model="selectedSpecId"
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
										:name="selectedSpec?.icon || 'lucide:stethoscope'"
										class="text-3xl text-blue-600"
									/>
									<div>
										<p class="text-lg font-bold text-blue-900">
											{{ selectedSpec?.name }}
										</p>
									</div>
								</div>
								<p class="mt-4 text-base font-semibold text-blue-900">
									{{ nextVisitInfo }}
								</p>
								<p
									v-if="nextVisitInfo !== 'Brak wolnych terminów'"
									class="mt-2 text-sm text-slate-600"
								>
									Zarezerwuj wizytę w dogodnym terminie po zalogowaniu.
								</p>
							</div>
						</div>
					</template>
				</ClientOnly>
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
					v-auto-animate
					class="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
				>
					<ClientOnly>
						<template v-if="pending">
							<USkeleton
								v-for="n in 4"
								:key="n"
								class="h-32 rounded-xl bg-blue-200/70 p-6"
							/>
						</template>

						<div
							v-for="spec in data.specializations"
							v-else
							:key="spec.id"
							class="flex h-full flex-col gap-3 rounded-xl bg-white p-6 text-center shadow"
						>
							<UIcon :name="spec.icon" class="mx-auto text-4xl text-blue-600" />
							<span class="text-xl font-semibold text-blue-900">
								{{ spec.name }}
							</span>
							<p class="text-sm text-slate-600">
								{{ spec.description || 'Opis specjalizacji jest niedostępny.' }}
							</p>
						</div>
					</ClientOnly>
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
					<UIcon name="lucide:calendar" class="mb-2 text-3xl text-blue-700" />
					<span class="mb-2 text-lg font-bold">Szybkie umawianie wizyt</span>
					<span class="text-gray-700">
						Wybierz specjalistę i termin w kilka sekund.
					</span>
				</div>
				<div
					class="flex flex-col items-center rounded-xl bg-blue-50 p-6 text-center shadow"
				>
					<UIcon name="lucide:file" class="mb-2 text-3xl text-blue-700" />
					<span class="mb-2 text-lg font-bold">Historia leczenia online</span>
					<span class="text-gray-700">
						Wszystkie wizyty i wyniki badań w jednym miejscu.
					</span>
				</div>
				<div
					class="flex flex-col items-center rounded-xl bg-blue-50 p-6 text-center shadow"
				>
					<UIcon name="lucide:shield" class="mb-2 text-3xl text-blue-700" />
					<span class="mb-2 text-lg font-bold">Bezpieczeństwo danych</span>
					<span class="text-gray-700">
						Twoje dane są chronione i dostępne tylko dla Ciebie.
					</span>
				</div>
			</div>
		</section>
		<AppFooter />
	</div>
</template>
