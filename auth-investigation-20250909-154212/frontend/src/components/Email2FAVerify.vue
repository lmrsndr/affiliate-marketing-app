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

      <label class="inline-flex items-center mt-2 mb-4 text-sm text-gray-600">
        <input type="checkbox" v-model="trustDevice" class="mr-2" />
        Don’t ask again for 30 days on this device
      </label>

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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import API from "@/api";

const emit = defineEmits(["verified"]);
const code = ref("");
const trustDevice = ref(false);
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

    const { data } = await API.post(
      "/2fa-email/verify",
      { code: code.value },
      { withCredentials: true }
    );

    // If user chose to trust the device, set the cookie
    if (trustDevice.value) {
      await API.post("/auth/trust-device", null, { withCredentials: true });
    }

    if (data.accessToken) {
      sessionStorage.setItem("accessToken", data.accessToken);
      API.defaults.headers.common["Authorization"] = `Bearer ${data.accessToken}`;
      sessionStorage.removeItem("2faCodeSent");
      emit("verified");
    } else {
      error.value = data.message || "Unexpected response.";
      attempt.value += 1;
    }
  } catch (err) {
    const msg = err.response?.data?.message;
    if (msg === "2FA code expired. Please request a new one.") {
      error.value = "⏰ Your code has expired. Please click 'Resend'.";
    } else {
      error.value = msg || "Verification failed.";
    }
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
    sessionStorage.setItem("2faCodeSent", "true");
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
  const alreadySent = sessionStorage.getItem("2faCodeSent");
  if (!alreadySent) {
    resendCode();
  }
});
</script>

<style scoped>
.email-2fa-modal {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}
.card {
  max-width: 400px;
  width: 100%;
  padding: 2rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  text-align: center;
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
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  font-weight: bold;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.btn.secondary {
  background-color: #6b7280;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.progress-bar-wrapper {
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}
.progress-bar {
  height: 100%;
  background-color: #3b82f6;
  transition: width 1s linear;
}
.error {
  color: red;
  margin-top: 0.5rem;
  font-weight: 600;
}
.attempt {
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  color: #6b7280;
}
</style>
