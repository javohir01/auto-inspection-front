<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { vehiclesApi, counterpartiesApi, vehicleModelsApi, fuelTypesApi } from '@/api/services';
import { useCrud } from '@/composables/useCrud';
import type { Vehicle, Counterparty, VehicleModel, FuelType } from '@/types';

const crud = useCrud<Vehicle>(vehiclesApi, { label: 'Avtomobil' });
const { items, loading, saving, dialogVisible, isEdit, form } = crud;

const counterparties = ref<Counterparty[]>([]);
const models = ref<VehicleModel[]>([]);
const fuelTypes = ref<FuelType[]>([]);

onMounted(async () => {
  [counterparties.value, models.value, fuelTypes.value] = await Promise.all([
    counterpartiesApi.list(),
    vehicleModelsApi.list(),
    fuelTypesApi.list(),
  ]);
  await crud.load();
});

function openCreate() {
  crud.openCreate({
    counterparty_id: null,
    vehicle_model_id: null,
    current_fuel_type_id: null,
    license_plate: '',
    manufacture_year: new Date().getFullYear(),
    body_number: '',
    chassis_number: '',
    engine_number: '',
  });
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Avtomobillar</h1>
        <p class="text-sm text-slate-400">Ro‘yxatdan o‘tgan transport vositalari</p>
      </div>
      <Button label="Yangi avtomobil" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
        <template #empty><div class="p-6 text-center text-slate-500">Avtomobillar topilmadi</div></template>
        <Column field="license_plate" header="Davlat raqami" />
        <Column header="Rusumi">
          <template #body="{ data }">{{ data.vehicle_model?.name ?? '—' }}</template>
        </Column>
        <Column field="manufacture_year" header="Yili" />
        <Column header="Egasi">
          <template #body="{ data }">{{ data.counterparty?.full_name ?? '—' }}</template>
        </Column>
        <Column header="Yoqilg‘i">
          <template #body="{ data }">{{ data.current_fuel_type?.name ?? '—' }}</template>
        </Column>
        <Column header="Amallar" style="width: 8rem">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button icon="pi pi-pencil" text rounded size="small" @click="crud.openEdit(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="crud.remove(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? 'Avtomobilni tahrirlash' : 'Yangi avtomobil'" class="w-full max-w-lg">
      <div class="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Egasi (mijoz)</label>
          <Select v-model="form.counterparty_id" :options="counterparties" option-label="full_name" option-value="id" class="w-full" filter placeholder="Tanlang" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Davlat raqami</label>
          <InputText v-model="form.license_plate" class="w-full" placeholder="01A123BC" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Rusumi</label>
          <Select v-model="form.vehicle_model_id" :options="models" option-label="name" option-value="id" class="w-full" placeholder="Tanlang" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Ishlab chiqarilgan yili</label>
          <InputNumber v-model="form.manufacture_year" class="w-full" :use-grouping="false" :min="1900" :max="2100" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Yoqilg‘i turi</label>
          <Select v-model="form.current_fuel_type_id" :options="fuelTypes" option-label="name" option-value="id" class="w-full" placeholder="Tanlang" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Kuzov raqami</label>
          <InputText v-model="form.body_number" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Shassi raqami</label>
          <InputText v-model="form.chassis_number" class="w-full" />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Dvigatel raqami</label>
          <InputText v-model="form.engine_number" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Bekor qilish" text @click="dialogVisible = false" />
        <Button label="Saqlash" icon="pi pi-check" :loading="saving" @click="crud.save()" />
      </template>
    </Dialog>
  </div>
</template>
