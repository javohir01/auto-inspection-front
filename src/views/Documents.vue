<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { inspectionDocumentsApi, documentTypesApi, fuelTypesApi, generatedDocumentsApi } from '@/api/services';
import { extractError, useCrud } from '@/composables/useCrud';
import { localizedName, translate as t } from '@/i18n';
import type { InspectionDocument, DocumentType, FuelType, GeneratedDocument } from '@/types';
import { fromApiDate, toApiDate } from '@/utils/dataFormat';

const router = useRouter();
const toast = useToast();
const crud = useCrud<InspectionDocument>(inspectionDocumentsApi, { label: 'Hujjat' });
const { items, loading, saving, dialogVisible, form, fieldErrors, totalRecords, rows, first } = crud;

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

onMounted(async () => {
  [documentTypes.value, fuelTypes.value] = await Promise.all([documentTypesApi.list(), fuelTypesApi.list()]);
  await crud.load();
});

function applyFilters() {
  crud.load({
    license_plate: filters.value.license_plate || undefined,
    gas_cylinder_number: filters.value.gas_cylinder_number || undefined,
    start_date: filters.value.start_date ? toApiDate(filters.value.start_date) : undefined,
    end_date: filters.value.end_date ? toApiDate(filters.value.end_date) : undefined,
  }, true);
}

watch(() => [filters.value.license_plate, filters.value.gas_cylinder_number], () => {
  crud.debouncedLoad({
    license_plate: filters.value.license_plate || undefined,
    gas_cylinder_number: filters.value.gas_cylinder_number || undefined,
    start_date: filters.value.start_date ? toApiDate(filters.value.start_date) : undefined,
    end_date: filters.value.end_date ? toApiDate(filters.value.end_date) : undefined,
  });
});

async function handleSave() {
  form.value.date = toApiDate(form.value.date);
  form.value.valid_until = toApiDate(form.value.valid_until);
  form.value.insurance_valid_until = toApiDate(form.value.insurance_valid_until);
  await crud.save();
}

function openEdit(document: InspectionDocument) {
  crud.openEdit({
    ...document,
    date: fromApiDate(document.date) ?? new Date(),
    valid_until: fromApiDate(document.valid_until),
    insurance_valid_until: fromApiDate(document.insurance_valid_until),
  } as unknown as InspectionDocument);
}

function resetFilters() {
  filters.value = { license_plate: '', gas_cylinder_number: '', start_date: null, end_date: null };
  void crud.load({}, true);
}

async function downloadGeneratedDocument(document: GeneratedDocument) {
  try {
    const blob = await generatedDocumentsApi.download(document.id);
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.document_number}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: extractError(error), life: 5000 });
  }
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

    <div class="grid grid-cols-1 gap-2 md:grid-cols-6">
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
      <Button :label="$t('common.reset')" icon="pi pi-filter-slash" text @click="resetFilters" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator lazy :rows="rows" :rows-per-page-options="[10, 25, 50]" :first="first" :total-records="totalRecords" data-key="id" @page="crud.onPage" @sort="crud.onSort">
        <template #empty><div class="p-6 text-center text-slate-500">{{ $t('documents.notFound') }}</div></template>
        <Column field="doc_number" :header="$t('documents.docNumber')" sortable />
        <Column field="date" :header="$t('common.date')" sortable />
        <Column :header="$t('documents.vehicle')">
          <template #body="{ data }">{{ data.vehicle?.license_plate ?? '—' }}</template>
        </Column>
        <Column :header="$t('documents.gasCylinder')">
          <template #body="{ data }">{{ data.gas_cylinder?.cylinder_number ?? '—' }}</template>
        </Column>
        <Column :header="$t('documents.client')">
          <template #body="{ data }">{{ data.counterparty?.full_name ?? '—' }}</template>
        </Column>
        <Column field="valid_until" :header="$t('documents.validUntil')" sortable>
          <template #body="{ data }">{{ data.valid_until ?? '—' }}</template>
        </Column>
        <Column field="insurance_valid_until" :header="$t('documents.insuranceValidUntil')" sortable>
          <template #body="{ data }">{{ data.insurance_valid_until ?? '—' }}</template>
        </Column>
        <Column :header="$t('documents.reinspection')">
          <template #body="{ data }">{{ data.previous_inspection_document?.doc_number ?? '—' }}</template>
        </Column>
        <Column :header="$t('documents.status')">
          <template #body="{ data }">
            <Tag :value="data.status === 'completed' ? $t('status.completed') : $t('status.pending')" :severity="data.status === 'completed' ? 'success' : 'warn'" />
          </template>
        </Column>
        <Column :header="$t('documents.generatedDocuments')">
          <template #body="{ data }">
            <div v-if="data.generated_documents?.length" class="flex flex-wrap gap-2">
              <Button
                v-for="document in data.generated_documents"
                :key="document.id"
                :label="document.document_type ? localizedName(document.document_type) : document.document_number"
                icon="pi pi-download"
                size="small"
                outlined
                @click="downloadGeneratedDocument(document)"
              />
            </div>
            <span v-else class="text-slate-500">—</span>
          </template>
        </Column>
        <Column :header="$t('common.actions')" style="width: 11rem">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button icon="pi pi-pencil" text rounded size="small" @click="openEdit(data)" />
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
          <InputText v-model="form.doc_number" class="w-full" disabled />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('common.date') }}</label>
          <DatePicker v-model="form.date" class="w-full" :invalid="!!fieldErrors.date" date-format="yy-mm-dd" />
          <InlineError :message="fieldErrors.date" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('documents.status') }}</label>
          <Select v-model="form.status" :options="statuses" option-label="label" option-value="value" class="w-full" :invalid="!!fieldErrors.status" />
          <InlineError :message="fieldErrors.status" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('documents.docType') }}</label>
          <Select v-model="form.document_type_id" :options="documentTypes" :option-label="localizedName" option-value="id" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('documents.fuelType') }}</label>
          <Select v-model="form.fuel_type_id" :options="fuelTypes" :option-label="localizedName" option-value="id" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('documents.validUntilFull') }}</label>
          <DatePicker v-model="form.valid_until" class="w-full" :invalid="!!fieldErrors.valid_until" date-format="yy-mm-dd" show-button-bar />
          <InlineError :message="fieldErrors.valid_until" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('documents.insuranceValidUntilFull') }}</label>
          <DatePicker v-model="form.insurance_valid_until" class="w-full" :invalid="!!fieldErrors.insurance_valid_until" date-format="yy-mm-dd" show-button-bar />
          <InlineError :message="fieldErrors.insurance_valid_until" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="dialogVisible = false" />
        <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="handleSave" />
      </template>
    </Dialog>
  </div>
</template>
