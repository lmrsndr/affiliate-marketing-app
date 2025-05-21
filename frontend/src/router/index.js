import { createRouter, createWebHistory } from "vue-router";
import { ref } from "vue";
import axios from "axios";
import { useTwoFAStore } from "@/stores/useTwoFAStore";

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

// ✅ Auth check from /auth/status
async function checkAuthState() {
  try {
    const response = await axiosInstance.get("/auth/status");

    if (response.data.isAuthenticated) {
      isAuthenticated.value = true;
      isAdmin.value = response.data.user.role === "admin";
      isPartner.value = response.data.user.role === "partner";

      const twoFAStore = useTwoFAStore();
      twoFAStore.setVerified(response.data.user.twoFAVerified === true);

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

    const twoFAStore = useTwoFAStore();
    twoFAStore.reset();

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

// ✅ Route Guard
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.meta.requiresAuth || to.meta.requiresAdmin || to.meta.requiresPartner;

  // ✅ Always sync 2FA cookie state
  const twoFAStore = useTwoFAStore();
  twoFAStore.syncFromCookie();

  // ✅ Allow direct access to login and callback routes
  if (to.path === "/login" || to.path === "/auth/callback") {
    return next();
  }

  // ✅ 1. Run authentication check once if needed
  if (requiresAuth && !isAuthenticated.value) {
    await checkAuthState();
  }

  // ✅ 2. If still unauthenticated, redirect to login
  if (requiresAuth && !isAuthenticated.value) {
    console.warn("🔒 Not authenticated. Redirecting to /login");
    return next("/login");
  }

  // ✅ 3. Check 2FA (skip check if already on verify-2fa)
  const needs2FA = !twoFAStore.isVerified;
  if (requiresAuth && needs2FA && to.path !== "/verify-2fa") {
    console.warn("🔐 2FA not verified. Redirecting to /verify-2fa");
    return next("/verify-2fa");
  }

  // ✅ 4. Prevent looping: if already verified, redirect away from /verify-2fa
  if (!needs2FA && to.path === "/verify-2fa") {
    console.warn("✅ 2FA complete. Redirecting to dashboard...");
    if (isAdmin.value) return next("/admin-dashboard");
    if (isPartner.value) return next("/partner-dashboard");
    return next("/dashboard");
  }

  // ✅ 5. Role-based routing
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

  const twoFAStore = useTwoFAStore();
  twoFAStore.reset();

  sessionStorage.removeItem("accessToken");
  delete axiosInstance.defaults.headers.common["Authorization"];

  axiosInstance.get("/auth/logout")
    .then(() => console.log("✅ Logged out"))
    .catch((err) => console.error("❌ Logout error:", err.response?.data || err.message));

  router.push("/login");
}

export default router;
