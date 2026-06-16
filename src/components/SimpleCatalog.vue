<script setup lang="ts">
import { onMounted } from 'vue';
import { useCrud } from '@/composables/useCrud';
import type { ResourceApi } from '@/api/services';

interface NamedEntity {
  id: number;
  name: string;
}

const props = defineProps<{
  api: ResourceApi<NamedEntity>;
  label: string;
}>();

const crud = useCrud<NamedEntity>(props.api, { label: props.label });
const { items, loading, saving, dialogVisible, isEdit, form } = crud;

onMounted(() => crud.load());
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <Button :label="`Yangi: ${label}`" icon="pi pi-plus" size="small" @click="crud.openCreate({ name: '' })" />
    </div>
    <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
      <template #empty><div class="p-6 text-center text-slate-500">Ma’lumot topilmadi</div></template>
      <Column field="id" header="ID" style="width: 5rem" />
      <Column field="name" header="Nomi" />
      <Column header="Amallar" style="width: 8rem">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" text rounded size="small" @click="crud.openEdit(data)" />
            <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="crud.remove(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? `${label}ni tahrirlash` : `Yangi: ${label}`" class="w-full max-w-md">
      <div class="pt-2">
        <label class="mb-1.5 block text-sm font-medium text-slate-300">Nomi</label>
        <InputText v-model="form.name" class="w-full" />
      </div>
      <template #footer>
        <Button label="Bekor qilish" text @click="dialogVisible = false" />
        <Button label="Saqlash" icon="pi pi-check" :loading="saving" @click="crud.save()" />
      </template>
    </Dialog>
  </div>
</template>
