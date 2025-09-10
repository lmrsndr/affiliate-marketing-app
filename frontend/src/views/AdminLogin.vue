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

    <div class="aux">
      <RouterLink to="/register">Create New Account</RouterLink>
      <span> · </span>
      <RouterLink to="/forgot-password">Forgot Password?</RouterLink>
    </div>

    <div class="or">or</div>

    <button class="google" @click="googleSignIn" :disabled="loading">
      Login with Google
    </button>

    <details style="margin-top:1rem">
      <summary>Debug</summary>
      <pre class="debug">
email: {{ email }}
loading: {{ loading }}
error: {{ error }}
API_ORIGIN: {{ API_ORIGIN }}
      </pre>
    </details>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter, RouterLink } from "vue-router";

// Prefer window.__BB_API_ORIGIN (your app already logs the backend URL)
// then Vite env, finally a safe default to your production API origin.
const API_ORIGIN =
  (window.__BB_API_ORIGIN || import.meta.env.VITE_API_ORIGIN || "https://api.bundlebee.co.uk").replace(/\/+$/,"");

const router = useRouter();
const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const res = await fetch(`${API_ORIGIN}/api/auth/local/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: email.value, password: password.value }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      error.value = data?.message || "Invalid credentials";
      return;
    }

    // server decides next: login -> verify-2fa -> dashboard
    if (data.next === "verify-2fa") {
      router.push({ path: "/setup-2fa", query: { oauth: "0" } });
    } else {
      router.push("/dashboard");
    }
  } catch {
    error.value = "Network or server error";
  } finally {
    loading.value = false;
  }
}

function googleSignIn() {
  // Kick off OAuth on the API origin
  window.location.href = `${API_ORIGIN}/auth/google`;
}
</script>

<style scoped>
.login {
  max-width: 480px;
  margin: 2rem auto;
  padding: 1.5rem;
  border: 1px solid #333;
  border-radius: 12px;
  background: #0b0b0b;
}
h1 { text-align: center; margin-bottom: 1rem; }
.field { margin-bottom: .75rem; display: grid; gap: .25rem; }
.field input { width: 100%; padding: .5rem; }
button { padding: .6rem .9rem; border-radius: 8px; }
.err { color: #ff6b6b; margin-top: .75rem; }
.aux { margin-top: .75rem; text-align: center; }
.or { text-align: center; opacity: .7; margin: .75rem 0; }
.google { width: 100%; }
.debug {
  white-space: pre-wrap;
  background: #111; color: #ddd;
  border: 1px dashed #444; padding: .5rem; border-radius: 8px;
}
</style>
