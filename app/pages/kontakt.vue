<script lang="ts" setup></script>

<template>
	<div class="flex min-h-screen w-full flex-col">
		<PageHeader />
		<!-- ! CONTACT INFO SECTION -->
		<div class="mb-24 flex w-full flex-col gap-8 bg-gray-200 p-8">
			<div class="text-center">
				<h1 class="text-4xl font-bold">Skontaktuj się z nami!</h1>
				<p>Porozmawiaj z naszą administracją, bądź pracownikami medycznymi</p>
			</div>

			<div class="flex w-full flex-row">
				<!-- Telefon -->
				<div class="flex w-1/3 flex-col items-center justify-start">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600"
					>
						<UIcon name="carbon:phone" class="text-3xl" />
					</div>
					<p>Nr Tel:</p>
					<p>(+48) 123 456 789</p>
				</div>
				<!-- Email -->
				<div class="flex w-1/3 flex-col items-center justify-start">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
					>
						<UIcon name="carbon:email" class="text-3xl" />
					</div>
					<p>Email:</p>
					<p>nazwa.kliniki@domena.pl</p>
				</div>
				<!-- Adres -->
				<div class="flex w-1/3 flex-col items-center justify-start">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600"
					>
						<UIcon name="carbon:location" class="text-3xl" />
					</div>
					<p>Lokalizacja</p>
					<p>ul. Jakaśtam 12</p>
					<p>12-345, Radom</p>
				</div>
			</div>
		</div>
		<!-- ! CONTACT INFO SECTION END -->

		<!-- ! WHY CONTACT US SECTION -->
		<div class="flex w-full gap-8">
			<div class="flex w-1/2 items-center justify-end">
				<div class="flex max-w-md flex-col gap-4">
					<h1 class="text-3xl font-bold">Masz pytania? Chętnie pomożemy</h1>
					<p>
						Nie jesteś pewien, do którego specjalisty się udać? Skontaktuj się z
						nami — doradzimy, pomożemy zapisać wizytę i odpowiemy na wszystkie
						Twoje pytania. Jesteśmy tu, by ułatwić Ci dostęp do potrzebnej
						opieki.
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

		<div class="flex w-full gap-8">
			<div class="flex w-1/2 items-center justify-center pt-8">
				<div class="aspect-square w-full max-w-sm overflow-hidden rounded-xl">
					<NuxtImg
						src="/imagePlaceholder.png"
						class="h-full w-full object-cover object-center"
					/>
				</div>
			</div>
			<div class="flex w-1/2 items-center justify-start">
				<div class="flex max-w-md flex-col gap-4">
					<h1 class="text-3xl font-bold">Opinie mówią same za siebie</h1>
					<p>
						Zaufało nam już wielu pacjentów, którzy cenią nas za profesjonalizm,
						empatię i sprawną obsługę. Jeśli szukasz miejsca, gdzie naprawdę
						liczy się człowiek — napisz lub zadzwoń. Przekonaj się, dlaczego
						warto do nas dołączyć.
					</p>
				</div>
			</div>
		</div>

		<div class="mb-24 flex w-full gap-8">
			<div class="flex w-1/2 items-center justify-end">
				<div class="flex max-w-md flex-col gap-4">
					<h1 class="text-3xl font-bold">
						Dowiedz się, co możemy dla Ciebie zrobić
					</h1>
					<p>
						Nasza oferta to coś więcej niż tylko leczenie — to kompleksowa
						opieka i nowoczesne rozwiązania dopasowane do Twoich potrzeb. Jeden
						kontakt wystarczy, by rozpocząć drogę do lepszego samopoczucia.
						Jesteśmy gotowi, by Ci pomóc.
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
		<!-- ! WHY CONTACT US SECTION END -->

		<PageFooter />
	</div>
</template>

<style></style>
