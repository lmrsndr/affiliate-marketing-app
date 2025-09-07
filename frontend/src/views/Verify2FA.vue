<template>
  <div class="verify-2fa-page">
    <section class="bb-card verify-card">
      <h2>Two-Factor Verification</h2>
      <p>We’ve sent a 6-digit code to your email.</p>

      <button class="bb-btn bb-btn--ghost" :disabled="sending" @click="sendCode">
        {{ sending ? 'Sending…' : 'Resend code' }}
      </button>

      <hr class="bb-sep" />

      <form novalidate @submit.prevent="onSubmit" ref="formEl">
        <label for="otp">Enter 6-digit code</label>

        <input
          id="otp"
          name="otp"
          v-model="code"
          @input="onInput"
          autocomplete="one-time-code"
          inputmode="numeric"
          maxlength="6"
          pattern="[0-9]{6}"
          title="Enter exactly 6 digits (0-9)"
          class="bb-input"
          placeholder="••••••"
          required
        />

        <label class="trust">
          <input type="checkbox" v-model="trustDevice" />
          Trust this device for 30 days
        </label>

        <button type="submit" class="bb-btn bb-btn--primary" :disabled="submitting">
          {{ submitting ? 'Verifying…' : 'Verify & Continue' }}
        </button>

        <p v-if="error" class="bb-error" role="alert">{{ error }}</p>
        <p v-if="success" class="bb-success" role="status">{{ success }}</p>
      </form>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import API from '../api.js';

const code = ref('');
const trustDevice = ref(true);
const sending = ref(false);
const submitting = ref(false);
const error = ref('');
const success = ref('');
const formEl = ref(null);

/** Keep only digits and clamp to 6 */
const onInput = () => {
  code.value = (code.value || '').replace(/\D/g, '').slice(0, 6);
};

const sendCode = async () => {
  error.value = '';
  success.value = '';
  sending.value = true;
  try {
    // hit your email 2FA send endpoint; auth cookie or otpTicket should be present
    await API.post('/2fa-email/send');
    success.value = 'Code sent. Please check your inbox/spam.';
  } catch (e) {
    error.value = e?.response?.data?.message || 'Failed to send code.';
  } finally {
    sending.value = false;
  }
};

const onSubmit = async () => {
  error.value = '';
  success.value = '';

  // Manual validation in place of native pattern bubbles
  const sanitized = (code.value || '').replace(/\D/g, '');
  if (sanitized.length !== 6) {
    error.value = 'Please enter exactly 6 digits.';
    return;
  }

  submitting.value = true;
  try {
    // verify endpoint (expects a string code)
    const { data } = await API.post('/auth/verify-otp', {
      code: String(sanitized),
      trustThisDevice: !!trustDevice.value,
    });

    // Optionally call trust-device endpoint after success (if your BE needs it)
    if (trustDevice.value) {
      try { await API.post('/auth/trust-device'); } catch (_) {}
    }

    success.value = 'Verified! Redirecting…';

    // Minimal redirect logic: send admins/partners to dashboards, else home
    const payload = data?.user || {};
    const role = payload.role || 'user';
    const target =
      role === 'admin'   ? '/admin'   :
      role === 'partner' ? '/partner' :
      '/';

    setTimeout(() => {
      window.location.assign(target);
    }, 600);
  } catch (e) {
    error.value = e?.response?.data?.message || 'Invalid code. Please try again.';
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.verify-card { max-width: 520px; margin: 2rem auto; padding: 1.5rem; }
.bb-input { width:100%; padding:.75rem .875rem; font-size:1.05rem; letter-spacing:.35em; text-align:center; }
.bb-sep { margin:1rem 0; border:none; border-top:1px solid var(--bb-border); }
.trust { display:flex; align-items:center; gap:.5rem; margin:.75rem 0 1rem; }
.bb-error { color:#ff5d5d; margin-top:.5rem; }
.bb-success { color:#19c37d; margin-top:.5rem; }
</style>
