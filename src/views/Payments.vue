<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { paymentsApi, branchesApi, counterpartiesApi, paymentMethodsApi, inspectionDocumentsApi } from '@/api/services';
import { buildPaymentPayload, getPaymentBreakdown, getPrimaryInspectionDocumentId } from '@/composables/paymentCompat';
import { calculateInspectionPaymentAmount } from '@/composables/inspectionPricing';
import { useCrud } from '@/composables/useCrud';
import { localizedName, translate as t } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import type { Payment, Branch, Counterparty, PaymentMethod, InspectionDocument } from '@/types';

const auth = useAuthStore();
const toast = useToast();
const crud = useCrud<Payment>(paymentsApi, { label: 'To‘lov' });
const { items, loading, saving, dialogVisible, isEdit, form } = crud;

const branches = ref<Branch[]>([]);
const counterparties = ref<Counterparty[]>([]);
const paymentMethods = ref<PaymentMethod[]>([]);
const inspectionDocuments = ref<InspectionDocument[]>([]);
const lastAutoPaymentAmount = ref(0);
const receiptTypes = computed(() => [
  { label: t('payments.receiptInv'), value: 'INV' },
  { label: t('payments.receiptFtk'), value: 'FTK' },
]);

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
const selectedInspectionDocument = computed(() => inspectionDocuments.value.find((doc) => doc.id === getPrimaryInspectionDocumentId(form.value as Payment)) ?? null);
const expectedPayment = computed(() => calculateInspectionPaymentAmount({
  documentType: selectedInspectionDocument.value?.document_type,
  vehicleType: selectedInspectionDocument.value?.vehicle?.vehicle_type,
  gasCylinderCount: 1,
}));
const paymentMismatch = computed(() => expectedPayment.value.amount > 0 && computedTotal.value !== expectedPayment.value.amount);

watch(selectedInspectionDocument, (document) => {
  if (!document || isEdit.value) return;

  form.value.branch_id = document.branch_id;
  form.value.counterparty_id = document.counterparty_id;

  if (expectedPayment.value.amount > 0 && (computedTotal.value === 0 || computedTotal.value === lastAutoPaymentAmount.value)) {
    form.value.cash_amount = expectedPayment.value.amount;
    form.value.plastic_amount = 0;
  }

  lastAutoPaymentAmount.value = expectedPayment.value.amount;
});

onMounted(async () => {
  [branches.value, counterparties.value, paymentMethods.value, inspectionDocuments.value] = await Promise.all([
    branchesApi.list(),
    counterpartiesApi.list(),
    paymentMethodsApi.list().catch(() => []),
    inspectionDocumentsApi.list(),
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
    description: '',
  });
  lastAutoPaymentAmount.value = 0;
}

async function handleSave() {
  if (paymentMismatch.value && !String(form.value.description || '').trim()) {
    toast.add({ severity: 'warn', summary: t('common.attention'), detail: t('payments.mismatchWarn'), life: 4000 });
    return;
  }

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
      description: form.value.description || null,
      paymentMethods: paymentMethods.value,
    }),
  };
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
        <h1 class="text-2xl font-semibold tracking-tight">{{ $t('payments.title') }}</h1>
        <p class="text-sm text-slate-400">{{ $t('payments.subtitle') }}</p>
      </div>
      <Button :label="$t('payments.newPayment')" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
        <template #empty><div class="p-6 text-center text-slate-500">{{ $t('payments.notFound') }}</div></template>
        <Column field="date" :header="$t('common.date')" />
        <Column :header="$t('payments.client')">
          <template #body="{ data }">{{ data.counterparty?.full_name ?? '—' }}</template>
        </Column>
        <Column :header="$t('payments.total')">
          <template #body="{ data }">{{ money(data.total_amount) }} {{ $t('common.som') }}</template>
        </Column>
        <Column :header="$t('payments.cash')">
          <template #body="{ data }">{{ money(getPaymentBreakdown(data).cashAmount) }}</template>
        </Column>
        <Column :header="$t('payments.terminal')">
          <template #body="{ data }">{{ money(getPaymentBreakdown(data).plasticAmount) }}</template>
        </Column>
        <Column :header="$t('payments.status')">
          <template #body="{ data }"><Tag :value="data.status === 'posted' ? $t('payments.paid') : data.status" :severity="data.status === 'posted' ? 'success' : 'warn'" /></template>
        </Column>
        <Column :header="$t('payments.receiptType')">
          <template #body="{ data }"><Tag :value="data.receipt_type ?? '—'" /></template>
        </Column>
        <Column :header="$t('common.actions')" style="width: 8rem">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button icon="pi pi-pencil" text rounded size="small" :disabled="data.status === 'posted'" @click="crud.openEdit(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" size="small" :disabled="data.status === 'posted'" @click="crud.remove(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? $t('payments.editTitle') : $t('payments.newPayment')" class="w-full max-w-lg">
      <div class="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('payments.branch') }}</label>
          <Select v-model="form.branch_id" :options="branches" option-label="name" option-value="id" class="w-full" :placeholder="$t('common.select')" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('payments.client') }}</label>
          <Select v-model="form.counterparty_id" :options="counterparties" option-label="full_name" option-value="id" class="w-full" filter :placeholder="$t('common.select')" />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('payments.document') }}</label>
          <Select v-model="form.inspection_document_id" :options="inspectionDocuments" option-value="id" class="w-full" filter :placeholder="$t('common.select')">
            <template #option="{ option }">{{ option.doc_number }} — {{ option.vehicle?.license_plate ?? '—' }} — {{ option.document_type ? localizedName(option.document_type) : '—' }}</template>
            <template #value="{ value }">
              <span v-if="value">
                {{ inspectionDocuments.find((doc) => doc.id === value)?.doc_number }}
              </span>
              <span v-else class="text-slate-500">{{ $t('common.select') }}</span>
            </template>
          </Select>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('common.date') }}</label>
          <DatePicker v-model="form.date" class="w-full" date-format="yy-mm-dd" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('payments.receiptType') }}</label>
          <Select v-model="form.receipt_type" :options="receiptTypes" option-label="label" option-value="value" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('payments.cash') }}</label>
          <InputNumber v-model="form.cash_amount" class="w-full" :min="0" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('payments.terminal') }}</label>
          <InputNumber v-model="form.plastic_amount" class="w-full" :min="0" />
        </div>
        <div v-if="paymentMismatch" class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('payments.amountDiffNote') }}</label>
          <Textarea v-model="form.description" class="w-full" rows="2" />
        </div>
        <div class="rounded-xl bg-slate-800/50 p-3 text-center sm:col-span-2">
          <span class="text-sm text-slate-400">{{ $t('payments.totalSum') }}: </span>
          <span class="text-lg font-semibold text-emerald-400">{{ money(computedTotal) }} {{ $t('common.som') }}</span>
          <div v-if="expectedPayment.amount" class="mt-1 text-sm text-slate-400">{{ $t('payments.expectedPrice') }}: {{ money(expectedPayment.amount) }} {{ $t('common.som') }}</div>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="dialogVisible = false" />
        <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="handleSave" />
      </template>
    </Dialog>
  </div>
</template>
