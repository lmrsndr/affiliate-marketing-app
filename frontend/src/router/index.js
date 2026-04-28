// frontend/src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { ref } from "vue";
import API from "@/api"; // uses baseURL ending with /api + withCredentials: true
import { useTwoFAStore } from "@/stores/useTwoFAStore";

// Views
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
import ProfileSettings from "../views/ProfileSettings.vue";

// ───────────────────────────────────────────────────────────────
// Reactive auth state (derived from /auth/status)
// ───────────────────────────────────────────────────────────────
const isAuthenticated = ref(false);
const isAdmin = ref(false);
const isPartner = ref(false);
const mfaVerified = ref(false);

// Ask server for truth; update refs + store; return snapshot
async function checkAuthState() {
  try {
    const { data } = await API.get("/auth/status"); // { ok, user, mfaVerified }
    const authed = !!data?.user;
    const mfaOk = !!data?.mfaVerified;

    isAuthenticated.value = authed;
    isAdmin.value = authed && data.user.role === "admin";
    isPartner.value = authed && data.user.role === "partner";
    mfaVerified.value = mfaOk;

    const twoFA = useTwoFAStore();
    twoFA.setVerified(mfaOk);

    // Optional: show upgrade suggestion (your prior behavior)
    if (authed && data.user?.email2FA?.verified && !data.user?.twoFA?.enabled) {
      window.dispatchEvent(new CustomEvent("show-2fa-upgrade-prompt"));
    }

    return { authed, mfaOk, user: data.user };
  } catch {
    // Treat as logged out on any error
    isAuthenticated.value = false;
    isAdmin.value = false;
    isPartner.value = false;
    mfaVerified.value = false;
    useTwoFAStore().reset();
    return { authed: false, mfaOk: false, user: null };
  }
}

// ───────────────────────────────────────────────────────────────
// Routes
// ───────────────────────────────────────────────────────────────
const routes = [
  { path: "/forgot-password", name: "ForgotPassword", component: () => import("@/views/ForgotPassword.vue") },
  { path: "/register",        name: "RegisterUser",   component: () => import("@/views/RegisterUser.vue") },
  { path: "/debug-auth",      name: "DebugAuth",      component: () => import("@/views/DebugAuthStatus.vue") },
  { path: "/setup-2fa",       name: "Setup2FA",       component: () => import("../views/Auth/Verify2FA.vue"), meta: { public: true } },

  { path: "/",                component: HomeView },
  { path: "/admin",           redirect: "/admin-dashboard" },
  { path: "/partner",         redirect: "/partner-dashboard" },
  { path: "/partner/:id",     component: PartnerDetails },

  { path: "/questionnaire",   component: SubscriptionQuestionnaire, meta: { requiresAuth: true } },
  { path: "/results",         component: SubscriptionResults,       meta: { requiresAuth: true } },

  { path: "/dashboard",       component: UserDashboard,   meta: { requiresAuth: true } },
  { path: "/profile",         name: "ProfileSettings", component: ProfileSettings, meta: { requiresAuth: true } },
  { path: "/settings",        redirect: "/profile" },
  { path: "/settings/security", redirect: { path: "/profile", query: { tab: "2fa" } } },
  { path: "/admin-dashboard", component: AdminDashboard,  meta: { requiresAuth: true, requiresAdmin: true } },
  { path: "/partner-dashboard", component: PartnerDashboard, meta: { requiresAuth: true, requiresPartner: true } },

  { path: "/manage-affiliates", component: AffiliatePartners, meta: { requiresAuth: true } },
  { path: "/admin/accounting",  component: AdminAccounting,  meta: { requiresAuth: true, requiresAdmin: true } },

  { path: "/login",          component: AdminLogin,   meta: { public: true } },
  { path: "/auth/callback",  component: OAuthCallback, meta: { public: true } },

  { path: "/verify-2fa",     component: Verify2FA,    meta: { requiresAuth: true } },
];

// Router
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// ───────────────────────────────────────────────────────────────
// Global guard — server is the source of truth
// ───────────────────────────────────────────────────────────────
router.beforeEach(async (to, from, next) => {
  const isPublic = !!to.meta?.public;
  const requiresAuth = !!(to.meta?.requiresAuth || to.meta?.requiresAdmin || to.meta?.requiresPartner);

  // Always refresh auth state when navigating to a protected route
  if (requiresAuth || to.path === "/login") {
    await checkAuthState();
  }

  // If already logged in, don't show /login again
  if (to.path === "/login" && isAuthenticated.value) {
    if (isAdmin.value)   return next("/admin-dashboard");
    if (isPartner.value) return next("/partner-dashboard");
    return next("/dashboard");
  }

  // Not authenticated → protect private routes
  if (requiresAuth && !isAuthenticated.value) {
    return next("/login");
  }

  // 2FA gate for private routes
  const needsMfa = !mfaVerified.value;
  if (requiresAuth && needsMfa && to.path !== "/verify-2fa") {
    return next("/verify-2fa");
  }
  if (!needsMfa && to.path === "/verify-2fa") {
    if (isAdmin.value)   return next("/admin-dashboard");
    if (isPartner.value) return next("/partner-dashboard");
    return next("/dashboard");
  }

  // Role gates
  if (to.meta?.requiresAdmin && !isAdmin.value) {
    return isPartner.value ? next("/partner-dashboard") : next("/dashboard");
  }
  if (to.meta?.requiresPartner && !isPartner.value) {
    return isAdmin.value ? next("/admin-dashboard") : next("/dashboard");
  }

  return next();
});

// ───────────────────────────────────────────────────────────────
// Logout helper
// ───────────────────────────────────────────────────────────────
export function logout() {
  isAuthenticated.value = false;
  isAdmin.value = false;
  isPartner.value = false;
  mfaVerified.value = false;

  const twoFA = useTwoFAStore();
  twoFA.reset();

  // Server uses GET /auth/logout in your backend; keep that.
  API.get("/auth/logout")
    .then(() => console.log("✅ Logged out"))
    .catch((err) => console.error("❌ Logout error:", err?.response?.data || err?.message));

  router.push("/login");
}

export default router;
