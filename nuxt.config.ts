import pkg from './package.json';
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2026-01-18',
	devtools: {
		enabled: true,

		timeline: {
			enabled: true,
		},
	},
	css: ['~/assets/css/main.css'],
	modules: [
		'@nuxt/eslint',
		'@nuxt/fonts',
		'@nuxt/icon',
		'@nuxt/image',
		'@nuxt/ui',
		'nuxt-nodemailer',
		'nuxt-email-renderer',
		'@nuxtjs/turnstile',
		'nuxt-charts',
		'@formkit/auto-animate/nuxt',
		'@vueuse/nuxt',
		'nuxt-security',
	],

	// Nuxt UI
	ui: {
		colorMode: false,
	},

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
	},

	// Cloudflare Turnstile configuration
	turnstile: {
		siteKey: '',
		addValidateEndpoint: true,
	},

	//Security
	security: {
		rateLimiter: {
			tokensPerInterval: 100,
			interval: 'minute',
		},
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
