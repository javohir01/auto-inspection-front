<script setup lang="ts">
import SimpleCatalog from '@/components/SimpleCatalog.vue';
import RegionsCatalog from '@/components/RegionsCatalog.vue';
import DistrictsCatalog from '@/components/DistrictsCatalog.vue';
import { fuelTypesApi, documentTypesApi, vehicleModelsApi } from '@/api/services';
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Ma’lumotnomalar</h1>
      <p class="text-sm text-slate-400">Tizim uchun yordamchi ma’lumotlar</p>
    </div>

    <div class="rounded-2xl border border-slate-800 bg-[#0e1320] p-5">
      <Tabs value="regions">
        <TabList>
          <Tab value="regions">Viloyatlar</Tab>
          <Tab value="districts">Tumanlar</Tab>
          <Tab value="fuel">Yoqilg‘i turlari</Tab>
          <Tab value="doctypes">Hujjat turlari</Tab>
          <Tab value="models">Avto rusumlari</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="regions"><RegionsCatalog /></TabPanel>
          <TabPanel value="districts"><DistrictsCatalog /></TabPanel>
          <TabPanel value="fuel"><SimpleCatalog :api="fuelTypesApi" label="Yoqilg‘i turi" /></TabPanel>
          <TabPanel value="doctypes"><SimpleCatalog :api="documentTypesApi" label="Hujjat turi" /></TabPanel>
          <TabPanel value="models"><SimpleCatalog :api="vehicleModelsApi" label="Avto rusumi" /></TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>
</template>
