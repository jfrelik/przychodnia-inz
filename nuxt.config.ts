// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2024-11-01',
	devtools: { enabled: true },
	css: ['~/assets/css/main.css'],

	colorMode: {
		preference: 'light',
		fallback: 'light',
	},

	nitro: {
		experimental: {
			openAPI: true,
		},
	},

	routeRules: {
		'/docs/**': { ssr: false },
	},

	modules: [
		'@nuxt/eslint',
		'@nuxt/fonts',
		'@nuxt/icon',
		'@nuxt/image',
		'@nuxt/test-utils',
		'@nuxt/ui',
		'@scalar/nuxt',
	],

	// Nitro OpenAPI runtime metadata
	runtimeConfig: {
		nitro: {
			openAPI: {
				meta: {
					title: 'Przychodnia API',
					description: 'Auto-generated OpenAPI from Nitro route meta',
				},
			},
		},
	},

	// Scalar API Reference configuration
	scalar: {
		pathRouting: { basePath: '/docs' },
		url: '/_openapi.json',
		theme: 'nuxt',
		darkMode: true,
	},
});
