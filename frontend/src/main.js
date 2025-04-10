import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import API from './api'; // ✅ Updated to use the central API module

// Optional test request to confirm cookies and connection
API.get("/auth/status")
  .then(res => {
    console.log("🔐 Auth status response:", res.data);
  })
  .catch(err => {
    console.error("❌ Auth status error:", err.response?.data || err.message);
  });

console.log("🔗 Backend API:", import.meta.env.VITE_API_URL);

createApp(App).use(router).mount('#app');
