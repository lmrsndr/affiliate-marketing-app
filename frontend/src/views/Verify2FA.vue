<template>
  <div class="verify-2fa">
    <div class="bb-card card">
      <h1 class="title">Two-Factor Verification</h1>

      <!-- Initial state -->
      <p v-if="uiState==='idle'" class="muted">Preparing verification…</p>

      <!-- Main content -->
      <div v-else>
        <!-- Send/Resend -->
        <div class="hint">
          <p class="muted">
            A 6-digit code is required to continue.
            <span v-if="otpTicket">We detected a recent login — we’ll email your code.</span>
            <span v-else>You can request your code below.</span>
          </p>

          <div class="send-row">
            <button
              class="bb-btn bb-btn--primary"
              @click="sendCode"
              :disabled="loading || cooldown>0"
            >
              {{ cooldown>0 ? `Resend in ${cooldown}s` : (codeSent ? 'Resend code' : 'Send code') }}
            </button>
            <span v-if="message" class="ok">{{ message }}</span>
            <span v-if="error && !codeErrorOnly" class="err">{{ error }}</span>
          </div>
        </div>

        <!-- Verify form -->
        <form class="form" @submit.prevent="verifyCode" autocomplete="one-time-code" novalidate>
          <label for="code">Enter 6-digit code</label>
          <input
            id="code"
            class="bb-input code-input"
            v-model="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            minlength="6"
            pattern="^[0-9]{6}$"
            placeholder="••••••"
            @input="onCodeInput"
            required
          />

          <label class="trust">
            <input type="checkbox" v-model="trustDevice" />
            Trust this device (30 days)
          </label>

          <button
            class="bb-btn bb-btn--primary"
            type="submit"
            :disabled="loading || code.length!==6"
            aria-busy="loading ? 'true' : 'false'"
          >
            {{ loading ? 'Verifying…' : 'Verify & Continue' }}
          </button>

          <p v-if="codeErrorOnly" class="err mt-2">{{ error }}</p>
        </form>

        <!-- Debug (collapsible) -->
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
import API, { email2FA, getNextAuthStep, checkAuthStatus } from '../api.js';

/** ───────────────────────────────────────────────────────────
 *  State
 *  ─────────────────────────────────────────────────────────── */
const uiState = ref('idle'); // idle | ready
const loading = ref(false);

const otpTicket = ref(false); // whether cookie is present
const codeSent = ref(false);
const cooldown = ref(0); // seconds
let cooldownTimer = null;

const code = ref('');
const trustDevice = ref(false);

const error = ref('');
const message = ref('');

/** Debug bundle */
const debug = ref({
  url: '',
  cookies: '',
  statusBefore: null,
  sentResp: null,
  verifyResp: null,
  statusAfter: null,
});
const debugInfo = computed(() => JSON.stringify(debug.value, null, 2));
const codeErrorOnly = computed(() => !!error.value && code.value.length >= 1);

/** ───────────────────────────────────────────────────────────
 *  Helpers
 *  ─────────────────────────────────────────────────────────── */
function hasOtpTicketCookie() {
  const c = document.cookie || '';
  return /(?:^|;\s*)otpTicket=/.test(c);
}
function startCooldown(seconds = 30) {
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldown.value = seconds;
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1;
    if (cooldown.value <= 0) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  }, 1000);
}
function onCodeInput(e) {
  const digits = (e?.target?.value ?? '').replace(/[^0-9]/g, '').slice(0, 6);
  code.value = digits;
}

/** ───────────────────────────────────────────────────────────
 *  Network
 *  ─────────────────────────────────────────────────────────── */
async function bootstrapStatus(where = 'before') {
  const r = await checkAuthStatus().catch(() => null);
  debug.value[where === 'before' ? 'statusBefore' : 'statusAfter'] = r;
  return r;
}

async function sendCode() {
  loading.value = true;
  error.value = '';
  message.value = '';
  try {
    // Prefer resend; API aliases send/resend identical in your backend wrapper
    const resp = await email2FA.resend().catch(async () => email2FA.send());
    debug.value.sentResp = resp;
    codeSent.value = true;
    message.value = 'Verification code sent to your email.';
    startCooldown(30);
  } catch (e) {
    console.error('❌ [2FA] send/resend failed', e);
    error.value = e?.response?.data?.message || 'Failed to send verification email.';
  } finally {
    loading.value = false;
  }
}

async function verifyCode() {
  loading.value = true;
  error.value = '';
  message.value = '';
  try {
    const resp = await email2FA.verify({ code: code.value, trustThisDevice: trustDevice.value });
    debug.value.verifyResp = resp;

    // Confirm backend now sees us as verified
    const after = await bootstrapStatus('after');

    // Route by /auth/next
    const next = await getNextAuthStep().catch(() => ({ step: 'dashboard', redirectTo: '/dashboard' }));
    const to = next?.redirectTo || '/dashboard';

    // Some UIs prefer a small delay to ensure cookies propagate
    setTimeout(() => window.location.assign(to), 100);
  } catch (e) {
    console.error('❌ [2FA] verify failed', e);
    error.value = e?.response?.data?.message || 'Invalid or expired code.';
  } finally {
    loading.value = false;
  }
}

/** ───────────────────────────────────────────────────────────
 *  Lifecycle
 *  ─────────────────────────────────────────────────────────── */
onMounted(async () => {
  debug.value.url = window.location.href;
  debug.value.cookies = document.cookie;

  await bootstrapStatus('before');

  otpTicket.value = hasOtpTicketCookie();

  // If we’ve got a ticket (common via Google OAuth), auto-send a code.
  if (otpTicket.value) {
    try {
      await sendCode();
    } catch { /* non-blocking */ }
  }

  uiState.value = 'ready';
});
</script>

<style scoped>
.verify-2fa { display:grid; place-items:center; padding:2rem; }
.card { width:min(560px, 94vw); }
.title { margin: 0 0 .75rem; }

.muted { color: var(--bb-muted); }

.hint { display:grid; gap:.5rem; margin:.5rem 0 1rem; }
.send-row { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; }

.form { display:grid; gap:.75rem; margin-top:.75rem; }
.code-input {
  letter-spacing:.25em;
  text-align:center;
  font-weight:700;
  font-size:1.15rem;
}
.trust { display:flex; gap:.5rem; align-items:center; font-size:.95rem; color:var(--bb-muted); }

.ok { color:#1db954; font-weight:600; }
.err { color:#ff6b6b; font-weight:600; }

.debug { margin-top:1rem; }
pre {
  white-space:pre-wrap;
  word-break:break-word;
  background: var(--bb-surface-2, #0a0a0a);
  border:1px dashed var(--bb-border, #333);
  padding:.75rem; border-radius:10px;
}

/* Brand helpers if not already globally present */
.bb-card {
  background: var(--bb-surface, #111);
  border:1px solid var(--bb-border, #222);
  border-radius:12px;
  padding:1.25rem;
  box-shadow: var(--bb-shadow-sm);
}
.bb-btn { border-radius: 10px; padding:.7rem 1rem; font-weight:700; border:1px solid transparent; cursor:pointer; }
.bb-btn--primary { background: var(--bb-primary, #17b169); color:#001; }
.bb-btn--primary[disabled] { opacity:.6; cursor:not-allowed; }
.bb-btn--ghost { background: transparent; color: var(--bb-text); border-color: var(--bb-border); }
.bb-input {
  background: var(--bb-surface, #0b0b0b);
  border:1px solid var(--bb-border, #333);
  border-radius:10px;
  padding:.9rem 1rem;
}
.mt-2 { margin-top:.5rem; }
</style>
