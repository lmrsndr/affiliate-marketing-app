<template>
  <section class="p-6 max-w-xl mx-auto">
    <h1 class="text-2xl font-bold mb-2">Set up Two-Factor Authentication</h1>
    <p class="mb-4">Finish your 2FA setup to access protected areas.</p>
    <!-- Put your existing QR / OTP form here -->
    <button class="bb-btn bb-btn--primary" @click="afterVerify">I've verified (dev shortcut)</button>
  </section>
</template>

<script setup lang="ts">
import { useUserStore } from '@/store/user';
const store = useUserStore();

async function afterVerify() {
  // In real flow you POST OTP, server rotates cookies, then:
  await store.refreshAfter2FA();
  // If verified now, go to the right place
  if (store.twoFAVerified) {
    window.location.href = '/admin/dashboard';
  }
}
</script>
