import { createRouter, createWebHistory } from "vue-router";
import { clearSupabaseSession, getSupabaseSession, signOutSupabase } from "@/supabaseAuth";
import { getBackendSupabaseSession } from "@/api";

import HomeView from "../views/HomeView.vue";
import AdminLogin from "../views/AdminLogin.vue";
import Verify2FA from "../views/Verify2FA.vue";
import ShoppingAdmin from "../views/ShoppingAdmin.vue";

const routes = [
  { path: "/", name: "Home", component: HomeView, meta: { public: true } },
  { path: "/login", name: "AdminLogin", component: AdminLogin, meta: { public: true } },
  { path: "/mfa", name: "SupabaseMfa", component: Verify2FA, meta: { requiresAuth: true } },
  { path: "/admin", name: "ShoppingAdmin", component: ShoppingAdmin, meta: { requiresAuth: true, requiresAdmin: true, requiresAal2: true } },

  // Compatibility redirects while bookmarks and old authentication links expire.
  { path: "/verify-2fa", redirect: (to) => ({ path: "/mfa", query: to.query }) },
  { path: "/setup-2fa", redirect: (to) => ({ path: "/mfa", query: to.query }) },
  { path: "/auth/callback", redirect: "/login" },
  { path: "/admin-dashboard", redirect: "/admin" },
  { path: "/admin/accounting", redirect: "/admin" },
  { path: "/manage-affiliates", redirect: "/admin" },
  { path: "/dashboard", redirect: "/" },
  { path: "/profile", redirect: "/" },
  { path: "/settings", redirect: "/" },
  { path: "/settings/security", redirect: "/mfa" },
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

function safeRedirect(path) {
  const value = String(path || "");
  return value.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

router.beforeEach(async (to) => {
  const localSession = await getSupabaseSession().catch(() => null);
  let auth = null;

  if (localSession) {
    try {
      auth = await getBackendSupabaseSession();
    } catch {
      clearSupabaseSession();
      auth = null;
    }
  }

  if (to.path === "/login" && auth?.isAdmin) {
    return auth.aal === "aal2"
      ? safeRedirect(to.query.redirect)
      : { path: "/mfa", query: { redirect: safeRedirect(to.query.redirect) } };
  }

  if (to.meta?.requiresAuth && !auth) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }

  if (to.meta?.requiresAdmin && !auth?.isAdmin) {
    return "/";
  }

  if (to.meta?.requiresAal2 && auth?.aal !== "aal2") {
    return { path: "/mfa", query: { redirect: to.fullPath } };
  }

  if (to.path === "/mfa" && auth?.aal === "aal2") {
    return safeRedirect(to.query.redirect);
  }

  return true;
});

export async function logout() {
  await signOutSupabase().catch(() => clearSupabaseSession());
  await router.push("/");
}

export default router;
