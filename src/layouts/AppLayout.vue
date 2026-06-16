<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import type { Role } from '@/types';

const router = useRouter();
const auth = useAuthStore();
const sidebarOpen = ref(true);

interface NavItem {
  label: string;
  icon: string;
  to: string;
  roles?: Role[];
}

// `roles` undefined => visible to everyone. Otherwise filtered by the user's role.
const allNav: NavItem[] = [
  { label: 'Boshqaruv paneli', icon: 'pi pi-th-large', to: '/' },
  { label: 'Yangi ko‘rik', icon: 'pi pi-plus-circle', to: '/wizard', roles: ['admin', 'cashier'] },
  { label: 'Ko‘rik hujjatlari', icon: 'pi pi-file', to: '/documents', roles: ['admin', 'cashier'] },
  { label: 'To‘lovlar', icon: 'pi pi-credit-card', to: '/payments', roles: ['admin', 'cashier'] },
  { label: 'Mijozlar', icon: 'pi pi-users', to: '/counterparties', roles: ['admin', 'cashier', 'moderator'] },
  { label: 'Avtomobillar', icon: 'pi pi-car', to: '/vehicles', roles: ['admin', 'cashier', 'moderator'] },
  { label: 'Xarajatlar', icon: 'pi pi-wallet', to: '/expenses', roles: ['admin', 'cashier'] },
  { label: 'Filiallar', icon: 'pi pi-building', to: '/branches', roles: ['admin'] },
  { label: 'Xodimlar', icon: 'pi pi-id-card', to: '/users', roles: ['admin'] },
  { label: 'Ma’lumotnomalar', icon: 'pi pi-database', to: '/catalogs', roles: ['admin', 'moderator'] },
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
  <div class="flex min-h-screen bg-[#0b0f19] text-slate-100">
    <!-- Sidebar -->
    <aside
      class="flex flex-col border-r border-slate-800 bg-[#0e1320] transition-all duration-200"
      :class="sidebarOpen ? 'w-64' : 'w-20'"
    >
      <div class="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500">
          <i class="pi pi-car" />
        </div>
        <span v-if="sidebarOpen" class="text-lg font-semibold tracking-tight">Avto Ko‘rik</span>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800/70 hover:text-white"
          active-class="!bg-indigo-500/15 !text-indigo-300"
          exact-active-class="!bg-indigo-500/15 !text-indigo-300"
        >
          <i :class="item.icon" class="text-base" />
          <span v-if="sidebarOpen">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="border-t border-slate-800 p-3">
        <button
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800/70 hover:text-white"
          @click="logout"
        >
          <i class="pi pi-sign-out text-base" />
          <span v-if="sidebarOpen">Chiqish</span>
        </button>
      </div>
    </aside>

    <!-- Main column -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-16 items-center justify-between border-b border-slate-800 bg-[#0e1320]/80 px-6 backdrop-blur">
        <button
          class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          @click="sidebarOpen = !sidebarOpen"
        >
          <i class="pi pi-bars" />
        </button>

        <div class="flex items-center gap-3">
          <div class="text-right">
            <div class="text-sm font-semibold leading-tight">{{ auth.user?.name }}</div>
            <div class="text-xs text-slate-400">{{ roleLabel }}<span v-if="auth.user?.branch"> · {{ auth.user.branch.name }}</span></div>
          </div>
          <Avatar :label="initials" shape="circle" class="!bg-indigo-500 !text-white" />
        </div>
      </header>

      <main class="flex-1 overflow-auto p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
