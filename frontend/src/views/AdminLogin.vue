<template>
  <section class="login-shell">
    <div class="login-card">
      <p class="eyebrow">BundleBee administration</p>
      <h1>Admin sign in</h1>
      <p class="intro">Sign in with the administrator account managed through Supabase Auth.</p>

      <form @submit.prevent="submit">
        <label>
          <span>Email</span>
          <input v-model.trim="email" type="email" required autocomplete="username" />
        </label>

        <label>
          <span>Password</span>
          <input v-model="password" type="password" required autocomplete="current-password" />
        </label>

        <button class="primary" type="submit" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>

        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </form>

      <p class="note">Authenticator-app verification is required before the admin area opens.</p>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { getBackendSupabaseSession } from '@/api';
import { signInWithPassword, signOutSupabase } from '@/supabaseAuth';

const route = useRoute();
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

function safeRedirect(value) {
  const path = String(value || '');
  return path.startsWith('/') && !path.startsWith('//') ? path : '/admin';
}

async function submit() {
  loading.value = true;
  error.value = '';

  try {
    await signInWithPassword(email.value, password.value);
    const session = await getBackendSupabaseSession();

    if (!session?.isAdmin) {
      await signOutSupabase();
      throw new Error('This Supabase account is not a BundleBee administrator.');
    }

    const destination = safeRedirect(route.query.redirect);
    window.location.assign(session.aal === 'aal2' ? destination : `/mfa?redirect=${encodeURIComponent(destination)}`);
  } catch (err) {
    error.value = err?.response?.data?.message || err?.message || 'Sign in failed.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-shell{display:grid;place-items:center;min-height:62vh;padding:2rem 1rem}.login-card{width:min(440px,100%);box-sizing:border-box;padding:1.5rem;border:1px solid var(--bb-border);border-radius:18px;background:var(--bb-surface);box-shadow:var(--bb-shadow-md);text-align:left}.eyebrow{margin:0 0 .45rem;color:var(--bb-primary-light);font-size:.78rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.intro,.note{color:var(--bb-muted);line-height:1.5}.note{margin:1rem 0 0;font-size:.9rem}.login-card form{display:grid;gap:1rem;margin-top:1.25rem}.login-card label{display:grid;gap:.4rem;font-weight:700}.login-card input{width:100%;box-sizing:border-box;padding:.75rem;border:1px solid var(--bb-border);border-radius:10px;background:var(--bb-bg);color:var(--bb-text);font:inherit}.primary{min-height:46px;border:0;border-radius:10px;background:var(--bb-primary-dark);color:white;font:inherit;font-weight:800;cursor:pointer}.primary:disabled{opacity:.65;cursor:wait}.error{margin:0;color:#ff7070;font-weight:700}
</style>
