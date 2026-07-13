<template>
  <section class="callback-shell">
    <div class="callback-card">
      <div v-if="!error" class="spinner" aria-hidden="true"></div>
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
.callback-shell{display:grid;place-items:center;min-height:60vh;padding:2rem 1rem}.callback-card{width:min(500px,100%);padding:1.5rem;border:1px solid var(--bb-border);border-radius:18px;background:var(--bb-surface);box-shadow:var(--bb-shadow-sm);text-align:center}.callback-card h1{margin:.75rem 0;font-size:clamp(2rem,8vw,2.5rem);line-height:1.05}.callback-card p{color:var(--bb-muted);line-height:1.55}.error{padding:.8rem;border-radius:10px;background:color-mix(in srgb,#b33 8%,transparent);color:#b33!important;overflow-wrap:anywhere}.button{display:inline-flex;align-items:center;justify-content:center;min-height:46px;margin-top:1rem;padding:.7rem 1rem;border-radius:10px;background:var(--bb-primary-dark);color:white;text-decoration:none;font-weight:800}.spinner{width:38px;height:38px;margin:0 auto;border:4px solid var(--bb-border);border-top-color:var(--bb-primary-dark);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:680px){.callback-shell{min-height:auto;padding:1.25rem 0}.callback-card{padding:1.15rem;border-radius:16px}.callback-card h1{font-size:2rem}.button{width:100%}}
@media(prefers-reduced-motion:reduce){.spinner{animation-duration:1.8s}}
</style>
