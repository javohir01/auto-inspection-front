import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { getToken } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import type { Role } from '@/types';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Dashboard', component: () => import('@/views/Dashboard.vue') },
      // Cashier operations (admin may also use them)
      { path: 'wizard', name: 'Wizard', component: () => import('@/views/Wizard.vue'), meta: { roles: ['admin', 'cashier'] } },
      { path: 'documents', name: 'Documents', component: () => import('@/views/Documents.vue'), meta: { roles: ['admin', 'cashier'] } },
      { path: 'payments', name: 'Payments', component: () => import('@/views/Payments.vue'), meta: { roles: ['admin', 'cashier'] } },
      // Shared
      { path: 'counterparties', name: 'Counterparties', component: () => import('@/views/Counterparties.vue'), meta: { roles: ['admin', 'cashier', 'moderator'] } },
      { path: 'vehicles', name: 'Vehicles', component: () => import('@/views/Vehicles.vue'), meta: { roles: ['admin', 'cashier', 'moderator'] } },
      { path: 'expenses', name: 'Expenses', component: () => import('@/views/Expenses.vue'), meta: { roles: ['admin', 'cashier'] } },
      // Admin / catalog management
      { path: 'branches', name: 'Branches', component: () => import('@/views/Branches.vue'), meta: { roles: ['admin'] } },
      { path: 'users', name: 'Users', component: () => import('@/views/Users.vue'), meta: { roles: ['admin'] } },
      { path: 'catalogs', name: 'Catalogs', component: () => import('@/views/Catalogs.vue'), meta: { roles: ['admin', 'moderator'] } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const authed = !!getToken();

  if (to.meta.guest) {
    return authed ? { name: 'Dashboard' } : true;
  }

  if (to.meta.requiresAuth && !authed) {
    return { name: 'Login' };
  }

  // Ensure the profile (and therefore the role) is loaded before role checks.
  const auth = useAuthStore();
  if (authed && !auth.user) {
    try {
      await auth.fetchMe();
    } catch {
      return { name: 'Login' };
    }
  }

  const allowed = to.meta.roles as Role[] | undefined;
  if (allowed && auth.user && !allowed.includes(auth.user.role)) {
    return { name: 'Dashboard' };
  }

  return true;
});

export default router;
