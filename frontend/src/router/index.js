import { createRouter, createWebHistory } from "vue-router";
import { clearSupabaseSession, getSupabaseSession, signOutSupabase } from "@/supabaseAuth";
import { getBackendSupabaseSession } from "@/api";

import HomeView from "../views/HomeView.vue";
import AdminLogin from "../views/AdminLogin.vue";
import AuthCallback from "../views/AuthCallback.vue";
import ShoppingAdmin from "../views/ShoppingAdmin.vue";
import ProductJsonImport from "../views/ProductJsonImport.vue";

const routes = [
  { path: "/", name: "Home", component: HomeView, meta: { public: true, title: "BundleBee | Distinctive gifts from independent makers", indexable: true } },
  { path: "/login", name: "AdminLogin", component: AdminLogin, meta: { public: true, title: "BundleBee administrator sign in", indexable: false } },
  { path: "/auth/callback", name: "AuthCallback", component: AuthCallback, meta: { public: true, title: "BundleBee sign in", indexable: false } },
  { path: "/admin", name: "ShoppingAdmin", component: ShoppingAdmin, meta: { requiresAdmin: true, title: "BundleBee administration", indexable: false } },
  { path: "/admin/import-product", name: "ProductJsonImport", component: ProductJsonImport, meta: { requiresAdmin: true, title: "Import a BundleBee product", indexable: false } },

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

router.afterEach((to) => {
  document.title = String(to.meta?.title || "BundleBee");
  let robots = document.querySelector('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.setAttribute("name", "robots");
    document.head.appendChild(robots);
  }
  robots.setAttribute(
    "content",
    to.meta?.indexable === false
      ? "noindex,nofollow,noarchive"
      : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
  );
});

export async function logout() {
  await signOutSupabase().catch(() => clearSupabaseSession());
  await router.push("/");
}

export default router;
