<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { vehiclesApi, counterpartiesApi, vehicleModelsApi, fuelTypesApi } from '@/api/services';
import { useCrud } from '@/composables/useCrud';
import { localizedName, translate as t } from '@/i18n';
import type { Vehicle, Counterparty, VehicleModel, FuelType, VehicleType } from '@/types';

const crud = useCrud<Vehicle>(vehiclesApi, { label: 'Avtomobil' });
const { items, loading, saving, dialogVisible, isEdit, form } = crud;

const counterparties = ref<Counterparty[]>([]);
const models = ref<VehicleModel[]>([]);
const fuelTypes = ref<FuelType[]>([]);
const filters = ref({ license_plate: '' });
const VEHICLE_TYPE_VALUES: VehicleType[] = ['Yengil', 'Yuk', 'Tirkama', 'Mototsikl', 'Avtobus', 'Mikroavtobus'];
const vehicleTypes = computed(() => VEHICLE_TYPE_VALUES.map((value) => ({ label: t('vehicleType.' + value), value })));

function vehicleTypeLabel(value?: string): string {
  return value ? t('vehicleType.' + value) : '—';
}

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
    vehicle_type: 'Yengil',
    manufacture_year: new Date().getFullYear(),
    body_number: '',
    chassis_number: '',
    engine_number: '',
  });
}

function applyFilters() {
  crud.load({ license_plate: filters.value.license_plate || undefined });
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ $t('vehicles.title') }}</h1>
        <p class="text-sm text-slate-400">{{ $t('vehicles.subtitle') }}</p>
      </div>
      <Button :label="$t('vehicles.newVehicle')" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div class="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="filters.license_plate" class="w-full" :placeholder="$t('vehicles.plate')" @keyup.enter="applyFilters" />
      </IconField>
      <Button :label="$t('common.search')" outlined @click="applyFilters" />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-2">
      <DataTable :value="items" :loading="loading" paginator :rows="10" data-key="id">
        <template #empty><div class="p-6 text-center text-slate-500">{{ $t('vehicles.notFound') }}</div></template>
        <Column field="license_plate" :header="$t('vehicles.plate')" />
        <Column :header="$t('vehicles.type')">
          <template #body="{ data }">{{ vehicleTypeLabel(data.vehicle_type) }}</template>
        </Column>
        <Column :header="$t('vehicles.model')">
          <template #body="{ data }">{{ data.vehicle_model ? localizedName(data.vehicle_model) : '—' }}</template>
        </Column>
        <Column field="manufacture_year" :header="$t('vehicles.year')" />
        <Column :header="$t('vehicles.owner')">
          <template #body="{ data }">{{ data.counterparty?.full_name ?? '—' }}</template>
        </Column>
        <Column :header="$t('vehicles.fuel')">
          <template #body="{ data }">{{ data.current_fuel_type ? localizedName(data.current_fuel_type) : '—' }}</template>
        </Column>
        <Column :header="$t('common.actions')" style="width: 8rem">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button icon="pi pi-pencil" text rounded size="small" @click="crud.openEdit(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="crud.remove(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" modal :header="isEdit ? $t('vehicles.editTitle') : $t('vehicles.newVehicle')" class="w-full max-w-lg">
      <div class="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('vehicles.ownerClient') }}</label>
          <Select v-model="form.counterparty_id" :options="counterparties" option-label="full_name" option-value="id" class="w-full" filter :placeholder="$t('common.select')" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('vehicles.plate') }}</label>
          <InputText v-model="form.license_plate" class="w-full" placeholder="01A123BC" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('vehicles.model') }}</label>
          <Select v-model="form.vehicle_model_id" :options="models" :option-label="localizedName" option-value="id" class="w-full" :placeholder="$t('common.select')" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('vehicles.vehicleType') }}</label>
          <Select v-model="form.vehicle_type" :options="vehicleTypes" option-label="label" option-value="value" class="w-full" :placeholder="$t('common.select')" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('vehicles.manufactureYear') }}</label>
          <InputNumber v-model="form.manufacture_year" class="w-full" :use-grouping="false" :min="1900" :max="2100" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('vehicles.fuel') }}</label>
          <Select v-model="form.current_fuel_type_id" :options="fuelTypes" :option-label="localizedName" option-value="id" class="w-full" :placeholder="$t('common.select')" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('vehicles.bodyNumber') }}</label>
          <InputText v-model="form.body_number" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('vehicles.chassisNumber') }}</label>
          <InputText v-model="form.chassis_number" class="w-full" />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ $t('vehicles.engineNumber') }}</label>
          <InputText v-model="form.engine_number" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="dialogVisible = false" />
        <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="crud.save()" />
      </template>
    </Dialog>
  </div>
</template>
