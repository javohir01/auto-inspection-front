<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { counterpartiesApi, regionsApi, districtsApi } from '@/api/services';
import { useCrud } from '@/composables/useCrud';
import type { Counterparty, Region, District } from '@/types';

const crud = useCrud<Counterparty>(counterpartiesApi, { label: 'Mijoz' });
const { items, loading, saving, dialogVisible, isEdit, form } = crud;

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
  crud.load({ search: search.value || undefined });
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Mijozlar</h1>
        <p class="text-sm text-slate-400">Kontragentlar ro‘yxati</p>
      </div>
      <Button label="Yangi mijoz" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div class="flex gap-2">
      <IconField class="flex-1">
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" class="w-full" placeholder="Ism yoki telefon bo‘yicha qidirish" @keyup.enter="doSearch" />
      </IconField>
      <Button label="Qidirish" outlined @click="doSearch" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
        <template #empty><div class="p-6 text-center text-slate-500">Mijozlar topilmadi</div></template>
        <Column field="full_name" header="F.I.O" />
        <Column field="phone" header="Telefon" />
        <Column header="Viloyat">
          <template #body="{ data }">{{ data.region?.name_uz ?? '—' }}</template>
        </Column>
        <Column header="Tuman">
          <template #body="{ data }">{{ data.district?.name_uz ?? '—' }}</template>
        </Column>
        <Column field="basis_type" header="Turi" />
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

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? 'Mijozni tahrirlash' : 'Yangi mijoz'" class="w-full max-w-lg">
      <div class="grid grid-cols-2 gap-4 pt-2">
        <div class="col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">F.I.O</label>
          <InputText v-model="form.full_name" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Telefon</label>
          <InputText v-model="form.phone" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Turi</label>
          <InputText v-model="form.basis_type" class="w-full" placeholder="Jismoniy/Yuridik shaxs" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Viloyat</label>
          <Select v-model="form.region_id" :options="regions" option-label="name_uz" option-value="id" class="w-full" placeholder="Tanlang" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Tuman</label>
          <Select v-model="form.district_id" :options="filteredDistricts" option-label="name_uz" option-value="id" class="w-full" placeholder="Tanlang" :disabled="!form.region_id" />
        </div>
        <div class="col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Manzil</label>
          <Textarea v-model="form.address" class="w-full" rows="2" />
        </div>
      </div>
      <template #footer>
        <Button label="Bekor qilish" text @click="dialogVisible = false" />
        <Button label="Saqlash" icon="pi pi-check" :loading="saving" @click="crud.save()" />
      </template>
    </Dialog>
  </div>
</template>
