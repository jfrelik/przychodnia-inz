<template>
	<div class="flex flex-col gap-4 px-4 pb-4">
		<!-- Top part -->
		<div class="grid grid-cols-2 gap-4">
			<UCard>
				<div class="flex items-center justify-between pb-6">
					<h1 class="text-2xl font-bold">Nadchodzące wizyty</h1>
					<UButton variant="soft" color="neutral" class="w-fit cursor-pointer">
						Pokaż wszystkie
					</UButton>
				</div>

				<div class="flex flex-col gap-4">
					<UCard>
						<div class="flex items-center justify-between gap-4">
							<div class="flex items-center gap-4">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-3xl"
								>
									<Icon
										name="carbon:calendar"
										class-name="w-6 h-6 text-blue-600"
									/>
								</div>

								<div class="flex flex-col">
									<h1 class="text-xl font-bold">Wizyta X</h1>
									<p>Dr. Jakis Tam</p>
									<div class="flex flex-row gap-4">
										<p>11.11.2025</p>
										<p>14:45</p>
										<UBadge variant="subtle">W placówce</UBadge>
									</div>
								</div>
							</div>

							<UButton
								variant="soft"
								color="neutral"
								icon="carbon:view"
								size="xl"
								class="cursor-pointer"
							/>
						</div>
					</UCard>

					<UCard>
						<div class="flex items-center justify-between gap-4">
							<div class="flex items-center gap-4">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-3xl"
								>
									<Icon
										name="carbon:calendar"
										class-name="w-6 h-6 text-blue-600"
									/>
								</div>

								<div class="flex flex-col">
									<h1 class="text-xl font-bold">Wizyta X</h1>
									<p>Dr. Jakis Tam</p>
									<div class="flex flex-row gap-4">
										<p>11.11.2025</p>
										<p>14:45</p>
										<UBadge variant="subtle">W placówce</UBadge>
									</div>
								</div>
							</div>

							<UButton
								variant="soft"
								color="neutral"
								icon="carbon:view"
								size="xl"
								class="cursor-pointer"
							/>
						</div>
					</UCard>
				</div>
			</UCard>

			<UCard>
				<div class="flex items-center justify-between pb-6">
					<h1 class="text-2xl font-bold">Ostatnie wyniki badań</h1>
					<UButton variant="soft" color="neutral" class="w-fit cursor-pointer">
						Pokaż wszystkie
					</UButton>
				</div>
				<div class="flex flex-col gap-4">
					<UCard>
						<div class="flex items-center justify-between gap-4">
							<!-- Left: Icon + Text -->
							<div class="flex items-center gap-4">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-3xl"
								>
									<Icon
										name="carbon:result"
										class-name="w-6 h-6 text-yellow-600"
									/>
								</div>
								<div class="flex flex-col">
									<h1 class="text-xl font-bold">Badanie krwi</h1>
									<p>Data badania: 11.11.2025</p>
								</div>
							</div>

							<!-- Right: Button -->
							<UButton
								variant="soft"
								color="neutral"
								icon="carbon:view"
								size="xl"
								class="cursor-pointer"
							></UButton>
						</div>
					</UCard>

					<UCard>
						<div class="flex items-center justify-between gap-4">
							<!-- Left: Icon + Text -->
							<div class="flex items-center gap-4">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-3xl"
								>
									<Icon
										name="carbon:result"
										class-name="w-6 h-6 text-yellow-600"
									/>
								</div>
								<div class="flex flex-col">
									<h1 class="text-xl font-bold">Badanie krwi</h1>
									<p>Data badania: 11.11.2025</p>
								</div>
							</div>

							<!-- Right: Button -->
							<UButton
								variant="soft"
								color="neutral"
								icon="carbon:view"
								size="xl"
								class="cursor-pointer"
							></UButton>
						</div>
					</UCard>
				</div>
			</UCard>
		</div>

		<!-- Bottom part -->
		<div>
			<UCard>
				<div class="flex items-center justify-between pb-6">
					<h1 class="text-2xl font-bold">Aktywne recepty</h1>
					<UButton variant="soft" color="neutral" class="w-fit cursor-pointer">
						Pokaż wszystkie
					</UButton>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<UCard>
						<div class="flex items-center justify-between gap-4">
							<!-- Left: Icon + Info -->
							<div class="flex items-center gap-4">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-3xl"
								>
									<Icon
										name="carbon:pills"
										class-name="w-6 h-6 text-green-600"
									/>
								</div>
								<div class="flex flex-col">
									<h1 class="text-xl font-bold">Lipitor</h1>
									<p>Data wystawienia: 06.07.2025</p>
									<p>Ważna do: 30.08.2025</p>
								</div>
							</div>

							<!-- Right: Button -->
							<UButton
								variant="soft"
								color="neutral"
								icon="carbon:view"
								size="xl"
								class="cursor-pointer"
							></UButton>
						</div>
					</UCard>

					<UCard>
						<div class="flex items-center justify-between gap-4">
							<!-- Left: Icon + Info -->
							<div class="flex items-center gap-4">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-3xl"
								>
									<Icon
										name="carbon:pills"
										class-name="w-6 h-6 text-green-600"
									/>
								</div>
								<div class="flex flex-col">
									<h1 class="text-xl font-bold">Lipitor</h1>
									<p>Data wystawienia: 06.07.2025</p>
									<p>Ważna do: 30.08.2025</p>
								</div>
							</div>

							<!-- Right: Button -->
							<UButton
								variant="soft"
								color="neutral"
								icon="carbon:view"
								size="xl"
								class="cursor-pointer"
							></UButton>
						</div>
					</UCard>

					<UCard>
						<div class="flex items-center justify-between gap-4">
							<!-- Left: Icon + Info -->
							<div class="flex items-center gap-4">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-3xl"
								>
									<Icon
										name="carbon:pills"
										class-name="w-6 h-6 text-green-600"
									/>
								</div>
								<div class="flex flex-col">
									<h1 class="text-xl font-bold">Lipitor</h1>
									<p>Data wystawienia: 06.07.2025</p>
									<p>Ważna do: 30.08.2025</p>
								</div>
							</div>

							<!-- Right: Button -->
							<UButton
								variant="soft"
								color="neutral"
								icon="carbon:view"
								size="xl"
								class="cursor-pointer"
							></UButton>
						</div>
					</UCard>
				</div>
			</UCard>
		</div>
	</div>
</template>

<script lang="ts" setup></script>

<style></style>
