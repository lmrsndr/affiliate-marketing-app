<template>
  <div class="user-2fa-container">
    <h2 class="text-xl font-bold mb-4">🔐 Two-Factor Authentication (2FA)</h2>

    <div v-if="twoFA.enabled" class="mb-6">
      <p>✅ App-based 2FA is currently <strong>enabled</strong> on your account.</p>
      <button class="btn danger mt-2" @click="disableApp2FA">Disable App-Based 2FA</button>
    </div>

    <div v-else>
      <p class="mb-2">You are currently using <strong>email-based 2FA</strong>.</p>
      <p>Upgrade to app-based 2FA for faster and more secure logins.</p>

      <div class="mt-4" v-if="!showSetup">
        <button class="btn" @click="startUpgrade">📲 Upgrade to App-Based 2FA</button>
      </div>

      <div v-if="showSetup" class="qr-setup">
        <h3 class="text-md font-semibold mb-2">Step 1: Scan this QR code</h3>
        <img :src="qrCodeUrl" alt="QR Code" class="qr-image" />

        <h3 class="text-md font-semibold mt-4 mb-2">Step 2: Enter the 6-digit code</h3>
        <input
          v-model="totpCode"
          maxlength="6"
          placeholder="123456"
          class="input"
          @keyup.enter="verifyApp2FA"
          :disabled="lockout"
        />

        <div class="totp-timer mt-2" v-if="!lockout">
          Code expires in: <strong>{{ countdown }}s</strong>
          <div class="progress-bar" :style="{ width: countdownPercent + '%' }"></div>
        </div>

        <div class="mt-2 text-red-500" v-if="error">{{ error }}</div>
        <div class="text-sm text-gray-500 mt-1" v-if="attemptsLeft > 0 && !lockout">
          Attempts left: {{ attemptsLeft }} of {{ maxAttempts }}
        </div>

        <div v-if="lockout" class="text-sm text-yellow-600 mt-2">
          ⏳ Too many attempts. Please wait {{ lockoutRemaining }}s.
        </div>

        <button class="btn mt-4" @click="verifyApp2FA" :disabled="loading || lockout">
          ✅ Verify and Activate
        </button>
      </div>

      <div v-if="backupCodes.length" class="backup-section mt-6">
        <h3 class="text-md font-semibold mb-2">📄 Backup Codes (save these):</h3>
        <ul class="backup-codes">
          <li v-for="code in backupCodes" :key="code">{{ code }}</li>
        </ul>
        <p class="text-sm text-gray-500 mt-2">
          Store these codes securely. Each can be used once if you lose your phone.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import API from "@/api";

const twoFA = ref({ enabled: false });
const qrCodeUrl = ref("");
const totpCode = ref("");
const error = ref("");
const loading = ref(false);
const showSetup = ref(false);
const backupCodes = ref([]);

const countdown = ref(30);
const countdownPercent = ref(100);
let countdownInterval = null;

const attemptsLeft = ref(5);
const maxAttempts = 5;
const lockout = ref(false);
const lockoutRemaining = ref(0);
let lockoutTimer = null;

const startCountdown = () => {
  clearInterval(countdownInterval);
  countdown.value = 30;
  countdownPercent.value = 100;
  countdownInterval = setInterval(() => {
    countdown.value--;
    countdownPercent.value = (countdown.value / 30) * 100;
    if (countdown.value <= 0) {
      countdown.value = 30;
      countdownPercent.value = 100;
    }
  }, 1000);
};

const startLockout = () => {
  lockout.value = true;
  lockoutRemaining.value = 300;
  lockoutTimer = setInterval(() => {
    lockoutRemaining.value--;
    if (lockoutRemaining.value <= 0) {
      clearInterval(lockoutTimer);
      lockout.value = false;
      attemptsLeft.value = maxAttempts;
    }
  }, 1000);
};

const load2FAStatus = async () => {
  try {
    const { data } = await API.get("/2fa/status");
    twoFA.value = data;
  } catch (err) {
    console.error("❌ Failed to load 2FA status:", err);
  }
};

const startUpgrade = async () => {
  try {
    const { data } = await API.get("/2fa-totp/generate");
    qrCodeUrl.value = data.qrCodeUrl;
    showSetup.value = true;
    startCountdown();
  } catch (err) {
    error.value = err.response?.data?.error || "Could not generate QR code.";
  }
};

const verifyApp2FA = async () => {
  error.value = "";
  loading.value = true;
  if (lockout.value) return;

  try {
    const { data } = await API.post("/2fa-totp/verify", { code: totpCode.value });

    if (data.success) {
      await load2FAStatus();
      showSetup.value = false;
      totpCode.value = "";
      backupCodes.value = data.backupCodes || [];
      clearInterval(countdownInterval);
    } else {
      error.value = "Invalid code. Please try again.";
      attemptsLeft.value--;
      if (attemptsLeft.value <= 0) {
        startLockout();
      }
    }
  } catch (err) {
    error.value = err.response?.data?.error || "Verification failed.";
    attemptsLeft.value--;
    if (attemptsLeft.value <= 0) {
      startLockout();
    }
  } finally {
    loading.value = false;
  }
};

const disableApp2FA = async () => {
  try {
    await API.post("/2fa-totp/disable");
    await load2FAStatus();
    qrCodeUrl.value = "";
    totpCode.value = "";
    showSetup.value = false;
    backupCodes.value = [];
    clearInterval(countdownInterval);
  } catch (err) {
    error.value = err.response?.data?.error || "Failed to disable app-based 2FA.";
  }
};

onMounted(() => {
  load2FAStatus();
});
</script>

<style scoped>
.user-2fa-container {
  max-width: 500px;
  margin: 80px auto;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.qr-image {
  width: 200px;
  height: 200px;
  object-fit: contain;
  margin: 0 auto;
  display: block;
}

.input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  text-align: center;
  letter-spacing: 0.15em;
}

.btn {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background-color: #3b82f6;
  color: white;
  font-weight: bold;
  border: none;
  cursor: pointer;
  transition: 0.3s ease;
}
.btn.danger {
  background-color: #ef4444;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.progress-bar {
  height: 6px;
  background: #3b82f6;
  border-radius: 9999px;
  margin-top: 4px;
  transition: width 1s linear;
}

.backup-codes {
  list-style: none;
  padding: 0;
  margin: 0;
}
.backup-codes li {
  font-family: monospace;
  background: #f9fafb;
  padding: 0.5rem;
  border: 1px dashed #ddd;
  margin-bottom: 4px;
  border-radius: 4px;
}
</style>

