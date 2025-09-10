<template>
  <div class="login">
    <h1>Admin Login</h1>

    <form @submit.prevent="submit">
      <div class="field">
        <label>Email</label>
        <input v-model.trim="email" type="email" required autocomplete="username" />
      </div>

      <div class="field">
        <label>Password</label>
        <input v-model="password" type="password" required autocomplete="current-password" />
      </div>

      <button type="submit" :disabled="loading">
        {{ loading ? "Logging in..." : "Login" }}
      </button>
    </form>

    <p v-if="error" class="err">{{ error }}</p>

    <p style="margin-top: .75rem">
      <router-link to="/register">Create New Account</router-link>
      ·
      <router-link to="/forgot-password">Forgot Password?</router-link>
    </p>

    <div style="margin: 1rem 0; text-align:center">or</div>

    <a class="google-btn" href="/auth/google">Login with Google</a>

    <details style="margin-top:1rem">
      <summary>Debug</summary>
      <pre class="debug">
email: {{ email }}
loading: {{ loading }}
error: {{ error }}
      </pre>
    </details>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch } from '@/lib/api';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const res = await apiFetch('/auth/local/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      error.value = data?.message || data?.error || 'Invalid credentials';
      return;
    }

    // On success, the server set cookies (SameSite=None; Secure; Domain=.bundlebee.co.uk)
    // Decide where to go next (2FA or dashboard).
    if (data?.next === 'verify-2fa') {
      router.push({ path: '/verify-2fa' });
    } else {
      router.push({ path: '/dashboard' });
    }
  } catch (e) {
    error.value = 'Network or server error';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login {
  max-width: 520px;
  margin: 2rem auto;
  padding: 1.5rem;
  border: 1px solid #333;
  border-radius: 12px;
  background: #0b0b0b;
}
.field { margin-bottom: 0.75rem; display: grid; gap: .25rem; }
.field input { width: 100%; padding: .5rem; }
button { padding: .5rem .75rem; }
.err { color: #f66; margin-top: .75rem; }
.google-btn {
  display: inline-block;
  width: 100%;
  text-align: center;
  padding: .6rem .9rem;
  border-radius: 8px;
  border: 1px solid #333;
  background: #eee;
  color: #111;
  text-decoration: none;
}
.debug {
  white-space: pre-wrap;
  background: #111; color: #ddd;
  border: 1px dashed #444; padding: .5rem; border-radius: 8px;
}
</style>
