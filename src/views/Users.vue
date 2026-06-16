<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { usersApi, branchesApi } from '@/api/services';
import { useCrud } from '@/composables/useCrud';
import type { User, Branch } from '@/types';

const crud = useCrud<User>(usersApi, { label: 'Xodim' });
const { items, loading, saving, dialogVisible, isEdit, form } = crud;

const branches = ref<Branch[]>([]);
const roles = [
  { label: 'Administrator', value: 'admin' },
  { label: 'Moderator', value: 'moderator' },
  { label: 'Kassir', value: 'cashier' },
];

onMounted(async () => {
  branches.value = await branchesApi.list();
  await crud.load();
});

function openCreate() {
  crud.openCreate({ name: '', phone: '', role: 'cashier', branch_id: null, password: '' });
}

function roleLabel(role: string) {
  return roles.find((r) => r.value === role)?.label ?? role;
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Xodimlar</h1>
        <p class="text-sm text-slate-400">Tizim foydalanuvchilarini boshqaring</p>
      </div>
      <Button label="Yangi xodim" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
        <template #empty><div class="p-6 text-center text-slate-500">Xodimlar topilmadi</div></template>
        <Column field="name" header="F.I.O" />
        <Column field="phone" header="Telefon" />
        <Column header="Lavozim">
          <template #body="{ data }"><Tag :value="roleLabel(data.role)" /></template>
        </Column>
        <Column header="Filial">
          <template #body="{ data }">{{ data.branch?.name ?? '—' }}</template>
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

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? 'Xodimni tahrirlash' : 'Yangi xodim'" class="w-full max-w-md">
      <div class="space-y-4 pt-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">F.I.O</label>
          <InputText v-model="form.name" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Telefon</label>
          <InputText v-model="form.phone" class="w-full" placeholder="+998..." />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Lavozim</label>
          <Select v-model="form.role" :options="roles" option-label="label" option-value="value" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Filial</label>
          <Select v-model="form.branch_id" :options="branches" option-label="name" option-value="id" class="w-full" show-clear placeholder="Tanlanmagan" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">
            Parol <span v-if="isEdit" class="text-xs text-slate-500">(o‘zgartirmaslik uchun bo‘sh qoldiring)</span>
          </label>
          <Password v-model="form.password" class="w-full" input-class="w-full" :feedback="false" toggle-mask />
        </div>
      </div>
      <template #footer>
        <Button label="Bekor qilish" text @click="dialogVisible = false" />
        <Button label="Saqlash" icon="pi pi-check" :loading="saving" @click="crud.save()" />
      </template>
    </Dialog>
  </div>
</template>
