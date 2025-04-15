<template>
  <div class="loading-screen">
    <h2>Authenticating...</h2>
    <p>Please wait while we log you in.</p><div class="profile-section" v-if="user">
  <img :src="user.profilePicture || defaultAvatar" alt="Profile Picture" class="profile-pic" />
  <input type="file" @change="uploadProfilePicture" accept="image/*" />
  <button @click="deleteProfilePicture">Remove Picture</button>
</div>

  </div>
</template><script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

const user = ref(null);
const defaultAvatar =
  'https://affiliate-marketing-app-api.onrender.com/api/user/profile-picture/generic_avatar.png';

onMounted(async () => {
  try {
    await auth.checkAuthState();

    if (!auth.isAuthenticated) throw new Error('Not authenticated');

    if (!auth.is2FAVerified) {
      console.warn('🔐 2FA not verified. Redirecting to verification...');
      sessionStorage.setItem('awaiting2FA', Date.now().toString());
      return router.push('/verify-2fa');
    }

    const res = await auth.axiosInstance.get('/user/profile');
    user.value = {
      email: res.data.email,
      profilePicture: res.data.profilePicture || defaultAvatar,
    };

    setTimeout(() => {
      if (auth.isAdmin) router.push('/admin-dashboard');
      else if (auth.isPartner) router.push('/partner-dashboard');
      else router.push('/dashboard');
    }, 1000);
  } catch (err) {
    console.error('❌ OAuth flow failed:', err);
    router.push('/login');
  }
});

const uploadProfilePicture = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('profilePicture', file);

  try {
    const response = await auth.axiosInstance.post('/user/upload-profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    user.value.profilePicture = response.data.profilePicture;
  } catch (error) {
    console.error('❌ Error uploading profile picture:', error);
  }
};

const deleteProfilePicture = async () => {
  try {
    await auth.axiosInstance.delete('/user/delete-profile-picture');
    user.value.profilePicture = defaultAvatar;
  } catch (error) {
    console.error('❌ Error deleting profile picture:', error);
  }
};
</script><style scoped>
.loading-screen {
  text-align: center;
  margin-top: 50px;
}

.profile-pic {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 50%;
  margin-bottom: 10px;
}
</style>
