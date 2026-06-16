<script setup lang="ts">
import { onMounted } from 'vue';
import { branchesApi } from '@/api/services';
import { useCrud } from '@/composables/useCrud';
import type { Branch } from '@/types';

const crud = useCrud<Branch>(branchesApi, { label: 'Filial' });
const { items, loading, saving, dialogVisible, isEdit, form } = crud;

onMounted(() => crud.load());

function openCreate() {
  crud.openCreate({ name: '', is_active: true });
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Filiallar</h1>
        <p class="text-sm text-slate-400">Korxona filiallarini boshqaring</p>
      </div>
      <Button label="Yangi filial" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
        <template #empty><div class="p-6 text-center text-slate-500">Filiallar topilmadi</div></template>
        <Column field="id" header="ID" style="width: 5rem" />
        <Column field="name" header="Nomi" />
        <Column header="Holati" style="width: 10rem">
          <template #body="{ data }">
            <Tag :value="data.is_active ? 'Faol' : 'Faol emas'" :severity="data.is_active ? 'success' : 'danger'" />
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

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? 'Filialni tahrirlash' : 'Yangi filial'" class="w-full max-w-md">
      <div class="space-y-4 pt-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Nomi</label>
          <InputText v-model="form.name" class="w-full" />
        </div>
        <div class="flex items-center gap-2">
          <ToggleSwitch v-model="form.is_active" input-id="active" />
          <label for="active" class="text-sm text-slate-300">Faol</label>
        </div>
      </div>
      <template #footer>
        <Button label="Bekor qilish" text @click="dialogVisible = false" />
        <Button label="Saqlash" icon="pi pi-check" :loading="saving" @click="crud.save()" />
      </template>
    </Dialog>
  </div>
</template>
