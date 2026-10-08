<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { counterpartiesApi, regionsApi, districtsApi } from '@/api/services';
import { useCrud } from '@/composables/useCrud';
import { localizedName } from '@/i18n';
import type { Counterparty, Region, District } from '@/types';
import { normalizePhone } from '@/utils/dataFormat';

const crud = useCrud<Counterparty>(counterpartiesApi, { label: 'Mijoz' });
const { items, loading, saving, dialogVisible, isEdit, form, fieldErrors, totalRecords, rows, first } = crud;

const regions = ref<Region[]>([]);
const districts = ref<District[]>([]);
const search = ref('');

const filteredDistricts = computed(() =>
  districts.value.filter((d) => d.region_id === form.value.region_id),
);

onMounted(async () => {
  [regions.value, districts.value] = await Promise.all([regionsApi.list(), districtsApi.list()]);
  await crud.load();
});

// Reset the district when the region changes (only on user interaction).
watch(() => form.value.region_id, (newRegion, oldRegion) => {
  if (oldRegion !== undefined && newRegion !== oldRegion) {
    form.value.district_id = null;
  }
});

function openCreate() {
  crud.openCreate({ full_name: '', phone: '', region_id: null, district_id: null, address: '', basis_type: 'Jismoniy shaxs' });
}

function doSearch() {
  crud.load({ search: search.value || undefined }, true);
}
async function saveCounterparty() {
  form.value.phone = normalizePhone(form.value.phone);
  await crud.save();
}

function resetSearch() {
  search.value = '';
  void crud.load({}, true);
}
watch(search, () => crud.debouncedLoad({ search: search.value || undefined }));
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ $t('counterparties.title') }}</h1>
        <p class="text-sm text-slate-400">{{ $t('counterparties.subtitle') }}</p>
      </div>
      <Button :label="$t('counterparties.newClient')" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div class="flex flex-col gap-2 sm:flex-row">
      <IconField class="flex-1">
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" class="w-full" :placeholder="$t('counterparties.searchPlaceholder')" @keyup.enter="doSearch" />
      </IconField>
      <Button :label="$t('common.search')" outlined @click="doSearch" />
      <Button :label="$t('common.reset')" icon="pi pi-filter-slash" text @click="resetSearch" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator lazy :rows="rows" :rows-per-page-options="[10, 25, 50]" :first="first" :total-records="totalRecords" data-key="id" @page="crud.onPage" @sort="crud.onSort">
        <template #empty><div class="p-6 text-center text-slate-500">{{ $t('counterparties.notFound') }}</div></template>
        <Column field="full_name" :header="$t('counterparties.fio')" sortable />
        <Column field="phone" :header="$t('counterparties.phone')" sortable />
        <Column :header="$t('counterparties.region')">
          <template #body="{ data }">{{ data.region ? localizedName(data.region) : '—' }}</template>
        </Column>
        <Column :header="$t('counterparties.district')">
          <template #body="{ data }">{{ data.district ? localizedName(data.district) : '—' }}</template>
        </Column>
        <Column field="basis_type" :header="$t('counterparties.type')" />
        <Column :header="$t('common.actions')" style="width: 8rem">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button icon="pi pi-pencil" text rounded size="small" @click="crud.openEdit(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="crud.remove(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? $t('counterparties.editTitle') : $t('counterparties.newClient')" class="w-full max-w-lg">
      <div class="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('counterparties.fio') }}</label>
          <InputText v-model="form.full_name" class="w-full" :invalid="!!fieldErrors.full_name" />
          <InlineError :message="fieldErrors.full_name" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('counterparties.phone') }}</label>
          <InputText v-model="form.phone" class="w-full" :invalid="!!fieldErrors.phone" placeholder="+998 90 123 45 67" inputmode="tel" />
          <InlineError :message="fieldErrors.phone" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('counterparties.type') }}</label>
          <InputText v-model="form.basis_type" class="w-full" :placeholder="$t('counterparties.typePlaceholder')" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('counterparties.region') }}</label>
          <Select v-model="form.region_id" :options="regions" :option-label="localizedName" option-value="id" class="w-full" :invalid="!!fieldErrors.region_id" :placeholder="$t('common.select')" />
          <InlineError :message="fieldErrors.region_id" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('counterparties.district') }}</label>
          <Select v-model="form.district_id" :options="filteredDistricts" :option-label="localizedName" option-value="id" class="w-full" :invalid="!!fieldErrors.district_id" :placeholder="$t('common.select')" :disabled="!form.region_id" />
          <InlineError :message="fieldErrors.district_id" />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('counterparties.address') }}</label>
          <Textarea v-model="form.address" class="w-full" :invalid="!!fieldErrors.address" rows="2" />
          <InlineError :message="fieldErrors.address" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="dialogVisible = false" />
        <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="saveCounterparty" />
      </template>
    </Dialog>
  </div>
</template>
