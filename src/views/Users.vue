<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usersApi, branchesApi } from '@/api/services';
import { useAuthStore } from '@/stores/auth';
import { useCrud } from '@/composables/useCrud';
import { translate as t } from '@/i18n';
import type { User, Branch } from '@/types';
import { normalizePhone } from '@/utils/dataFormat';

const crud = useCrud<User>(usersApi, { label: 'Xodim' });
const { items, loading, saving, dialogVisible, isEdit, form, fieldErrors, totalRecords, rows, first } = crud;
const auth = useAuthStore();

const branches = ref<Branch[]>([]);
const roles = [
  { labelKey: 'role.admin', value: 'admin' },
  { labelKey: 'role.branch_manager', value: 'branch_manager' },
  { labelKey: 'role.cashier', value: 'cashier' },
];
const roleOptions = computed(() => {
  const options = roles.map((r) => ({ label: t(r.labelKey), value: r.value }));

  return auth.user?.role === 'branch_manager'
    ? options.filter((option) => option.value === 'cashier')
    : options;
});

onMounted(async () => {
  branches.value = await branchesApi.list();
  await crud.load();
});

function openCreate() {
  crud.openCreate({ name: '', phone: '', role: 'cashier', branch_id: null, password: '' });
}

function roleLabel(role: string) {
  const match = roles.find((r) => r.value === role);
  return match ? t(match.labelKey) : role;
}

async function saveUser() {
  form.value.phone = normalizePhone(form.value.phone);
  await crud.save();
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ $t('users.title') }}</h1>
        <p class="text-sm text-slate-400">{{ $t('users.subtitle') }}</p>
      </div>
      <Button :label="$t('users.newUser')" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator lazy :rows="rows" :rows-per-page-options="[10, 25, 50]" :first="first" :total-records="totalRecords" data-key="id" @page="crud.onPage" @sort="crud.onSort">
        <template #empty><div class="p-6 text-center text-slate-500">{{ $t('users.notFound') }}</div></template>
        <Column field="name" :header="$t('users.fio')" sortable />
        <Column field="phone" :header="$t('users.phone')" sortable />
        <Column :header="$t('users.role')">
          <template #body="{ data }"><Tag :value="roleLabel(data.role)" /></template>
        </Column>
        <Column :header="$t('users.branch')">
          <template #body="{ data }">{{ data.branch?.name ?? '—' }}</template>
        </Column>
        <Column :header="$t('common.actions')" style="width: 8rem">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button icon="pi pi-pencil" text rounded size="small" @click="crud.openEdit(data)" />
              <Button v-if="auth.user?.role === 'admin'" icon="pi pi-trash" text rounded severity="danger" size="small" @click="crud.remove(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? $t('users.editTitle') : $t('users.newUser')" class="w-full max-w-md">
      <div class="space-y-4 pt-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('users.fio') }}</label>
          <InputText v-model="form.name" class="w-full" :invalid="!!fieldErrors.name" />
          <InlineError :message="fieldErrors.name" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('users.phone') }}</label>
          <InputText v-model="form.phone" class="w-full" :invalid="!!fieldErrors.phone" placeholder="+998 90 123 45 67" inputmode="tel" />
          <InlineError :message="fieldErrors.phone" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('users.role') }}</label>
          <Select v-model="form.role" :options="roleOptions" option-label="label" option-value="value" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('users.branch') }}</label>
          <Select v-model="form.branch_id" :options="branches" option-label="name" option-value="id" class="w-full" show-clear :placeholder="$t('common.notSelected')" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">
            {{ $t('users.password') }} <span v-if="isEdit" class="text-xs text-slate-500">{{ $t('users.passwordEditHint') }}</span>
          </label>
          <Password v-model="form.password" class="w-full" input-class="w-full" :invalid="!!fieldErrors.password" :feedback="false" toggle-mask />
          <InlineError :message="fieldErrors.password" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="dialogVisible = false" />
        <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="saveUser" />
      </template>
    </Dialog>
  </div>
</template>
