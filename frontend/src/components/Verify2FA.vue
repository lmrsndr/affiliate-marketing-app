<template>
  <div v-if="showModal" class="verify-2fa-container">
    <h2 class="text-xl font-bold text-center mb-4">🔐 Two-Factor Authentication Required</h2>
    <p class="text-center mb-6">
      Please check your email and enter the 6-digit code to complete login.
    </p><Email2FAVerify @verified="handleVerified" />

<div class="text-center text-sm text-gray-500 mt-8">
  Prefer stronger protection?
  <router-link to="/settings/security" class="text-blue-500 underline">Set up app-based 2FA</router-link>
</div>

  </div>
</template><script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Email2FAVerify from '@/components/Email2FAVerify.vue';

const router = useRouter();
const auth = useAuthStore();
const showModal = ref(false);

onMounted(() => {
  const awaiting2FA = sessionStorage.getItem('awaiting2FA');
  if (awaiting2FA === 'true') {
    showModal.value = true;
  }
});

const handleVerified = async () => {
  try {
    await auth.checkAuthState();
    sessionStorage.removeItem('awaiting2FA');

    if (auth.accessToken) {
      sessionStorage.setItem('accessToken', auth.accessToken);
      localStorage.setItem('accessToken', auth.accessToken);
    }

    if (auth.isAdmin) router.push('/admin-dashboard');
    else if (auth.isPartner) router.push('/partner-dashboard');
    else router.push('/dashboard');
  } catch (err) {
    console.error('❌ Failed to recheck 2FA status after verification:', err);
    router.push('/login');
  }
};
</script>
