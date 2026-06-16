<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  branchesApi,
  counterpartiesApi,
  vehiclesApi,
  usersApi,
  inspectionDocumentsApi,
  paymentsApi,
  expensesApi,
} from '@/api/services';
import { useAuthStore } from '@/stores/auth';
import type { InspectionDocument, Payment, Expense } from '@/types';

const router = useRouter();
const auth = useAuthStore();
const isAdmin = computed(() => auth.user?.role === 'admin');

const loading = ref(true);
const stats = ref({ branches: 0, counterparties: 0, vehicles: 0, users: 0, documents: 0 });
const recentDocs = ref<InspectionDocument[]>([]);
const todayDocs = ref<InspectionDocument[]>([]);
const payments = ref<Payment[]>([]);
const expenses = ref<Expense[]>([]);

const today = new Date().toISOString().slice(0, 10);

function money(v: string | number): string {
  return new Intl.NumberFormat('uz-UZ').format(Number(v));
}

const totalPayments = computed(() => payments.value.reduce((s, p) => s + Number(p.total_amount), 0));
const totalCash = computed(() => payments.value.reduce((s, p) => s + Number(p.cash_amount), 0));
const totalPlastic = computed(() => payments.value.reduce((s, p) => s + Number(p.plastic_amount), 0));
const totalExpenses = computed(() => expenses.value.reduce((s, e) => s + Number(e.amount), 0));
const pendingCount = computed(() => todayDocs.value.filter((d) => d.status === 'pending').length);

const cards = [
  { key: 'branches', label: 'Filiallar', icon: 'pi pi-building', color: 'from-indigo-500 to-blue-500' },
  { key: 'counterparties', label: 'Mijozlar', icon: 'pi pi-users', color: 'from-emerald-500 to-teal-500' },
  { key: 'vehicles', label: 'Avtomobillar', icon: 'pi pi-car', color: 'from-amber-500 to-orange-500' },
  { key: 'users', label: 'Xodimlar', icon: 'pi pi-id-card', color: 'from-fuchsia-500 to-pink-500' },
  { key: 'documents', label: 'Ko‘rik hujjatlari', icon: 'pi pi-file', color: 'from-sky-500 to-cyan-500' },
] as const;

onMounted(async () => {
  try {
    // Today's figures are useful for both roles.
    [payments.value, expenses.value, todayDocs.value] = await Promise.all([
      paymentsApi.list({ start_date: today, end_date: today }),
      expensesApi.list({ start_date: today, end_date: today }).catch(() => []),
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
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Boshqaruv paneli</h1>
        <p class="text-sm text-slate-400">{{ isAdmin ? 'Tizim bo‘yicha umumiy ko‘rsatkichlar' : today }}</p>
      </div>
      <Button v-if="auth.user?.role !== 'moderator'" label="Yangi ko‘rik" icon="pi pi-plus" @click="router.push('/wizard')" />
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
        <div class="text-sm text-slate-400">Bugungi tushum</div>
        <div class="mt-2 text-2xl font-bold text-emerald-400">{{ money(totalPayments) }} <span class="text-sm text-slate-400">so‘m</span></div>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
        <div class="text-sm text-slate-400">Naqd / Plastik</div>
        <div class="mt-2 text-lg font-semibold">{{ money(totalCash) }} / {{ money(totalPlastic) }}</div>
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
