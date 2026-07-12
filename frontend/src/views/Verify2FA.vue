<template>
  <section class="mfa-shell">
    <div class="mfa-card">
      <p class="eyebrow">Secure administrator access</p>
      <h1>{{ mode === 'setup' ? 'Set up authenticator app' : 'Enter authenticator code' }}</h1>

      <p v-if="loading" class="muted">Preparing secure verification…</p>

      <template v-else>
        <div v-if="mode === 'setup'" class="setup">
          <p>Scan this QR code with Microsoft Authenticator, Google Authenticator, 1Password, Bitwarden or another TOTP app.</p>
          <img v-if="qrCode" :src="qrCode" alt="Authenticator setup QR code" class="qr" />
          <details v-if="secret">
            <summary>Cannot scan the QR code?</summary>
            <p>Enter this setup key manually:</p>
            <code>{{ secret }}</code>
          </details>
        </div>

        <p v-else class="muted">Open your authenticator app and enter the current six-digit BundleBee code.</p>

        <form @submit.prevent="verify">
          <label for="totp-code">Six-digit code</label>
          <input
            id="totp-code"
            v-model="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            pattern="[0-9]{6}"
            maxlength="6"
            placeholder="000000"
            required
            @input="code = code.replace(/\D/g, '').slice(0, 6)"
          />
          <button type="submit" :disabled="submitting || code.length !== 6">
            {{ submitting ? 'Verifying…' : 'Verify and continue' }}
          </button>
        </form>

        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button class="link-button" type="button" @click="signOut">Sign out and use another account</button>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { getBackendSupabaseSession } from '@/api';
import {
  challengeAndVerifyTotp,
  enrollTotp,
  signOutSupabase,
} from '@/supabaseAuth';

const route = useRoute();
const loading = ref(true);
const submitting = ref(false);
const error = ref('');
const mode = ref('verify');
const factorId = ref('');
const enrollment = ref(null);
const code = ref('');

const qrCode = computed(() => enrollment.value?.totp?.qr_code || enrollment.value?.totp?.qrCode || '');
const secret = computed(() => enrollment.value?.totp?.secret || '');

function safeRedirect(value) {
  const path = String(value || '');
  return path.startsWith('/') && !path.startsWith('//') ? path : '/admin';
}

async function initialise() {
  loading.value = true;
  error.value = '';
  try {
    const session = await getBackendSupabaseSession();
    if (!session?.isAdmin) {
      window.location.assign('/login?reason=admin-required');
      return;
    }
    if (session.aal === 'aal2') {
      window.location.assign(safeRedirect(route.query.redirect));
      return;
    }

    const verifiedTotp = (session.user?.factors || []).find(
      (factor) => factor.factor_type === 'totp' && factor.status === 'verified'
    );

    if (verifiedTotp) {
      mode.value = 'verify';
      factorId.value = verifiedTotp.id;
    } else {
      mode.value = 'setup';
      enrollment.value = await enrollTotp();
      factorId.value = enrollment.value?.id || '';
      if (!factorId.value) throw new Error('Supabase did not return an authenticator factor ID.');
    }
  } catch (err) {
    if (err?.response?.status === 401 || err?.status === 401) {
      window.location.assign('/login?reason=session-expired');
      return;
    }
    error.value = err?.response?.data?.message || err?.message || 'Unable to prepare authenticator verification.';
  } finally {
    loading.value = false;
  }
}

async function verify() {
  submitting.value = true;
  error.value = '';
  try {
    await challengeAndVerifyTotp(factorId.value, code.value);
    const session = await getBackendSupabaseSession();
    if (session?.aal !== 'aal2') throw new Error('Authenticator verification did not reach the required security level.');
    window.location.assign(safeRedirect(route.query.redirect));
  } catch (err) {
    error.value = err?.response?.data?.message || err?.message || 'The authenticator code was not accepted.';
    code.value = '';
  } finally {
    submitting.value = false;
  }
}

async function signOut() {
  await signOutSupabase().catch(() => undefined);
  window.location.assign('/login');
}

onMounted(initialise);
</script>

<style scoped>
.mfa-shell{display:grid;place-items:start center;min-height:64vh;padding:2.5rem 1rem}.mfa-card{width:min(520px,100%);box-sizing:border-box;padding:1.5rem;border:1px solid var(--bb-border);border-radius:18px;background:var(--bb-surface);box-shadow:var(--bb-shadow-md);text-align:left}.eyebrow{margin:0 0 .45rem;color:var(--bb-primary-light);font-size:.78rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.muted,.setup p{color:var(--bb-muted);line-height:1.55}.setup{text-align:center}.setup p,.setup details{text-align:left}.qr{display:block;width:min(260px,80%);margin:1.25rem auto;padding:.6rem;border-radius:12px;background:white}.mfa-card form{display:grid;gap:.75rem;margin-top:1.25rem}.mfa-card label{font-weight:750}.mfa-card input{width:100%;box-sizing:border-box;padding:.85rem;border:1px solid var(--bb-border);border-radius:10px;background:var(--bb-bg);color:var(--bb-text);font:inherit;font-size:1.2rem;font-weight:800;letter-spacing:.28em;text-align:center}.mfa-card button[type='submit']{min-height:46px;border:0;border-radius:10px;background:var(--bb-primary-dark);color:white;font:inherit;font-weight:800;cursor:pointer}.mfa-card button:disabled{opacity:.6;cursor:wait}.error{color:#ff7070;font-weight:700}.link-button{margin-top:.75rem;padding:0;border:0;background:transparent;color:var(--bb-muted);text-decoration:underline;cursor:pointer}details{margin-top:1rem}code{display:block;overflow-wrap:anywhere;padding:.7rem;border-radius:8px;background:var(--bb-bg);color:var(--bb-text)}
</style>
