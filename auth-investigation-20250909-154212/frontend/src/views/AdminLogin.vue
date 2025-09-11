<template>
  <div class="login-container">
    <h2>Sign In to BundleBee</h2>

    <!-- ✅ Email/Password Login -->
    <form @submit.prevent="login">
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <button type="submit">Login</button>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </form>

    <p>
      <router-link to="/register">Create New Account</router-link> | 
      <router-link to="/forgot-password">Forgot Password?</router-link>
    </p>

    <!-- ✅ OAuth -->
    <div class="oauth-section">
      <p>Or sign in with:</p>
      <button @click="loginWithGoogle" class="google-button">Login with Google</button>
    </div>
  </div>
</template>

<script>
import { useRouter } from "vue-router";
import { ref } from "vue";
import API from "../api.js";

export default {
  setup() {
    const email = ref("");
    const password = ref("");
    const errorMessage = ref("");
    const router = useRouter();

    // ✅ Email/Password Login
    const login = async () => {
      try {
        await API.post("/auth/login", {
          email: email.value,
          password: password.value,
        });

        const profile = await API.get("/auth/me");

        if (profile.data.role === "admin") {
          router.push("/admin-dashboard");
        } else {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("❌ Login error:", error);
        errorMessage.value = "❌ Invalid email or password. Please try again.";
      }
    };

    // ✅ Google OAuth Login (Redirects to backend route, not Google directly)
    const loginWithGoogle = () => {
      window.location.href = "https://api.bundlebee.co.uk/auth/google";
    };

    return {
      email,
      password,
      errorMessage,
      login,
      loginWithGoogle,
    };
  },
};
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: auto;
  padding: 20px;
  text-align: center;
}

input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 5px;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}

.error {
  color: red;
  font-weight: bold;
}

.oauth-section {
  margin-top: 20px;
}

.google-button {
  background-color: #db4437;
  color: white;
}

.google-button:hover {
  background-color: #c1351d;
}
</style>
