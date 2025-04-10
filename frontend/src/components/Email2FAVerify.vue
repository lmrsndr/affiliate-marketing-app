
<template>
  <div class="email-2fa-modal">
    <div class="card">
      <h2 class="text-xl font-semibold text-center mb-2">🔐 Enter 2FA Code</h2>
      <p class="text-sm text-center text-gray-600 mb-4">
        We've emailed you a 6-digit verification code.
      </p>
      <input
        v-model="code"
        type="text"
        maxlength="6"
        placeholder="Enter 6-digit code"
        class="input"
        :disabled="loading"
        @keyup.enter="verifyCode"
      />
      <div v-if="error" class="error">{{ error }}</div>
      <div class="attempt">Attempt {{ attempt }} of 5</div>
      <div class="progress-bar-wrapper" v-if="cooldown > 0">
        <div class="progress-bar" :style="{ width: cooldownPercent + '%' }"></div>
      </div>
      <div class="button-group">
        <button class="btn" @click="verifyCode" :disabled="loading || !code">
          ✅ Verify
        </button>
        <button class="btn secondary" @click="resendCode" :disabled="cooldown > 0 || loading">
          🔁 Resend <span v-if="cooldown > 0">({{ cooldown }}s)</span>
        </button>
      </div>
      <p class="text-xs text-center mt-4 text-gray-500">
        Want stronger protection? Set up
        <router-link to="/settings/security" class="text-blue-500 underline">app-based 2FA</router-link>.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import API from "@/api";

const emit = defineEmits(["verified"]);
const code = ref("");
const error = ref(null);
const loading = ref(false);
const cooldown = ref(0);
const attempt = ref(1);
let interval = null;

const cooldownPercent = computed(() => Math.max(0, (cooldown.value / 60) * 100));

const refreshToken = async () => {
  try {
    await API.get("/auth/refresh", { withCredentials: true });
  } catch (err) {
    console.error("❌ Token refresh failed:", err);
  }
};

const verifyCode = async () => {
  if (!code.value || code.value.length !== 6) {
    error.value = "Please enter a 6-digit code.";
    return;
  }
  error.value = null;
  loading.value = true;

  try {
    await refreshToken();
    const { data } = await API.post("/2fa-email/verify", { code: code.value });

    if (data.message === "2FA verified") {
      emit("verified");
    } else if (data.message === "2FA code sent") {
      error.value = "🔁 Your code expired. A new one was sent.";
      code.value = "";
      attempt.value += 1;
      startCooldown();
    } else {
      error.value = data.message || "Unexpected response.";
      attempt.value += 1;
    }
  } catch (err) {
    error.value = err.response?.data?.message || "Verification failed.";
    attempt.value += 1;
  } finally {
    loading.value = false;
  }
};

const resendCode = async () => {
  error.value = null;
  loading.value = true;
  code.value = "";

  try {
    await refreshToken();
    await API.post("/2fa-email/resend", {}, { withCredentials: true });
    cooldown.value = 60;
    startCooldown();
  } catch (err) {
    error.value = err.response?.data?.message || "Failed to resend code";
  } finally {
    loading.value = false;
  }
};

const startCooldown = () => {
  clearInterval(interval);
  interval = setInterval(() => {
    cooldown.value--;
    if (cooldown.value <= 0) clearInterval(interval);
  }, 1000);
};

onMounted(() => {
  resendCode();
});
</script>
