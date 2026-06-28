<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { expensesApi, branchesApi, usersApi } from '@/api/services';
import { useCrud } from '@/composables/useCrud';
import { translate as t } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import type { Expense, Branch, User } from '@/types';

const auth = useAuthStore();
const crud = useCrud<Expense>(expensesApi, { label: 'Xarajat' });
const { items, loading, saving, dialogVisible, isEdit, form } = crud;

const branches = ref<Branch[]>([]);
const employees = ref<User[]>([]);
// Canonical stored values (kept stable across locales); only labels are translated.
const expenseOptions = [
  { value: 'Yo‘l xarajati', labelKey: 'expenses.opt.road' },
  { value: 'Ofis xarajati', labelKey: 'expenses.opt.office' },
  { value: 'Kommunal to‘lov', labelKey: 'expenses.opt.utility' },
  { value: 'Uskuna ta’miri', labelKey: 'expenses.opt.repair' },
  { value: 'Kanselyariya', labelKey: 'expenses.opt.stationery' },
  { value: 'Boshqa', labelKey: 'expenses.opt.other' },
];
const expenseOptionList = computed(() => expenseOptions.map((o) => ({ label: t(o.labelKey), value: o.value })));
const knownBasisValues = expenseOptions.map((o) => o.value);
const customBasis = ref('');
const isCustomExpense = computed(() => form.value.basis === 'Boshqa');

function money(v: string | number): string {
  return new Intl.NumberFormat('uz-UZ').format(Number(v));
}

// Convert a Date picker value to the Y-m-d string the API expects on save.
function toIso(d: unknown): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

onMounted(async () => {
  branches.value = await branchesApi.list();
  employees.value = await usersApi.list().catch(() => []);
  await crud.load();
});

function openCreate() {
  customBasis.value = '';
  crud.openCreate({
    branch_id: auth.user?.branch_id ?? null,
    employee_id: auth.user?.id ?? null,
    date: new Date(),
    basis: knownBasisValues[0],
    payment_method: 'Naqd',
    amount: 0,
    description: '',
  });
}

function openEditExpense(expense: Expense) {
  customBasis.value = knownBasisValues.includes(expense.basis) ? '' : expense.basis;
  crud.openEdit({
    ...expense,
    basis: knownBasisValues.includes(expense.basis) ? expense.basis : 'Boshqa',
  });
}

async function handleSave() {
  form.value.date = toIso(form.value.date);
  form.value.employee_id = form.value.employee_id ?? auth.user?.id ?? null;
  form.value.payment_method = 'Naqd';
  if (isCustomExpense.value) {
    form.value.basis = customBasis.value.trim();
  }

  const saved = await crud.save();
  if (saved) {
    window.dispatchEvent(new Event('cash-balance:refresh'));
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ $t('expenses.title') }}</h1>
        <p class="text-sm text-slate-400">{{ $t('expenses.subtitle') }}</p>
      </div>
      <Button :label="$t('expenses.newExpense')" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
        <template #empty><div class="p-6 text-center text-slate-500">{{ $t('expenses.notFound') }}</div></template>
        <Column field="date" :header="$t('common.date')" />
        <Column :header="$t('expenses.branch')">
          <template #body="{ data }">{{ data.branch?.name ?? '—' }}</template>
        </Column>
        <Column field="basis" :header="$t('expenses.basis')" />
        <Column :header="$t('common.amount')">
          <template #body="{ data }">{{ money(data.amount) }} {{ $t('common.som') }}</template>
        </Column>
        <Column :header="$t('expenses.employee')">
          <template #body="{ data }">{{ data.employee?.name ?? '—' }}</template>
        </Column>
        <Column :header="$t('common.actions')" style="width: 8rem">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button icon="pi pi-pencil" text rounded size="small" @click="openEditExpense(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="crud.remove(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? $t('expenses.editTitle') : $t('expenses.newExpense')" class="w-full max-w-lg">
      <div class="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('expenses.branch') }}</label>
          <Select v-model="form.branch_id" :options="branches" option-label="name" option-value="id" class="w-full" :placeholder="$t('common.select')" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('common.date') }}</label>
          <DatePicker v-model="form.date" class="w-full" date-format="yy-mm-dd" />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('expenses.basis') }}</label>
          <Select v-model="form.basis" :options="expenseOptionList" option-label="label" option-value="value" class="w-full" />
        </div>
        <div v-if="isCustomExpense" class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('expenses.customBasis') }}</label>
          <InputText v-model="customBasis" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('common.amount') }}</label>
          <InputNumber v-model="form.amount" class="w-full" :min="0" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('expenses.employee') }}</label>
          <Select v-model="form.employee_id" :options="employees" option-label="name" option-value="id" class="w-full" show-clear :placeholder="$t('common.notSelected')" />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('common.note') }}</label>
          <Textarea v-model="form.description" class="w-full" rows="2" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="dialogVisible = false" />
        <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="handleSave" />
      </template>
    </Dialog>
  </div>
</template>
