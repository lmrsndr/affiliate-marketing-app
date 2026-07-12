<template>
  <div class="loading-screen">
    <h2>Signing you in…</h2>
    <p>Please wait while BundleBee confirms your administrator session.</p>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { checkAuthStatus, getNextAuthStep, setAccessToken } from "../api.js";

const router = useRouter();
const route = useRoute();

function safeInternalRedirect(value) {
  if (!value) return "";
  let path = String(value);
  try {
    path = decodeURIComponent(path);
  } catch {
    return "";
  }

  if (!path.startsWith("/") || path.startsWith("//")) return "";
  if (["/login", "/auth/callback", "/verify-2fa", "/setup-2fa"].includes(path)) return "";
  return path;
}

onMounted(async () => {
  const requestedRedirect = safeInternalRedirect(route.query.redirect);

  try {
    const next = await getNextAuthStep();
    if (next.step === "login") {
      return router.replace({ path: "/login", query: { reason: "callback-session-missing" } });
    }
    if (next.step === "verify-2fa") {
      return router.replace({ path: "/verify-2fa", query: { redirect: requestedRedirect || "/admin" } });
    }

    const status = await checkAuthStatus();
    if (!status?.user || !status?.mfaVerified) {
      return router.replace({ path: "/login", query: { reason: "status-mismatch" } });
    }
    if (status.accessToken) setAccessToken(status.accessToken);

    const destination = status.user.role === "admin" ? requestedRedirect || "/admin" : "/";
    return router.replace(destination);
  } catch (error) {
    console.error("OAuth callback failed:", error?.response?.data || error?.message);
    return router.replace({ path: "/login", query: { reason: "callback-error" } });
  }
});
</script>

<style scoped>
.loading-screen {
  margin: 4rem auto;
  max-width: 32rem;
  text-align: center;
}
</style>
