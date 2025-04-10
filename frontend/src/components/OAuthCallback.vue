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
import API from "../api.js";

export default {
  name: "OAuthCallback",
  setup() {
    const router = useRouter();
    const user = ref(null);
    const defaultAvatar =
      "https://affiliate-marketing-app-api.onrender.com/api/user/profile-picture/generic_avatar.png";

    onMounted(async () => {
      try {
        // ✅ Check authentication status
        const { data } = await API.get("/auth/status");
        if (!data.isAuthenticated) throw new Error("Not authenticated");

        const { user: authUser, accessToken } = data;

        // ✅ Save access token
        sessionStorage.setItem("accessToken", accessToken);
        localStorage.setItem("accessToken", accessToken);
        API.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

        // ✅ If not 2FA verified, redirect to 2FA screen and store timestamp
        if (!authUser.twoFAVerified) {
          console.warn("🔐 2FA not verified. Redirecting to verification...");
          sessionStorage.setItem("awaiting2FA", Date.now().toString());
          return router.push("/verify-2fa");
        }

        // ✅ Load user profile if 2FA already verified
        const profile = await API.get("/user/profile");
        user.value = {
          email: profile.data.email,
          profilePicture: profile.data.profilePicture || defaultAvatar,
        };

        // ✅ Role-based redirect
        setTimeout(() => {
          if (authUser.role === "admin") router.push("/admin-dashboard");
          else if (authUser.role === "partner") router.push("/partner-dashboard");
          else router.push("/dashboard");
        }, 1000);
      } catch (err) {
        console.error("❌ OAuth flow failed:", err);
        router.push("/login");
      }
    });

    const uploadProfilePicture = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("profilePicture", file);

      try {
        const response = await API.post("/user/upload-profile-picture", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        user.value.profilePicture = response.data.profilePicture;
      } catch (error) {
        console.error("❌ Error uploading profile picture:", error);
      }
    };

    const deleteProfilePicture = async () => {
      try {
        await API.delete("/user/delete-profile-picture");
        user.value.profilePicture = defaultAvatar;
      } catch (error) {
        console.error("❌ Error deleting profile picture:", error);
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
