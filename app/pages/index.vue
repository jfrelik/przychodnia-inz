<script setup lang="ts"></script>

<template>
	<div class="flex w-full flex-col">
		<PageHeader />

		<!-- ! REGISTER SUGGESTION SECTION -->
		<div
			class="flex max-h-fit min-h-[400px] w-full flex-col items-start justify-center bg-[url('/imagePlaceholder.png')] bg-cover bg-center px-8 py-8 text-white"
		>
			<div class="w-full max-w-[40%] space-y-4 text-left">
				<h1 class="text-3xl font-bold">
					Twoje zdrowie jest naszym priorytetem
				</h1>
				<p>
					Odkryj nowoczesną opiekę zdrowotną dzięki naszemu kompleksowemu
					portalowi medycznemu. Uzyskaj dostęp do dokumentacji medycznej,
					umawiaj wizyty, zarządzaj receptami i kontaktuj się z naszymi
					specjalistami - wszystko w jednym miejscu.
				</p>
				<UButton size="xl" to="/register" class="w-max">
					Zarejestruj się
				</UButton>
			</div>
		</div>
		<!-- ! REGISTER SUGGESTION SECTION END -->

		<div class="flex w-full flex-col gap-24 p-8">
			<!-- ! GET TO KNOW US SECTION -->
			<div class="flex flex-col items-center">
				<h1 class="text-center text-4xl font-bold">
					Poznaj nasz kompleksowy portal opieki zdrowotnej
				</h1>
				<p class="max-w-1/2 text-center text-xl">
					Dzięki zastosowaniu nowoczesnych technologii możesz łatwo i szybko
					zarządzać swoimi wizytami, czy przeglądać recepty oraz wyniki badań
				</p>
			</div>
			<!-- ! GET TO KNOW US SECTION END -->

			<!-- ! WEBSITE FEATURES SECTION -->
			<div class="flex w-full gap-8">
				<!-- Portal pacjenta -->
				<!-- Left Half: Feature Box -->
				<div class="flex w-1/2 items-center justify-center">
					<div
						class="max-w-md rounded-xl border border-gray-300 p-8 shadow-xl shadow-gray-300 transition-shadow duration-300 hover:shadow-blue-100"
					>
						<div class="flex w-full flex-col items-center">
							<div
								class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600"
							>
								<UIcon name="carbon:user-profile" class="text-3xl" />
							</div>
							<h2 class="mt-2 text-xl font-bold">Portal pacjenta</h2>
							<p>Wszystkie twoje potrzeby w jednym miejscu</p>
						</div>

						<div class="flex flex-col gap-2 pt-4">
							<p class="flex items-center gap-2">
								<UIcon name="carbon:calendar-heat-map" />
								Umawiaj wizyty
							</p>
							<p class="flex items-center gap-2">
								<UIcon name="carbon:calendar" />
								Przeglądaj historię wizyt
							</p>
							<p class="flex items-center gap-2">
								<UIcon name="carbon:pills" />
								Wyszukaj recepty
							</p>
							<p class="flex items-center gap-2">
								<UIcon name="carbon:notebook" />
								Sprawdź wyniki badań
							</p>
							<p class="flex items-center gap-2">
								<UIcon name="carbon:information-square" />
								Zobacz zalecenia lekarskie
							</p>
							<p class="flex items-center gap-2">
								<UIcon name="carbon:notification" />
								System powiadomień
							</p>
						</div>
					</div>
				</div>
				<!-- Right Half: Text Description -->
				<div class="flex w-1/2 items-center justify-start">
					<div class="flex max-w-md flex-col gap-4">
						<h1 class="text-3xl font-bold">Portal pacjenta</h1>
						<p>
							Kompleksowy dostęp do Twoich usług medycznych w jednym miejscu.
							Zarządzaj wizytami, przeglądaj historię leczenia, wyniki badań,
							recepty, zalecenia oraz otrzymuj ważne powiadomienia na bieżąco.
						</p>
					</div>
				</div>
			</div>

			<!-- Portal lekarza -->
			<div class="flex w-full">
				<!-- Left Half: Text Description -->
				<div class="flex w-1/2 items-center justify-end">
					<div class="flex max-w-md flex-col gap-4">
						<h1 class="text-3xl font-bold">Portal lekarza</h1>
						<p>
							Intuicyjny system wspierający codzienną pracę lekarza. Zapewnia
							szybki dostęp do dokumentacji pacjentów, przejrzysty grafik oraz
							wygodny arkusz do obsługi wizyt.
						</p>
					</div>
				</div>
				<!-- Right Half: Feature Box -->
				<div class="flex w-1/2 items-center justify-center">
					<div
						class="min-w-1/3 rounded-xl border-1 border-gray-300 p-8 shadow-xl transition-shadow duration-300 hover:shadow-emerald-100"
					>
						<div class="flex w-full flex-col items-center">
							<div
								class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
							>
								<UIcon name="carbon:reminder-medical" class="text-3xl" />
							</div>
							<h2 class="mt-2 text-xl font-bold">Portal lekarza</h2>
							<p>Zoptymalizowany do szybkiej obsługi pacjenta</p>
						</div>

						<div class="flex flex-col gap-2 pt-4">
							<p>
								<UIcon name="carbon:document" />
								Łatwy dostęp do dokumentacji medycznej
							</p>
							<p>
								<UIcon name="carbon:calendar-heat-map" />
								Prosty i czytelny grafik
							</p>
							<p>
								<UIcon name="carbon:edit" />
								Wygodny do wypełnienia arkusz obsługi wizyty
							</p>
						</div>
					</div>
				</div>
			</div>
			<!-- ! WEBSITE FEATURES END -->

			<!-- ! OUR GOAL SECTION -->
			<div class="flex w-full gap-8">
				<div class="flex w-1/2 items-center justify-end">
					<div class="flex max-w-md flex-col gap-4">
						<h1 class="text-3xl font-bold">Twoje zdrowie - nasz cel</h1>
						<p>
							Zadbane zdrowie to fundament dobrego życia - właśnie dlatego
							stworzyliśmy portal, który wspiera Cię na każdym etapie troski o
							siebie. Naszym priorytetem jest zapewnienie Ci łatwego, szybkiego
							i bezpiecznego dostępu do usług medycznych, dokumentacji i zaleceń
							lekarzy. Chcemy, byś mógł skupić się na swoim samopoczuciu, a my
							zajmiemy się resztą.
						</p>
						<p>
							Nasz portal to nie tylko narzędzie - to cyfrowy partner w Twojej
							codziennej opiece zdrowotnej. Ułatwiamy kontakt z lekarzem,
							przegląd historii wizyt, dostęp do wyników badań czy odnalezienie
							recept. Wierzymy, że technologia może wspierać zdrowie, a my
							chcemy dać Ci do tego jak najlepsze narzędzia.
						</p>
					</div>
				</div>
				<div class="flex w-1/2 items-center justify-center pt-8">
					<div class="aspect-square w-full max-w-sm overflow-hidden rounded-xl">
						<NuxtImg
							src="/imagePlaceholder.png"
							class="h-full w-full object-cover object-center"
						/>
					</div>
				</div>
			</div>
			<!-- ! OUR GOAL SECTION END -->
		</div>

		<PageFooter />
	</div>
</template>
