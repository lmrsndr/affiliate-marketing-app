<template>
  <div class="admin-dashboard">
    <h1>Admin Dashboard</h1>

    <!-- ✅ Navigation -->
    <nav>
      <button 
        v-for="tab in tabs" 
        :key="tab.name" 
        :class="{ active: selectedView === tab.name }"
        @click="changeView(tab.name)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- ✅ Dynamic View Loader -->
    <component :is="selectedComponent" />
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import AdminAnalytics from "./AdminAnalytics.vue";
import AdminAffiliates from "./AdminAffiliates.vue";
import AdminUsers from "./AdminUsers.vue";
import AdminPermissions from "./AdminPermissions.vue";
import AdminAccounting from "./AdminAccounting.vue"; // ✅ NEW
import API from "../api.js";

export default {
  name: "AdminDashboard",
  components: {
    AdminAnalytics,
    AdminAffiliates,
    AdminUsers,
    AdminPermissions,
    AdminAccounting, // ✅ REGISTERED
  },
  setup() {
    const router = useRouter();
    const selectedView = ref(localStorage.getItem("adminView") || "analytics");
    const isAdmin = ref(false); // ✅ ADMIN ROLE CHECK

    // ✅ Secure Authentication Check
    onMounted(async () => {
      try {
        const status = await API.get("/auth/status");
        if (!status.data.isAuthenticated) {
          alert("❌ Unauthorized! Redirecting to login.");
          router.push("/login");
          return;
        }

        const profile = await API.get("/auth/me");
        isAdmin.value = profile.data.role === "admin";

        if (!isAdmin.value) {
          alert("⚠️ Access Denied: You must be an admin.");
          router.push("/");
        }

        if (!profile.data.profilePicture) {
          profile.data.profilePicture = "/generic_avatar.png";
        }
      } catch (error) {
        console.error("❌ Authentication check failed:", error);
        router.push("/login");
      }
    });

    // ✅ Tab Navigation List (conditionally include Accounting)
    const tabs = computed(() => {
      const baseTabs = [
        { name: "analytics", label: "Analytics" },
        { name: "affiliates", label: "Affiliates" },
        { name: "users", label: "Users" },
        { name: "permissions", label: "Permissions" },
      ];

      if (isAdmin.value) {
        baseTabs.push({ name: "accounting", label: "Accounting" }); // ✅ ADD TAB IF ADMIN
      }

      return baseTabs;
    });

    // ✅ Map selected view to a component
    const selectedComponent = computed(() => {
      switch (selectedView.value) {
        case "analytics":
          return AdminAnalytics;
        case "affiliates":
          return AdminAffiliates;
        case "users":
          return AdminUsers;
        case "permissions":
          return AdminPermissions;
        case "accounting":
          return AdminAccounting;
        default:
          return AdminAnalytics;
      }
    });

    // ✅ Update View & Store in LocalStorage
    const changeView = (view) => {
      selectedView.value = view;
      localStorage.setItem("adminView", view);
    };

    return { selectedView, selectedComponent, tabs, changeView };
  },
};
</script>

<style scoped>
.admin-dashboard {
  text-align: center;
  margin-top: 20px;
}

nav {
  margin-bottom: 20px;
}

button {
  margin: 5px;
  padding: 10px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  transition: background 0.3s ease-in-out;
}

button:hover {
  background-color: #0056b3;
}

button.active {
  background-color: #ff9900;
}
</style>
