import { authClient } from '~~/lib/auth-client';

export default defineNuxtRouteMiddleware(async (to, from) => {
	const { data: session } = await authClient.useSession(useFetch);
	const role = session.value?.user?.role;
	const publicPages = ['/', '/login', '/register'];

	// Allow public pages
	if (publicPages.includes(to.path)) return;

	if (!session.value?.user) return navigateTo('/login', { replace: true });

	if (to.path.startsWith('/admin/') && role !== 'admin')
		return navigateTo('/', { replace: true });
	if (to.path.startsWith('/doctor/') && role !== 'doctor')
		return navigateTo('/', { replace: true });
	if (to.path.startsWith('/user/') && role !== 'user')
		return navigateTo('/', { replace: true });
	if (to.path.startsWith('/receptionist/') && role !== 'receptionist')
		return navigateTo('/', { replace: true });
});
