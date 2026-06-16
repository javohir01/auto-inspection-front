<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { districtsApi, regionsApi } from '@/api/services';
import { useCrud } from '@/composables/useCrud';
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
    <div class="flex justify-end">
      <Button label="Yangi tuman" icon="pi pi-plus" size="small" @click="crud.openCreate({ name: '', region_id: null })" />
    </div>
    <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
      <template #empty><div class="p-6 text-center text-slate-500">Ma’lumot topilmadi</div></template>
      <Column field="id" header="ID" style="width: 5rem" />
      <Column field="name" header="Nomi" />
      <Column header="Viloyat">
        <template #body="{ data }">{{ data.region?.name ?? '—' }}</template>
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

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? 'Tumanni tahrirlash' : 'Yangi tuman'" class="w-full max-w-md">
      <div class="space-y-4 pt-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Viloyat</label>
          <Select v-model="form.region_id" :options="regions" option-label="name" option-value="id" class="w-full" placeholder="Tanlang" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Nomi</label>
          <InputText v-model="form.name" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Bekor qilish" text @click="dialogVisible = false" />
        <Button label="Saqlash" icon="pi pi-check" :loading="saving" @click="crud.save()" />
      </template>
    </Dialog>
  </div>
</template>
