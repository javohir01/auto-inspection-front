<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

// Restore the user profile on a hard refresh if a token is present.
onMounted(() => {
  if (auth.isAuthenticated && !auth.user) {
    auth.fetchMe().catch(() => {});
  }
});
</script>

<template>
  <router-view />
  <Toast position="top-right" />
  <ConfirmDialog />
</template>
