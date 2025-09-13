<script setup>
import { ref, computed } from "vue";
import API from "@/api"; // axios instance with cookies+interceptor (not required here, but consistent)

/* ────────────────────────────────────────────────────────────
   State
──────────────────────────────────────────────────────────── */
const email = ref("");
const sending = ref(false);
const successText = ref("");
const errorText = ref("");

/* ────────────────────────────────────────────────────────────
   Validation
──────────────────────────────────────────────────────────── */
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailValid = computed(() => emailPattern.test(email.value.trim()));

/* ────────────────────────────────────────────────────────────
   Actions
──────────────────────────────────────────────────────────── */
async function sendResetLink() {
  successText.value = "";
  errorText.value = "";

  const value = email.value.trim();
  if (!emailPattern.test(value)) {
    errorText.value = "Please enter a valid email address.";
    return;
  }

  sending.value = true;
  try {
    // Backend should always respond with a generic success for privacy.
    // Example accepted responses: 200/202 with { ok: true } (shape not strictly required here).
    await API.post("/auth/forgot-password", { email: value });

    // Always show a generic success message (prevents user enumeration).
    successText.value = "If an account exists for that email, a reset link has been sent.";
  } catch (e) {
    // Handle rate-limiting clearly; otherwise show generic guidance.
    const status = e?.response?.status;
    if (status === 429) {
      errorText.value = "Too many requests. Please wait a few minutes before trying again.";
    } else {
      errorText.value = "We couldn't send a reset link right now. Please try again shortly.";
    }
    console.error("Forgot password error:", e?.response?.data || e);
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-10">
    <section class="bb-card p-6">
      <header class="mb-4 text-center">
        <h1 class="text-2xl font-bold" style="font-family: var(--bb-font-heading);">
          Reset Password
        </h1>
        <p class="text-muted mt-1">
          Enter the email associated with your account and we'll send you a reset link.
        </p>
      </header>

      <!-- Feedback banners -->
      <p v-if="successText" class="mb-3 text-green-700">{{ successText }}</p>
      <p v-if="errorText" class="mb-3 text-red-600">{{ errorText }}</p>

      <form @submit.prevent="sendResetLink" class="grid gap-3">
        <label class="flex flex-col">
          <span class="text-sm text-muted mb-1">Email address</span>
          <input
            class="bb-input"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            required
          />
        </label>

        <button
          type="submit"
          class="bb-btn bb-btn--primary"
          :disabled="sending || !emailValid"
          :aria-busy="sending ? 'true' : 'false'"
        >
          {{ sending ? "Sending…" : "Send Reset Link" }}
        </button>
      </form>

      <div class="text-center mt-4 text-sm">
        Remembered your password?
        <router-link to="/login" class="underline">Login</router-link>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* All visuals come from brand.css; minimal local tweaks only if needed */
</style>
