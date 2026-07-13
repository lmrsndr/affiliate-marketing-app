<template>
  <div id="app">
    <header class="bb-header">
      <router-link to="/" class="bb-title" aria-label="BundleBee home">bundlebee</router-link>

      <nav class="bb-nav" aria-label="Main navigation">
        <router-link to="/">Shop</router-link>
        <a href="/#how-it-works">How it works</a>
        <router-link to="/admin" rel="nofollow">Admin</router-link>
      </nav>

      <div class="bb-actions">
        <button v-if="isAdmin" class="bb-btn bb-btn--ghost bb-signout" @click="signOut">Sign out</button>
        <button class="bb-btn bb-btn--ghost bb-toggle" @click="toggleTheme" :aria-pressed="isDark.toString()">
          <span v-if="isDark">☀️ Light</span>
          <span v-else>🌙 Dark</span>
        </button>
      </div>
    </header>

    <main class="bb-main">
      <router-view />
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { clearSupabaseSession, getSupabaseSession, signOutSupabase } from "@/supabaseAuth";
import { getBackendSupabaseSession } from "@/api";

import "@/css/brand.css";
import "@/css/light.css";
import "@/css/dark.css";

export default {
  name: "App",
  setup() {
    const THEME_KEY = "bbTheme";
    const isDark = ref(false);
    const isAdmin = ref(false);

    const setTheme = (mode) => {
      isDark.value = mode === "dark";
      localStorage.setItem(THEME_KEY, mode);
      document.documentElement.classList.remove("theme-light", "theme-dark");
      document.documentElement.classList.add(mode === "dark" ? "theme-dark" : "theme-light");
    };

    const toggleTheme = () => setTheme(isDark.value ? "light" : "dark");

    const signOut = async () => {
      await signOutSupabase().catch(() => clearSupabaseSession());
      isAdmin.value = false;
      window.location.assign("/");
    };

    onMounted(async () => {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
      else {
        const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
      }

      const localSession = await getSupabaseSession().catch(() => null);
      if (!localSession) return;

      try {
        const auth = await getBackendSupabaseSession();
        isAdmin.value = Boolean(auth?.isAdmin);
        if (!isAdmin.value) clearSupabaseSession();
      } catch {
        clearSupabaseSession();
        isAdmin.value = false;
      }
    });

    return { isDark, isAdmin, signOut, toggleTheme };
  },
};
</script>

<style>
*{box-sizing:border-box}
html{min-width:0;overflow-x:hidden;scroll-behavior:smooth}
body{min-width:0;margin:0;padding:0;overflow-x:hidden;background-color:var(--bb-bg);color:var(--bb-text);font-family:var(--bb-font-body);-webkit-text-size-adjust:100%}
button,input,select,textarea{font:inherit}
button,a,input,select,textarea{-webkit-tap-highlight-color:transparent}
#app{display:flex;flex-direction:column;align-items:center;min-height:100vh;min-width:0}
.bb-header{position:sticky;top:0;z-index:40;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:1rem;width:100%;padding:12px max(18px,env(safe-area-inset-right)) 12px max(18px,env(safe-area-inset-left));border-bottom:1px solid var(--bb-border);background:color-mix(in srgb,var(--bb-bg) 90%,transparent);backdrop-filter:blur(10px)}
.bb-title{margin:0;font-family:var(--bb-font-heading);font-size:1.45rem;font-weight:800;letter-spacing:-.3px;background:linear-gradient(90deg,var(--bb-primary-dark) 0 55%,var(--bb-primary-light) 55% 100%);-webkit-background-clip:text;background-clip:text;color:transparent;text-decoration:none;text-transform:lowercase;white-space:nowrap}
.bb-nav{display:flex;justify-content:center;gap:.35rem;min-width:0}
.bb-nav a{display:inline-flex;align-items:center;min-height:42px;padding:.55rem .75rem;border-radius:999px;color:var(--bb-text);font-weight:650;text-decoration:none;white-space:nowrap}
.bb-nav a:hover,.bb-nav a.router-link-active{background:color-mix(in srgb,var(--bb-primary-dark) 9%,transparent);color:var(--bb-primary-light)}
.bb-actions{display:flex;align-items:center;justify-content:flex-end;gap:.45rem}
.bb-toggle,.bb-signout{min-height:42px;padding:.5rem .75rem;border:1px solid var(--bb-border);border-radius:999px;background:var(--bb-surface);color:var(--bb-text);font-size:.9rem;white-space:nowrap;cursor:pointer}
.bb-main{flex-grow:1;width:min(1180px,calc(100% - 28px));min-width:0;margin:20px auto;padding:20px;border-radius:var(--bb-radius);background:var(--bb-surface);box-shadow:var(--bb-shadow-sm)}
@media(max-width:680px){
 .bb-header{grid-template-columns:minmax(0,1fr) auto;gap:.55rem;padding:8px max(10px,env(safe-area-inset-right)) 7px max(10px,env(safe-area-inset-left))}
 .bb-title{font-size:1.25rem}
 .bb-actions{grid-column:2;grid-row:1}.bb-toggle,.bb-signout{min-height:38px;padding:.42rem .62rem;font-size:.78rem}
 .bb-nav{grid-column:1/-1;grid-row:2;justify-content:flex-start;gap:.2rem;margin:0 -10px;padding:0 10px 2px;overflow-x:auto;overscroll-behavior-inline:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch}
 .bb-nav::-webkit-scrollbar{display:none}.bb-nav a{min-height:38px;padding:.45rem .65rem;font-size:.84rem;scroll-snap-align:start}
 .bb-main{width:100%;margin:0;padding:10px max(8px,env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));border-radius:0;box-shadow:none}
}
</style>
