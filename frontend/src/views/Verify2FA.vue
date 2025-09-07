<template>
  <section class="twofa-wrap">
    <h2 class="twofa-title">Two-Factor Verification</h2>
    <p class="twofa-sub">We’ve sent a 6-digit code to your email.</p>

    <div class="twofa-actions">
      <button class="bb-btn bb-btn--ghost" @click="resend" :disabled="resending">
        {{ resending ? "Sending…" : "Resend code" }}
      </button>
    </div>

    <div class="twofa-form" role="form" aria-labelledby="twofa-label">
      <label id="twofa-label" for="otp" class="twofa-label">Enter 6-digit code</label>

      <input
        id="otp"
        ref="otpEl"
        v-model="code"
        class="twofa-input"
        inputmode="numeric"
        autocomplete="one-time-code"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        maxlength="6"
        pattern="[0-9]{6}"
        :aria-invalid="code.length > 0 && !isCodeValid"
        @input="sanitize"
        @keyup.enter="submit"
      />

      <p v-if="error" class="twofa-error" role="alert">{{ error }}</p>

      <div class="twofa-remember">
        <label class="bb-checkbox">
          <input type="checkbox" v-model="remember" />
          <span>Remember this device for 30 days</span>
        </label>
      </div>

      <button
        type="button"
        class="bb-btn bb-btn--primary twofa-submit"
        :disabled="submitting || !isCodeValid"
        @click="submit"
      >
        {{ submitting ? "Verifying…" : "Verify & Continue" }}
      </button>
    </div>
  </section>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import API, { getNextAuthStep } from "@/api.js";

export default {
  name: "Verify2FA",
  setup() {
    const router = useRouter();
    const route  = useRoute();

    const code = ref("");
    const remember = ref(false);
    const error = ref("");
    const submitting = ref(false);
    const resending = ref(false);
    const otpEl = ref(null);

    // Read and sanitize ?redirect=...
    const rawRedirect = String(route.query.redirect || "");
    function sanitizeRedirect(path) {
      if (!path) return "";
      try { path = decodeURIComponent(path); } catch (_) {}
      // internal paths only, no protocol, no scheme-relative, must start with /
      if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) return "";
      if (!path.startsWith("/")) return "";
      // avoid looping back into auth pages
      const blocked = ["/login", "/auth/callback", "/verify-2fa", "/setup-2fa"];
      if (blocked.includes(path)) return "";
      return path;
    }
    const safeRedirect = sanitizeRedirect(rawRedirect);

    const isCodeValid = computed(() => /^\d{6}$/.test(code.value));

    function sanitize(e) {
      // Keep only digits, max 6
      const v = (e?.target?.value ?? code.value).replace(/\D/g, "").slice(0, 6);
      code.value = v;
      if (e?.target && e.target.value !== v) e.target.value = v;
      if (error.value) error.value = "";
    }

    async function submit() {
      error.value = "";
      sanitize();

      if (!isCodeValid.value) {
        error.value = "Please enter the 6-digit code.";
        otpEl.value?.focus();
        return;
      }

      submitting.value = true;
      try {
        // Verify the code; backend binds it to the session via HttpOnly cookies/ticket.
        await API.post("/2fa/verify", {
          token: code.value,
          rememberDevice: !!remember.value,
        });

        // Ask server where to go next; prefer our safe redirect if present.
        const { step, redirectTo } = await getNextAuthStep();
        if (step === "dashboard") {
          return router.replace(safeRedirect || redirectTo || "/dashboard");
        }
        if (step === "setup-2fa") {
          return router.replace({ path: "/setup-2fa", query: route.query });
        }
        if (step === "verify-2fa") {
          // Server still says we need to verify (code invalid/expired)
          error.value = "That code didn’t verify. Please try again.";
          return;
        }
        // Fallback
        router.replace({ path: "/login", query: { redirect: safeRedirect || "/" } });
      } catch (e) {
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Invalid or expired code. Please try again.";
        error.value = msg;
        otpEl.value?.focus();
      } finally {
        submitting.value = false;
      }
    }

    async function resend() {
      error.value = "";
      resending.value = true;
      try {
        await API.post("/2fa/resend");
      } catch (e) {
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Couldn’t resend the code. Please wait a moment and try again.";
        error.value = msg;
      } finally {
        resending.value = false;
      }
    }

    onMounted(() => {
      // Autofocus for fast entry
      requestAnimationFrame(() => otpEl.value?.focus());
    });

    return {
      code,
      remember,
      error,
      submitting,
      resending,
      isCodeValid,
      sanitize,
      submit,
      resend,
      otpEl,
    };
  },
};
</script>

<style scoped>
.twofa-wrap { max-width: 520px; margin: 2rem auto; padding: 1.25rem; }
.twofa-title { font-weight: 800; margin: 0 0 .25rem 0; }
.twofa-sub { margin: 0 0 1rem 0; opacity: .8; }
.twofa-actions { margin-bottom: 1rem; }
.twofa-form { display: grid; gap: .75rem; }
.twofa-label { font-weight: 600; }
.twofa-input {
  font-size: 1.125rem;
  letter-spacing: .12em;
  text-align: center;
  padding: .75rem 1rem;
  border-radius: var(--bb-radius, 10px);
  border: 1px solid var(--bb-border, #333);
  background: var(--bb-surface, #121212);
  color: var(--bb-text, #fff);
}
.twofa-input[aria-invalid="true"] { outline: 2px solid #ff9a9a; }
.twofa-error { color: #ff9a9a; font-weight: 600; }
.twofa-remember { margin-top: .25rem; }
.twofa-submit { margin-top: .25rem; }
</style>
