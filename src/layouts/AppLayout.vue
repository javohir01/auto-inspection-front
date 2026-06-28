<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { cashBalanceApi } from '@/api/services';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/composables/useTheme';
import { extractError } from '@/composables/useCrud';
import { translate as t } from '@/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import type { Role, CashBalance } from '@/types';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const toast = useToast();
// Two independent states: desktop collapses the rail to icons, mobile slides
// the full sidebar in as an off-canvas drawer over the content.
const desktopCollapsed = ref(false);
const mobileMenuOpen = ref(false);
const { isDark, toggleTheme } = useTheme();
const cashBalance = ref<CashBalance | null>(null);
const balanceLoading = ref(false);
const safeDialogVisible = ref(false);
const safeSaving = ref(false);
const safeForm = ref({ amount: 0, description: '' });

function toggleSidebar() {
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    desktopCollapsed.value = !desktopCollapsed.value;
  } else {
    mobileMenuOpen.value = !mobileMenuOpen.value;
  }
}

interface NavItem {
  labelKey: string;
  icon: string;
  to: string;
  roles?: Role[];
}

// `roles` undefined => visible to everyone. Otherwise filtered by the user's role.
const allNav: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: 'pi pi-th-large', to: '/' },
  { labelKey: 'nav.documents', icon: 'pi pi-file', to: '/documents', roles: ['admin', 'cashier'] },
  { labelKey: 'nav.payments', icon: 'pi pi-credit-card', to: '/payments', roles: ['admin', 'cashier'] },
  { labelKey: 'nav.expenses', icon: 'pi pi-wallet', to: '/expenses', roles: ['admin', 'cashier'] },
  { labelKey: 'nav.newDocument', icon: 'pi pi-plus-circle', to: '/wizard', roles: ['admin', 'cashier'] },
  { labelKey: 'nav.counterparties', icon: 'pi pi-users', to: '/counterparties', roles: ['admin', 'cashier', 'moderator'] },
  { labelKey: 'nav.vehicles', icon: 'pi pi-car', to: '/vehicles', roles: ['admin', 'cashier', 'moderator'] },
  { labelKey: 'nav.branches', icon: 'pi pi-building', to: '/branches', roles: ['admin'] },
  { labelKey: 'nav.users', icon: 'pi pi-id-card', to: '/users', roles: ['admin'] },
  { labelKey: 'nav.catalogs', icon: 'pi pi-database', to: '/catalogs', roles: ['admin', 'moderator'] },
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
    case 'admin': return t('role.admin');
    case 'moderator': return t('role.moderator');
    case 'cashier': return t('role.cashier');
    default: return '';
  }
});

function money(v: string | number | null | undefined): string {
  return new Intl.NumberFormat('uz-UZ').format(Number(v || 0));
}

async function refreshBalance() {
  if (!auth.user || !['admin', 'cashier'].includes(auth.user.role)) return;

  balanceLoading.value = true;
  try {
    cashBalance.value = await cashBalanceApi.summary({
      branch_id: auth.user.branch_id,
      employee_id: auth.user.id,
    });
  } catch {
    cashBalance.value = null;
  } finally {
    balanceLoading.value = false;
  }
}

function openSafeDeposit() {
  safeForm.value = { amount: Number(cashBalance.value?.balance || 0), description: '' };
  safeDialogVisible.value = true;
}

async function saveSafeDeposit() {
  safeSaving.value = true;
  try {
    const result = await cashBalanceApi.safeDeposit({
      branch_id: auth.user?.branch_id ?? null,
      amount: Number(safeForm.value.amount || 0),
      description: safeForm.value.description || null,
    });
    cashBalance.value = result.summary;
    safeDialogVisible.value = false;
    window.dispatchEvent(new Event('cash-balance:refresh'));
    toast.add({ severity: 'success', summary: t('common.saved'), detail: t('header.depositedToSafe'), life: 3000 });
  } catch (e) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: extractError(e), life: 5000 });
  } finally {
    safeSaving.value = false;
  }
}

async function logout() {
  await auth.logout();
  router.push({ name: 'Login' });
}

onMounted(() => {
  window.addEventListener('cash-balance:refresh', refreshBalance);
  refreshBalance();
});

onBeforeUnmount(() => {
  window.removeEventListener('cash-balance:refresh', refreshBalance);
});

watch(() => route.fullPath, () => refreshBalance());
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
        <span class="text-lg font-semibold tracking-tight" :class="{ 'lg:hidden': desktopCollapsed }">{{ $t('header.appName') }}</span>
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
          <span :class="{ 'lg:hidden': desktopCollapsed }">{{ $t(item.labelKey) }}</span>
        </RouterLink>
      </nav>

      <div class="border-t border-slate-800 p-3">
        <button
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800/70 hover:text-white"
          @click="logout"
        >
          <i class="pi pi-sign-out text-base" />
          <span :class="{ 'lg:hidden': desktopCollapsed }">{{ $t('nav.logout') }}</span>
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
            :aria-label="$t('header.menu')"
            @click="toggleSidebar"
          >
            <i class="pi pi-bars" />
          </button>
          <button
            v-tooltip.bottom="isDark ? $t('header.lightMode') : $t('header.darkMode')"
            class="app-icon-button flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            type="button"
            @click="toggleTheme"
          >
            <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'" />
          </button>
          <LanguageSwitcher />
        </div>

        <div class="flex min-w-0 items-center gap-3">
          <div v-if="cashBalance" class="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs md:flex">
            <span class="text-slate-400">{{ $t('header.daily') }}</span>
            <span class="font-semibold text-emerald-300">{{ money(cashBalance.balance) }}</span>
            <span class="hidden text-slate-600 xl:inline">|</span>
            <span class="hidden text-slate-400 xl:inline">{{ $t('header.cash') }} {{ money(cashBalance.cash_income) }}</span>
            <span class="hidden text-slate-400 xl:inline">{{ $t('header.terminal') }} {{ money(cashBalance.terminal_income) }}</span>
            <span class="hidden text-slate-400 xl:inline">{{ $t('header.safe') }} {{ money(cashBalance.safe_balance) }}</span>
          </div>
          <Button
            v-if="cashBalance"
            icon="pi pi-lock"
            text
            rounded
            size="small"
            :loading="balanceLoading"
            v-tooltip.bottom="$t('header.safeDeposit')"
            @click="openSafeDeposit"
          />
          <span v-if="auth.isMock" class="hidden sm:inline-flex"><Tag :value="$t('header.mockData')" severity="contrast" /></span>
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

    <Dialog v-model:visible="safeDialogVisible" modal :header="$t('header.safeDeposit')" class="w-full max-w-md">
      <div class="space-y-4 pt-2">
        <div class="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">
          {{ $t('header.dailyBalance') }}: <span class="font-semibold text-emerald-300">{{ money(cashBalance?.balance) }} {{ $t('common.som') }}</span>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('common.amount') }}</label>
          <InputNumber v-model="safeForm.amount" class="w-full" :min="1" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('common.note') }}</label>
          <Textarea v-model="safeForm.description" class="w-full" rows="2" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="safeDialogVisible = false" />
        <Button :label="$t('header.deposit')" icon="pi pi-check" :loading="safeSaving" @click="saveSafeDeposit" />
      </template>
    </Dialog>
  </div>
</template>
