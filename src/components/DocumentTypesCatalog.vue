<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { documentTypesApi } from '@/api/services';
import { extractError, useCrud } from '@/composables/useCrud';
import { localizedName, translate as t } from '@/i18n';
import type { DocumentPriceType, DocumentType, VehicleType } from '@/types';

const VEHICLE_TYPES: VehicleType[] = ['Yengil', 'Yuk', 'Tirkama', 'Mototsikl', 'Avtobus', 'Mikroavtobus'];

const PRICE_TYPE_KEYS: Record<DocumentPriceType, string> = {
  fixed: 'docTypes.priceTypeFixed',
  by_vehicle_type: 'docTypes.priceTypeByVehicle',
  by_cylinder_count: 'docTypes.priceTypeByCylinder',
};

const priceTypeOptions = computed(() =>
  (Object.keys(PRICE_TYPE_KEYS) as DocumentPriceType[]).map((value) => ({ label: t(PRICE_TYPE_KEYS[value]), value })),
);

const toast = useToast();
const crud = useCrud<DocumentType>(documentTypesApi, { label: 'Hujjat turi' });
const { items, loading, saving, dialogVisible, isEdit, form } = crud;
const basisDocument = ref<File | null>(null);
const fileInputKey = ref(0);
// Per vehicle-type prices for the `by_vehicle_type` mode; assembled into FormData on save.
const tiers = ref<Record<string, number | null>>({});

crud.load();

function syncTiersFromForm(): void {
  const source = (form.value.price_tiers || {}) as Record<string, number>;
  tiers.value = Object.fromEntries(VEHICLE_TYPES.map((vt) => [vt, source[vt] ?? null]));
}

const priceLabel = computed(() => {
  switch (form.value.price_type) {
    case 'by_vehicle_type':
      return t('docTypes.priceLabelDefault');
    case 'by_cylinder_count':
      return t('docTypes.priceLabelCylinder');
    default:
      return t('docTypes.priceLabel');
  }
});

function priceTypeLabel(value?: string): string {
  return t(PRICE_TYPE_KEYS[(value as DocumentPriceType) || 'fixed'] ?? PRICE_TYPE_KEYS.fixed);
}

function openCreate(): void {
  basisDocument.value = null;
  fileInputKey.value++;
  crud.openCreate({
    code: '',
    name: '',
    name_uz: '',
    name_cyrl: '',
    name_ru: '',
    name_en: '',
    category: 'inspection',
    price: 120000,
    price_type: 'fixed',
    price_tiers: null,
    is_printable: true,
    is_active: true,
  });
  syncTiersFromForm();
}

function openEdit(item: DocumentType): void {
  basisDocument.value = null;
  fileInputKey.value++;
  crud.openEdit(item);
  syncTiersFromForm();
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  basisDocument.value = input.files?.[0] ?? null;
}

async function save(): Promise<void> {
  if (!isEdit.value && !basisDocument.value) {
    toast.add({ severity: 'warn', summary: t('common.attention'), detail: t('docTypes.uploadWarn'), life: 4000 });
    return;
  }

  if (isEdit.value && !form.value.has_basis_document && !basisDocument.value) {
    toast.add({ severity: 'warn', summary: t('common.attention'), detail: t('docTypes.uploadWarn'), life: 4000 });
    return;
  }

  const payload = new FormData();
  payload.append('name', String(form.value.name_uz || form.value.name || ''));
  payload.append('name_uz', String(form.value.name_uz ?? ''));
  payload.append('name_cyrl', String(form.value.name_cyrl ?? ''));
  payload.append('name_ru', String(form.value.name_ru ?? ''));
  payload.append('name_en', String(form.value.name_en ?? ''));
  payload.append('code', String(form.value.code ?? ''));
  payload.append('category', String(form.value.category ?? 'inspection'));
  payload.append('price', String(form.value.price ?? 120000));
  payload.append('price_type', String(form.value.price_type ?? 'fixed'));
  payload.append('is_printable', form.value.is_printable === false ? '0' : '1');
  payload.append('is_active', form.value.is_active === false ? '0' : '1');

  if (form.value.price_type === 'by_vehicle_type') {
    for (const vt of VEHICLE_TYPES) {
      const value = tiers.value[vt];
      if (value != null && value !== ('' as unknown)) {
        payload.append(`price_tiers[${vt}]`, String(value));
      }
    }
  }

  if (basisDocument.value) {
    payload.append('basis_document', basisDocument.value);
  }

  saving.value = true;
  try {
    if (isEdit.value) {
      await documentTypesApi.update(Number(form.value.id), payload);
    } else {
      await documentTypesApi.create(payload);
    }
    toast.add({ severity: 'success', summary: t('common.saved'), detail: t('crud.savedDetail'), life: 3000 });
    dialogVisible.value = false;
    await crud.load();
  } catch (error) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: extractError(error), life: 5000 });
  } finally {
    saving.value = false;
  }
}

async function downloadBasisDocument(item: DocumentType): Promise<void> {
  try {
    const blob = await documentTypesApi.downloadBasisDocument(item.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.basis_document_name || `${item.name}-asos-hujjat`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: extractError(error), life: 5000 });
  }
}

function money(value: string | number): string {
  return new Intl.NumberFormat('uz-UZ').format(Number(value || 0));
}

function priceSummary(item: DocumentType): string {
  if (item.price_type === 'by_vehicle_type') {
    const parts = VEHICLE_TYPES.filter((vt) => item.price_tiers?.[vt] != null).map(
      (vt) => `${t('vehicleType.' + vt)}: ${money(item.price_tiers![vt])}`,
    );
    return parts.length ? parts.join(', ') : `${money(item.price)} ${t('common.som')}`;
  }
  if (item.price_type === 'by_cylinder_count') {
    return t('docTypes.priceTimesCount', { price: money(item.price) });
  }
  return `${money(item.price)} ${t('common.som')}`;
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <Button :label="$t('docTypes.newDocType')" icon="pi pi-plus" size="small" @click="openCreate" />
    </div>

    <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
      <template #empty><div class="p-6 text-center text-slate-500">{{ $t('documents.notFound') }}</div></template>
      <Column :header="$t('common.name')">
        <template #body="{ data }">{{ localizedName(data) }}</template>
      </Column>
      <Column field="code" :header="$t('common.code')" />
      <Column :header="$t('docTypes.priceTypeCol')">
        <template #body="{ data }">
          <span class="text-sm text-slate-300">{{ priceTypeLabel(data.price_type) }}</span>
        </template>
      </Column>
      <Column :header="$t('docTypes.priceCol')">
        <template #body="{ data }">
          <span class="text-sm text-slate-300">{{ priceSummary(data) }}</span>
        </template>
      </Column>
      <Column :header="$t('docTypes.basisCol')">
        <template #body="{ data }">
          <Button
            v-if="data.has_basis_document"
            :label="data.basis_document_name || $t('docTypes.download')"
            icon="pi pi-download"
            link
            size="small"
            @click="downloadBasisDocument(data)"
          />
          <span v-else class="text-sm text-amber-400">{{ $t('docTypes.notUploaded') }}</span>
        </template>
      </Column>
      <Column :header="$t('common.actions')" style="width: 8rem">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" text rounded size="small" @click="openEdit(data)" />
            <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="crud.remove(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? $t('docTypes.editTitle') : $t('docTypes.newDocType')" class="w-full max-w-lg">
      <div class="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('catalogs.nameUz') }}</label>
          <InputText v-model="form.name_uz" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('catalogs.nameCyrl') }}</label>
          <InputText v-model="form.name_cyrl" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('catalogs.nameRu') }}</label>
          <InputText v-model="form.name_ru" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('catalogs.nameEn') }}</label>
          <InputText v-model="form.name_en" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('common.code') }}</label>
          <InputText v-model="form.code" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('docTypes.priceType') }}</label>
          <Select v-model="form.price_type" :options="priceTypeOptions" option-label="label" option-value="value" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ priceLabel }}</label>
          <InputNumber v-model="form.price" class="w-full" :min="0" :use-grouping="true" :suffix="` ${$t('common.som')}`" />
        </div>
        <div v-if="form.price_type === 'by_cylinder_count'" class="sm:col-span-2">
          <p class="rounded-lg bg-slate-800/60 px-3 py-2 text-xs text-slate-400">
            {{ $t('docTypes.cylinderFormula', { price: money(form.price ?? 0) }) }}
          </p>
        </div>
        <div v-if="form.price_type === 'by_vehicle_type'" class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('docTypes.vehiclePrices') }}</label>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div v-for="vt in VEHICLE_TYPES" :key="vt">
              <label class="mb-1 block text-xs text-slate-400">{{ $t('vehicleType.' + vt) }}</label>
              <InputNumber
                v-model="tiers[vt]"
                class="w-full"
                :min="0"
                :use-grouping="true"
                :suffix="` ${$t('common.som')}`"
                :placeholder="$t('docTypes.priceDefaultPlaceholder')"
              />
            </div>
          </div>
          <p class="mt-1 text-xs text-slate-500">{{ $t('docTypes.defaultHint') }}</p>
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">
            {{ $t('docTypes.basisDocument') }}
            <span v-if="isEdit && form.basis_document_name" class="font-normal text-slate-500">
              — {{ form.basis_document_name }}
            </span>
          </label>
          <input
            :key="fileInputKey"
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            class="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-500 file:px-3 file:py-1.5 file:text-white"
            @change="onFileChange"
          />
          <p class="mt-1 text-xs text-slate-500">{{ $t('docTypes.basisHint') }}</p>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="dialogVisible = false" />
        <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
