import { createRouter, createWebHistory } from "vue-router";
import { ref } from "vue";
import axios from "axios";

// ✅ Views
import HomeView from "../views/HomeView.vue";
import SubscriptionQuestionnaire from "../views/SubscriptionQuestionnaire.vue";
import SubscriptionResults from "../views/SubscriptionResults.vue";
import UserDashboard from "../views/UserDashboard.vue";
import AdminDashboard from "../views/AdminDashboard.vue";
import AffiliatePartners from "../views/AffiliatePartners.vue";
import AdminLogin from "../views/AdminLogin.vue";
import OAuthCallback from "../components/OAuthCallback.vue";
import PartnerDetails from "../views/PartnerDashboard.vue";
import PartnerDashboard from "../views/PartnerDashboard.vue";
import AdminAccounting from "../views/AdminAccounting.vue";
import Verify2FA from "../views/Verify2FA.vue";

// ✅ Axios setup
const safeBaseURL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const axiosInstance = axios.create({
  baseURL: safeBaseURL,
  withCredentials: true,
});

// ✅ Reactive state
const isAuthenticated = ref(false);
const isAdmin = ref(false);
const isPartner = ref(false);
const is2FAVerified = ref(false);

// ✅ Cookie utils
function getCookieValue(name) {
  const match = document.cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ✅ Auth check from /auth/status
async function checkAuthState() {
  try {
    const response = await axiosInstance.get("/auth/status");

    if (response.data.isAuthenticated) {
      isAuthenticated.value = true;
      isAdmin.value = response.data.user.role === "admin";
      isPartner.value = response.data.user.role === "partner";
      is2FAVerified.value = response.data.user.twoFAVerified === true;

      if (response.data.accessToken) {
        sessionStorage.setItem("accessToken", response.data.accessToken);
        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${response.data.accessToken}`;
      }

      console.log("✅ Authenticated:", response.data.user);

      if (response.data.user.email2FA?.verified && !response.data.user.twoFA?.enabled) {
        window.dispatchEvent(new CustomEvent("show-2fa-upgrade-prompt"));
      }
    } else {
      throw new Error("Unauthenticated");
    }
  } catch (error) {
    console.warn("⚠️ Not authenticated or session expired.");
    isAuthenticated.value = false;
    isAdmin.value = false;
    isPartner.value = false;
    is2FAVerified.value = false;
    sessionStorage.removeItem("accessToken");
    delete axiosInstance.defaults.headers.common["Authorization"];
  }
}

// ✅ Routes
const routes = [
  { path: "/", component: HomeView },
  { path: "/partner/:id", component: PartnerDetails },
  { path: "/questionnaire", component: SubscriptionQuestionnaire, meta: { requiresAuth: true } },
  { path: "/results", component: SubscriptionResults, meta: { requiresAuth: true } },
  { path: "/dashboard", component: UserDashboard, meta: { requiresAuth: true } },
  { path: "/admin-dashboard", component: AdminDashboard, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: "/partner-dashboard", component: PartnerDashboard, meta: { requiresAuth: true, requiresPartner: true } },
  { path: "/manage-affiliates", component: AffiliatePartners, meta: { requiresAuth: true } },
  { path: "/admin/accounting", component: AdminAccounting, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: "/login", component: AdminLogin },
  { path: "/auth/callback", component: OAuthCallback },
  { path: "/verify-2fa", component: Verify2FA, meta: { requiresAuth: true } },
];

// ✅ Router instance
const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.meta.requiresAuth || to.meta.requiresAdmin || to.meta.requiresPartner;

  // Sync 2FA status from cookie (in case app was reloaded)
  const trustedDevice = getCookieValue("trustedDevice");
  const twoFACookie = getCookieValue("twoFACookie");
  if (twoFACookie === "true" || trustedDevice) {
    is2FAVerified.value = true;
  }

  if (requiresAuth && !isAuthenticated.value) {
    await checkAuthState();
  }

  if (requiresAuth && !isAuthenticated.value) {
    console.warn("🔒 Not authenticated. Redirecting to /login");
    return next("/login");
  }

  const needs2FA = !is2FAVerified.value;

  if (needs2FA && to.path !== "/verify-2fa") {
    console.warn("🔐 2FA not verified. Redirecting to /verify-2fa");
    return next("/verify-2fa");
  }

  if (!needs2FA && to.path === "/verify-2fa") {
    console.warn("✅ 2FA complete. Redirecting to dashboard...");
    if (isAdmin.value) return next("/admin-dashboard");
    if (isPartner.value) return next("/partner-dashboard");
    return next("/dashboard");
  }

  if (to.meta.requiresAdmin && !isAdmin.value) {
    return isPartner.value ? next("/partner-dashboard") : next("/dashboard");
  }

  if (to.meta.requiresPartner && !isPartner.value) {
    return isAdmin.value ? next("/admin-dashboard") : next("/dashboard");
  }

  next();
});

// ✅ Logout function
export function logout() {
  isAuthenticated.value = false;
  isAdmin.value = false;
  isPartner.value = false;
  is2FAVerified.value = false;

  sessionStorage.removeItem("accessToken");
  delete axiosInstance.defaults.headers.common["Authorization"];

  axiosInstance.get("/auth/logout")
    .then(() => console.log("✅ Logged out"))
    .catch((err) => console.error("❌ Logout error:", err.response?.data || err.message));

  router.push("/login");
}

export default router;
