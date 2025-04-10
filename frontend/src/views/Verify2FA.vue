
<template>
  <div class="verify-2fa-container">
    <h2 class="text-xl font-bold text-center mb-4">🔐 Two-Factor Authentication Required</h2>
    <p class="text-center mb-6">
      Please check your email and enter the 6-digit code to complete login.
    </p>

    <!-- Render 2FA Modal -->
    <Email2FAVerify v-if="showModal" @verified="handleVerified" />

    <div class="text-center text-sm text-gray-500 mt-8">
      Prefer stronger protection? <router-link to="/settings/security" class="text-blue-500 underline">Set up app-based 2FA</router-link>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import API from '@/api';
import Email2FAVerify from '@/components/Email2FAVerify.vue';

const router = useRouter();
const showModal = ref(false);

onMounted(() => {
  setTimeout(() => {
    showModal.value = true;
  }, 150);
});

const handleVerified = async () => {
  try {
    const { data } = await API.get('/auth/status');
    sessionStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("accessToken", data.accessToken);
    API.defaults.headers.common["Authorization"] = `Bearer ${data.accessToken}`;

    const role = data.user.role;
    if (role === "admin") router.push("/admin-dashboard");
    else if (role === "partner") router.push("/partner-dashboard");
    else router.push("/dashboard");
  } catch (err) {
    console.error("❌ Failed to recheck 2FA status after verification:", err);
    router.push("/");
  }
};
</script>

<style scoped>
.verify-2fa-container {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}
</style>
