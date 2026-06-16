<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { expensesApi, branchesApi, usersApi } from '@/api/services';
import { useCrud } from '@/composables/useCrud';
import { useAuthStore } from '@/stores/auth';
import type { Expense, Branch, User } from '@/types';

const auth = useAuthStore();
const crud = useCrud<Expense>(expensesApi, { label: 'Xarajat' });
const { items, loading, saving, dialogVisible, isEdit, form } = crud;

const branches = ref<Branch[]>([]);
const employees = ref<User[]>([]);
const paymentMethods = ['Naqd', 'Plastik', 'Bank o‘tkazmasi'];

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
  crud.openCreate({
    branch_id: auth.user?.branch_id ?? null,
    employee_id: auth.user?.id ?? null,
    date: new Date(),
    basis: '',
    payment_method: 'Naqd',
    amount: 0,
    description: '',
  });
}

async function handleSave() {
  form.value.date = toIso(form.value.date);
  await crud.save();
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Xarajatlar</h1>
        <p class="text-sm text-slate-400">Filiallar bo‘yicha xarajatlar</p>
      </div>
      <Button label="Yangi xarajat" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
        <template #empty><div class="p-6 text-center text-slate-500">Xarajatlar topilmadi</div></template>
        <Column field="date" header="Sana" />
        <Column header="Filial">
          <template #body="{ data }">{{ data.branch?.name ?? '—' }}</template>
        </Column>
        <Column field="basis" header="Asos" />
        <Column field="payment_method" header="To‘lov turi" />
        <Column header="Summa">
          <template #body="{ data }">{{ money(data.amount) }} so‘m</template>
        </Column>
        <Column header="Xodim">
          <template #body="{ data }">{{ data.employee?.name ?? '—' }}</template>
        </Column>
        <Column header="Amallar" style="width: 8rem">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button icon="pi pi-pencil" text rounded size="small" @click="crud.openEdit(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="crud.remove(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? 'Xarajatni tahrirlash' : 'Yangi xarajat'" class="w-full max-w-lg">
      <div class="grid grid-cols-2 gap-4 pt-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Filial</label>
          <Select v-model="form.branch_id" :options="branches" option-label="name" option-value="id" class="w-full" placeholder="Tanlang" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Sana</label>
          <DatePicker v-model="form.date" class="w-full" date-format="yy-mm-dd" />
        </div>
        <div class="col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Asos</label>
          <InputText v-model="form.basis" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">To‘lov turi</label>
          <Select v-model="form.payment_method" :options="paymentMethods" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Summa</label>
          <InputNumber v-model="form.amount" class="w-full" :min="0" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Xodim</label>
          <Select v-model="form.employee_id" :options="employees" option-label="name" option-value="id" class="w-full" show-clear placeholder="Tanlanmagan" />
        </div>
        <div class="col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Izoh</label>
          <Textarea v-model="form.description" class="w-full" rows="2" />
        </div>
      </div>
      <template #footer>
        <Button label="Bekor qilish" text @click="dialogVisible = false" />
        <Button label="Saqlash" icon="pi pi-check" :loading="saving" @click="handleSave" />
      </template>
    </Dialog>
  </div>
</template>
