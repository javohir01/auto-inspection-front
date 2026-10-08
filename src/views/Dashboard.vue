<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { dashboardApi } from '@/api/services';
import { useAuthStore } from '@/stores/auth';
import { useCashBalanceStore } from '@/stores/cashBalance';
import type { InspectionDocument } from '@/types';
import { toApiDate } from '@/utils/dataFormat';

const router = useRouter();
const auth = useAuthStore();
const balanceStore = useCashBalanceStore();
const isAdmin = computed(() => auth.user?.role === 'admin');

const loading = ref(true);
const stats = ref({ branches: 0, counterparties: 0, vehicles: 0, users: 0, documents: 0 });
const recentDocs = ref<InspectionDocument[]>([]);
const todayDocs = ref<InspectionDocument[]>([]);
const cashBalance = computed(() => balanceStore.balance);

const today = toApiDate(new Date()) ?? '';

function money(v: string | number): string {
  return new Intl.NumberFormat('uz-UZ').format(Number(v));
}

const dailyBalance = computed(() => Number(cashBalance.value?.balance || 0));
const totalCash = computed(() => Number(cashBalance.value?.cash_income || 0));
const totalTerminal = computed(() => Number(cashBalance.value?.terminal_income || 0));
const totalExpenses = computed(() => Number(cashBalance.value?.expense_total || 0));
const pendingCount = computed(() => todayDocs.value.filter((d) => d.status === 'pending').length);

const cards = [
  { key: 'branches', labelKey: 'nav.branches', icon: 'pi pi-building', color: 'from-indigo-500 to-blue-500' },
  { key: 'counterparties', labelKey: 'nav.counterparties', icon: 'pi pi-users', color: 'from-emerald-500 to-teal-500' },
  { key: 'vehicles', labelKey: 'nav.vehicles', icon: 'pi pi-car', color: 'from-amber-500 to-orange-500' },
  { key: 'users', labelKey: 'nav.users', icon: 'pi pi-id-card', color: 'from-fuchsia-500 to-pink-500' },
  { key: 'documents', labelKey: 'dashboard.inspectionDocs', icon: 'pi pi-file', color: 'from-sky-500 to-cyan-500' },
] as const;

async function loadDailyBalance(): Promise<void> {
  await balanceStore.refresh({
    branch_id: auth.user?.branch_id ?? null,
    employee_id: auth.user?.id ?? null,
  }, true);
}

async function refreshDashboardBalance(): Promise<void> {
  try {
    await loadDailyBalance();
  } catch { /* Layout keeps the last known balance visible. */ }
}

onMounted(async () => {
  window.addEventListener('cash-balance:refresh', refreshDashboardBalance);
  try {
    const [, summary] = await Promise.all([
      balanceStore.refresh({
        branch_id: auth.user?.branch_id ?? null,
        employee_id: auth.user?.id ?? null,
      }).catch(() => null),
      dashboardApi.summary({ branch_id: auth.user?.branch_id ?? null }),
    ]);
    stats.value = summary.counts;
    todayDocs.value = summary.today_documents;
    recentDocs.value = summary.recent_documents;
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('cash-balance:refresh', refreshDashboardBalance);
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ $t('dashboard.title') }}</h1>
        <p class="text-sm text-slate-400">{{ isAdmin ? $t('dashboard.subtitleAdmin') : today }}</p>
      </div>
      <Button v-if="auth.user?.role !== 'branch_manager'" :label="$t('nav.newDocument')" icon="pi pi-plus" @click="router.push('/wizard')" />
    </div>

    <!-- Admin: system-wide stat cards -->
    <div v-if="isAdmin" class="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <div v-for="c in cards" :key="c.key" class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
        <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white" :class="c.color">
          <i :class="c.icon" />
        </div>
        <div class="text-2xl font-semibold">{{ stats[c.key] }}</div>
        <div class="text-sm text-slate-400">{{ $t(c.labelKey) }}</div>
      </div>
    </div>

    <!-- Daily figures (both roles) -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
        <div class="text-sm text-slate-400">{{ $t('dashboard.dailyBalance') }}</div>
        <div class="mt-2 text-2xl font-bold text-emerald-400">{{ money(dailyBalance) }} <span class="text-sm text-slate-400">{{ $t('common.som') }}</span></div>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
        <div class="text-sm text-slate-400">{{ $t('dashboard.cashTerminal') }}</div>
        <div class="mt-2 text-lg font-semibold">{{ money(totalCash) }} / {{ money(totalTerminal) }}</div>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
        <div class="text-sm text-slate-400">{{ $t('dashboard.todayExpense') }}</div>
        <div class="mt-2 text-2xl font-bold text-rose-400">{{ money(totalExpenses) }} <span class="text-sm text-slate-400">{{ $t('common.som') }}</span></div>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
        <div class="text-sm text-slate-400">{{ $t('dashboard.pendingDocs') }}</div>
        <div class="mt-2 text-2xl font-bold text-amber-400">{{ pendingCount }}</div>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
      <h2 class="mb-4 text-lg font-semibold">{{ isAdmin ? $t('dashboard.recentDocs') : $t('dashboard.todayDocs') }}</h2>
      <DataTable :value="isAdmin ? recentDocs : todayDocs" :loading="loading" size="small" class="text-sm">
        <template #empty><div class="p-6 text-center text-slate-500">{{ $t('dashboard.noDocs') }}</div></template>
        <Column field="doc_number" :header="$t('dashboard.docNumber')" />
        <Column :header="$t('dashboard.vehicle')">
          <template #body="{ data }">{{ data.vehicle?.license_plate ?? '—' }}</template>
        </Column>
        <Column :header="$t('dashboard.client')">
          <template #body="{ data }">{{ data.counterparty?.full_name ?? '—' }}</template>
        </Column>
        <Column field="date" :header="$t('common.date')" />
        <Column :header="$t('common.status')">
          <template #body="{ data }">
            <Tag :value="data.status === 'completed' ? $t('status.completed') : $t('status.pending')" :severity="data.status === 'completed' ? 'success' : 'warn'" />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
