<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { inspectionDocumentsApi, documentTypesApi, fuelTypesApi, onlinePaymentApi } from '@/api/services';
import type { OnlinePaymentLink } from '@/api/services';
import { useCrud, extractError } from '@/composables/useCrud';
import type { InspectionDocument, DocumentType, FuelType } from '@/types';

const router = useRouter();
const toast = useToast();
const crud = useCrud<InspectionDocument>(inspectionDocumentsApi, { label: 'Hujjat' });
const { items, loading, saving, dialogVisible, form } = crud;

// Online payment (Payme / Click)
const onlineVisible = ref(false);
const onlineDoc = ref<InspectionDocument | null>(null);
const onlineLoading = ref<'' | 'payme' | 'click'>('');
const onlineLink = ref<OnlinePaymentLink | null>(null);
const simulating = ref(false);

function openOnline(doc: InspectionDocument) {
  onlineDoc.value = doc;
  onlineLink.value = null;
  onlineVisible.value = true;
}

async function payOnline(provider: 'payme' | 'click') {
  if (!onlineDoc.value) return;
  onlineLoading.value = provider;
  try {
    const link = await onlinePaymentApi.link(onlineDoc.value.id, provider, window.location.origin + '/documents');
    onlineLink.value = link;
    // In production (real keys) open the hosted checkout; in test mode use the simulate button instead.
    if (!link.test_mode) window.open(link.url, '_blank');
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Xatolik', detail: extractError(e), life: 6000 });
  } finally {
    onlineLoading.value = '';
  }
}

async function simulatePayment() {
  if (!onlineDoc.value || !onlineLink.value) return;
  simulating.value = true;
  try {
    const result = await onlinePaymentApi.simulate(onlineDoc.value.id, onlineLink.value.provider);
    toast.add({ severity: 'success', summary: 'To‘landi', detail: `Test to‘lov muvaffaqiyatli (${result.amount} so‘m)`, life: 4000 });
    onlineVisible.value = false;
    await crud.load();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Xatolik', detail: extractError(e), life: 6000 });
  } finally {
    simulating.value = false;
  }
}

async function copyLink() {
  if (onlineLink.value) {
    await navigator.clipboard.writeText(onlineLink.value.url);
    toast.add({ severity: 'success', summary: 'Nusxalandi', detail: 'Havola nusxalandi', life: 2500 });
  }
}

function paymentTag(status?: string): { label: string; severity: string } {
  switch (status) {
    case 'paid': return { label: 'To‘langan', severity: 'success' };
    case 'partial': return { label: 'Qisman', severity: 'warn' };
    case 'refunded': return { label: 'Qaytarilgan', severity: 'secondary' };
    default: return { label: 'To‘lanmagan', severity: 'danger' };
  }
}

const documentTypes = ref<DocumentType[]>([]);
const fuelTypes = ref<FuelType[]>([]);
const filters = ref<{ license_plate: string; start_date: Date | null; end_date: Date | null }>({
  license_plate: '',
  start_date: null,
  end_date: null,
});
const statuses = [
  { label: 'Kutilmoqda', value: 'pending' },
  { label: 'Tugatilgan', value: 'completed' },
];

function toIso(d: unknown): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

onMounted(async () => {
  [documentTypes.value, fuelTypes.value] = await Promise.all([documentTypesApi.list(), fuelTypesApi.list()]);
  await crud.load();
});

function applyFilters() {
  crud.load({
    license_plate: filters.value.license_plate || undefined,
    start_date: filters.value.start_date ? toIso(filters.value.start_date) : undefined,
    end_date: filters.value.end_date ? toIso(filters.value.end_date) : undefined,
  });
}

async function handleSave() {
  form.value.date = toIso(form.value.date);
  await crud.save();
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Ko‘rik hujjatlari</h1>
        <p class="text-sm text-slate-400">Texnik ko‘rik hujjatlari ro‘yxati</p>
      </div>
      <Button label="Yangi ko‘rik" icon="pi pi-plus" @click="router.push('/wizard')" />
    </div>

    <div class="grid grid-cols-1 gap-2 md:grid-cols-4">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="filters.license_plate" class="w-full" placeholder="Davlat raqami" @keyup.enter="applyFilters" />
      </IconField>
      <DatePicker v-model="filters.start_date" date-format="yy-mm-dd" placeholder="Boshlanish sanasi" class="w-full" />
      <DatePicker v-model="filters.end_date" date-format="yy-mm-dd" placeholder="Tugash sanasi" class="w-full" />
      <Button label="Filtrlash" outlined @click="applyFilters" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
        <template #empty><div class="p-6 text-center text-slate-500">Hujjatlar topilmadi</div></template>
        <Column field="doc_number" header="Hujjat №" />
        <Column field="act_number" header="Akt №" />
        <Column field="date" header="Sana" />
        <Column header="Avtomobil">
          <template #body="{ data }">{{ data.vehicle?.license_plate ?? '—' }}</template>
        </Column>
        <Column header="Mijoz">
          <template #body="{ data }">{{ data.counterparty?.full_name ?? '—' }}</template>
        </Column>
        <Column header="Holat">
          <template #body="{ data }">
            <Tag :value="data.status === 'completed' ? 'Tugatilgan' : 'Kutilmoqda'" :severity="data.status === 'completed' ? 'success' : 'warn'" />
          </template>
        </Column>
        <Column header="To‘lov">
          <template #body="{ data }">
            <Tag :value="paymentTag(data.payment_status).label" :severity="paymentTag(data.payment_status).severity" />
          </template>
        </Column>
        <Column header="Amallar" style="width: 11rem">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button icon="pi pi-credit-card" text rounded size="small" severity="success" v-tooltip.top="'Onlayn to‘lov (Payme/Click)'" @click="openOnline(data)" />
              <Button icon="pi pi-pencil" text rounded size="small" @click="crud.openEdit(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="crud.remove(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Online payment dialog -->
    <Dialog v-model:visible="onlineVisible" modal header="Onlayn to‘lov" class="w-full max-w-md">
      <div class="space-y-4 pt-2">
        <p class="text-sm text-slate-400">
          Hujjat: <span class="font-medium text-slate-200">{{ onlineDoc?.doc_number }}</span>
        </p>
        <div class="grid grid-cols-2 gap-3">
          <Button label="Payme" icon="pi pi-wallet" :loading="onlineLoading === 'payme'" @click="payOnline('payme')" />
          <Button label="Click" icon="pi pi-wallet" severity="info" :loading="onlineLoading === 'click'" @click="payOnline('click')" />
        </div>
        <div v-if="onlineLink" class="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <div class="text-sm text-slate-400">To‘lov summasi: <span class="font-semibold text-emerald-400">{{ onlineLink.amount_due }} so‘m</span></div>

          <!-- Test mode: complete the payment locally without real provider credentials. -->
          <div v-if="onlineLink.test_mode" class="space-y-2">
            <div class="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <i class="pi pi-info-circle" /> Test rejimi: haqiqiy credential yo‘q. To‘lovni simulyatsiya qilib hujjatni «to‘langan» qiling.
            </div>
            <Button
              :label="`To‘lovni tasdiqlash (test · ${onlineLink.provider})`"
              icon="pi pi-check-circle"
              severity="success"
              class="w-full"
              :loading="simulating"
              @click="simulatePayment"
            />
          </div>

          <!-- Real checkout link (works once merchant credentials are configured). -->
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <InputText :model-value="onlineLink.url" readonly class="w-full text-xs" />
              <Button icon="pi pi-copy" text rounded @click="copyLink" />
            </div>
            <a :href="onlineLink.url" target="_blank" class="inline-flex items-center gap-1 text-sm text-indigo-400 hover:underline">
              <i class="pi pi-external-link" /> To‘lov sahifasini ochish
            </a>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Yopish" text @click="onlineVisible = false" />
      </template>
    </Dialog>

    <Dialog v-model:visible="dialogVisible" modal header="Hujjatni tahrirlash" class="w-full max-w-lg">
      <div class="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Hujjat №</label>
          <InputText v-model="form.doc_number" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Akt №</label>
          <InputText v-model="form.act_number" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Sana</label>
          <DatePicker v-model="form.date" class="w-full" date-format="yy-mm-dd" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Holat</label>
          <Select v-model="form.status" :options="statuses" option-label="label" option-value="value" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Hujjat turi</label>
          <Select v-model="form.document_type_id" :options="documentTypes" option-label="name" option-value="id" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Yoqilg‘i turi</label>
          <Select v-model="form.fuel_type_id" :options="fuelTypes" option-label="name" option-value="id" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Bekor qilish" text @click="dialogVisible = false" />
        <Button label="Saqlash" icon="pi pi-check" :loading="saving" @click="handleSave" />
      </template>
    </Dialog>
  </div>
</template>
