<script setup lang="ts">
defineProps<{ message?: string }>();
</script>

<template>
  <small v-if="message" class="mt-1 block text-rose-400" role="alert">{{ message }}</small>
</template>
