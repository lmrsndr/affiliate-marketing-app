import { createRouter, createWebHistory } from "vue-router";
import { ref } from "vue";
import API from "@/api";
import { useTwoFAStore } from "@/stores/useTwoFAStore";

import HomeView from "../views/HomeView.vue";
import AdminLogin from "../views/AdminLogin.vue";
import OAuthCallback from "../components/OAuthCallback.vue";
import Verify2FA from "../views/Verify2FA.vue";
import ShoppingAdmin from "../views/ShoppingAdmin.vue";

const isAuthenticated = ref(false);
const isAdmin = ref(false);
const mfaVerified = ref(false);

async function checkAuthState() {
  try {
    const { data } = await API.get("/auth/status");
    const authed = !!data?.user;
    const mfaOk = !!data?.mfaVerified;

    isAuthenticated.value = authed;
    isAdmin.value = authed && data.user.role === "admin";
    mfaVerified.value = mfaOk;
    useTwoFAStore().setVerified(mfaOk);

    return { authed, mfaOk, user: data.user };
  } catch {
    isAuthenticated.value = false;
    isAdmin.value = false;
    mfaVerified.value = false;
    useTwoFAStore().reset();
    return { authed: false, mfaOk: false, user: null };
  }
}

const routes = [
  { path: "/", name: "Home", component: HomeView, meta: { public: true } },
  { path: "/login", name: "AdminLogin", component: AdminLogin, meta: { public: true } },
  { path: "/auth/callback", name: "OAuthCallback", component: OAuthCallback, meta: { public: true } },
  { path: "/setup-2fa", name: "Setup2FA", component: () => import("../views/Auth/Verify2FA.vue"), meta: { public: true } },
  { path: "/verify-2fa", name: "Verify2FA", component: Verify2FA, meta: { requiresAuth: true } },
  { path: "/admin", name: "ShoppingAdmin", component: ShoppingAdmin, meta: { requiresAuth: true, requiresAdmin: true } },

  // Legacy links remain valid but are intentionally hidden from the current product.
  { path: "/admin-dashboard", redirect: "/admin" },
  { path: "/admin/accounting", redirect: "/admin" },
  { path: "/manage-affiliates", redirect: "/admin" },
  { path: "/dashboard", redirect: "/" },
  { path: "/profile", redirect: "/" },
  { path: "/settings", redirect: "/" },
  { path: "/settings/security", redirect: "/" },
  { path: "/partner", redirect: "/" },
  { path: "/partner-dashboard", redirect: "/" },
  { path: "/partner/:id", redirect: "/" },
  { path: "/questionnaire", redirect: "/" },
  { path: "/results", redirect: "/" },
  { path: "/register", redirect: "/login" },
  { path: "/forgot-password", name: "ForgotPassword", component: () => import("@/views/ForgotPassword.vue"), meta: { public: true } },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
  const requiresAuth = !!(to.meta?.requiresAuth || to.meta?.requiresAdmin);

  if (requiresAuth || to.path === "/login") {
    await checkAuthState();
  }

  if (to.path === "/login" && isAuthenticated.value) {
    return isAdmin.value ? "/admin" : "/";
  }

  if (requiresAuth && !isAuthenticated.value) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }

  if (requiresAuth && !mfaVerified.value && to.path !== "/verify-2fa") {
    return { path: "/verify-2fa", query: { redirect: to.fullPath } };
  }

  if (to.path === "/verify-2fa" && mfaVerified.value) {
    return isAdmin.value ? "/admin" : "/";
  }

  if (to.meta?.requiresAdmin && !isAdmin.value) {
    return "/";
  }

  return true;
});

export function logout() {
  isAuthenticated.value = false;
  isAdmin.value = false;
  mfaVerified.value = false;
  useTwoFAStore().reset();

  API.get("/auth/logout")
    .catch((err) => console.error("Logout error:", err?.response?.data || err?.message))
    .finally(() => router.push("/"));
}

export default router;
