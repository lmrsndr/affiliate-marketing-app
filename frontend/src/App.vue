<template>
  <div id="app">
    <header class="bb-header">
      <h1 class="bb-title">bundlebee</h1>

      <!-- Theme toggle -->
      <button class="bb-btn bb-btn--ghost bb-toggle" @click="toggleTheme" :aria-pressed="isDark.toString()">
        <span v-if="isDark">🌙 Dark</span>
        <span v-else>☀️ Light</span>
      </button>
    </header>

    <main class="bb-main">
      <router-view />
    </main>

    <!-- ✅ Email 2FA Prompt (conditionally rendered) -->
    <Email2FAVerify v-if="showEmail2FA" />

    <!-- ✅ App-Based 2FA Upgrade Prompt -->
    <Upgrade2FAPrompt />
  </div>
</template>

<script>
import { useRoute } from "vue-router";
import { computed, ref, onMounted } from "vue";
import Email2FAVerify from "@/components/Email2FAVerify.vue";
import Upgrade2FAPrompt from "@/components/Upgrade2FAPrompt.vue";

/* ✅ Brand + Theme CSS (global design tokens & overrides) */
import "@/assets/css/brand.css";
import "@/assets/css/light.css";
import "@/assets/css/dark.css";

export default {
  name: "App",
  components: {
    Email2FAVerify,
    Upgrade2FAPrompt,
  },
  setup() {
    const route = useRoute();

    /* ------- 2FA visibility (kept from your version) ------- */
    const showEmail2FA = computed(() => {
      const excludedRoutes = ["/verify-2fa", "/login", "/register"];
      const sessionFlag = sessionStorage.getItem("awaiting2FA") === "true";
      return sessionFlag && !excludedRoutes.includes(route.path);
    });

    /* ------- Theme state & helpers ------- */
    const THEME_KEY = "bbTheme"; // 'light' | 'dark'
    const isDark = ref(false);

    const applyThemeClass = (mode) => {
      const root = document.documentElement;
      root.classList.remove("theme-light", "theme-dark");
      root.classList.add(mode === "dark" ? "theme-dark" : "theme-light");
    };

    const setTheme = (mode) => {
      isDark.value = mode === "dark";
      localStorage.setItem(THEME_KEY, mode);
      applyThemeClass(mode);
    };

    const toggleTheme = () => {
      setTheme(isDark.value ? "light" : "dark");
    };

    onMounted(() => {
      // 1) Use saved preference if any
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
        return;
      }
      // 2) Else respect OS preference on first load
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    });

    return {
      showEmail2FA,
      isDark,
      toggleTheme,
      setTheme, // exported in case you want to use it elsewhere
    };
  },
};
</script>

<style>
/* ----- Layout shell uses brand tokens (no hardcoded colors) ----- */

/* App container */
#app {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
}

/* Header */
.bb-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  width: 100%;
  padding: 12px 16px;
  border-bottom: 1px solid var(--bb-border);
  background: color-mix(in srgb, var(--bb-bg) 85%, transparent);
  backdrop-filter: blur(6px);
}

/* Brand title */
.bb-title {
  margin: 0;
  font-family: var(--bb-font-heading);
  font-weight: 800;
  letter-spacing: -0.3px;
  /* Two-tone wordmark effect on text version (optional) */
  background: linear-gradient(90deg, var(--bb-primary-dark) 0 55%, var(--bb-primary-light) 55% 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-transform: lowercase;
}

/* Theme toggle button (reuses brand button tokens) */
.bb-toggle {
  font-size: 0.95rem;
  padding: .5rem .75rem;
  border: 1px solid var(--bb-border);
  border-radius: var(--bb-radius);
}

/* Main content area */
.bb-main {
  flex-grow: 1;
  width: 100%;
  max-width: 960px;
  padding: 20px;
  background: var(--bb-surface);
  box-shadow: var(--bb-shadow-sm);
  border-radius: var(--bb-radius);
  margin-top: 20px;
}

/* Body text baseline (moved to variables) */
body {
  font-family: var(--bb-font-body);
  margin: 0;
  padding: 0;
  background-color: var(--bb-bg);
  color: var(--bb-text);
  text-align: center;
}
</style>
