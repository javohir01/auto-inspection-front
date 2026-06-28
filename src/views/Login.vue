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

      <p class="mt-6 text-center text-xs text-slate-500">
        <template v-if="auth.isMock">
          {{ $t('login.mockLogin') }}: <span class="text-slate-300">998901112233</span> · {{ $t('login.password') }}: <span class="text-slate-300">password</span>
        </template>
        <template v-else>
          {{ $t('login.testLogin') }}: <span class="text-slate-300">+998901112233</span> · {{ $t('login.password') }}: <span class="text-slate-300">password</span>
        </template>
      </p>
    </div>
  </div>
</template>
