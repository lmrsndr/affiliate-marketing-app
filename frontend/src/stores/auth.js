// stores/auth.js (Pinia) import { defineStore } from 'pinia'; import { ref } from 'vue'; import axios from 'axios'; import router from '../router';

const safeBaseURL = (import.meta.env.VITE_API_URL || '').replace(//+$/, ''); const axiosInstance = axios.create({ baseURL: safeBaseURL, withCredentials: true, });

export const useAuthStore = defineStore('auth', () => { const isAuthenticated = ref(false); const isAdmin = ref(false); const isPartner = ref(false); const is2FAVerified = ref(false); const accessToken = ref(null);

function setAccessToken(token) { accessToken.value = token; sessionStorage.setItem('accessToken', token); axiosInstance.defaults.headers.common['Authorization'] = Bearer ${token}; }

async function checkAuthState() { try { const res = await axiosInstance.get('/auth/status'); const user = res.data.user;

if (res.data.isAuthenticated) {
    isAuthenticated.value = true;
    isAdmin.value = user.role === 'admin';
    isPartner.value = user.role === 'partner';
    is2FAVerified.value = user.twoFAVerified === true;

    if (res.data.accessToken) {
      setAccessToken(res.data.accessToken);
    }

    if (user.email2FA?.verified && !user.twoFA?.enabled) {
      window.dispatchEvent(new CustomEvent('show-2fa-upgrade-prompt'));
    }
  } else {
    throw new Error('Unauthenticated');
  }
} catch (err) {
  isAuthenticated.value = false;
  isAdmin.value = false;
  isPartner.value = false;
  is2FAVerified.value = false;
  accessToken.value = null;
  sessionStorage.removeItem('accessToken');
  delete axiosInstance.defaults.headers.common['Authorization'];
}

}

async function logout() { isAuthenticated.value = false; isAdmin.value = false; isPartner.value = false; is2FAVerified.value = false; accessToken.value = null; sessionStorage.removeItem('accessToken'); delete axiosInstance.defaults.headers.common['Authorization'];

try {
  await axiosInstance.get('/auth/logout');
} catch (err) {
  console.error('Logout error:', err);
}

router.push('/login');

}

return { isAuthenticated, isAdmin, isPartner, is2FAVerified, accessToken, checkAuthState, logout, setAccessToken, axiosInstance, }; });

