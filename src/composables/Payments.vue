<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { paymentsApi, branchesApi, counterpartiesApi, paymentMethodsApi } from '@/api/services';
import { buildPaymentPayload, getPaymentBreakdown, getPrimaryInspectionDocumentId } from '@/composables/paymentCompat';
import { useCrud } from '@/composables/useCrud';
import { useAuthStore } from '@/stores/auth';
import type { Payment, Branch, Counterparty, PaymentMethod } from '@/types';

const auth = useAuthStore();
const crud = useCrud<Payment>(paymentsApi, { label: 'To‘lov' });
const { items, loading, saving, dialogVisible, isEdit, form } = crud;

const branches = ref<Branch[]>([]);
const counterparties = ref<Counterparty[]>([]);
const paymentMethods = ref<PaymentMethod[]>([]);
const receiptTypes = [
  { label: 'Hisob-faktura (INV)', value: 'INV' },
  { label: 'Fiskal chek (FTK)', value: 'FTK' },
];

function money(v: string | number): string {
  return new Intl.NumberFormat('uz-UZ').format(Number(v));
}

function toIso(d: unknown): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

// Total is always the sum of cash + plastic (matches backend validation).
const computedTotal = computed(() => Number(form.value.cash_amount || 0) + Number(form.value.plastic_amount || 0));
watch(computedTotal, (v) => { form.value.total_amount = v; });

onMounted(async () => {
  [branches.value, counterparties.value, paymentMethods.value] = await Promise.all([
    branchesApi.list(),
    counterpartiesApi.list(),
    paymentMethodsApi.list().catch(() => []),
  ]);
  await crud.load();
});

function openCreate() {
  crud.openCreate({
    inspection_document_id: null,
    branch_id: auth.user?.branch_id ?? null,
    counterparty_id: null,
    date: new Date(),
    total_amount: 0,
    cash_amount: 0,
    plastic_amount: 0,
    receipt_type: 'FTK',
    z_report_id: '',
  });
}

async function handleSave() {
  const payment = form.value as Payment;
  form.value = {
    ...form.value,
    ...buildPaymentPayload({
      branchId: Number(form.value.branch_id),
      counterpartyId: Number(form.value.counterparty_id),
      date: toIso(form.value.date) ?? '',
      cashAmount: Number(form.value.cash_amount || 0),
      plasticAmount: Number(form.value.plastic_amount || 0),
      inspectionDocumentId: getPrimaryInspectionDocumentId(payment),
      receiptType: form.value.receipt_type ?? 'FTK',
      zReportId: form.value.z_report_id || null,
      paymentMethods: paymentMethods.value,
    }),
  };
  await crud.save();
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">To‘lovlar</h1>
        <p class="text-sm text-slate-400">Qabul qilingan to‘lovlar</p>
      </div>
      <Button label="Yangi to‘lov" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
        <template #empty><div class="p-6 text-center text-slate-500">To‘lovlar topilmadi</div></template>
        <Column field="date" header="Sana" />
        <Column header="Mijoz">
          <template #body="{ data }">{{ data.counterparty?.full_name ?? '—' }}</template>
        </Column>
        <Column header="Jami">
          <template #body="{ data }">{{ money(data.total_amount) }} so‘m</template>
        </Column>
        <Column header="Naqd">
          <template #body="{ data }">{{ money(getPaymentBreakdown(data).cashAmount) }}</template>
        </Column>
        <Column header="Plastik">
          <template #body="{ data }">{{ money(getPaymentBreakdown(data).plasticAmount) }}</template>
        </Column>
        <Column header="Chek turi">
          <template #body="{ data }"><Tag :value="data.receipt_type ?? '—'" /></template>
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

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? 'To‘lovni tahrirlash' : 'Yangi to‘lov'" class="w-full max-w-lg">
      <div class="grid grid-cols-2 gap-4 pt-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Filial</label>
          <Select v-model="form.branch_id" :options="branches" option-label="name" option-value="id" class="w-full" placeholder="Tanlang" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Mijoz</label>
          <Select v-model="form.counterparty_id" :options="counterparties" option-label="full_name" option-value="id" class="w-full" filter placeholder="Tanlang" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Sana</label>
          <DatePicker v-model="form.date" class="w-full" date-format="yy-mm-dd" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Chek turi</label>
          <Select v-model="form.receipt_type" :options="receiptTypes" option-label="label" option-value="value" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Naqd</label>
          <InputNumber v-model="form.cash_amount" class="w-full" :min="0" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Plastik</label>
          <InputNumber v-model="form.plastic_amount" class="w-full" :min="0" />
        </div>
        <div class="col-span-2 rounded-xl bg-slate-800/50 p-3 text-center">
          <span class="text-sm text-slate-400">Jami summa: </span>
          <span class="text-lg font-semibold text-emerald-400">{{ money(computedTotal) }} so‘m</span>
        </div>
      </div>
      <template #footer>
        <Button label="Bekor qilish" text @click="dialogVisible = false" />
        <Button label="Saqlash" icon="pi pi-check" :loading="saving" @click="handleSave" />
      </template>
    </Dialog>
  </div>
</template>
