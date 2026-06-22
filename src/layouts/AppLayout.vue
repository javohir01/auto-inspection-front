<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/composables/useTheme';
import type { Role } from '@/types';

const router = useRouter();
const auth = useAuthStore();
// Two independent states: desktop collapses the rail to icons, mobile slides
// the full sidebar in as an off-canvas drawer over the content.
const desktopCollapsed = ref(false);
const mobileMenuOpen = ref(false);
const { isDark, toggleTheme } = useTheme();

function toggleSidebar() {
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    desktopCollapsed.value = !desktopCollapsed.value;
  } else {
    mobileMenuOpen.value = !mobileMenuOpen.value;
  }
}

interface NavItem {
  label: string;
  icon: string;
  to: string;
  roles?: Role[];
}

// `roles` undefined => visible to everyone. Otherwise filtered by the user's role.
const allNav: NavItem[] = [
  { label: 'Bosh sahifa', icon: 'pi pi-th-large', to: '/' },
  { label: 'Hujjatlar', icon: 'pi pi-file', to: '/documents', roles: ['admin', 'cashier'] },
  { label: 'To‘lovlar', icon: 'pi pi-credit-card', to: '/payments', roles: ['admin', 'cashier'] },
  { label: 'Xarajatlar', icon: 'pi pi-wallet', to: '/expenses', roles: ['admin', 'cashier'] },
  { label: 'Ma’lumotnomalar', icon: 'pi pi-database', to: '/catalogs', roles: ['admin', 'moderator'] },
  { label: 'Yangi ko‘rik', icon: 'pi pi-plus-circle', to: '/wizard', roles: ['admin', 'cashier'] },
  { label: 'Mijozlar', icon: 'pi pi-users', to: '/counterparties', roles: ['admin', 'cashier', 'moderator'] },
  { label: 'Avtomobillar', icon: 'pi pi-car', to: '/vehicles', roles: ['admin', 'cashier', 'moderator'] },
  { label: 'Filiallar', icon: 'pi pi-building', to: '/branches', roles: ['admin'] },
  { label: 'Xodimlar', icon: 'pi pi-id-card', to: '/users', roles: ['admin'] },
];

const nav = computed(() => {
  const role = auth.user?.role;
  return allNav.filter((item) => !item.roles || (role && item.roles.includes(role)));
});

const initials = computed(() => {
  const name = auth.user?.name ?? '';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'A';
});

const roleLabel = computed(() => {
  switch (auth.user?.role) {
    case 'admin': return 'Administrator';
    case 'moderator': return 'Moderator';
    case 'cashier': return 'Kassir';
    default: return '';
  }
});

async function logout() {
  await auth.logout();
  router.push({ name: 'Login' });
}
</script>

<template>
  <div class="app-shell flex min-h-screen bg-[#0b0f19] text-slate-100">
    <!-- Mobile backdrop (only while the drawer is open on small screens) -->
    <div
      v-if="mobileMenuOpen"
      class="fixed inset-0 z-40 bg-black/50 lg:hidden"
      @click="mobileMenuOpen = false"
    />

    <!-- Sidebar: off-canvas drawer below lg, static collapsible rail at lg+ -->
    <aside
      class="app-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-[#0e1320] transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:transition-[width]"
      :class="[
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        desktopCollapsed ? 'lg:w-20' : 'lg:w-64',
      ]"
    >
      <div class="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500">
          <i class="pi pi-car" />
        </div>
        <span class="text-lg font-semibold tracking-tight" :class="{ 'lg:hidden': desktopCollapsed }">Avto Ko‘rik</span>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800/70 hover:text-white"
          active-class="!bg-indigo-500/15 !text-indigo-300"
          exact-active-class="!bg-indigo-500/15 !text-indigo-300"
          @click="mobileMenuOpen = false"
        >
          <i :class="item.icon" class="text-base" />
          <span :class="{ 'lg:hidden': desktopCollapsed }">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="border-t border-slate-800 p-3">
        <button
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800/70 hover:text-white"
          @click="logout"
        >
          <i class="pi pi-sign-out text-base" />
          <span :class="{ 'lg:hidden': desktopCollapsed }">Chiqish</span>
        </button>
      </div>
    </aside>

    <!-- Main column -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="app-header flex h-16 items-center justify-between gap-3 border-b border-slate-800 bg-[#0e1320]/80 px-4 backdrop-blur sm:px-6">
        <div class="flex items-center gap-2">
          <button
            class="app-icon-button flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            type="button"
            aria-label="Menyu"
            @click="toggleSidebar"
          >
            <i class="pi pi-bars" />
          </button>
          <button
            v-tooltip.bottom="isDark ? 'Light mode' : 'Dark mode'"
            class="app-icon-button flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            type="button"
            @click="toggleTheme"
          >
            <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'" />
          </button>
        </div>

        <div class="flex min-w-0 items-center gap-3">
          <span v-if="auth.isMock" class="hidden sm:inline-flex"><Tag value="Mock data" severity="contrast" /></span>
          <div class="hidden min-w-0 text-right sm:block">
            <div class="truncate text-sm font-semibold leading-tight">{{ auth.user?.name }}</div>
            <div class="truncate text-xs text-slate-400">{{ roleLabel }}<span v-if="auth.user?.branch"> · {{ auth.user.branch.name }}</span></div>
          </div>
          <Avatar :label="initials" shape="circle" class="shrink-0 !bg-indigo-500 !text-white" />
        </div>
      </header>

      <main class="flex-1 overflow-auto p-4 sm:p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
