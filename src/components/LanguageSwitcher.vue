<script setup lang="ts">
import { computed, ref } from 'vue';
import { availableLocales, locale, setLocale } from '@/i18n';
import type { LocaleCode } from '@/i18n';

const menu = ref();

const current = computed(() => availableLocales.find((l) => l.code === locale.value) ?? availableLocales[0]);

const items = computed(() =>
  availableLocales.map((l) => ({
    label: l.label,
    command: () => setLocale(l.code as LocaleCode),
  })),
);

function toggle(event: Event): void {
  menu.value?.toggle(event);
}
</script>

<template>
  <div>
    <button
      class="app-icon-button flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-slate-400 hover:bg-slate-800 hover:text-white"
      type="button"
      :aria-label="$t('header.language')"
      @click="toggle"
    >
      <i class="pi pi-globe" />
      <span class="text-xs font-semibold">{{ current.short }}</span>
    </button>
    <Menu ref="menu" :model="items" popup />
  </div>
</template>
