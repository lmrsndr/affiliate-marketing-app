import { createApp } from 'vue';
import { createPinia } from 'pinia'; // ✅ Import Pinia
import App from './App.vue';
import router from './router';
import API from './api'; // ✅ Your API instance

// Optional test request to confirm cookies and connection
API.get("/auth/status")
  .then(res => {
    console.log("🔐 Auth status response:", res.data);
  })
  .catch(err => {
    console.error("❌ Auth status error:", err.response?.data || err.message);
  });

console.log("🔗 Backend API:", import.meta.env.VITE_API_URL);

// ✅ Create and register app with Pinia and router
const app = createApp(App);

app.use(createPinia());  // ✅ Mount Pinia BEFORE using store anywhere
app.use(router);

app.mount('#app');
