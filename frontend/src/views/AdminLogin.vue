<template>
  <section class="login-shell">
    <div class="login-card">
      <p class="eyebrow">BundleBee administration</p>
      <h1>Admin sign in</h1>
      <p class="intro">Enter one of the approved administrator email addresses. Supabase will send a secure sign-in link.</p>

      <form @submit.prevent="submit">
        <label>
          <span>Email</span>
          <input v-model.trim="email" type="email" required autocomplete="email" />
        </label>

        <button class="primary" type="submit" :disabled="loading || sent">
          {{ loading ? 'Sending…' : sent ? 'Magic link sent' : 'Send magic link' }}
        </button>

        <p v-if="message" class="success" role="status">{{ message }}</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </form>

      <p class="note">Only the two pre-approved administrator accounts can access the admin area.</p>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { sendMagicLink } from '@/supabaseAuth';

const email = ref('');
const loading = ref(false);
const sent = ref(false);
const error = ref('');
const message = ref('');

async function submit() {
  loading.value = true;
  error.value = '';
  message.value = '';
  try {
    await sendMagicLink(email.value);
    sent.value = true;
    message.value = 'Check your email and open the BundleBee sign-in link. You can close this page afterwards.';
  } catch (err) {
    error.value = err?.message || 'The sign-in link could not be sent.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-shell{display:grid;place-items:center;min-height:62vh;padding:2rem 1rem}.login-card{width:min(440px,100%);box-sizing:border-box;padding:1.5rem;border:1px solid var(--bb-border);border-radius:18px;background:var(--bb-surface);box-shadow:var(--bb-shadow-md);text-align:left}.eyebrow{margin:0 0 .45rem;color:var(--bb-primary-light);font-size:.78rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.intro,.note{color:var(--bb-muted);line-height:1.5}.note{margin:1rem 0 0;font-size:.9rem}.login-card form{display:grid;gap:1rem;margin-top:1.25rem}.login-card label{display:grid;gap:.4rem;font-weight:700}.login-card input{width:100%;box-sizing:border-box;padding:.75rem;border:1px solid var(--bb-border);border-radius:10px;background:var(--bb-bg);color:var(--bb-text);font:inherit}.primary{min-height:46px;border:0;border-radius:10px;background:var(--bb-primary-dark);color:white;font:inherit;font-weight:800;cursor:pointer}.primary:disabled{opacity:.65;cursor:wait}.error{margin:0;color:#ff7070;font-weight:700}.success{margin:0;color:var(--bb-primary-light);font-weight:700}
</style>
