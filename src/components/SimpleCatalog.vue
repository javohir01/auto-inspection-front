<script setup lang="ts">
import { onMounted } from 'vue';
import { useCrud } from '@/composables/useCrud';
import { localizedName } from '@/i18n';
import type { ResourceApi } from '@/api/services';

interface NamedEntity {
  id: number;
  name: string;
  name_uz?: string | null;
  name_cyrl?: string | null;
  name_ru?: string | null;
  name_en?: string | null;
}

const props = defineProps<{
  api: ResourceApi<NamedEntity>;
  label: string;
}>();

const crud = useCrud<NamedEntity>(props.api, { label: props.label });
const { items, loading, saving, dialogVisible, isEdit, form } = crud;

onMounted(() => crud.load());

function openCreate(): void {
  crud.openCreate({ name: '', name_uz: '', name_cyrl: '', name_ru: '', name_en: '' });
}

// Keep the canonical `name` populated (backend requires it) from the uz value.
async function handleSave(): Promise<void> {
  form.value.name = form.value.name_uz || form.value.name || '';
  await crud.save();
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <Button :label="$t('catalogs.newOf', { label })" icon="pi pi-plus" size="small" @click="openCreate" />
    </div>
    <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
      <template #empty><div class="p-6 text-center text-slate-500">{{ $t('catalogs.notFound') }}</div></template>
      <Column field="id" header="ID" style="width: 5rem" />
      <Column :header="$t('common.name')">
        <template #body="{ data }">{{ localizedName(data) }}</template>
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

    <Dialog
      v-model:visible="dialogVisible"
      modal
      :header="isEdit ? $t('catalogs.editOf', { label }) : $t('catalogs.newOf', { label })"
      class="w-full max-w-md"
    >
      <div class="space-y-4 pt-2">
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
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="dialogVisible = false" />
        <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="handleSave" />
      </template>
    </Dialog>
  </div>
</template>
