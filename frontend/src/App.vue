<template>
  <div id="app">
    <header class="bb-header">
      <router-link to="/" class="bb-title" aria-label="BundleBee home">bundlebee</router-link>

      <nav class="bb-nav" aria-label="Main navigation">
        <router-link to="/">Shop</router-link>
        <a href="/#how-it-works">How it works</a>
        <router-link to="/admin">Admin</router-link>
      </nav>

      <div class="bb-actions">
        <button v-if="isSignedIn" class="bb-btn bb-btn--ghost bb-signout" @click="signOut">Sign out</button>
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
import { getSupabaseSession, signOutSupabase } from "@/supabaseAuth";

import "@/css/brand.css";
import "@/css/light.css";
import "@/css/dark.css";

export default {
  name: "App",
  setup() {
    const THEME_KEY = "bbTheme";
    const isDark = ref(false);
    const isSignedIn = ref(false);

    const setTheme = (mode) => {
      isDark.value = mode === "dark";
      localStorage.setItem(THEME_KEY, mode);
      document.documentElement.classList.remove("theme-light", "theme-dark");
      document.documentElement.classList.add(mode === "dark" ? "theme-dark" : "theme-light");
    };

    const toggleTheme = () => setTheme(isDark.value ? "light" : "dark");

    const signOut = async () => {
      await signOutSupabase().catch(() => undefined);
      isSignedIn.value = false;
      window.location.assign("/");
    };

    onMounted(async () => {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
      else {
        const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
      }

      isSignedIn.value = Boolean(await getSupabaseSession().catch(() => null));
    });

    return { isDark, isSignedIn, signOut, toggleTheme };
  },
};
</script>

<style>
#app { display:flex; flex-direction:column; align-items:center; min-height:100vh; }
.bb-header { position:sticky; top:0; z-index:40; display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:1rem; width:100%; box-sizing:border-box; padding:12px 18px; border-bottom:1px solid var(--bb-border); background:color-mix(in srgb, var(--bb-bg) 88%, transparent); backdrop-filter:blur(8px); }
.bb-title { margin:0; font-family:var(--bb-font-heading); font-size:1.45rem; font-weight:800; letter-spacing:-.3px; background:linear-gradient(90deg,var(--bb-primary-dark) 0 55%,var(--bb-primary-light) 55% 100%); -webkit-background-clip:text; background-clip:text; color:transparent; text-decoration:none; text-transform:lowercase; }
.bb-nav { display:flex; justify-content:center; gap:1rem; }
.bb-nav a { color:var(--bb-text); text-decoration:none; font-weight:650; }
.bb-nav a:hover,.bb-nav a.router-link-active { color:var(--bb-primary-light); }
.bb-actions{display:flex;align-items:center;gap:.5rem}.bb-toggle,.bb-signout { font-size:.9rem; padding:.5rem .75rem; border:1px solid var(--bb-border); border-radius:var(--bb-radius); }
.bb-main { flex-grow:1; width:min(1180px,calc(100% - 28px)); box-sizing:border-box; padding:20px; background:var(--bb-surface); box-shadow:var(--bb-shadow-sm); border-radius:var(--bb-radius); margin:20px auto; }
body { font-family:var(--bb-font-body); margin:0; padding:0; background-color:var(--bb-bg); color:var(--bb-text); }
@media(max-width:680px){ .bb-header{grid-template-columns:1fr auto}.bb-nav{grid-column:1/-1;grid-row:2;justify-content:flex-start;overflow-x:auto}.bb-actions{grid-column:2;grid-row:1}.bb-main{width:min(100% - 16px,1180px);padding:12px;margin:10px auto} }
</style>
