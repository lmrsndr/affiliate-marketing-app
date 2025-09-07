<template>
  <div class="verify-wrapper">
    <div class="card">
      <h2>Two-Factor Verification</h2>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="info" class="info">{{ info }}</p>

      <div class="row">
        <label for="otp">Enter 6-digit code</label>
        <input
          id="otp"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          :value="code"
          @input="onCodeInput"
          class="otp-input"
        />
      </div>

      <div class="row actions">
        <button :disabled="sending" @click="resend">{{ sending ? 'Sending…' : 'Resend code' }}</button>
        <button :disabled="verifying || code.length !== 6" class="primary" @click="verify">
          {{ verifying ? 'Verifying…' : 'Verify & Continue' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import API, { getNextAuthStep, checkAuthStatus, setAccessToken } from "@/api.js";

export default {
  name: "Verify2FA",
  setup() {
    const router = useRouter();
    const route = useRoute();

    const code = ref("");
    const error = ref("");
    const info = ref("");
    const sending = ref(false);
    const verifying = ref(false);

    function sanitizeRedirect(path) {
      if (!path) return "";
      try { path = decodeURIComponent(String(path)); } catch {}
      if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) return "";
      if (!path.startsWith("/")) return "";
      const blocked = ["/login", "/auth/callback", "/verify-2fa", "/setup-2fa"];
      return blocked.includes(path) ? "" : path;
    }
    const safeRedirect = sanitizeRedirect(route.query.redirect);

    const onCodeInput = (e) => {
      const digits = String(e.target.value || "").replace(/\D+/g, "").slice(0, 6);
      code.value = digits;
      error.value = "";
    };

    async function ensureContext() {
      // Many backends require an OTP context cookie (otpTicket) before sending the code.
      // This endpoint will create it when the user is authenticated but not yet 2FA-verified.
      try {
        await API.post("/2fa-email/context"); // idempotent
      } catch (e) {
        // If the endpoint doesn't exist, that's OK; backend may not need it.
        if (e?.response?.status !== 404) {
          throw e;
        }
      }
    }

    async function resend() {
      error.value = "";
      info.value = "";
      sending.value = true;
      try {
        await ensureContext();
        await API.post("/2fa-email/send");
        info.value = "Code sent. Please check your email.";
      } catch (e) {
        const msg = e?.response?.data?.msg || e?.response?.data?.message || e.message || "Failed to send code.";
        error.value = msg;
      } finally {
        sending.value = false;
      }
    }

    async function verify() {
      error.value = "";
      verifying.value = true;
      try {
        if (code.value.length !== 6) {
          error.value = "Please enter the 6-digit code.";
          return;
        }
        const { data } = await API.post("/2fa/verify", { token: code.value });
        // On success, many backends re-issue cookies and/or return a short-lived access token
        if (data?.accessToken) setAccessToken(data.accessToken);

        const status = await checkAuthStatus();
        if (!status?.isAuthenticated) {
          throw new Error("Verification succeeded, but session not established.");
        }

        const role = status?.user?.role;
        const fallback = role === "admin" ? "/admin-dashboard"
                       : role === "partner" ? "/partner-dashboard"
                       : "/dashboard";
        router.replace(safeRedirect || fallback);
      } catch (e) {
        const msg = e?.response?.data?.msg || e?.response?.data?.message || e.message || "Verification failed.";
        error.value = msg;
      } finally {
        verifying.value = false;
      }
    }

    onMounted(async () => {
      // If we reached this screen by mistake, nudge to the right place.
      try {
        const next = await getNextAuthStep();
        if (next?.step === "dashboard") {
          return router.replace(next.redirectTo || "/dashboard");
        }
        // Optional: pre-send a code upon arrival to reduce friction
        await resend();
      } catch {
        /* ignore; manual resend still works */
      }
    });

    return { code, error, info, sending, verifying, onCodeInput, resend, verify };
  },
};
</script>

<style scoped>
.verify-wrapper { display:flex; justify-content:center; padding:2rem 1rem; }
.card { width: 100%; max-width: 520px; background:#111; border:1px solid #222; border-radius:16px; padding:24px; }
h2 { margin:0 0 12px; }
.row { margin: 12px 0; }
.otp-input { width:100%; padding:.75rem 1rem; border-radius:10px; border:1px solid #2a2a2a; font-size:1.1rem; letter-spacing:0.12em; }
.actions { display:flex; gap:.75rem; justify-content:flex-end; }
button { padding:.6rem 1rem; border-radius:10px; border:1px solid #2a2a2a; background:#1f1f1f; color:#eee; cursor:pointer; }
button.primary { background:#19c37d; color:#031d12; border:none; }
button:disabled { opacity:.6; cursor:not-allowed; }
.error { color:#ff6b6b; margin:.5rem 0; }
.info  { color:#75d6a5; margin:.5rem 0; }
</style>
