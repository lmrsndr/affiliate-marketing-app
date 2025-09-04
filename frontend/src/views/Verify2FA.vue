<template>
  <div class="bb-container">
    <div class="card">
      <h1 class="title">Two-Factor Verification</h1>

      <p class="hint">
        We've sent a <strong>6-digit code</strong> to your email.
      </p>

      <div class="actions">
        <button class="bb-btn" :disabled="sending || verifying" @click="sendCode">
          {{ sending ? 'Sending…' : 'Resend code' }}
        </button>
      </div>

      <form class="form" @submit.prevent="verify">
        <label class="label" for="code">Enter 6-digit code</label>
        <input
          id="code"
          v-model="code"
          class="input"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          placeholder="123456"
          @input="digitsOnly"
        />

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="info" class="info">{{ info }}</p>

        <label class="trust">
          <input type="checkbox" v-model="trustThisDevice" />
          Trust this device for 30 days
        </label>

        <button class="bb-btn bb-btn--primary" type="submit" :disabled="verifying">
          {{ verifying ? 'Verifying…' : 'Verify & Continue' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import API from '@/api.js' // uses your existing axios wrapper (withCredentials enabled)

const router = useRouter()

const code = ref('')
const sending = ref(false)
const verifying = ref(false)
const error = ref('')
const info = ref('')
const trustThisDevice = ref(true)

/**
 * Keep the input numeric and max 6 chars
 */
const digitsOnly = () => {
  code.value = (code.value || '').replace(/\D+/g, '').slice(0, 6)
}

/**
 * Trigger email send using otpTicket cookie (no JWT required).
 * Backend route (added earlier): POST /api/auth/2fa-email/send-ticket
 */
const sendCode = async () => {
  error.value = ''
  info.value = ''
  sending.value = true
  try {
    await API.post('/auth/2fa-email/send-ticket')
    info.value = 'A new 6-digit code has been sent to your email.'
  } catch (e) {
    error.value = e?.response?.data?.message || 'Failed to send the code. Please try again.'
  } finally {
    sending.value = false
  }
}

/**
 * Verify the 6-digit code.
 * Backend route (added earlier): POST /api/auth/verify-otp
 * Request body: { token: <string>, trustThisDevice: <boolean> }
 * On success, server rotates cookies (authCookie/refreshCookie) and clears otpTicket.
 */
const verify = async () => {
  error.value = ''
  info.value = ''

  if (!/^\d{6}$/.test(code.value)) {
    error.value = 'Please enter a valid 6-digit code.'
    return
  }

  verifying.value = true
  try {
    await API.post('/auth/verify-otp', {
      token: code.value,
      trustThisDevice: !!trustThisDevice.value
    })

    // Fetch who we are and where to go
    const { data } = await API.get('/auth/status')
    if (!data?.isAuthenticated) {
      error.value = 'Verification succeeded but session was not established. Please sign in again.'
      return
    }

    const role = data?.user?.role || 'user'
    // Route by role (tweak if your paths differ)
    if (role === 'admin') {
      router.push('/admin')
    } else if (role === 'partner') {
      router.push('/partner')
    } else {
      router.push('/dashboard')
    }
  } catch (e) {
    error.value = e?.response?.data?.message || 'Invalid or expired code. Please try again.'
  } finally {
    verifying.value = false
  }
}

onMounted(() => {
  // Auto-send a code on page load if possible
  sendCode()
})
</script>

<style scoped>
.bb-container {
  display: grid;
  place-items: center;
  min-height: 60vh;
  padding: 1.25rem;
}
.card {
  width: 100%;
  max-width: 560px;
  background: var(--bb-surface, #111);
  border: 1px solid var(--bb-border, #222);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: var(--bb-shadow-md, 0 8px 24px rgba(0,0,0,.18));
}
.title {
  margin: 0 0 .5rem;
  font-size: clamp(1.25rem, 2.2vw, 1.6rem);
}
.hint {
  color: var(--bb-muted, #9aa);
}
.actions {
  margin: .75rem 0 1rem;
}
.form {
  display: grid;
  gap: .75rem;
}
.label {
  font-weight: 600;
}
.input {
  font-size: 1.25rem;
  letter-spacing: .12em;
  text-align: center;
  padding: .75rem .9rem;
  border-radius: 10px;
  border: 1px solid var(--bb-border, #222);
  background: var(--bb-bg, #0b0b0b);
  color: var(--bb-text, #eef);
}
.input::placeholder { color: #6a6a6a; }
.error {
  color: #ff6b6b;
  font-weight: 600;
}
.info {
  color: var(--bb-muted, #9aa);
}
.trust {
  display: flex;
  align-items: center;
  gap: .5rem;
  color: var(--bb-muted, #9aa);
}
.bb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .4rem;
  border-radius: 10px;
  padding: .6rem .9rem;
  border: 1px solid var(--bb-border, #222);
  background: var(--bb-surface, #131313);
  color: var(--bb-text, #eef);
  cursor: pointer;
}
.bb-btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}
.bb-btn--primary {
  background: var(--bb-primary, #39d353);
  color: #0b0b0b;
  border-color: transparent;
  font-weight: 800;
}
</style>
