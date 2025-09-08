<template>
  <div class="verify-2fa">
    <div class="card">
      <h1>Two-Factor Verification</h1>

      <p v-if="status==='idle'">Preparing verification…</p>

      <div v-if="status!=='idle'">
        <p class="hint">
          We’ve sent a 6-digit code to your email.
          <button class="link" @click="resend" :disabled="loading">Resend code</button>
        </p>

        <form @submit.prevent="verify">
          <label for="code">Enter 6-digit code</label>
          <input
            id="code"
            v-model="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            minlength="6"
            pattern="^[0-9]{6}$"
            placeholder="••••••"
            @input="code = code.replace(/[^0-9]/g, '').slice(0,6)"
            required
          />
          <label class="trust">
            <input type="checkbox" v-model="trustDevice" /> Trust this device (30 days)
          </label>
          <button type="submit" :disabled="loading || code.length!==6">Verify & Continue</button>
        </form>

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="message" class="message">{{ message }}</p>

        <details class="debug">
          <summary>Debug info</summary>
          <pre>{{ debugInfo }}</pre>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';

const API = import.meta.env.VITE_API_BASE || '/api';

const status = ref('idle');       // idle | ticket | ready
const loading = ref(false);
const error = ref('');
const message = ref('');
const code = ref('');
const trustDevice = ref(false);

const debug = ref({
  url: '',
  cookies: '',
  authStatusBefore: null,
  emailSend: null,
  verifyResp: null,
  authStatusAfter: null,
});

const debugInfo = computed(() => JSON.stringify(debug.value, null, 2));

async function getJSON(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { credentials: 'include', ...opts });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { ok: res.ok, status: res.status, body };
}

async function checkAuth(where = 'before') {
  const r = await getJSON('/auth/status');
  console.log(`📊 [Verify2FA] /auth/status (${where}) ->`, r);
  debug.value[where === 'before' ? 'authStatusBefore' : 'authStatusAfter'] = r;
  return r;
}

function hasOtpTicket() {
  const c = document.cookie || '';
  return /(?:^|;\s*)otpTicket=/.test(c);
}

async function ensureEmailSent() {
  loading.value = true;
  error.value = '';
  try {
    const r = await getJSON('/2fa-email/send', { method: 'POST' });
    console.log('📧 [Verify2FA] /2fa-email/send ->', r);
    debug.value.emailSend = r;
    if (!r.ok) {
      error.value = r.body?.message || 'Failed to send verification email.';
    } else {
      message.value = 'Verification code sent to your email.';
    }
  } catch (e) {
    console.error('❌ [Verify2FA] sendEmail failed', e);
    error.value = 'Network error sending code.';
  } finally {
    loading.value = false;
  }
}

async function verify() {
  loading.value = true;
  error.value = '';
  message.value = '';
  try {
    console.log('🔐 [Verify2FA] Submitting code:', code.value, 'trustDevice:', trustDevice.value);
    const r = await getJSON('/2fa-email/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.value, trustThisDevice: trustDevice.value }),
    });
    console.log('✅ [Verify2FA] /2fa-email/verify ->', r);
    debug.value.verifyResp = r;

    if (!r.ok) {
      error.value = r.body?.message || 'Invalid code.';
      return;
    }

    // After success, authCookie should be set; confirm:
    await checkAuth('after');

    // Redirect based on role or to dashboard/home
    window.location.replace('/');
  } catch (e) {
    console.error('❌ [Verify2FA] verify failed', e);
    error.value = 'Verification failed due to network error.';
  } finally {
    loading.value = false;
  }
}

async function resend() {
  loading.value = true;
  error.value = '';
  message.value = '';
  try {
    const r = await getJSON('/2fa-email/resend', { method: 'POST' });
    console.log('📨 [Verify2FA] /2fa-email/resend ->', r);
    if (!r.ok) {
      error.value = r.body?.message || 'Could not resend code.';
    } else {
      message.value = 'Code resent.';
    }
  } catch (e) {
    console.error('❌ [Verify2FA] resend failed', e);
    error.value = 'Network error resending code.';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  debug.value.url = window.location.href;
  debug.value.cookies = document.cookie;
  console.log('🌐 [Verify2FA] URL:', debug.value.url);
  console.log('🍪 [Verify2FA] Cookies:', debug.value.cookies);

  // See what backend thinks *right now*
  await checkAuth('before');

  // Only send email automatically if otpTicket is present
  if (hasOtpTicket()) {
    console.log('🎫 [Verify2FA] otpTicket cookie detected -> sending email code');
    status.value = 'ticket';
    await ensureEmailSent();
  } else {
    console.log('ℹ️ [Verify2FA] No otpTicket cookie. If you arrived here by mistake, auth flow may have skipped OAuth callback.');
  }

  status.value = 'ready';
});
</script>

<style scoped>
.verify-2fa { display:grid; place-items:center; padding:2rem; }
.card { width:min(560px, 94vw); background: var(--bb-surface, #111); border:1px solid var(--bb-border, #222); border-radius:12px; padding:1.25rem; }
h1 { margin: 0 0 .75rem; }
.hint { color: #aaa; display:flex; gap:.75rem; align-items:center; }
.link { background:none; border:none; color:#7dcfff; text-decoration:underline; cursor:pointer; }
form { display:grid; gap:.75rem; margin-top:1rem; }
input[type="text"], input[type="tel"], input[type="password"], input:not([type]) {
  background:#0b0b0b; border:1px solid #333; border-radius:10px; padding:.9rem 1rem; font-size:1.1rem; letter-spacing:.2em;
}
button[type="submit"] { padding:.8rem 1rem; border-radius:10px; border:none; background:#17b169; color:#001; font-weight:800; cursor:pointer; }
.error { color:#ff8484; }
.message { color:#9fe39f; }
.trust { display:flex; gap:.5rem; align-items:center; font-size:.95rem; color:#bbb; }
.debug { margin-top:1rem; }
pre { white-space:pre-wrap; word-break:break-word; background:#0a0a0a; border:1px dashed #333; padding:.75rem; border-radius:10px; }
</style>
