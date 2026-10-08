import { onBeforeUnmount, ref } from 'vue';
import axios from 'axios';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { translate as t } from '@/i18n';
import type { ResourceApi } from '@/api/services';

interface WithId {
  id: number;
}

interface UseCrudOptions {
  label: string; // e.g. "Filial"
}

/**
 * Encapsulates list/create/update/delete state for a single resource,
 * wiring PrimeVue toast + confirm dialogs for feedback.
 */
export function useCrud<T extends WithId>(api: ResourceApi<T>, _options: UseCrudOptions) {
  const toast = useToast();
  const confirm = useConfirm();

  const items = ref<T[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const dialogVisible = ref(false);
  const isEdit = ref(false);
  // Dynamic form bag; typed loosely so each view can bind arbitrary fields.
  const form = ref<Record<string, any>>({});
  const fieldErrors = ref<Record<string, string>>({});
  const totalRecords = ref(0);
  const rows = ref(10);
  const first = ref(0);
  const sortField = ref<string>();
  const sortOrder = ref<1 | -1>(-1);
  let lastParams: Record<string, unknown> = {};
  let controller: AbortController | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let requestSequence = 0;

  async function load(params: Record<string, unknown> = lastParams, resetPage = false): Promise<void> {
    lastParams = { ...params };
    if (resetPage) first.value = 0;
    controller?.abort();
    controller = new AbortController();
    const sequence = ++requestSequence;
    loading.value = true;
    try {
      const result = await api.page({
        ...lastParams,
        page: Math.floor(first.value / rows.value) + 1,
        per_page: rows.value,
        sort_field: sortField.value,
        sort_dir: sortOrder.value === 1 ? 'asc' : 'desc',
      }, controller.signal);
      items.value = result.data;
      totalRecords.value = result.total;
    } catch (e) {
      if (axios.isCancel(e)) return;
      toast.add({ severity: 'error', summary: t('common.error'), detail: t('crud.loadFailed'), life: 4000 });
    } finally {
      if (sequence === requestSequence) loading.value = false;
    }
  }

  function debouncedLoad(params: Record<string, unknown> = lastParams, delay = 350): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => load(params, true), delay);
  }

  function onPage(event: { first: number; rows: number }): void {
    first.value = event.first;
    rows.value = event.rows;
    void load();
  }

  function onSort(event: { sortField?: string | ((item: T) => string); sortOrder?: 1 | -1 | 0 | null }): void {
    if (typeof event.sortField !== 'string') return;
    sortField.value = event.sortField;
    sortOrder.value = event.sortOrder === 1 ? 1 : -1;
    first.value = 0;
    void load();
  }

  function openCreate(defaults: Record<string, unknown> = {}): void {
    isEdit.value = false;
    fieldErrors.value = {};
    form.value = { ...defaults };
    dialogVisible.value = true;
  }

  function openEdit(item: T): void {
    isEdit.value = true;
    fieldErrors.value = {};
    form.value = { ...item };
    dialogVisible.value = true;
  }

  async function save(): Promise<boolean> {
    fieldErrors.value = {};
    saving.value = true;
    try {
      if (isEdit.value && form.value.id) {
        await api.update(form.value.id as number, form.value as Partial<T>);
      } else {
        await api.create(form.value as Partial<T>);
      }
      toast.add({ severity: 'success', summary: t('common.saved'), detail: t('crud.savedDetail'), life: 3000 });
      dialogVisible.value = false;
      await load(lastParams);
      return true;
    } catch (e: unknown) {
      fieldErrors.value = extractFieldErrors(e);
      const detail = extractError(e);
      toast.add({ severity: 'error', summary: t('common.error'), detail, life: 5000 });
      return false;
    } finally {
      saving.value = false;
    }
  }

  function remove(item: T): void {
    confirm.require({
      message: t('crud.confirmMessage'),
      header: t('crud.confirmHeader'),
      icon: 'pi pi-exclamation-triangle',
      rejectLabel: t('common.cancel'),
      acceptLabel: t('common.delete'),
      acceptClass: 'p-button-danger',
      accept: async () => {
        try {
          await api.remove(item.id);
          toast.add({ severity: 'success', summary: t('common.deleted'), detail: t('crud.deletedDetail'), life: 3000 });
          await load(lastParams);
        } catch (e: unknown) {
          toast.add({ severity: 'error', summary: t('common.error'), detail: extractError(e), life: 5000 });
        }
      },
    });
  }

  onBeforeUnmount(() => {
    controller?.abort();
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  return {
    items,
    loading,
    saving,
    dialogVisible,
    isEdit,
    form,
    fieldErrors,
    totalRecords,
    rows,
    first,
    load,
    debouncedLoad,
    onPage,
    onSort,
    openCreate,
    openEdit,
    save,
    remove,
  };
}

export function extractFieldErrors(e: unknown): Record<string, string> {
  const err = e as { response?: { data?: { errors?: Record<string, string[]> } } };
  return Object.fromEntries(
    Object.entries(err.response?.data?.errors ?? {}).map(([field, messages]) => [field, messages[0] ?? '']),
  );
}

// Pull the first validation message (or generic message) out of an axios error.
export function extractError(e: unknown): string {
  const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
  const data = err.response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors)[0];
    if (first?.length) return first[0];
  }
  return data?.message ?? t('crud.unknownError');
}
