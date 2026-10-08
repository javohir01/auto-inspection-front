import { createApp, defineAsyncComponent } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import Column from 'primevue/column';
import { initTheme } from './composables/useTheme';
import { i18n } from './i18n';

import './style.css';
import 'primeicons/primeicons.css';

initTheme();

const app = createApp(App);

app.use(createPinia());
app.use(i18n);
app.use(router);
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.dark',
            cssLayer: false,
        },
    },
});
app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);

const asyncPrime = (loader: () => Promise<{ default: object }>) => defineAsyncComponent(async () => (await loader()).default);
const primeComponents: Record<string, () => Promise<{ default: object }>> = {
    Button: () => import('primevue/button'),
    InputText: () => import('primevue/inputtext'),
    Password: () => import('primevue/password'),
    Textarea: () => import('primevue/textarea'),
    InputNumber: () => import('primevue/inputnumber'),
    Select: () => import('primevue/select'),
    DatePicker: () => import('primevue/datepicker'),
    Checkbox: () => import('primevue/checkbox'),
    ToggleSwitch: () => import('primevue/toggleswitch'),
    DataTable: () => import('primevue/datatable'),
    Dialog: () => import('primevue/dialog'),
    ConfirmDialog: () => import('primevue/confirmdialog'),
    Toast: () => import('primevue/toast'),
    Tag: () => import('primevue/tag'),
    Card: () => import('primevue/card'),
    Toolbar: () => import('primevue/toolbar'),
    IconField: () => import('primevue/iconfield'),
    InputIcon: () => import('primevue/inputicon'),
    Avatar: () => import('primevue/avatar'),
    Menu: () => import('primevue/menu'),
    Divider: () => import('primevue/divider'),
    ProgressSpinner: () => import('primevue/progressspinner'),
    Message: () => import('primevue/message'),
    InlineError: () => import('@/components/InlineError.vue'),
    Tabs: () => import('primevue/tabs'),
    TabList: () => import('primevue/tablist'),
    Tab: () => import('primevue/tab'),
    TabPanels: () => import('primevue/tabpanels'),
    TabPanel: () => import('primevue/tabpanel'),
};

for (const [name, loader] of Object.entries(primeComponents)) {
    app.component(name, asyncPrime(loader));
}
app.component('Column', Column);

app.mount('#app');
