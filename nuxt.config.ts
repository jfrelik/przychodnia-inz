import pkg from './package.json';
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-10-10',
	devtools: {
		enabled: true,

		timeline: {
			enabled: true,
		},
	},
	css: ['~/assets/css/main.css'],

	colorMode: {
		preference: 'light',
		fallback: 'light',
	},

	modules: [
		'@nuxt/eslint',
		'@nuxt/fonts',
		'@nuxt/icon',
		'@nuxt/image',
		'@nuxt/test-utils',
		'@nuxt/ui',
		'nuxt-nodemailer',
		'nuxt-email-renderer',
		'@nuxtjs/turnstile',
		'nuxt-charts',
		'@formkit/auto-animate/nuxt',
		'@vueuse/nuxt',
	],

	routeRules: {
		'/': {
			swr: 3600, // cache homepage for 1 hour
		},
	},

	// Nitro OpenAPI runtime metadata
	runtimeConfig: {
		public: {
			appVersion: pkg.version,
		},
		defaultAdminEmail: 'admin@example.com',
		nitro: {
			openAPI: {
				meta: {
					title: 'Przychodnia API',
					description: 'Auto-generated OpenAPI from Nitro route meta',
				},
			},
		},
	},

	// Cloudflare Turnstile configuration
	turnstile: {
		siteKey: '0x4AAAAAAB7eRFhXHU1Ycfzv',
		addValidateEndpoint: true,
	},

	// Nuxt Nodemailer configuration
	nodemailer: {
		from: '',
		host: '',
		port: 25,
		secure: false,
		auth: {
			user: '',
			pass: '',
		},
	},

	// Nitro
	nitro: {
		experimental: {
			tasks: true,
		},
		scheduledTasks: {
			// Run `visit:reminder` task at everyday at 6:00 AM
			'0 6 * * *': ['visit:reminder'],
		},
	},
});
