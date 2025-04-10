<template>
  <div class="profile-settings">
    <h1>👤 Profile Settings</h1>

    <!-- 🔖 Navigation Tabs -->
    <nav class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="{ active: currentTab === tab.key }"
        @click="currentTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- 🧩 Dynamic Component Loader -->
    <component :is="currentTabComponent" />
  </div>
</template>

<script>
import { ref, computed } from "vue";

// ⏬ Lazy-load tab components
const ProfileGeneral = () => import("../components/ProfileGeneral.vue");
const ProfilePassword = () => import("../components/ProfilePassword.vue");
const Profile2FA = () => import("../components/Profile2FA.vue");
const ProfileSessions = () => import("../components/ProfileSessions.vue");
const ProfileActivity = () => import("../components/ProfileActivity.vue");

export default {
  name: "ProfileSettings",
  setup() {
    const currentTab = ref("general");

    const tabs = [
      { key: "general", label: "General" },
      { key: "password", label: "Password" },
      { key: "2fa", label: "Two-Factor Auth" },
      { key: "sessions", label: "Sessions" },
      { key: "activity", label: "Activity Log" },
    ];

    const currentTabComponent = computed(() => {
      switch (currentTab.value) {
        case "general":
          return ProfileGeneral;
        case "password":
          return ProfilePassword;
        case "2fa":
          return Profile2FA;
        case "sessions":
          return ProfileSessions;
        case "activity":
          return ProfileActivity;
        default:
          return ProfileGeneral;
      }
    });

    return { currentTab, tabs, currentTabComponent };
  },
};
</script>

<style scoped>
.profile-settings {
  max-width: 900px;
  margin: auto;
  padding: 20px;
}

.tabs {
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 10px;
}

.tabs button {
  padding: 10px 20px;
  background-color: #eee;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  font-weight: bold;
}

.tabs button.active {
  background-color: #007bff;
  color: white;
}
</style>
