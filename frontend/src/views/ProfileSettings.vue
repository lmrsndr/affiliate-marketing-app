<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { guardedGet } from "@/lib/guarded-api"; // our 401/403-safe GET

// Lazy-load tab panes
const ProfileGeneral   = () => import("@/components/ProfileGeneral.vue");
const ProfilePassword  = () => import("@/components/ProfilePassword.vue");
const Profile2FA       = () => import("@/components/Profile2FA.vue");
const ProfileSessions  = () => import("@/components/ProfileSessions.vue");
const ProfileActivity  = () => import("@/components/ProfileActivity.vue");

// Tab registry (single source of truth)
const TABS = [
  { key: "general",  label: "General",         component: ProfileGeneral },
  { key: "password", label: "Password",        component: ProfilePassword },
  { key: "2fa",      label: "Two-Factor Auth", component: Profile2FA },
  { key: "sessions", label: "Sessions",        component: ProfileSessions },
  { key: "activity", label: "Activity Log",    component: ProfileActivity },
];

const allowedKeys = new Set(TABS.map(t => t.key));
const route  = useRoute();
const router = useRouter();

function normalizeTabKey(k) {
  return allowedKeys.has(k) ? k : "general";
}

// Initial tab from ?tab=… or default
const currentTab = ref(normalizeTabKey(String(route.query.tab || "general")));

const currentTabComponent = computed(() => {
  const found = TABS.find(t => t.key === currentTab.value);
  return found ? found.component : ProfileGeneral;
});

// Keep URL in sync (replace so we don’t spam history)
watch(currentTab, (key) => {
  router.replace({ query: { ...route.query, tab: key } });
});

// Optional: respond to manual URL changes (back/forward)
watch(
  () => route.query.tab,
  (q) => { currentTab.value = normalizeTabKey(String(q || currentTab.value)); }
);

// Keyboard navigation for tabs (←/→)
function onTabsKeydown(e) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
  e.preventDefault();
  const idx = TABS.findIndex(t => t.key === currentTab.value);
  if (e.key === "ArrowLeft") {
    currentTab.value = TABS[(idx - 1 + TABS.length) % TABS.length].key;
  } else if (e.key === "ArrowRight") {
    currentTab.value = TABS[(idx + 1) % TABS.length].key;
  } else if (e.key === "Home") {
    currentTab.value = TABS[0].key;
  } else if (e.key === "End") {
    currentTab.value = TABS[TABS.length - 1].key;
  }
}

// Auth/MFA check (guarded helper will redirect if needed)
onMounted(async () => {
  try {
    await guardedGet("/auth/status");
    // if we got here, user is authenticated; guardedGet already handles MFA redirects if required
  } catch {
    // no-op; guardedGet handles redirects
  }
});
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8 profile-settings">
    <header class="mb-6 text-center">
      <h1 class="text-3xl font-bold" style="font-family: var(--bb-font-heading);">Profile Settings</h1>
      <p class="text-muted">Manage your account details, security, and activity.</p>
    </header>

    <!-- Tabs -->
    <nav
      class="tabs bb-card p-2"
      role="tablist"
      aria-label="Profile settings tabs"
      @keydown="onTabsKeydown"
    >
      <button
        v-for="tab in TABS"
        :key="tab.key"
        class="tab-btn"
        :class="{ 'is-active': currentTab === tab.key }"
        role="tab"
        :id="`tab-${tab.key}`"
        :aria-selected="currentTab === tab.key ? 'true' : 'false'"
        :tabindex="currentTab === tab.key ? 0 : -1"
        @click="currentTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- Pane -->
    <section
      class="bb-card p-4 mt-4"
      role="tabpanel"
      :aria-labelledby="`tab-${currentTab}`"
    >
      <component :is="currentTabComponent" />
    </section>
  </div>
</template>

<style scoped>
/* Layout handled by brand.css; light tab polish here */
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tab-btn {
  padding: 8px 14px;
  border: 1px solid var(--bb-border);
  background: var(--bb-surface);
  border-radius: 999px; /* pill */
  cursor: pointer;
  font-weight: 600;
}

.tab-btn.is-active {
  background: var(--bb-primary-ghost, rgba(255, 184, 0, 0.12));
  border-color: var(--bb-primary, #ffb800);
  color: var(--bb-primary-text, #1b1b1b);
}

.tab-btn:focus-visible {
  outline: 2px solid var(--bb-primary, #ffb800);
  outline-offset: 1px;
}
</style>
