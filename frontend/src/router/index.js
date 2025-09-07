// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { ref } from "vue";
import { useTwoFAStore } from "@/stores/useTwoFAStore";

// ✅ Central API + helpers (secure interceptors, CSRF, cookies, memory token)
import API, { getNextAuthStep, checkAuthStatus, logoutUser } from "@/api.js";

// ✅ Views
import HomeView from "../views/HomeView.vue";
import SubscriptionQuestionnaire from "../views/SubscriptionQuestionnaire.vue";
import SubscriptionResults from "../views/SubscriptionResults.vue";
import UserDashboard from "../views/UserDashboard.vue";
import AdminDashboard from "../views/AdminDashboard.vue";
import AffiliatePartners from "../views/AffiliatePartners.vue";
import AdminLogin from "../views/AdminLogin.vue";
import OAuthCallback from "../components/OAuthCallback.vue";
// NOTE: Source project imported PartnerDetails from PartnerDashboard.vue;
// keeping as-is to avoid path breakage. Update if you have a separate file.
import PartnerDetails from "../views/PartnerDashboard.vue";
import PartnerDashboard from "../views/PartnerDashboard.vue";
import AdminAccounting from "../views/AdminAccounting.vue";
import Verify2FA from "../views/Verify2FA.vue";

// ===== Reactive auth flags (UI hints; server still enforces) =====
const isAuthenticated = ref(false);
const isAdmin = ref(false);
const isPartner = ref(false);

// ===== Populate flags from /auth/status (no local/session storage writes) =====
async function populateAuthContext() {
  try {
    const data = await checkAuthStatus(); // { isAuthenticated, user?, accessToken? }
    isAuthenticated.value = !!data?.isAuthenticated;

    const role = data?.user?.role;
    isAdmin.value = role === "admin";
    isPartner.value = role === "partner";

    // Keep TwoFA store in sync (client view state only; server still enforces)
    const twoFAStore = useTwoFAStore();
    twoFAStore.setVerified(Boolean(data?.user?.twoFAVerified));

    if (data?.user?.email2FA?.verified && !data?.user?.twoFA?.enabled) {
      window.dispatchEvent(new CustomEvent("show-2fa-upgrade-prompt"));
    }
  } catch {
    isAuthenticated.value = false;
    isAdmin.value = false;
    isPartner.value = false;
    const twoFAStore = useTwoFAStore();
    twoFAStore.reset();
  }
}

// ===== Routes =====
const routes = [
  { path: "/", component: HomeView, meta: { public: true } },
  { path: "/partner/:id", component: PartnerDetails, meta: { public: true } },

  { path: "/questionnaire", component: SubscriptionQuestionnaire, meta: { requiresAuth: true } },
  { path: "/results", component: SubscriptionResults, meta: { requiresAuth: true } },
  { path: "/dashboard", component: UserDashboard, meta: { requiresAuth: true } },
  { path: "/admin-dashboard", component: AdminDashboard, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: "/partner-dashboard", component: PartnerDashboard, meta: { requiresAuth: true, requiresPartner: true } },
  { path: "/manage-affiliates", component: AffiliatePartners, meta: { requiresAuth: true } },
  { path: "/admin/accounting", component: AdminAccounting, meta: { requiresAuth: true, requiresAdmin: true } },

  { path: "/login", component: AdminLogin, meta: { public: true } },
  { path: "/auth/callback", component: OAuthCallback, meta: { public: true } },
  { path: "/verify-2fa", component: Verify2FA, meta: { public: true } },

  // If you have a separate setup screen, keep it public so auth can advance pre-login.
  { path: "/setup-2fa", name: "Setup2FA", component: () => import("../views/Auth/Verify2FA.vue"), meta: { public: true } },
];

// ===== Router instance =====
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// ===== Route Guard (server-driven; avoids loops & guesses) =====
router.beforeEach(async (to, from, next) => {
  const isPublic = to.meta.public === true;
  const requiresAuth = Boolean(to.meta.requiresAuth || to.meta.requiresAdmin || to.meta.requiresPartner);

  // Sync local 2FA view state from cookie if your store supports it
  const twoFAStore = useTwoFAStore();
  if (!twoFAStore.isVerified) {
    twoFAStore.syncFromCookie?.();
  }

  // Always allow explicit public routes (including callback & 2FA/setup)
  if (isPublic) return next();

  // Protected routes: ask the server for the next step
  if (requiresAuth) {
    try {
      const { step, redirectTo } = await getNextAuthStep(); // "login" | "verify-2fa" | "setup-2fa" | "dashboard"

      if (step === "login") {
        return next({ path: "/login", query: { redirect: to.fullPath } });
      }
      if (step === "verify-2fa" && to.path !== "/verify-2fa") {
        // ✅ preserve where the user wanted to go
        return next({ path: "/verify-2fa", query: { redirect: to.fullPath, ...to.query } });
      }
      if (step === "setup-2fa" && to.path !== "/setup-2fa") {
        // ✅ preserve intended redirect (and any oauth hints)
        return next({ path: "/setup-2fa", query: { redirect: to.fullPath, ...to.query } });
      }

      // Otherwise, authenticated: populate role flags and continue
      await populateAuthContext();

      // Role gates
      if (to.meta.requiresAdmin && !isAdmin.value) {
        return isPartner.value ? next("/partner-dashboard") : next("/dashboard");
      }
      if (to.meta.requiresPartner && !isPartner.value) {
        return isAdmin.value ? next("/admin-dashboard") : next("/dashboard");
      }

      return next(redirectTo || undefined);
    } catch {
      // On any error, fall back to login (carry intended target)
      return next({ path: "/login", query: { redirect: to.fullPath } });
    }
  }

  // Default allow
  return next();
});

// ===== Logout helper (uses central API; clears in-memory token & cookies server-side) =====
export async function logout() {
  try {
    await logoutUser();
  } catch {
    // even if backend fails, punt to login
  } finally {
    router.push("/login");
  }
}

export default router;
