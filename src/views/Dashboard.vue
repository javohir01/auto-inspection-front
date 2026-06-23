<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  branchesApi,
  counterpartiesApi,
  vehiclesApi,
  usersApi,
  inspectionDocumentsApi,
  cashBalanceApi,
} from '@/api/services';
import { useAuthStore } from '@/stores/auth';
import type { InspectionDocument, CashBalance } from '@/types';

const router = useRouter();
const auth = useAuthStore();
const isAdmin = computed(() => auth.user?.role === 'admin');

const loading = ref(true);
const stats = ref({ branches: 0, counterparties: 0, vehicles: 0, users: 0, documents: 0 });
const recentDocs = ref<InspectionDocument[]>([]);
const todayDocs = ref<InspectionDocument[]>([]);
const cashBalance = ref<CashBalance | null>(null);

const today = new Date().toISOString().slice(0, 10);

function money(v: string | number): string {
  return new Intl.NumberFormat('uz-UZ').format(Number(v));
}

const dailyBalance = computed(() => Number(cashBalance.value?.balance || 0));
const totalCash = computed(() => Number(cashBalance.value?.cash_income || 0));
const totalTerminal = computed(() => Number(cashBalance.value?.terminal_income || 0));
const totalExpenses = computed(() => Number(cashBalance.value?.expense_total || 0));
const pendingCount = computed(() => todayDocs.value.filter((d) => d.status === 'pending').length);

const cards = [
  { key: 'branches', label: 'Filiallar', icon: 'pi pi-building', color: 'from-indigo-500 to-blue-500' },
  { key: 'counterparties', label: 'Mijozlar', icon: 'pi pi-users', color: 'from-emerald-500 to-teal-500' },
  { key: 'vehicles', label: 'Avtomobillar', icon: 'pi pi-car', color: 'from-amber-500 to-orange-500' },
  { key: 'users', label: 'Xodimlar', icon: 'pi pi-id-card', color: 'from-fuchsia-500 to-pink-500' },
  { key: 'documents', label: 'Ko‘rik hujjatlari', icon: 'pi pi-file', color: 'from-sky-500 to-cyan-500' },
] as const;

async function loadDailyBalance(): Promise<void> {
  cashBalance.value = await cashBalanceApi.summary({
    branch_id: auth.user?.branch_id ?? null,
    employee_id: auth.user?.id ?? null,
    date: today,
  });
}

async function refreshDashboardBalance(): Promise<void> {
  try {
    await loadDailyBalance();
  } catch {
    cashBalance.value = null;
  }
}

onMounted(async () => {
  window.addEventListener('cash-balance:refresh', refreshDashboardBalance);
  try {
    [cashBalance.value, todayDocs.value] = await Promise.all([
      cashBalanceApi.summary({
        branch_id: auth.user?.branch_id ?? null,
        employee_id: auth.user?.id ?? null,
        date: today,
      }).catch(() => null),
      inspectionDocumentsApi.list({ start_date: today, end_date: today }),
    ]);

    if (isAdmin.value) {
      const [branches, counterparties, vehicles, users, documents] = await Promise.all([
        branchesApi.list(),
        counterpartiesApi.list(),
        vehiclesApi.list(),
        usersApi.list().catch(() => []),
        inspectionDocumentsApi.list(),
      ]);
      stats.value = {
        branches: branches.length,
        counterparties: counterparties.length,
        vehicles: vehicles.length,
        users: users.length,
        documents: documents.length,
      };
      recentDocs.value = documents.slice(0, 8);
    }
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
        <h1 class="text-2xl font-semibold tracking-tight">Boshqaruv paneli</h1>
        <p class="text-sm text-slate-400">{{ isAdmin ? 'Tizim bo‘yicha umumiy ko‘rsatkichlar' : today }}</p>
      </div>
      <Button v-if="auth.user?.role !== 'moderator'" label="Yangi hujjat" icon="pi pi-plus" @click="router.push('/wizard')" />
    </div>

    <!-- Admin: system-wide stat cards -->
    <div v-if="isAdmin" class="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <div v-for="c in cards" :key="c.key" class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
        <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white" :class="c.color">
          <i :class="c.icon" />
        </div>
        <div class="text-2xl font-semibold">{{ stats[c.key] }}</div>
        <div class="text-sm text-slate-400">{{ c.label }}</div>
      </div>
    </div>

    <!-- Daily figures (both roles) -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
        <div class="text-sm text-slate-400">Kunlik qoldiq</div>
        <div class="mt-2 text-2xl font-bold text-emerald-400">{{ money(dailyBalance) }} <span class="text-sm text-slate-400">so‘m</span></div>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
        <div class="text-sm text-slate-400">Naqd / Terminal</div>
        <div class="mt-2 text-lg font-semibold">{{ money(totalCash) }} / {{ money(totalTerminal) }}</div>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
        <div class="text-sm text-slate-400">Bugungi xarajat</div>
        <div class="mt-2 text-2xl font-bold text-rose-400">{{ money(totalExpenses) }} <span class="text-sm text-slate-400">so‘m</span></div>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
        <div class="text-sm text-slate-400">Kutilayotgan hujjatlar</div>
        <div class="mt-2 text-2xl font-bold text-amber-400">{{ pendingCount }}</div>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
      <h2 class="mb-4 text-lg font-semibold">{{ isAdmin ? 'So‘nggi ko‘rik hujjatlari' : 'Bugungi ko‘rik hujjatlari' }}</h2>
      <DataTable :value="isAdmin ? recentDocs : todayDocs" :loading="loading" size="small" paginator :rows="8" class="text-sm">
        <template #empty><div class="p-6 text-center text-slate-500">Hujjatlar yo‘q</div></template>
        <Column field="doc_number" header="Hujjat №" />
        <Column header="Avtomobil">
          <template #body="{ data }">{{ data.vehicle?.license_plate ?? '—' }}</template>
        </Column>
        <Column header="Mijoz">
          <template #body="{ data }">{{ data.counterparty?.full_name ?? '—' }}</template>
        </Column>
        <Column field="date" header="Sana" />
        <Column header="Holat">
          <template #body="{ data }">
            <Tag :value="data.status === 'completed' ? 'Tugatilgan' : 'Kutilmoqda'" :severity="data.status === 'completed' ? 'success' : 'warn'" />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
