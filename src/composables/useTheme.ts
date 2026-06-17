import { computed, ref } from 'vue';

type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'vehicle-front-theme';
const theme = ref<ThemeMode>('dark');
let initialized = false;

function resolveInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(nextTheme: ThemeMode, persist = true) {
  theme.value = nextTheme;

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.toggle('dark', nextTheme === 'dark');
    root.classList.toggle('light', nextTheme === 'light');
    root.style.colorScheme = nextTheme;
  }

  if (persist && typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  }
}

export function initTheme() {
  if (initialized) {
    return;
  }

  applyTheme(resolveInitialTheme(), false);
  initialized = true;
}

export function useTheme() {
  initTheme();

  const isDark = computed(() => theme.value === 'dark');

  function setTheme(nextTheme: ThemeMode) {
    applyTheme(nextTheme);
  }

  function toggleTheme() {
    applyTheme(isDark.value ? 'light' : 'dark');
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  };
}
