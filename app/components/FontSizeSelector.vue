<script lang="ts" setup>
	type FontSize = 'small' | 'medium' | 'large';

	const props = defineProps<{
		collapsed: boolean;
		popoverSide?: 'top' | 'right';
	}>();

	const fontSize = useState<FontSize>('fontSize', () => 'medium');

	const fontSizeOptions: { value: FontSize; label: string; icon: string }[] = [
		{ value: 'small', label: 'Mały', icon: 'lucide:a-arrow-down' },
		{ value: 'medium', label: 'Normalny', icon: 'lucide:type' },
		{ value: 'large', label: 'Duży', icon: 'lucide:a-arrow-up' },
	];

	const applyFontSize = (size: FontSize) => {
		fontSize.value = size;
		if (import.meta.client) {
			const root = document.documentElement;
			// Remove all font size classes first
			root.classList.remove(
				'app-font-small',
				'app-font-medium',
				'app-font-large'
			);
			// Add the new class
			root.classList.add(`app-font-${size}`);
			// Persist to localStorage
			localStorage.setItem('app-font-size', size);
		}
	};

	onMounted(() => {
		const savedSize = localStorage.getItem('app-font-size') as FontSize | null;
		if (savedSize && ['small', 'medium', 'large'].includes(savedSize)) {
			applyFontSize(savedSize);
		} else {
			applyFontSize(fontSize.value);
		}
	});

	const currentIcon = computed(
		() =>
			fontSizeOptions.find((opt) => opt.value === fontSize.value)?.icon ??
			'lucide:type'
	);

	const currentLabel = computed(
		() =>
			fontSizeOptions.find((opt) => opt.value === fontSize.value)?.label ??
			'Normalny'
	);
</script>

<template>
	<UPopover :content="{ align: 'center', side: popoverSide }">
		<UTooltip
			v-if="collapsed"
			text="Rozmiar czcionki"
			:content="{ side: 'right', sideOffset: 8 }"
		>
			<UButton
				color="neutral"
				variant="ghost"
				class="w-full cursor-pointer"
				block
				:icon="currentIcon"
			/>
		</UTooltip>
		<UButton
			v-else
			color="neutral"
			variant="ghost"
			class="w-full cursor-pointer justify-start"
			:icon="currentIcon"
		>
			Rozmiar: {{ currentLabel }}
		</UButton>

		<template #content>
			<div class="flex flex-col gap-1 p-2">
				<p class="mb-1 px-2 text-xs font-medium text-neutral-500">
					Rozmiar czcionki
				</p>
				<UButton
					v-for="option in fontSizeOptions"
					:key="option.value"
					color="neutral"
					:variant="fontSize === option.value ? 'soft' : 'ghost'"
					class="w-full cursor-pointer justify-start"
					:icon="option.icon"
					@click="applyFontSize(option.value)"
				>
					{{ option.label }}
				</UButton>
			</div>
		</template>
	</UPopover>
</template>
