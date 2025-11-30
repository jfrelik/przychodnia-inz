import pkg from './package.json';
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-10-10',
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
	],

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
});
