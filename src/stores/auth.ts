import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import http, { getToken, setToken } from '@/api/http';
import { createMockAdminUser, isMockModeEnabled, mockFetchMe, mockLogin, mockLogout } from '@/mock/backend';
import type { User } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(getToken());
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isMock = computed(() => isMockModeEnabled());

  async function login(phone: string, password: string): Promise<void> {
    loading.value = true;
    try {
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
    if (isMockModeEnabled()) {
      user.value = await mockFetchMe(token.value);
      return;
    }

    const { data } = await http.get('/me');
    user.value = data.data ?? data;
  }

  async function logout(): Promise<void> {
    if (isMockModeEnabled()) {
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
