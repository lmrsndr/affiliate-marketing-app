import { createRouter, createWebHistory } from "vue-router";
import { clearSupabaseSession, getSupabaseSession, signOutSupabase } from "@/supabaseAuth";
import { getBackendSupabaseSession } from "@/api";

import HomeView from "../views/HomeView.vue";
import AdminLogin from "../views/AdminLogin.vue";
import AuthCallback from "../views/AuthCallback.vue";
import ShoppingAdmin from "../views/ShoppingAdmin.vue";

const routes = [
  { path: "/", name: "Home", component: HomeView, meta: { public: true } },
  { path: "/login", name: "AdminLogin", component: AdminLogin, meta: { public: true } },
  { path: "/auth/callback", name: "AuthCallback", component: AuthCallback, meta: { public: true } },
  { path: "/admin", name: "ShoppingAdmin", component: ShoppingAdmin, meta: { requiresAdmin: true } },

  { path: "/admin-dashboard", redirect: "/admin" },
  { path: "/admin/accounting", redirect: "/admin" },
  { path: "/manage-affiliates", redirect: "/admin" },
  { path: "/verify-2fa", redirect: "/login" },
  { path: "/setup-2fa", redirect: "/login" },
  { path: "/mfa", redirect: "/login" },
  { path: "/forgot-password", redirect: "/login" },
  { path: "/register", redirect: "/login" },
  { path: "/dashboard", redirect: "/" },
  { path: "/profile", redirect: "/" },
  { path: "/settings", redirect: "/" },
  { path: "/settings/security", redirect: "/" },
  { path: "/partner", redirect: "/" },
  { path: "/partner-dashboard", redirect: "/" },
  { path: "/partner/:id", redirect: "/" },
  { path: "/questionnaire", redirect: "/" },
  { path: "/results", redirect: "/" },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
  if (!to.meta?.requiresAdmin && to.path !== "/login") return true;

  const localSession = await getSupabaseSession().catch(() => null);
  let auth = null;

  if (localSession) {
    try {
      auth = await getBackendSupabaseSession();
    } catch {
      clearSupabaseSession();
    }
  }

  if (to.path === "/login" && auth?.isAdmin) return "/admin";
  if (to.meta?.requiresAdmin && !auth?.isAdmin) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }

  return true;
});

export async function logout() {
  await signOutSupabase().catch(() => clearSupabaseSession());
  await router.push("/");
}

export default router;
