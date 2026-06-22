<script setup lang="ts">
import { onMounted, reactive, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import {
  counterpartiesApi, vehiclesApi, inspectionDocumentsApi, paymentsApi,
  regionsApi, districtsApi, vehicleModelsApi, fuelTypesApi, documentTypesApi, branchesApi, paymentMethodsApi,
} from '@/api/services';
import { buildPaymentPayload } from '@/composables/paymentCompat';
import { useAuthStore } from '@/stores/auth';
import { extractError } from '@/composables/useCrud';
import type { Region, District, VehicleModel, FuelType, DocumentType, Branch, Counterparty, Vehicle, PaymentMethod } from '@/types';

const router = useRouter();
const toast = useToast();
const auth = useAuthStore();

const step = ref(1);
const steps = ['Mijoz', 'Avtomobil', 'Ko‘rik hujjati', 'To‘lov'];
const submitting = ref(false);

// Reference data
const regions = ref<Region[]>([]);
const districts = ref<District[]>([]);
const models = ref<VehicleModel[]>([]);
const fuelTypes = ref<FuelType[]>([]);
const documentTypes = ref<DocumentType[]>([]);
const branches = ref<Branch[]>([]);
const paymentMethods = ref<PaymentMethod[]>([]);
const counterparties = ref<Counterparty[]>([]);
const vehicles = ref<Vehicle[]>([]);

// Step 1 — counterparty
const cpMode = ref<'existing' | 'new'>('existing');
const selectedCounterpartyId = ref<number | null>(null);
const newCp = reactive({ full_name: '', phone: '', region_id: null as number | null, district_id: null as number | null, address: '', basis_type: 'Jismoniy shaxs' });
const cpDistricts = computed(() => districts.value.filter((d) => d.region_id === newCp.region_id));

// Step 2 — vehicle
const vMode = ref<'existing' | 'new'>('new');
const selectedVehicleId = ref<number | null>(null);
const newV = reactive({
  vehicle_model_id: null as number | null,
  license_plate: '',
  manufacture_year: new Date().getFullYear(),
  body_number: '',
  chassis_number: '',
  engine_number: '',
  current_fuel_type_id: null as number | null,
});

// Step 3 — document
const doc = reactive({
  doc_number: '',
  act_number: '',
  date: new Date() as Date,
  branch_id: (auth.user?.branch_id ?? null) as number | null,
  document_type_id: null as number | null,
  fuel_type_id: null as number | null,
  status: 'completed',
});

// Step 4 — payment
const addPayment = ref(true);
const pay = reactive({ cash_amount: 0, plastic_amount: 0, receipt_type: 'FTK', z_report_id: '' });
const payTotal = computed(() => Number(pay.cash_amount || 0) + Number(pay.plastic_amount || 0));
const receiptTypes = [
  { label: 'Hisob-faktura (INV)', value: 'INV' },
  { label: 'Fiskal chek (FTK)', value: 'FTK' },
];

function money(v: number): string {
  return new Intl.NumberFormat('uz-UZ').format(v);
}

function toIso(d: Date | string): string {
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
}

onMounted(async () => {
  [regions.value, districts.value, models.value, fuelTypes.value, documentTypes.value, branches.value, counterparties.value, paymentMethods.value] =
    await Promise.all([
      regionsApi.list(), districtsApi.list(), vehicleModelsApi.list(),
      fuelTypesApi.list(), documentTypesApi.list(), branchesApi.list(), counterpartiesApi.list(), paymentMethodsApi.list().catch(() => []),
    ]);
});

// New counterparty has no existing vehicles, so force vehicle creation.
watch(cpMode, (m) => { if (m === 'new') vMode.value = 'new'; });

watch(() => newCp.region_id, () => { newCp.district_id = null; });

// Load the chosen counterparty's vehicles for the "existing" path.
watch(selectedCounterpartyId, async (id) => {
  selectedVehicleId.value = null;
  vehicles.value = id ? await vehiclesApi.list({ counterparty_id: id }) : [];
});

// Default the document's fuel type from the chosen vehicle.
watch(selectedVehicleId, (id) => {
  const v = vehicles.value.find((x) => x.id === id);
  if (v) doc.fuel_type_id = v.current_fuel_type_id;
});
watch(() => newV.current_fuel_type_id, (id) => { if (vMode.value === 'new' && id) doc.fuel_type_id = id; });

function validateStep(): string | null {
  if (step.value === 1) {
    if (cpMode.value === 'existing' && !selectedCounterpartyId.value) return 'Mijozni tanlang';
    if (cpMode.value === 'new' && (!newCp.full_name || !newCp.phone || !newCp.region_id || !newCp.district_id || !newCp.address)) return 'Mijoz ma’lumotlarini to‘ldiring';
  }
  if (step.value === 2) {
    if (vMode.value === 'existing' && !selectedVehicleId.value) return 'Avtomobilni tanlang';
    if (vMode.value === 'new' && (!newV.license_plate || !newV.vehicle_model_id || !newV.current_fuel_type_id)) return 'Avtomobil ma’lumotlarini to‘ldiring';
  }
  if (step.value === 3) {
    if (!doc.doc_number || !doc.act_number || !doc.branch_id || !doc.document_type_id || !doc.fuel_type_id) return 'Hujjat ma’lumotlarini to‘ldiring';
  }
  return null;
}

function next() {
  const err = validateStep();
  if (err) {
    toast.add({ severity: 'warn', summary: 'Diqqat', detail: err, life: 3500 });
    return;
  }
  if (step.value < 4) step.value++;
}

function back() {
  if (step.value > 1) step.value--;
}

async function submit() {
  const err = validateStep();
  if (err) {
    toast.add({ severity: 'warn', summary: 'Diqqat', detail: err, life: 3500 });
    return;
  }
  submitting.value = true;
  try {
    // 1) Counterparty
    let counterpartyId = selectedCounterpartyId.value;
    if (cpMode.value === 'new') {
      const created = await counterpartiesApi.create(newCp);
      counterpartyId = created.id;
    }

    // 2) Vehicle
    let vehicleId = selectedVehicleId.value;
    if (vMode.value === 'new') {
      const created = await vehiclesApi.create({ ...newV, counterparty_id: counterpartyId! });
      vehicleId = created.id;
    }

    // 3) Inspection document
    const document = await inspectionDocumentsApi.create({
      doc_number: doc.doc_number,
      act_number: doc.act_number,
      date: toIso(doc.date),
      branch_id: doc.branch_id!,
      vehicle_id: vehicleId!,
      counterparty_id: counterpartyId!,
      fuel_type_id: doc.fuel_type_id!,
      document_type_id: doc.document_type_id!,
      employee_id: auth.user!.id,
      status: doc.status as 'pending' | 'completed',
    });

    // 4) Optional payment
    if (addPayment.value && payTotal.value > 0) {
      await paymentsApi.create(buildPaymentPayload({
        branchId: doc.branch_id!,
        counterpartyId: counterpartyId!,
        date: toIso(doc.date),
        cashAmount: Number(pay.cash_amount || 0),
        plasticAmount: Number(pay.plastic_amount || 0),
        inspectionDocumentId: document.id,
        receiptType: pay.receipt_type as 'INV' | 'FTK',
        zReportId: pay.z_report_id || null,
        paymentMethods: paymentMethods.value,
      }));
    }

    toast.add({ severity: 'success', summary: 'Tayyor', detail: 'Ko‘rik hujjati ro‘yxatga olindi', life: 3000 });
    router.push('/documents');
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Xatolik', detail: extractError(e), life: 6000 });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Yangi ko‘rik hujjati</h1>
      <p class="text-sm text-slate-400">Bosqichma-bosqich ro‘yxatga olish</p>
    </div>

    <!-- Step indicator -->
    <div class="flex items-center">
      <template v-for="(s, i) in steps" :key="i">
        <div class="flex flex-col items-center">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition"
            :class="step > i + 1 ? 'border-emerald-500 bg-emerald-500 text-white'
              : step === i + 1 ? 'border-emerald-500 text-emerald-400'
              : 'border-slate-700 text-slate-500'"
          >
            <i v-if="step > i + 1" class="pi pi-check" />
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="mt-1 hidden text-xs sm:block" :class="step === i + 1 ? 'text-emerald-400' : 'text-slate-500'">{{ s }}</span>
        </div>
        <div v-if="i < steps.length - 1" class="mx-2 h-0.5 flex-1" :class="step > i + 1 ? 'bg-emerald-500' : 'bg-slate-700'" />
      </template>
    </div>
    <!-- Current step name (mobile, where per-step labels are hidden) -->
    <p class="-mt-2 text-center text-sm font-medium text-emerald-400 sm:hidden">{{ step }}/{{ steps.length }} · {{ steps[step - 1] }}</p>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-6">
      <!-- Step 1: Counterparty -->
      <div v-if="step === 1" class="space-y-4">
        <div class="flex gap-2">
          <Button :label="'Mavjud mijoz'" :outlined="cpMode !== 'existing'" size="small" @click="cpMode = 'existing'" />
          <Button :label="'Yangi mijoz'" :outlined="cpMode !== 'new'" size="small" @click="cpMode = 'new'" />
        </div>

        <div v-if="cpMode === 'existing'">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Mijozni tanlang</label>
          <Select v-model="selectedCounterpartyId" :options="counterparties" option-label="full_name" option-value="id" class="w-full" filter placeholder="Qidirish..." />
        </div>

        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-slate-300">F.I.O</label>
            <InputText v-model="newCp.full_name" class="w-full" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Telefon</label>
            <InputText v-model="newCp.phone" class="w-full" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Turi</label>
            <InputText v-model="newCp.basis_type" class="w-full" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Viloyat</label>
            <Select v-model="newCp.region_id" :options="regions" option-label="name_uz" option-value="id" class="w-full" placeholder="Tanlang" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Tuman</label>
            <Select v-model="newCp.district_id" :options="cpDistricts" option-label="name_uz" option-value="id" class="w-full" placeholder="Tanlang" :disabled="!newCp.region_id" />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Manzil</label>
            <Textarea v-model="newCp.address" class="w-full" rows="2" />
          </div>
        </div>
      </div>

      <!-- Step 2: Vehicle -->
      <div v-else-if="step === 2" class="space-y-4">
        <div class="flex gap-2">
          <Button label="Mavjud avtomobil" :outlined="vMode !== 'existing'" size="small" :disabled="cpMode === 'new'" @click="vMode = 'existing'" />
          <Button label="Yangi avtomobil" :outlined="vMode !== 'new'" size="small" @click="vMode = 'new'" />
        </div>

        <div v-if="vMode === 'existing'">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Avtomobilni tanlang</label>
          <Select v-model="selectedVehicleId" :options="vehicles" option-value="id" class="w-full" placeholder="Mijoz avtomobillari">
            <template #option="{ option }">{{ option.license_plate }} — {{ option.vehicle_model?.name }}</template>
            <template #value="{ value }">
              <span v-if="value">{{ vehicles.find((v) => v.id === value)?.license_plate }}</span>
              <span v-else class="text-slate-500">Tanlang</span>
            </template>
          </Select>
          <p v-if="!vehicles.length" class="mt-2 text-sm text-slate-500">Bu mijozda avtomobil yo‘q. "Yangi avtomobil"ni tanlang.</p>
        </div>

        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Davlat raqami</label>
            <InputText v-model="newV.license_plate" class="w-full" placeholder="01A123BC" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Rusumi</label>
            <Select v-model="newV.vehicle_model_id" :options="models" option-label="name" option-value="id" class="w-full" placeholder="Tanlang" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Ishlab chiqarilgan yili</label>
            <InputNumber v-model="newV.manufacture_year" class="w-full" :use-grouping="false" :min="1900" :max="2100" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Yoqilg‘i turi</label>
            <Select v-model="newV.current_fuel_type_id" :options="fuelTypes" option-label="name" option-value="id" class="w-full" placeholder="Tanlang" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Kuzov raqami</label>
            <InputText v-model="newV.body_number" class="w-full" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Dvigatel raqami</label>
            <InputText v-model="newV.engine_number" class="w-full" />
          </div>
        </div>
      </div>

      <!-- Step 3: Document -->
      <div v-else-if="step === 3" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Hujjat №</label>
          <InputText v-model="doc.doc_number" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Akt №</label>
          <InputText v-model="doc.act_number" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Sana</label>
          <DatePicker v-model="doc.date" class="w-full" date-format="yy-mm-dd" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Filial</label>
          <Select v-model="doc.branch_id" :options="branches" option-label="name" option-value="id" class="w-full" placeholder="Tanlang" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Hujjat turi</label>
          <Select v-model="doc.document_type_id" :options="documentTypes" option-label="name" option-value="id" class="w-full" placeholder="Tanlang" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Yoqilg‘i turi</label>
          <Select v-model="doc.fuel_type_id" :options="fuelTypes" option-label="name" option-value="id" class="w-full" placeholder="Tanlang" />
        </div>
      </div>

      <!-- Step 4: Payment -->
      <div v-else class="space-y-4">
        <div class="flex items-center gap-2">
          <Checkbox v-model="addPayment" input-id="addpay" :binary="true" />
          <label for="addpay" class="text-sm text-slate-300">To‘lov qo‘shish</label>
        </div>

        <div v-if="addPayment" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Naqd</label>
            <InputNumber v-model="pay.cash_amount" class="w-full" :min="0" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Plastik</label>
            <InputNumber v-model="pay.plastic_amount" class="w-full" :min="0" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Chek turi</label>
            <Select v-model="pay.receipt_type" :options="receiptTypes" option-label="label" option-value="value" class="w-full" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Z-hisobot ID</label>
            <InputText v-model="pay.z_report_id" class="w-full" />
          </div>
          <div class="rounded-xl bg-slate-800/50 p-3 text-center sm:col-span-2">
            <span class="text-sm text-slate-400">Jami: </span>
            <span class="text-lg font-semibold text-emerald-400">{{ money(payTotal) }} so‘m</span>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="mt-6 flex justify-between border-t border-slate-800 pt-4">
        <Button label="Orqaga" icon="pi pi-arrow-left" text :disabled="step === 1" @click="back" />
        <Button v-if="step < 4" label="Keyingi" icon="pi pi-arrow-right" icon-pos="right" @click="next" />
        <Button v-else label="Yakunlash" icon="pi pi-check" :loading="submitting" @click="submit" />
      </div>
    </div>
  </div>
</template>
