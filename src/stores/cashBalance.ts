import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { cashBalanceApi } from '@/api/services';
import type { CashBalance } from '@/types';

interface BalanceParams {
  branch_id?: number | null;
  employee_id?: number | null;
  date?: string | null;
}

export const useCashBalanceStore = defineStore('cash-balance', () => {
  const balance = ref<CashBalance | null>(null);
  const loading = ref(false);
  let inFlight: Promise<CashBalance> | null = null;
  let lastKey = '';
  let loadedAt = 0;

  async function refresh(params: BalanceParams, force = false): Promise<CashBalance> {
    const key = JSON.stringify(params);
    if (!force && balance.value && key === lastKey && Date.now() - loadedAt < 15_000) return balance.value;
    if (inFlight && key === lastKey) return inFlight;

    lastKey = key;
    loading.value = true;
    inFlight = cashBalanceApi.summary(params);
    try {
      balance.value = await inFlight;
      loadedAt = Date.now();
      return balance.value;
    } finally {
      inFlight = null;
      loading.value = false;
    }
  }

  async function safeDeposit(payload: { branch_id?: number | null; amount: number; date?: string | null; description?: string | null }) {
    const result = await cashBalanceApi.safeDeposit(payload);
    balance.value = result.summary;
    loadedAt = Date.now();
    return result;
  }

  return { balance, loading: computed(() => loading.value), refresh, safeDeposit };
});
