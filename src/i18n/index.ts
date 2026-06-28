import { ref } from 'vue';
import type { App } from 'vue';
import cyrl from './locales/cyrl';
import en from './locales/en';
import ru from './locales/ru';
import uz from './locales/uz';

export type LocaleCode = 'uz' | 'cyrl' | 'ru' | 'en';

export type Messages = Record<string, string>;

const messages: Record<LocaleCode, Messages> = { uz, cyrl, ru, en };

const STORAGE_KEY = 'app_locale';

export const availableLocales: Array<{ code: LocaleCode; label: string; short: string }> = [
  { code: 'uz', label: "O‘zbekcha", short: 'UZ' },
  { code: 'cyrl', label: 'Ўзбекча', short: 'ЎЗ' },
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'en', label: 'English', short: 'EN' },
];

function detectLocale(): LocaleCode {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved in messages) {
    return saved as LocaleCode;
  }
  return 'uz';
}

/** The active locale. Reading `.value` inside render/computed makes them reactive. */
export const locale = ref<LocaleCode>(detectLocale());

/** Listeners notified whenever the locale changes (e.g. to update axios headers). */
const localeListeners = new Set<(code: LocaleCode) => void>();

export function onLocaleChange(listener: (code: LocaleCode) => void): void {
  localeListeners.add(listener);
}

export function setLocale(code: LocaleCode): void {
  if (!(code in messages) || code === locale.value) {
    if (code in messages) localeListeners.forEach((l) => l(code));
    return;
  }
  locale.value = code;
  localStorage.setItem(STORAGE_KEY, code);
  document.documentElement.setAttribute('lang', code);
  localeListeners.forEach((listener) => listener(code));
}

/** Translate a key, with `{param}` interpolation. Falls back to uz, then the key. */
export function translate(key: string, params?: Record<string, string | number>): string {
  const dict = messages[locale.value] ?? messages.uz;
  let value = dict[key] ?? messages.uz[key] ?? key;
  if (params) {
    for (const [name, replacement] of Object.entries(params)) {
      value = value.split(`{${name}}`).join(String(replacement));
    }
  }
  return value;
}

/**
 * Resolve a catalog item's name in the active locale, with a fallback chain
 * down to the canonical `name`. Mirrors the backend HasLocalizedName trait.
 */
export function localizedName(item: Record<string, unknown> | null | undefined): string {
  if (!item) return '';
  const order: LocaleCode[] = [locale.value, 'uz', 'ru', 'en', 'cyrl'];
  for (const code of order) {
    const value = item[`name_${code}`];
    if (typeof value === 'string' && value !== '') return value;
  }
  const plain = item.name;
  return typeof plain === 'string' ? plain : '';
}

export function useI18n() {
  return { t: translate, locale, setLocale, availableLocales, localizedName };
}

export const i18n = {
  install(app: App): void {
    document.documentElement.setAttribute('lang', locale.value);
    app.config.globalProperties.$t = translate;
    app.config.globalProperties.$tn = localizedName;
  },
};

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $t: typeof translate;
    $tn: typeof localizedName;
  }
}
