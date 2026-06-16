import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
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
export function useCrud<T extends WithId>(api: ResourceApi<T>, options: UseCrudOptions) {
  const toast = useToast();
  const confirm = useConfirm();

  const items = ref<T[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const dialogVisible = ref(false);
  const isEdit = ref(false);
  // Dynamic form bag; typed loosely so each view can bind arbitrary fields.
  const form = ref<Record<string, any>>({});

  async function load(params?: Record<string, unknown>): Promise<void> {
    loading.value = true;
    try {
      items.value = await api.list(params);
    } catch {
      toast.add({ severity: 'error', summary: 'Xatolik', detail: "Ma'lumotlarni yuklab bo‘lmadi", life: 4000 });
    } finally {
      loading.value = false;
    }
  }

  function openCreate(defaults: Record<string, unknown> = {}): void {
    isEdit.value = false;
    form.value = { ...defaults };
    dialogVisible.value = true;
  }

  function openEdit(item: T): void {
    isEdit.value = true;
    form.value = { ...item };
    dialogVisible.value = true;
  }

  async function save(): Promise<boolean> {
    saving.value = true;
    try {
      if (isEdit.value && form.value.id) {
        await api.update(form.value.id as number, form.value as Partial<T>);
      } else {
        await api.create(form.value as Partial<T>);
      }
      toast.add({ severity: 'success', summary: 'Saqlandi', detail: `${options.label} saqlandi`, life: 3000 });
      dialogVisible.value = false;
      await load();
      return true;
    } catch (e: unknown) {
      const detail = extractError(e);
      toast.add({ severity: 'error', summary: 'Xatolik', detail, life: 5000 });
      return false;
    } finally {
      saving.value = false;
    }
  }

  function remove(item: T): void {
    confirm.require({
      message: `Rostdan ham o‘chirmoqchimisiz?`,
      header: 'Tasdiqlang',
      icon: 'pi pi-exclamation-triangle',
      rejectLabel: 'Bekor qilish',
      acceptLabel: 'O‘chirish',
      acceptClass: 'p-button-danger',
      accept: async () => {
        try {
          await api.remove(item.id);
          toast.add({ severity: 'success', summary: 'O‘chirildi', detail: `${options.label} o‘chirildi`, life: 3000 });
          await load();
        } catch (e: unknown) {
          toast.add({ severity: 'error', summary: 'Xatolik', detail: extractError(e), life: 5000 });
        }
      },
    });
  }

  return {
    items,
    loading,
    saving,
    dialogVisible,
    isEdit,
    form,
    load,
    openCreate,
    openEdit,
    save,
    remove,
  };
}

// Pull the first validation message (or generic message) out of an axios error.
export function extractError(e: unknown): string {
  const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
  const data = err.response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors)[0];
    if (first?.length) return first[0];
  }
  return data?.message ?? 'Noma’lum xatolik yuz berdi';
}
