<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { extractError } from '@/composables/useCrud';
import { useTheme } from '@/composables/useTheme';

const router = useRouter();
const auth = useAuthStore();
const { isDark, toggleTheme } = useTheme();

const phone = ref('998901112233');
const password = ref('password');
const error = ref('');
const demoCredentials = [
  { role: 'Admin', phone: '998901112233', password: 'password' },
  { role: 'Kassir', phone: '998901112244', password: 'password' },
  { role: 'Filial manager', phone: '998901112255', password: 'password' },
];

async function submit() {
  error.value = '';
  try {
    await auth.login(phone.value, password.value);
    router.push({ name: 'Dashboard' });
  } catch (e) {
    error.value = extractError(e);
  }
}

</script>

<template>
  <div class="app-shell relative flex min-h-screen items-center justify-center bg-[#0b0f19] px-4">
    <button
      v-tooltip.bottom="isDark ? $t('header.lightMode') : $t('header.darkMode')"
      class="app-icon-button absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
      type="button"
      @click="toggleTheme"
    >
      <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'" />
    </button>

    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-2xl font-bold">
          <i class="pi pi-car" />
        </div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ $t('header.appName') }}</h1>
        <p class="mt-1 text-sm text-slate-400">{{ $t('login.subtitle') }}</p>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-7 shadow-xl">
        <form class="space-y-5" @submit.prevent="submit">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('login.phone') }}</label>
            <InputText v-model="phone" class="w-full" placeholder="998901112233" autocomplete="username" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('login.password') }}</label>
            <Password
              v-model="password"
              class="w-full"
              input-class="w-full"
              :feedback="false"
              toggle-mask
              :placeholder="$t('login.password')"
              autocomplete="current-password"
            />
          </div>

          <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

          <Button
            type="submit"
            :label="$t('login.signIn')"
            icon="pi pi-sign-in"
            class="w-full"
            :loading="auth.loading"
          />
        </form>
      </div>

      <!-- <div class="mt-6 space-y-2 text-xs text-slate-500">
        <p class="text-center">{{ auth.isMock ? $t('login.mockLogin') : $t('login.testLogin') }}</p>
        <div class="space-y-1 rounded-xl border border-slate-800 bg-[#0e1320] p-3">
          <div
            v-for="credential in demoCredentials"
            :key="credential.phone"
            class="flex items-center justify-between gap-3"
          >
            <span class="font-medium text-slate-300">{{ credential.role }}</span>
            <span class="text-right">
              <span class="text-slate-300">{{ credential.phone }}</span>
              <span class="px-1 text-slate-600">/</span>
              <span class="text-slate-300">{{ credential.password }}</span>
            </span>
          </div>
        </div>
      </div> -->
    </div>
  </div>
</template>
