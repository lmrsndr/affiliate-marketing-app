<template> 
  <div id="app">
    <header>
      <h1>BundleBee</h1>
    </header>

    <main>
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
import { computed } from "vue";
import Email2FAVerify from "@/components/Email2FAVerify.vue";
import Upgrade2FAPrompt from "@/components/Upgrade2FAPrompt.vue";

export default {
  name: "App",
  components: {
    Email2FAVerify,
    Upgrade2FAPrompt,
  },
  setup() {
    const route = useRoute();

    const showEmail2FA = computed(() => {
      const excludedRoutes = ["/verify-2fa", "/login", "/register"];
      const sessionFlag = sessionStorage.getItem("awaiting2FA") === "true";
      return sessionFlag && !excludedRoutes.includes(route.path);
    });

    return {
      showEmail2FA,
    };
  },
};
</script>


<style>
/* ✅ Global Styles */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
  text-align: center;
}

/* ✅ App Container */
#app {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
}

/* ✅ Header Styles */
header {
  background: #007bff;
  color: white;
  width: 100%;
  padding: 15px 0;
  font-size: 1.5rem;
  font-weight: bold;
}

/* ✅ Main Content */
main {
  flex-grow: 1;
  width: 100%;
  max-width: 800px;
  padding: 20px;
  background: white;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  margin-top: 20px;
}
</style>
