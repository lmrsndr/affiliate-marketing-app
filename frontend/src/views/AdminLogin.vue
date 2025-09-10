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

    <details style="margin-top:1rem">
      <summary>Debug</summary>
      <pre class="debug">
email: {{ email }}
loading: {{ loading }}
      </pre>
    </details>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

async function submit() {
  loading.value = true;
  error.value = "";

  try {
    const res = await fetch("/api/auth/local/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: email.value, password: password.value }),
    });

    const text = await res.text().catch(() => "");
    let json = {};
    try { json = text ? JSON.parse(text) : {}; } catch {}

    console.log("🔐 /api/auth/local/login ->", res.status, json);

    if (!res.ok || !json.success) {
      throw new Error(json.message || `Login failed (HTTP ${res.status})`);
    }

    if (json.next === "verify-2fa") {
      router.push("/verify-2fa");
    } else {
      router.push("/dashboard");
    }
  } catch (e) {
    error.value = e?.message || "Network or server error";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login {
  max-width: 420px;
  margin: 2rem auto;
  padding: 1.5rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}
.field { margin-bottom: 0.75rem; display: grid; gap: .25rem; }
.field input { width: 100%; padding: .5rem; }
button { padding: .5rem .75rem; }
.err { color: #c00; margin-top: .75rem; }
.debug {
  white-space: pre-wrap;
  background: #111; color: #ddd;
  border: 1px dashed #444; padding: .5rem; border-radius: 8px;
}
</style>
