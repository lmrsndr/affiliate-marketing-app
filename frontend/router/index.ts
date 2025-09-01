import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/store/user';
import { RoleLevel } from '@/store/user';

const routes: RouteRecordRaw[] = [
  // PUBLIC
  {
    path: '/',
    component: () => import('@/layouts/PublicLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { minRole: RoleLevel.general } },
      { path: 'explore', name: 'explore', component: () => import('@/views/Explore/ExploreView.vue'), meta: { minRole: RoleLevel.general } },
      { path: 'partner/:id', name: 'partner-detail', component: () => import('@/views/Explore/PartnerDetailView.vue'), meta: { minRole: RoleLevel.general } },
      { path: 'login', name: 'login', component: () => import('@/views/Auth/LoginView.vue'), meta: { minRole: RoleLevel.general, guestOnly: true } },
      { path: 'register', name: 'register', component: () => import('@/views/Auth/RegisterView.vue'), meta: { minRole: RoleLevel.general, guestOnly: true } },
    ],
  },

  // USER
  {
    path: '/app',
    component: () => import('@/layouts/DashboardLayout.vue'),
    meta: { minRole: RoleLevel.user },
    children: [
      { path: 'dashboard',    name: 'user-dashboard',   component: () => import('@/views/User/UserDashboardView.vue'), meta: { minRole: RoleLevel.user } },
      { path: 'favorites',    name: 'favorites',        component: () => import('@/views/User/FavoritesView.vue'),     meta: { minRole: RoleLevel.user } },
      { path: 'compare',      name: 'compare',          component: () => import('@/views/User/CompareView.vue'),       meta: { minRole: RoleLevel.user } },
      { path: 'reviews',      name: 'user-reviews',     component: () => import('@/views/User/ReviewsView.vue'),       meta: { minRole: RoleLevel.user } },
      { path: 'subscriptions',name: 'subscriptions',    component: () => import('@/views/User/SubscriptionsView.vue'), meta: { minRole: RoleLevel.user } },
      { path: 'savings',      name: 'savings',          component: () => import('@/views/User/SavingsView.vue'),       meta: { minRole: RoleLevel.user } },
      { path: 'challenges',   name: 'challenges',       component: () => import('@/views/User/ChallengesView.vue'),    meta: { minRole: RoleLevel.user } },
      { path: 'settings',     name: 'settings',         component: () => import('@/views/User/SettingsView.vue'),      meta: { minRole: RoleLevel.user } },
    ],
  },

  // PARTNER
  {
    path: '/partner',
    component: () => import('@/layouts/DashboardLayout.vue'),
    meta: { minRole: RoleLevel.partner },
    children: [
      { path: 'dashboard', name: 'partner-dashboard',  component: () => import('@/views/Partner/PartnerDashboardView.vue'),   meta: { minRole: RoleLevel.partner } },
      { path: 'listings',  name: 'listings',           component: () => import('@/views/Partner/ListingsView.vue'),          meta: { minRole: RoleLevel.partner } },
      { path: 'offers',    name: 'offers',             component: () => import('@/views/Partner/OffersView.vue'),            meta: { minRole: RoleLevel.partner } },
      { path: 'analytics', name: 'analytics',          component: () => import('@/views/Partner/AnalyticsView.vue'),         meta: { minRole: RoleLevel.partner } },
      { path: 'reviews',   name: 'reviews-moderation', component: () => import('@/views/Partner/ReviewsModerationView.vue'), meta: { minRole: RoleLevel.partner } },
      { path: 'conversions', name: 'conversions',      component: () => import('@/views/Partner/ConversionsView.vue'),       meta: { minRole: RoleLevel.partner } },
      { path: 'billing',   name: 'billing',            component: () => import('@/views/Partner/BillingView.vue'),           meta: { minRole: RoleLevel.partner } },
      { path: 'api',       name: 'api-access',         component: () => import('@/views/Partner/ApiAccessView.vue'),         meta: { minRole: RoleLevel.partner } },
    ],
  },

  // ADMIN + ACCOUNTING
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { minRole: RoleLevel.admin },
    children: [
      { path: 'dashboard',    name: 'admin-dashboard',     component: () => import('@/views/Admin/AdminDashboardView.vue'),       meta: { minRole: RoleLevel.admin } },
      { path: 'users',        name: 'admin-users',         component: () => import('@/views/Admin/UsersView.vue'),               meta: { minRole: RoleLevel.admin } },
      { path: 'partners',     name: 'admin-partners',      component: () => import('@/views/Admin/PartnersView.vue'),            meta: { minRole: RoleLevel.admin } },
      { path: 'moderation',   name: 'admin-moderation',    component: () => import('@/views/Admin/ContentModerationView.vue'),   meta: { minRole: RoleLevel.admin } },
      { path: 'taxonomy',     name: 'admin-taxonomy',      component: () => import('@/views/Admin/TaxonomyView.vue'),            meta: { minRole: RoleLevel.admin } },
      { path: 'reports',      name: 'admin-reports',       component: () => import('@/views/Admin/ReportsView.vue'),             meta: { minRole: RoleLevel.admin } },
      { path: 'payouts-health', name: 'admin-payouts-health', component: () => import('@/views/Admin/PayoutsHealthView.vue'),    meta: { minRole: RoleLevel.admin } },
      { path: 'flags',        name: 'admin-flags',         component: () => import('@/views/Admin/FeatureFlagsView.vue'),        meta: { minRole: RoleLevel.admin } },
      { path: 'audit',        name: 'admin-audit',         component: () => import('@/views/Admin/AuditLogsView.vue'),           meta: { minRole: RoleLevel.admin } },

      { path: 'accounting',                       name: 'acct-home',   component: () => import('@/views/Admin/Accounting/AccountingHomeView.vue'),   meta: { minRole: RoleLevel.admin } },
      { path: 'accounting/chart-of-accounts',     name: 'acct-coa',    component: () => import('@/views/Admin/Accounting/ChartOfAccountsView.vue'),  meta: { minRole: RoleLevel.admin } },
      { path: 'accounting/journal',               name: 'acct-journal',component: () => import('@/views/Admin/Accounting/JournalEntriesView.vue'),   meta: { minRole: RoleLevel.admin } },
      { path: 'accounting/invoices',              name: 'acct-invoices',component: () => import('@/views/Admin/Accounting/InvoicesView.vue'),        meta: { minRole: RoleLevel.admin } },
      { path: 'accounting/bills',                 name: 'acct-bills',  component: () => import('@/views/Admin/Accounting/BillsView.vue'),            meta: { minRole: RoleLevel.admin } },
      { path: 'accounting/receipts',              name: 'acct-receipts',component: () => import('@/views/Admin/Accounting/ReceiptsView.vue'),        meta: { minRole: RoleLevel.admin } },
      { path: 'accounting/payouts',               name: 'acct-payouts',component: () => import('@/views/Admin/Accounting/PayoutsView.vue'),          meta: { minRole: RoleLevel.admin } },
      { path: 'accounting/reconciliation',        name: 'acct-recon',  component: () => import('@/views/Admin/Accounting/ReconciliationView.vue'),   meta: { minRole: RoleLevel.admin } },
      { path: 'accounting/taxes',                 name: 'acct-taxes',  component: () => import('@/views/Admin/Accounting/TaxesView.vue'),            meta: { minRole: RoleLevel.admin } },
      { path: 'accounting/reports',               name: 'acct-reports',component: () => import('@/views/Admin/Accounting/FinancialReportsView.vue'), meta: { minRole: RoleLevel.admin } },
    ],
  },

  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to, _from, next) => {
  const store = useUserStore();
  const required = (to.meta?.minRole as number) ?? RoleLevel.general;

  if (to.meta?.guestOnly && store.isAuthenticated) {
    return next({ name: 'user-dashboard' });
  }

  if (store.roleLevel >= required) return next();

  if (!store.isAuthenticated && required > RoleLevel.general) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  return next({ name: 'home' });
});

export default router;
