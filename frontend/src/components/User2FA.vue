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

        <h3 class="text-md font-semibold mt-4 mb-2">Step 2: Enter the 6-digit code from your authenticator app</h3>
        <input v-model="totpCode" maxlength="6" placeholder="123456" class="input" @keyup.enter="verifyApp2FA" />

        <div class="mt-2 text-red-500" v-if="error">{{ error }}</div>

        <button class="btn mt-4" @click="verifyApp2FA" :disabled="loading">
          ✅ Verify and Activate
        </button>
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
  } catch (err) {
    console.error("❌ Failed to generate QR code:", err);
    error.value = err.response?.data?.error || "Could not generate QR code.";
  }
};

const verifyApp2FA = async () => {
  error.value = "";
  loading.value = true;
  try {
    const { data } = await API.post("/2fa-totp/verify", { code: totpCode.value });
    if (data.success) {
      await load2FAStatus();
      showSetup.value = false;
      totpCode.value = "";
    } else {
      error.value = "Invalid code. Please try again.";
    }
  } catch (err) {
    error.value = err.response?.data?.error || "Verification failed.";
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
</style>
