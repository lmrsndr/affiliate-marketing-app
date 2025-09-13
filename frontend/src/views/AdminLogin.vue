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
        <span v-if="loading">Logging in…</span>
        <span v-else>Login</span>
      </button>

      <p v-if="error" class="error">{{ error }}</p>
    </form>

    <div class="or">or</div>

    <!-- FULL-PAGE NAV to backend OAuth start -->
    <button class="google" @click="loginWithGoogle" :disabled="loading">
      Login with Google
    </button>

    <details class="debug">
      <summary>Debug</summary>
      <div>
        <div><b>API_BASE:</b> {{ API_BASE }}</div>
        <div><b>OAUTH_BASE:</b> {{ OAUTH_BASE }}</div>
        <pre>{{ lastResponse }}</pre>
      </div>
    </details>
  </div>
</template>

<script setup>
import { ref } from "vue";
import API from "@/api"; // your axios instance with baseURL ending in /api and withCredentials: true

const API_BASE = (import.meta.env.VITE_API_URL || "https://api.bundlebee.co.uk/api").replace(/\/+$/, "");
const OAUTH_BASE = API_BASE.replace(/\/api$/, "");

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");
const lastResponse = ref("");

async function submit() {
  error.value = "";
  lastResponse.value = "";
  loading.value = true;

  try {
    // NOTE: baseURL already ends with /api → path MUST NOT start with /api
    const { data } = await API.post("/auth/local/login", {
      email: email.value,
      password: password.value,
    });

    lastResponse.value = JSON.stringify(data, null, 2);

    // Pre-2FA flow
    if (data?.need2fa) {
      window.location.assign("/verify-2fa");
      return;
    }

    // Logged in (cookies set) → pick a sensible landing page
    // If you have /auth/next available, you can use it here instead.
    window.location.assign("/admin-dashboard");
  } catch (e) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Login failed";
    error.value = msg === "Invalid credentials" ? "Invalid credentials" : msg;
  } finally {
    loading.value = false;
  }
}

function loginWithGoogle() {
  // IMPORTANT: must be a full page navigation to the API domain
  window.location.assign(`${OAUTH_BASE}/auth/google`);
}
</script>

<style scoped>
.login {
  max-width: 420px;
  margin: 2rem auto;
  padding: 1.25rem 1.5rem;
  border-radius: 14px;
  background: #0d0f10;
  color: #e8ecef;
  box-shadow: 0 8px 28px rgba(0,0,0,.25);
}
h1 {
  margin: 0 0 1rem;
  font-size: 1.6rem;
  font-weight: 700;
}
.field { margin-bottom: .9rem; }
label { display: block; font-size: .9rem; margin-bottom: .35rem; opacity: .9; }
input {
  width: 100%;
  padding: .6rem .7rem;
  border-radius: 8px;
  border: 1px solid #2a2f33;
  background: #101316;
  color: #e8ecef;
  outline: none;
}
input:focus { border-color: #3aa265; }
button {
  width: 100%;
  padding: .7rem .9rem;
  border-radius: 8px;
  border: 1px solid #2a2f33;
  background: #1a2125;
  color: #e8ecef;
  cursor: pointer;
}
button[disabled] { opacity: .6; cursor: not-allowed; }
.error { color: #ff6b6b; margin-top: .6rem; }

.or {
  text-align: center;
  opacity: .7;
  margin: 1rem 0 .7rem;
}

button.google {
  background: #ffffff;
  color: #111;
  border: 1px solid #d0d5d9;
}

details.debug {
  margin-top: 1rem;
  border: 1px dashed #3a3f44;
  padding: .6rem .7rem;
  border-radius: 8px;
}
details.debug pre {
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: .85rem;
  margin-top: .4rem;
}
</style>
