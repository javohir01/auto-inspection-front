<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { inspectionDocumentsApi, documentTypesApi, fuelTypesApi } from '@/api/services';
import { useCrud } from '@/composables/useCrud';
import type { InspectionDocument, DocumentType, FuelType } from '@/types';

const router = useRouter();
const crud = useCrud<InspectionDocument>(inspectionDocumentsApi, { label: 'Hujjat' });
const { items, loading, saving, dialogVisible, form } = crud;

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
    <div class="flex items-center justify-between">
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

    <Dialog v-model:visible="dialogVisible" modal header="Hujjatni tahrirlash" class="w-full max-w-lg">
      <div class="grid grid-cols-2 gap-4 pt-2">
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
