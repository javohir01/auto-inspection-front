<script setup lang="ts">
import { onMounted, reactive, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import {
  counterpartiesApi, vehiclesApi, inspectionDocumentsApi, paymentsApi,
  regionsApi, districtsApi, vehicleModelsApi, fuelTypesApi, documentTypesApi, branchesApi, paymentMethodsApi, generatedDocumentsApi,
} from '@/api/services';
import { buildPaymentPayload } from '@/composables/paymentCompat';
import { calculateInspectionPaymentAmount, hasGasInspection } from '@/composables/inspectionPricing';
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
const vehicleTypes = [
  { label: 'Yengil', value: 'Yengil' },
  { label: 'Yuk', value: 'Yuk' },
  { label: 'Tirkama', value: 'Tirkama' },
  { label: 'Mototsikl', value: 'Mototsikl' },
  { label: 'Avtobus', value: 'Avtobus' },
  { label: 'Mikroavtobus', value: 'Mikroavtobus' },
];
const documentTypeChoices = computed(() => documentTypes.value);

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
  vehicle_type: 'Yengil',
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
const selectedDocumentTypeIds = ref<number[]>([]);
const selectedDocumentTypes = computed(() => documentTypes.value.filter((type) => selectedDocumentTypeIds.value.includes(type.id)));
const selectedDocumentKinds = computed(() => selectedDocumentTypes.value.map((type) => `${type.code ?? ''} ${type.name ?? ''}`.toUpperCase()));
const hasRegularInspectionDocument = computed(() => selectedDocumentKinds.value.some((kind) => kind.includes('TEXOSMOTR') || kind.includes('GAZ')));
const isSimpleDocumentSelection = computed(() => selectedDocumentTypeIds.value.length > 0 && !hasRegularInspectionDocument.value);
const showActNumber = computed(() => !isSimpleDocumentSelection.value);
const showFuelType = computed(() => !isSimpleDocumentSelection.value);
const selectedVehicleType = computed(() => {
  if (vMode.value === 'existing') {
    return vehicles.value.find((vehicle) => vehicle.id === selectedVehicleId.value)?.vehicle_type ?? null;
  }

  return newV.vehicle_type;
});
const showGasBalloonFields = computed(() => selectedDocumentTypes.value.some(hasGasInspection));
const gasCylinderTypes = [
  { label: 'Metan', value: 'metan' },
  { label: 'Propan', value: 'propan' },
];
const gasCylinder = reactive({
  type: 'metan' as 'metan' | 'propan',
  manufacturer_country: '',
  cylinder_number: '',
  volume_liters: null as number | null,
  weight_kg: null as number | null,
  manufacture_year: new Date().getFullYear(),
  working_pressure: null as number | null,
  test_pressure: null as number | null,
});

// Step 4 — payment
const addPayment = ref(true);
const pay = reactive({ cash_amount: 0, plastic_amount: 0, receipt_type: 'FTK', z_report_id: '', description: '' });
const payTotal = computed(() => Number(pay.cash_amount || 0) + Number(pay.plastic_amount || 0));
const expectedPayment = computed(() => calculateInspectionPaymentAmount({
  documentTypes: selectedDocumentTypes.value,
  vehicleType: selectedVehicleType.value,
  gasCylinderCount: showGasBalloonFields.value ? 1 : 0,
}));
const paymentMismatch = computed(() => addPayment.value && expectedPayment.value.amount > 0 && payTotal.value !== expectedPayment.value.amount);
const gasBalloonDescription = computed(() => {
  if (!expectedPayment.value.hasGasInspection) return '';

  return [
    `Gaz ballon turi: ${gasCylinder.type}`,
    `Gaz ballon raqami: ${gasCylinder.cylinder_number}`,
    gasCylinder.manufacturer_country ? `Ishlab chiqargan davlat: ${gasCylinder.manufacturer_country}` : '',
    gasCylinder.volume_liters ? `Hajmi: ${gasCylinder.volume_liters} litr` : '',
    gasCylinder.weight_kg ? `Og‘irligi: ${gasCylinder.weight_kg} kg` : '',
    gasCylinder.manufacture_year ? `Ishlab chiqarilgan yil: ${gasCylinder.manufacture_year}` : '',
    gasCylinder.working_pressure ? `Ishchi bosimi: ${gasCylinder.working_pressure}` : '',
    gasCylinder.test_pressure ? `Sinov bosimi: ${gasCylinder.test_pressure}` : '',
  ].filter(Boolean).join('\n');
});
const paymentDescription = computed(() => {
  const parts = [
    gasBalloonDescription.value,
    paymentMismatch.value && pay.description ? `To‘lov farqi izohi: ${pay.description}` : pay.description,
  ].filter(Boolean);

  return parts.length ? parts.join('\n') : null;
});
const lastAutoPaymentAmount = ref(0);
const receiptTypes = [
  { label: 'Hisob-faktura (INV)', value: 'INV' },
  { label: 'Fiskal chek (FTK)', value: 'FTK' },
];
const modelDialogVisible = ref(false);
const newModelName = ref('');
const modelSaving = ref(false);

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
  selectDefaultDocumentType();
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
watch(() => doc.doc_number, (value) => {
  if (isSimpleDocumentSelection.value) doc.act_number = value;
});
watch(expectedPayment, (pricing) => {
  if (!addPayment.value || pricing.amount <= 0) {
    lastAutoPaymentAmount.value = pricing.amount;
    return;
  }

  if (payTotal.value === 0 || payTotal.value === lastAutoPaymentAmount.value) {
    pay.cash_amount = pricing.amount;
    pay.plastic_amount = 0;
  }

  lastAutoPaymentAmount.value = pricing.amount;
}, { immediate: true });

function validateStep(): string | null {
  if (step.value === 1) {
    if (cpMode.value === 'existing' && !selectedCounterpartyId.value) return 'Mijozni tanlang';
    if (cpMode.value === 'new' && (!newCp.full_name || !newCp.phone || !newCp.region_id || !newCp.district_id || !newCp.address)) return 'Mijoz ma’lumotlarini to‘ldiring';
  }
  if (step.value === 2) {
    if (vMode.value === 'existing' && !selectedVehicleId.value) return 'Avtomobilni tanlang';
    if (vMode.value === 'new' && (!newV.license_plate || !newV.vehicle_model_id || !newV.vehicle_type || !newV.current_fuel_type_id)) return 'Avtomobil ma’lumotlarini to‘ldiring';
  }
  if (step.value === 3) {
    if (isSimpleDocumentSelection.value) {
      doc.act_number = doc.act_number || doc.doc_number;
      doc.fuel_type_id = doc.fuel_type_id || selectedVehicleFuelTypeId.value;
    }
    if (!doc.doc_number || (showActNumber.value && !doc.act_number) || !doc.branch_id || !selectedDocumentTypeIds.value.length || !doc.fuel_type_id) return 'Hujjat ma’lumotlarini to‘ldiring';
    if (showGasBalloonFields.value && (
      !gasCylinder.type ||
      !gasCylinder.manufacturer_country ||
      !gasCylinder.cylinder_number ||
      !gasCylinder.volume_liters ||
      !gasCylinder.weight_kg ||
      !gasCylinder.manufacture_year ||
      !gasCylinder.working_pressure ||
      !gasCylinder.test_pressure
    )) return 'Gaz ballon ma’lumotlarini to‘ldiring';
  }
  if (step.value === 4 && addPayment.value && paymentMismatch.value && !pay.description.trim()) {
    return 'To‘lov summasi belgilangan narxdan farq qiladi. Izoh kiriting';
  }
  return null;
}

const selectedVehicleFuelTypeId = computed(() => {
  if (vMode.value === 'existing') {
    return vehicles.value.find((vehicle) => vehicle.id === selectedVehicleId.value)?.current_fuel_type_id ?? null;
  }

  return newV.current_fuel_type_id;
});

function selectDefaultDocumentType(): void {
  if (!documentTypeChoices.value.length) return;

  if (!selectedDocumentTypeIds.value.some((id) => documentTypeChoices.value.some((type) => type.id === id))) {
    selectedDocumentTypeIds.value = [documentTypeChoices.value[0].id];
  }

  doc.document_type_id = selectedDocumentTypeIds.value[0] ?? null;
}

function toggleDocumentType(id: number): void {
  selectedDocumentTypeIds.value = selectedDocumentTypeIds.value.includes(id)
    ? selectedDocumentTypeIds.value.filter((current) => current !== id)
    : [...selectedDocumentTypeIds.value, id];

  doc.document_type_id = selectedDocumentTypeIds.value[0] ?? null;
}

async function createVehicleModel(): Promise<void> {
  const name = newModelName.value.trim();
  if (!name) {
    toast.add({ severity: 'warn', summary: 'Diqqat', detail: 'Rusum nomini kiriting', life: 3000 });
    return;
  }

  modelSaving.value = true;
  try {
    const created = await vehicleModelsApi.create({ name, is_active: true });
    models.value = [...models.value, created];
    newV.vehicle_model_id = created.id;
    newModelName.value = '';
    modelDialogVisible.value = false;
    toast.add({ severity: 'success', summary: 'Saqlandi', detail: 'Avtomobil rusumi qo‘shildi', life: 2500 });
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Xatolik', detail: extractError(e), life: 5000 });
  } finally {
    modelSaving.value = false;
  }
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
    if (isSimpleDocumentSelection.value) {
      doc.act_number = doc.act_number || doc.doc_number;
      doc.fuel_type_id = doc.fuel_type_id || selectedVehicleFuelTypeId.value;
    }

    const document = await inspectionDocumentsApi.create({
      doc_number: doc.doc_number,
      act_number: doc.act_number || doc.doc_number,
      date: toIso(doc.date),
      branch_id: doc.branch_id!,
      vehicle_id: vehicleId!,
      counterparty_id: counterpartyId!,
      fuel_type_id: doc.fuel_type_id!,
      document_type_id: selectedDocumentTypeIds.value[0],
      primary_document_type_id: selectedDocumentTypeIds.value[0],
      employee_id: auth.user!.id,
      status: doc.status as 'pending' | 'completed',
      subtotal: expectedPayment.value.amount ? expectedPayment.value.amount.toFixed(2) : undefined,
      discount_amount: '0.00',
      total_amount: expectedPayment.value.amount ? expectedPayment.value.amount.toFixed(2) : undefined,
      notes: gasBalloonDescription.value || undefined,
      gas_cylinder: showGasBalloonFields.value ? { ...gasCylinder } : undefined,
    });

    await Promise.all(selectedDocumentTypes.value.map((type) => generatedDocumentsApi.create({
      inspection_document_id: document.id,
      document_type_id: type.id,
      document_number: `${doc.doc_number}-${type.id}`,
      status: 'draft',
      payload: {
        selected_document_type_ids: selectedDocumentTypeIds.value,
      },
      created_by: auth.user!.id,
    })));

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
        description: paymentDescription.value,
      }));
      window.dispatchEvent(new Event('cash-balance:refresh'));
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
      <h1 class="text-2xl font-semibold tracking-tight">Yangi hujjat</h1>
      <p class="text-sm text-slate-400">Texnik ko‘rik, gaz, sug‘urta va tonirovka</p>
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
          <Select v-model="selectedVehicleId" :options="vehicles" option-label="license_plate" option-value="id" class="w-full" filter filter-placeholder="Davlat raqami" placeholder="Davlat raqami bilan qidirish">
            <template #option="{ option }">{{ option.license_plate }} — {{ option.vehicle_type ?? '—' }} — {{ option.vehicle_model?.name }}</template>
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
            <div class="flex gap-2">
              <Select v-model="newV.vehicle_model_id" :options="models" option-label="name" option-value="id" class="min-w-0 flex-1" placeholder="Tanlang" filter />
              <Button icon="pi pi-plus" outlined v-tooltip.top="'Yangi rusum qo‘shish'" @click="modelDialogVisible = true" />
            </div>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Avtomobil turi</label>
            <Select v-model="newV.vehicle_type" :options="vehicleTypes" option-label="label" option-value="value" class="w-full" placeholder="Tanlang" />
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
        <div v-if="showActNumber">
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
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Hujjat turlari</label>
          <div class="grid grid-cols-1 gap-2 rounded-xl border border-slate-800 p-3">
            <label v-for="type in documentTypeChoices" :key="type.id" class="flex items-center gap-2 text-sm text-slate-300">
              <Checkbox :model-value="selectedDocumentTypeIds.includes(type.id)" :binary="true" @update:model-value="toggleDocumentType(type.id)" />
              <span>{{ type.name }}</span>
            </label>
          </div>
          <div class="mt-2 text-sm text-slate-400">Umumiy summa: <span class="font-semibold text-emerald-400">{{ money(expectedPayment.amount) }} so‘m</span></div>
        </div>
        <div v-if="showFuelType">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Yoqilg‘i turi</label>
          <Select v-model="doc.fuel_type_id" :options="fuelTypes" option-label="name" option-value="id" class="w-full" placeholder="Tanlang" />
        </div>
        <div v-if="showGasBalloonFields" class="grid grid-cols-1 gap-4 rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-4 sm:col-span-2 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Gaz ballon turi</label>
            <Select v-model="gasCylinder.type" :options="gasCylinderTypes" option-label="label" option-value="value" class="w-full" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Ishlab chiqargan davlat</label>
            <InputText v-model="gasCylinder.manufacturer_country" class="w-full" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Gaz ballon raqami</label>
            <InputText v-model="gasCylinder.cylinder_number" class="w-full" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Gaz ballon hajmi (litr)</label>
            <InputNumber v-model="gasCylinder.volume_liters" class="w-full" :min="0" :min-fraction-digits="0" :max-fraction-digits="2" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Gaz ballon og‘irligi (kg)</label>
            <InputNumber v-model="gasCylinder.weight_kg" class="w-full" :min="0" :min-fraction-digits="0" :max-fraction-digits="2" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Ishlab chiqarilgan yil</label>
            <InputNumber v-model="gasCylinder.manufacture_year" class="w-full" :use-grouping="false" :min="1900" :max="2100" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Ishchi bosimi</label>
            <InputNumber v-model="gasCylinder.working_pressure" class="w-full" :min="0" :min-fraction-digits="0" :max-fraction-digits="2" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Sinov bosimi</label>
            <InputNumber v-model="gasCylinder.test_pressure" class="w-full" :min="0" :min-fraction-digits="0" :max-fraction-digits="2" />
          </div>
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
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Terminal</label>
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
          <div v-if="paymentMismatch" class="sm:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-slate-300">Summa farqi izohi</label>
            <Textarea v-model="pay.description" class="w-full" rows="2" />
          </div>
          <div class="rounded-xl bg-slate-800/50 p-3 text-center sm:col-span-2">
            <span class="text-sm text-slate-400">Jami: </span>
            <span class="text-lg font-semibold text-emerald-400">{{ money(payTotal) }} so‘m</span>
            <div v-if="expectedPayment.amount" class="mt-1 text-sm text-slate-400">Belgilangan narx: {{ money(expectedPayment.amount) }} so‘m</div>
          </div>
        </div>
      </div>

      <Dialog v-model:visible="modelDialogVisible" modal header="Yangi avtomobil rusumi" class="w-full max-w-md">
        <div class="space-y-3 pt-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Rusum nomi</label>
          <InputText v-model="newModelName" class="w-full" placeholder="Masalan: Chevrolet Cobalt" @keyup.enter="createVehicleModel" />
        </div>
        <template #footer>
          <Button label="Bekor qilish" text @click="modelDialogVisible = false" />
          <Button label="Qo‘shish" icon="pi pi-check" :loading="modelSaving" @click="createVehicleModel" />
        </template>
      </Dialog>

      <!-- Controls -->
      <div class="mt-6 flex justify-between border-t border-slate-800 pt-4">
        <Button label="Orqaga" icon="pi pi-arrow-left" text :disabled="step === 1" @click="back" />
        <Button v-if="step < 4" label="Keyingi" icon="pi pi-arrow-right" icon-pos="right" @click="next" />
        <Button v-else label="Yakunlash" icon="pi pi-check" :loading="submitting" @click="submit" />
      </div>
    </div>
  </div>
</template>
