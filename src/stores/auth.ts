import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import http, { getToken, setToken } from '@/api/http';
import { createMockAdminUser, enableMockMode, isMockModeEnabled, mockFetchMe, mockLogin, mockLogout } from '@/mock/backend';
import type { User } from '@/types';

const TEST_PHONE = '998901112233';
const TEST_PASSWORD = 'password';

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

function isTestLogin(phone: string, password: string): boolean {
  return normalizePhone(phone) === TEST_PHONE && password === TEST_PASSWORD;
}

function isMockToken(token: string | null): boolean {
  return token?.startsWith('mock-token-') ?? false;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(getToken());
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isMock = computed(() => isMockModeEnabled() || isMockToken(token.value));

  async function login(phone: string, password: string): Promise<void> {
    loading.value = true;
    try {
      if (isTestLogin(phone, password)) {
        enableMockMode();
      }

      if (isMockModeEnabled()) {
        const data = await mockLogin(phone, password);
        token.value = data.token;
        setToken(data.token);
        user.value = data.user;
        return;
      }

      const { data } = await http.post('/login', { phone, password });
      token.value = data.token;
      setToken(data.token);
      user.value = data.user;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMe(): Promise<void> {
    if (isMock.value) {
      user.value = await mockFetchMe(token.value);
      return;
    }

    const { data } = await http.get('/me');
    user.value = data.data ?? data;
  }

  async function logout(): Promise<void> {
    if (isMock.value) {
      await mockLogout(token.value);
    } else {
      try {
        await http.post('/logout');
      } catch {
        // Ignore network errors on logout; we clear the session regardless.
      }
    }
    user.value = null;
    token.value = null;
    setToken(null);
  }

  async function createAdmin(name: string, phone: string, password: string): Promise<void> {
    loading.value = true;
    try {
      await createMockAdminUser({ name, phone, password });
      const data = await mockLogin(phone, password);
      token.value = data.token;
      setToken(data.token);
      user.value = data.user;
    } finally {
      loading.value = false;
    }
  }

  return { user, token, loading, isAuthenticated, isAdmin, isMock, login, fetchMe, logout, createAdmin };
});
