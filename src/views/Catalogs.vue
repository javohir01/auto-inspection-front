<script setup lang="ts">
import SimpleCatalog from '@/components/SimpleCatalog.vue';
import DocumentTypesCatalog from '@/components/DocumentTypesCatalog.vue';
import RegionsCatalog from '@/components/RegionsCatalog.vue';
import DistrictsCatalog from '@/components/DistrictsCatalog.vue';
import { fuelTypesApi, vehicleModelsApi } from '@/api/services';
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">{{ $t('catalogs.title') }}</h1>
      <p class="text-sm text-slate-400">{{ $t('catalogs.subtitle') }}</p>
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
      <Tabs value="regions">
        <TabList>
          <Tab value="regions">{{ $t('catalogs.regions') }}</Tab>
          <Tab value="districts">{{ $t('catalogs.districts') }}</Tab>
          <Tab value="fuel">{{ $t('catalogs.fuel') }}</Tab>
          <Tab value="doctypes">{{ $t('catalogs.docTypes') }}</Tab>
          <Tab value="models">{{ $t('catalogs.models') }}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="regions"><RegionsCatalog /></TabPanel>
          <TabPanel value="districts"><DistrictsCatalog /></TabPanel>
          <TabPanel value="fuel"><SimpleCatalog :api="fuelTypesApi" :label="$t('catalogs.fuelType')" /></TabPanel>
          <TabPanel value="doctypes"><DocumentTypesCatalog /></TabPanel>
          <TabPanel value="models"><SimpleCatalog :api="vehicleModelsApi" :label="$t('catalogs.model')" /></TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>
</template>
