<template>
  <div class="min-h-screen grid grid-cols-[240px_1fr]">
    <aside class="border-r p-3 space-y-2">
      <slot name="sidebar">
        <!-- default user nav -->
        <router-link to="/app/dashboard">Overview</router-link>
      </slot>
    </aside>
    <section class="p-4">
      <router-view />
    </section>
  </div>
</template>

<script setup lang="ts">
</script>
