<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { inspectionDocumentsApi, documentTypesApi, fuelTypesApi } from '@/api/services';
import { useCrud } from '@/composables/useCrud';
import { localizedName, translate as t } from '@/i18n';
import type { InspectionDocument, DocumentType, FuelType } from '@/types';

const router = useRouter();
const crud = useCrud<InspectionDocument>(inspectionDocumentsApi, { label: 'Hujjat' });
const { items, loading, saving, dialogVisible, form } = crud;

function paymentTag(status?: string): { label: string; severity: string } {
  switch (status) {
    case 'paid': return { label: t('status.paid'), severity: 'success' };
    case 'partial': return { label: t('status.partial'), severity: 'warn' };
    case 'refunded': return { label: t('status.refunded'), severity: 'secondary' };
    default: return { label: t('status.unpaid'), severity: 'danger' };
  }
}

const documentTypes = ref<DocumentType[]>([]);
const fuelTypes = ref<FuelType[]>([]);
const filters = ref<{ license_plate: string; gas_cylinder_number: string; start_date: Date | null; end_date: Date | null }>({
  license_plate: '',
  gas_cylinder_number: '',
  start_date: null,
  end_date: null,
});
const statuses = computed(() => [
  { label: t('status.pending'), value: 'pending' },
  { label: t('status.completed'), value: 'completed' },
]);

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
    gas_cylinder_number: filters.value.gas_cylinder_number || undefined,
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
        <h1 class="text-2xl font-semibold tracking-tight">{{ $t('documents.title') }}</h1>
        <p class="text-sm text-slate-400">{{ $t('documents.subtitle') }}</p>
      </div>
      <Button :label="$t('nav.newDocument')" icon="pi pi-plus" @click="router.push('/wizard')" />
    </div>

    <div class="grid grid-cols-1 gap-2 md:grid-cols-5">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="filters.license_plate" class="w-full" :placeholder="$t('documents.plate')" @keyup.enter="applyFilters" />
      </IconField>
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="filters.gas_cylinder_number" class="w-full" :placeholder="$t('documents.gasCylinderNumber')" @keyup.enter="applyFilters" />
      </IconField>
      <DatePicker v-model="filters.start_date" date-format="yy-mm-dd" :placeholder="$t('documents.startDate')" class="w-full" />
      <DatePicker v-model="filters.end_date" date-format="yy-mm-dd" :placeholder="$t('documents.endDate')" class="w-full" />
      <Button :label="$t('common.filter')" outlined @click="applyFilters" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
        <template #empty><div class="p-6 text-center text-slate-500">{{ $t('documents.notFound') }}</div></template>
        <Column field="doc_number" :header="$t('documents.docNumber')" />
        <Column field="act_number" :header="$t('documents.actNumber')" />
        <Column field="date" :header="$t('common.date')" />
        <Column :header="$t('documents.vehicle')">
          <template #body="{ data }">{{ data.vehicle?.license_plate ?? '—' }}</template>
        </Column>
        <Column :header="$t('documents.gasCylinder')">
          <template #body="{ data }">{{ data.gas_cylinder?.cylinder_number ?? '—' }}</template>
        </Column>
        <Column :header="$t('documents.client')">
          <template #body="{ data }">{{ data.counterparty?.full_name ?? '—' }}</template>
        </Column>
        <Column :header="$t('documents.status')">
          <template #body="{ data }">
            <Tag :value="data.status === 'completed' ? $t('status.completed') : $t('status.pending')" :severity="data.status === 'completed' ? 'success' : 'warn'" />
          </template>
        </Column>
        <Column :header="$t('documents.payment')">
          <template #body="{ data }">
            <Tag :value="paymentTag(data.payment_status).label" :severity="paymentTag(data.payment_status).severity" />
          </template>
        </Column>
        <Column :header="$t('common.actions')" style="width: 11rem">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button icon="pi pi-pencil" text rounded size="small" @click="crud.openEdit(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="crud.remove(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" modal :header="$t('documents.editTitle')" class="w-full max-w-lg">
      <div class="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('documents.docNumber') }}</label>
          <InputText v-model="form.doc_number" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('documents.actNumber') }}</label>
          <InputText v-model="form.act_number" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('common.date') }}</label>
          <DatePicker v-model="form.date" class="w-full" date-format="yy-mm-dd" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('documents.status') }}</label>
          <Select v-model="form.status" :options="statuses" option-label="label" option-value="value" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('documents.docType') }}</label>
          <Select v-model="form.document_type_id" :options="documentTypes" :option-label="localizedName" option-value="id" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('documents.fuelType') }}</label>
          <Select v-model="form.fuel_type_id" :options="fuelTypes" :option-label="localizedName" option-value="id" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="dialogVisible = false" />
        <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="handleSave" />
      </template>
    </Dialog>
  </div>
</template>
