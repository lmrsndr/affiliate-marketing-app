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
import { useRouter } from "vue-router";
import API, { getNextAuthStep, checkAuthStatus, setAccessToken } from "../api.js";

export default {
  name: "OAuthCallback",
  setup() {
    const router = useRouter();
    const user = ref(null);
    const defaultAvatar =
      "https://affiliate-marketing-app-api.onrender.com/api/user/profile-picture/generic_avatar.png";

    onMounted(async () => {
      try {
        // ✅ Ask server what the next step is (no client-side guessing)
        const next = await getNextAuthStep(); // { step: "login" | "verify-2fa" | "setup-2fa" | "dashboard", redirectTo? }

        if (!next || !next.step) {
          throw new Error("Invalid /auth/next response");
        }

        if (next.step === "login") {
          return router.replace({ path: "/login", query: { reason: "callback-session-missing" } });
        }
        if (next.step === "verify-2fa") {
          return router.replace("/verify-2fa");
        }
        if (next.step === "setup-2fa") {
          return router.replace("/setup-2fa");
        }

        // step === "dashboard": confirm status, then route by role
        const status = await checkAuthStatus(); // { isAuthenticated, user, accessToken? }
        if (!status?.isAuthenticated) {
          return router.replace({ path: "/login", query: { reason: "status-mismatch" } });
        }

        // If backend returned a short-lived access token, keep it in memory only
        if (status?.accessToken) setAccessToken(status.accessToken);

        // Optional: load profile to show avatar while we redirect
        try {
          const profile = await API.get("/user/profile");
          user.value = {
            email: profile.data.email,
            profilePicture: profile.data.profilePicture || defaultAvatar,
          };
        } catch (e) {
          console.warn("Profile not ready yet, continuing redirect.", e?.response?.data || e.message);
        }

        // Role-based redirect
        const role = status?.user?.role;
        setTimeout(() => {
          if (role === "admin") router.replace("/admin-dashboard");
          else if (role === "partner") router.replace("/partner-dashboard");
          else router.replace("/dashboard");
        }, 600);
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
.loading-screen {
  text-align: center;
  margin-top: 50px;
}

.profile-pic {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 50%;
  margin-bottom: 10px;
}
</style>
