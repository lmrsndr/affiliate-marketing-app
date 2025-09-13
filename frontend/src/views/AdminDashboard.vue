<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { guardedGet } from "@/lib/guarded-api"; // routes to 2FA on server reasons
import API from "@/api"; // still useful if you need later calls

// Child views
import AdminAnalytics    from "./AdminAnalytics.vue";
import AdminAffiliates   from "./AdminAffiliates.vue";
import AdminUsers        from "./AdminUsers.vue";
import AdminPermissions  from "./AdminPermissions.vue";
import AdminAccounting   from "./AdminAccounting.vue";

// ───────────────────────────────────────────────────────────────
// State
// ───────────────────────────────────────────────────────────────
const router = useRouter();
const loadingAuth = ref(true);
const isAdmin = ref(false);
const selectedView = ref(localStorage.getItem("adminView") || "analytics");

// ───────────────────────────────────────────────────────────────
// Auth/role guard (cookie-based; no alerts)
// ───────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const status = await guardedGet("/auth/status"); // { ok, user, mfaVerified }
    const authed = !!status?.user;
    const mfaOK  = !!status?.mfaVerified;

    if (!authed) {
      router.replace("/login?reason=auth");
      return;
    }
    if (!mfaOK) {
      // guarded-api would handle 403->/verify-2fa, but /auth/status is 200; route here
      router.replace("/verify-2fa");
      return;
    }

    isAdmin.value = (status.user?.role === "admin");
    if (!isAdmin.value) {
      router.replace("/dashboard"); // safe landing for non-admins
      return;
    }
  } catch (e) {
    // If status fails (network, cookies, etc.), go to login
    console.error("Auth status check failed:", e?.response?.data || e);
    router.replace("/login?reason=auth");
    return;
  } finally {
    loadingAuth.value = false;
  }
});

// ───────────────────────────────────────────────────────────────
// Tabs
// ───────────────────────────────────────────────────────────────
const tabs = computed(() => {
  const base = [
    { name: "analytics",   label: "Analytics" },
    { name: "affiliates",  label: "Affiliates" },
    { name: "users",       label: "Users" },
    { name: "permissions", label: "Permissions" },
  ];
  // Show Accounting for admins only (extra safety even though page is admin-only)
  if (isAdmin.value) base.push({ name: "accounting", label: "Accounting" });
  return base;
});

const selectedComponent = computed(() => {
  switch (selectedView.value) {
    case "analytics":   return AdminAnalytics;
    case "affiliates":  return AdminAffiliates;
    case "users":       return AdminUsers;
    case "permissions": return AdminPermissions;
    case "accounting":  return AdminAccounting;
    default:            return AdminAnalytics;
  }
});

function changeView(view) {
  selectedView.value = view;
  localStorage.setItem("adminView", view);
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8 admin-dashboard">
    <header class="mb-6">
      <h1 class="text-3xl font-bold" style="font-family: var(--bb-font-heading);">
        Admin Dashboard
      </h1>
      <p class="text-muted mt-1">Manage analytics, partners, users, permissions, and more.</p>
    </header>

    <!-- Loading / denied states -->
    <div v-if="loadingAuth" class="bb-card p-4 mb-6" aria-busy="true">
      Checking your access…
    </div>
    <div v-else-if="!isAdmin" class="bb-card p-4 mb-6">
      <div class="text-red-600 font-semibold">Access denied</div>
      <div class="text-muted mt-1">Admins only.</div>
    </div>

    <!-- Main content -->
    <div v-else>
      <!-- Tabs -->
      <nav class="bb-card p-2 mb-6 flex flex-wrap gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          class="bb-btn"
          :class="selectedView === tab.name ? 'bb-btn--primary' : 'bb-btn--ghost'"
          @click="changeView(tab.name)"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- Dynamic view -->
      <section class="bb-card p-4">
        <component :is="selectedComponent" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard { /* container tweaks only; visuals come from brand.css */ }
</style>
