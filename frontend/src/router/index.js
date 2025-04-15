// router/index.js (updated with Pinia auth store) import { createRouter, createWebHistory } from "vue-router"; import { useAuthStore } from "@/stores/auth"; import { createPinia } from "pinia"; import { createApp } from "vue";

// ✅ Views import HomeView from "../views/HomeView.vue"; import SubscriptionQuestionnaire from "../views/SubscriptionQuestionnaire.vue"; import SubscriptionResults from "../views/SubscriptionResults.vue"; import UserDashboard from "../views/UserDashboard.vue"; import AdminDashboard from "../views/AdminDashboard.vue"; import AffiliatePartners from "../views/AffiliatePartners.vue"; import AdminLogin from "../views/AdminLogin.vue"; import OAuthCallback from "../components/OAuthCallback.vue"; import PartnerDetails from "../views/PartnerDashboard.vue"; import PartnerDashboard from "../views/PartnerDashboard.vue"; import AdminAccounting from "../views/AdminAccounting.vue"; import Verify2FA from "../views/Verify2FA.vue";

// ✅ Routes const routes = [ { path: "/", component: HomeView, meta: { requiresAuth: false } }, { path: "/partner/:id", component: PartnerDetails, meta: { requiresAuth: false } }, { path: "/questionnaire", component: SubscriptionQuestionnaire, meta: { requiresAuth: true } }, { path: "/results", component: SubscriptionResults, meta: { requiresAuth: true } }, { path: "/dashboard", component: UserDashboard, meta: { requiresAuth: true } }, { path: "/admin-dashboard", component: AdminDashboard, meta: { requiresAuth: true, requiresAdmin: true } }, { path: "/partner-dashboard", component: PartnerDashboard, meta: { requiresAuth: true, requiresPartner: true } }, { path: "/manage-affiliates", component: AffiliatePartners, meta: { requiresAuth: true } }, { path: "/admin/accounting", component: AdminAccounting, meta: { requiresAuth: true, requiresAdmin: true } }, { path: "/login", component: AdminLogin, meta: { requiresAuth: false } }, { path: "/auth/callback", component: OAuthCallback, meta: { requiresAuth: false } }, { path: "/verify-2fa", component: Verify2FA, meta: { requiresAuth: true } }, ];

// ✅ Router instance const router = createRouter({ history: createWebHistory(), routes, });

// ✅ Route Guard using Pinia auth store router.beforeEach(async (to, from, next) => { const auth = useAuthStore(); const requiresAuth = to.meta.requiresAuth || to.meta.requiresAdmin || to.meta.requiresPartner; const isTrusted = document.cookie.includes("trustedDevice=");

if (requiresAuth && !auth.isAuthenticated) { await auth.checkAuthState(); }

if (requiresAuth && !auth.isAuthenticated) { console.warn("🔒 Not authenticated. Redirecting to /login"); return next("/login"); }

if (requiresAuth && !auth.is2FAVerified && !isTrusted && to.path !== "/verify-2fa") { console.warn("🔐 2FA not verified. Redirecting to /verify-2fa"); return next("/verify-2fa"); }

if (to.meta.requiresAdmin && !auth.isAdmin) { console.warn("🔒 Admin only. Redirecting to /dashboard"); return next("/dashboard"); }

if (to.meta.requiresPartner && !auth.isPartner) { console.warn("🔒 Partner only. Redirecting to /dashboard"); return next("/dashboard"); }

next(); // ✅ Allow route });

// ✅ Logout wrapper (for use in components) export function logout() { const auth = useAuthStore(); auth.logout(); }

export default router;

