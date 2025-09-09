import { authClient } from '~~/lib/auth-client';

export default defineNuxtRouteMiddleware(async (to, from) => {
	const { data: session } = await authClient.useSession(useFetch);

	const isDev = import.meta.dev;
	const publicPaths = [
		'/login',
		'/register',
		'/commute',
		'/contactUs',
		'/openapi.yaml',
		'/openapi.json',
		'/_openapi.json',
	];

	const isPublic =
		publicPaths.includes(to.path) || (isDev && to.path.startsWith('/docs'));

	if (!session.value && !isPublic) {
		return navigateTo('/register');
	}

	if (to.path.startsWith('/admin') && session.value?.user.role !== 'admin') {
		console.log(
			`User ${session.value?.user.email} attemped to access route ${to.path} without proper roles required`
		);
		return false;
	}

	if (to.path.startsWith('/user') && session.value?.user.role !== 'user') {
		console.log(
			`User ${session.value?.user.email} attemped to access route ${to.path} without proper roles required`
		);
		return false;
	}

	if (to.path.startsWith('/doctor') && session.value?.user.role !== 'doctor') {
		console.log(
			`User ${session.value?.user.email} attemped to access route ${to.path} without proper roles required`
		);
		return false;
	}
});
