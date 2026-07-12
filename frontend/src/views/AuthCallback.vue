<template>
  <section class="callback-shell">
    <div class="callback-card">
      <h1>{{ error ? 'Sign-in failed' : 'Signing you in…' }}</h1>
      <p v-if="!error">Please wait while BundleBee checks your administrator access.</p>
      <p v-else class="error">{{ error }}</p>
      <router-link v-if="error" to="/login" class="button">Back to login</router-link>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { consumeMagicLinkFromUrl, signOutSupabase } from '@/supabaseAuth';
import { getBackendSupabaseSession } from '@/api';

const error = ref('');

onMounted(async () => {
  try {
    const localSession = consumeMagicLinkFromUrl();
    if (!localSession) throw new Error('The sign-in link is missing or has expired.');

    const session = await getBackendSupabaseSession();
    if (!session?.isAdmin) {
      await signOutSupabase();
      throw new Error('This email is not approved for BundleBee administration.');
    }

    window.location.replace('/admin');
  } catch (err) {
    error.value = err?.response?.data?.message || err?.message || 'Unable to complete sign-in.';
  }
});
</script>

<style scoped>
.callback-shell{display:grid;place-items:center;min-height:60vh;padding:2rem}.callback-card{width:min(500px,100%);padding:1.5rem;border:1px solid var(--bb-border);border-radius:18px;background:var(--bb-surface);text-align:center}.error{color:#ff7070}.button{display:inline-block;margin-top:1rem;padding:.7rem 1rem;border-radius:10px;background:var(--bb-primary-dark);color:white;text-decoration:none;font-weight:800}
</style>
