<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { districtsApi, regionsApi } from '@/api/services';
import { useCrud } from '@/composables/useCrud';
import { localizedName } from '@/i18n';
import type { District, Region } from '@/types';

const crud = useCrud<District>(districtsApi, { label: 'Tuman' });
const { items, loading, saving, dialogVisible, isEdit, form } = crud;
const regions = ref<Region[]>([]);

onMounted(async () => {
  regions.value = await regionsApi.list();
  await crud.load();
});
</script>

<template>
  <div class="space-y-4">
    <!-- <div class="flex justify-end">
      <Button label="Yangi tuman" icon="pi pi-plus" size="small" @click="crud.openCreate({ name_uz: '', name_ru: '', name_en: '', name_cyrl: '', soato: null, region_id: null })" />
    </div> -->
    <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
      <template #empty><div class="p-6 text-center text-slate-500">{{ $t('catalogs.notFound') }}</div></template>
      <Column field="id" header="ID" style="width: 5rem" />
      <Column :header="$t('common.name')">
        <template #body="{ data }">{{ localizedName(data) }}</template>
      </Column>
      <Column field="soato" :header="$t('catalogs.soato')" style="width: 8rem" />
      <Column :header="$t('catalogs.region')">
        <template #body="{ data }">{{ data.region ? localizedName(data.region) : '—' }}</template>
      </Column>
      <!-- <Column header="Amallar" style="width: 8rem">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" text rounded size="small" @click="crud.openEdit(data)" />
            <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="crud.remove(data)" />
          </div>
        </template>
      </Column> -->
    </DataTable>

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? $t('catalogs.editDistrict') : $t('catalogs.newDistrict')" class="w-full max-w-md">
      <div class="space-y-4 pt-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('catalogs.region') }}</label>
          <Select v-model="form.region_id" :options="regions" :option-label="localizedName" option-value="id" class="w-full" :placeholder="$t('common.select')" />
        </div>
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
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('catalogs.soato') }}</label>
          <InputNumber v-model="form.soato" :use-grouping="false" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="dialogVisible = false" />
        <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="crud.save()" />
      </template>
    </Dialog>
  </div>
</template>
