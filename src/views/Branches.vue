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
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ $t('branches.title') }}</h1>
        <p class="text-sm text-slate-400">{{ $t('branches.subtitle') }}</p>
      </div>
      <Button :label="$t('branches.newBranch')" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
        <template #empty><div class="p-6 text-center text-slate-500">{{ $t('branches.notFound') }}</div></template>
        <Column field="id" header="ID" style="width: 5rem" />
        <Column field="name" :header="$t('common.name')" />
        <Column :header="$t('common.status')" style="width: 10rem">
          <template #body="{ data }">
            <Tag :value="data.is_active ? $t('common.active') : $t('common.inactive')" :severity="data.is_active ? 'success' : 'danger'" />
          </template>
        </Column>
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

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? $t('branches.editTitle') : $t('branches.newBranch')" class="w-full max-w-md">
      <div class="space-y-4 pt-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('common.name') }}</label>
          <InputText v-model="form.name" class="w-full" />
        </div>
        <div class="flex items-center gap-2">
          <ToggleSwitch v-model="form.is_active" input-id="active" />
          <label for="active" class="text-sm text-slate-300">{{ $t('common.active') }}</label>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="dialogVisible = false" />
        <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="crud.save()" />
      </template>
    </Dialog>
  </div>
</template>
