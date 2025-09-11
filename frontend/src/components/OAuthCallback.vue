<template>
  <div class="loading-screen">
    <h2>Authenticating...</h2>
    <p>Please wait while we log you in.</p>

    <div class="profile-section" v-if="user">
      <img :src="user.profilePicture || defaultAvatar" alt="Profile Picture" class="profile-pic" />
      <input type="file" @change="uploadProfilePicture" accept="image/*" />
      <button @click="deleteProfilePicture">Remove Picture</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import API, { getNextAuthStep, checkAuthStatus, setAccessToken } from "../api.js";

export default {
  name: "OAuthCallback",
  setup() {
    const router = useRouter();
    const route  = useRoute();

    const user = ref(null);
    const defaultAvatar =
      "https://affiliate-marketing-app-api.onrender.com/user/profile-picture/generic_avatar.png";

    // sanitize ?redirect= (internal paths only, not auth pages)
    function sanitizeRedirect(path) {
      if (!path) return "";
      try { path = decodeURIComponent(String(path)); } catch (_) {}
      if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) return "";
      if (!path.startsWith("/")) return "";
      const blocked = ["/login", "/auth/callback", "/verify-2fa", "/setup-2fa"];
      return blocked.includes(path) ? "" : path;
    }
    const safeRedirect = sanitizeRedirect(route.query.redirect);

    onMounted(async () => {
      try {
        // 1) Ask server what the next step is (prevents loops on callback)
        const next = await getNextAuthStep(); // { step: "login"|"verify-2fa"|"setup-2fa"|"dashboard", redirectTo? }
        if (!next || !next.step) throw new Error("Invalid /auth/next response");

        if (next.step === "login") {
          return router.replace({ path: "/login", query: { reason: "callback-session-missing" } });
        }
        if (next.step === "verify-2fa") {
          return router.replace({ path: "/verify-2fa", query: { redirect: safeRedirect || undefined } });
        }
        if (next.step === "setup-2fa") {
          return router.replace({ path: "/setup-2fa", query: { redirect: safeRedirect || undefined, ...route.query } });
        }

        // 2) Server says we're good → confirm and capture short-lived token (memory only)
        const status = await checkAuthStatus(); // { isAuthenticated, user, accessToken? }
        if (!status?.isAuthenticated) {
          return router.replace({ path: "/login", query: { reason: "status-mismatch" } });
        }
        if (status?.accessToken) setAccessToken(status.accessToken);

        // 3) Optional: show profile while we redirect
        try {
          const profile = await API.get("/user/profile");
          user.value = {
            email: profile.data.email,
            profilePicture: profile.data.profilePicture || defaultAvatar,
          };
        } catch (_) {
          /* non-blocking */
        }

        // 4) Role-based fallback + safe redirect
        const role = status?.user?.role;
        const fallback =
          role === "admin"   ? "/admin-dashboard"   :
          role === "partner" ? "/partner-dashboard" : "/dashboard";

        router.replace(safeRedirect || next.redirectTo || fallback);
      } catch (err) {
        console.error("❌ OAuth callback failed:", err?.response?.data || err.message);
        router.replace({ path: "/login", query: { reason: "callback-error" } });
      }
    });

    const uploadProfilePicture = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("profilePicture", file);

      try {
        const { data } = await API.post("/user/upload-profile-picture", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (!user.value) user.value = {};
        user.value.profilePicture = data.profilePicture || defaultAvatar;
      } catch (error) {
        console.error("❌ Error uploading profile picture:", error?.response?.data || error.message);
      }
    };

    const deleteProfilePicture = async () => {
      try {
        await API.delete("/user/delete-profile-picture");
        if (!user.value) user.value = {};
        user.value.profilePicture = defaultAvatar;
      } catch (error) {
        console.error("❌ Error deleting profile picture:", error?.response?.data || error.message);
      }
    };

    return {
      user,
      defaultAvatar,
      uploadProfilePicture,
      deleteProfilePicture,
    };
  },
};
</script>

<style scoped>
.loading-screen { text-align: center; margin-top: 50px; }
.profile-pic { width: 100px; height: 100px; object-fit: cover; border-radius: 50%; margin-bottom: 10px; }
</style>
