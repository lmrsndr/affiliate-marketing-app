<template>
  <div class="wrap">
    <header class="brand">bundlebee</header>

    <main class="card">
      <h1>Two-Factor Verification</h1>

      <p v-if="sending" class="muted">Sending a verification code to your email…</p>
      <p v-else-if="sendOk" class="ok">We’ve sent a 6-digit code to your email.</p>
      <p v-else-if="sendErr" class="err">{{ sendErr }}</p>
      <p v-else class="muted">If you didn’t receive a code, click “Resend code”.</p>

      <div class="row">
        <button class="btn" :disabled="sending" @click="sendCode">Resend code</button>
      </div>

      <hr />

      <form @submit.prevent="verify">
        <label for="code">Enter 6-digit code</label>
        <input
          id="code"
          v-model="code"
          inputmode="numeric"
          pattern="\\d{6}"
          maxlength="6"
          autocomplete="one-time-code"
          placeholder="123456"
        />

        <label class="chk">
          <input type="checkbox" v-model="trustThisDevice" />
          Trust this device for 30 days
        </label>

        <button class="btn primary" :disabled="verifying || code.length !== 6">
          Verify & Continue
        </button>
      </form>

      <p v-if="verifying" class="muted">Verifying…</p>
      <p v-if="verifyErr" class="err">{{ verifyErr }}</p>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import API from '../../api.js'; // uses VITE_API_URL
import { useRouter } from 'vue-router';

const router = useRouter();

const sending = ref(false);
const sendOk = ref(false);
const sendErr = ref('');

const code = ref('');
const trustThisDevice = ref(true);
const verifying = ref(false);
const verifyErr = ref('');

async function sendCode() {
  sending.value = true; sendOk.value = false; sendErr.value = '';
  try {
    await API.post('/2fa-email/send');
    sendOk.value = true;
  } catch (err) {
    sendErr.value = err?.response?.data?.message || 'Failed to send code';
  } finally {
    sending.value = false;
  }
}

async function verify() {
  verifying.value = true; verifyErr.value = '';
  try {
    await API.post('/2fa-email/verify', { code: code.value, trustThisDevice: trustThisDevice.value });

    // sanity check and smart redirect by role
    const { data } = await API.get('/auth/status');
    if (data?.isAuthenticated && data?.user?.twoFAVerified) {
      const role = data.user.role;
      if (role === 'admin') return router.replace('/admin-dashboard');
      if (role === 'partner') return router.replace('/partner-dashboard');
      return router.replace('/dashboard');
    }
    verifyErr.value = 'Verification succeeded but session not ready. Try reloading the page.';
  } catch (err) {
    verifyErr.value = err?.response?.data?.message || 'Invalid or expired code';
  } finally {
    verifying.value = false;
  }
}

onMounted(() => {
  // Auto-send on load so the user gets feedback immediately
  sendCode();
});
</script>

<style scoped>
.wrap { min-height: 100vh; display: grid; place-items: start center; padding: 2rem 1rem; background: #0b0b0b; color: #e5e7eb; }
.brand { margin-bottom: 1rem; font-weight: 900; font-size: 1.5rem; color: #6ee7b7; }
.card { width: 100%; max-width: 520px; background: #111213; border: 1px solid #222; border-radius: 14px; padding: 1.25rem; }
h1 { margin: .25rem 0 1rem; font-size: 1.25rem; }
.row { margin: .5rem 0 1rem; }
.btn { padding: .6rem 1rem; border-radius: 10px; border: 1px solid #2a2a2a; background: #1a1b1c; color: #e5e7eb; cursor: pointer; }
.btn:hover { background: #202224; }
.btn.primary { background: #10b981; border-color: #10b981; color: #0b0b0b; font-weight: 700; }
input { width: 100%; padding: .6rem .75rem; border-radius: 10px; background: #0f1113; border: 1px solid #2a2a2a; color: #e5e7eb; }
label { display: block; margin: .5rem 0 .35rem; }
.chk { display: flex; align-items: center; gap: .5rem; margin-top: .5rem; }
hr { border: none; border-top: 1px solid #1f1f1f; margin: 1rem 0; }
.muted { color: #9ca3af; }
.ok { color: #34d399; }
.err { color: #f87171; }
</style>
