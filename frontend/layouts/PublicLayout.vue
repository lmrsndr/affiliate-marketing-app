<template>
  <div class="min-h-screen grid grid-rows-[auto_1fr_auto]">
    <AppHeader />
    <main class="p-4">
      <router-view />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue';
import AppFooter from '@/components/common/AppFooter.vue';
</script>
