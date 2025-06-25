<script setup lang="ts"></script>

<template>
	<div class="flex min-h-screen w-full flex-col">
		<PageHeader />
		<div
			class="flex h-[400px] w-full flex-col items-start justify-center bg-[url('/mainPageImagePlaceholder.png')] bg-cover bg-center px-8 py-8 text-white"
		>
			<div class="w-full max-w-[40%] space-y-4 text-left">
				<h1 class="text-3xl font-bold">
					Twoje zdrowie jest naszym priorytetem
				</h1>
				<p>
					Odkryj nowoczesną opiekę zdrowotną dzięki naszemu kompleksowemu
					portalowi medycznemu. Uzyskaj dostęp do dokumentacji medycznej,
					umawiaj wizyty, zarządzaj receptami i kontaktuj się z naszymi
					specjalistami – wszystko w jednym miejscu.
				</p>
				<UButton size="xl" to="/register" class="w-max">
					Zarejestruj się
				</UButton>
			</div>
		</div>

		<div class="flex flex-col gap-4 p-8">
			<p>
				Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
				tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
				veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
				commodo consequat. Duis aute irure dolor in reprehenderit in voluptate
				velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint
				occaecat cupidatat non proident, sunt in culpa qui officia deserunt
				mollit anim id est laborum.
			</p>
			<p>some content</p>
			<p>some content</p>
			<p>
				Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
				tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
				veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
				commodo consequat.
			</p>
			<p>some content</p>
			<p>some content</p>
		</div>

		<PageFooter />
	</div>
</template>
