import { authClient } from '~~/lib/auth-client';

export default defineNuxtRouteMiddleware(async (to) => {
	const { data: session } = await authClient.useSession(useFetch);
	const role = session.value?.user?.role;
	const isLoggedIn = session.value?.user;

	const publicPages = [
		'/',
		'/login',
		'/register',
		'/change-password',
		'/verify-email',
	];
	const isPublicPage = publicPages.includes(to.path);
	const roleHomePage = role ? `/${role}/home` : '/';

	// Allow /login?logout=true for logged in users. Logout redirects there
	if (to.path === '/login' && to.query.logout === 'true') {
		return;
	}

	// Logged in user trying to access public page → redirect to role home
	if (isLoggedIn && isPublicPage) {
		return navigateTo(roleHomePage, { replace: true });
	}

	// Not logged in user → allow public pages, redirect to login otherwise
	if (!isLoggedIn) {
		if (isPublicPage) return;
		return navigateTo('/login', { replace: true });
	}

	// Logged in user → check RBAC
	const roleRoutes: Record<string, string> = {
		admin: '/admin/',
		doctor: '/doctor/',
		user: '/user/',
		receptionist: '/receptionist/',
	};

	const requiredRole = Object.entries(roleRoutes).find(([_, prefix]) =>
		to.path.startsWith(prefix)
	)?.[0];

	// If route requires a specific role and user doesn't have it → redirect to their home
	if (requiredRole && requiredRole !== role) {
		return navigateTo(roleHomePage, { replace: true });
	}
});
