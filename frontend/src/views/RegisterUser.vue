<template>
  <div class="register-container">
    <h2>Create Account</h2>

    <form @submit.prevent="register">
      <input v-model="name" type="text" placeholder="Full Name" required />
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <input v-model="confirmPassword" type="password" placeholder="Confirm Password" required />
      <button type="submit">Register</button>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="success">{{ successMessage }}</p>
    </form>

    <p>
      Already have an account?
      <router-link to="/login">Login</router-link>
    </p>
  </div>
</template>

<script>
import { ref } from "vue";
import { useRouter } from "vue-router";
import API from "../api.js";

export default {
  setup() {
    const name = ref("");
    const email = ref("");
    const password = ref("");
    const confirmPassword = ref("");
    const errorMessage = ref("");
    const successMessage = ref("");
    const router = useRouter();

    const register = async () => {
      errorMessage.value = "";
      successMessage.value = "";

      if (password.value !== confirmPassword.value) {
        errorMessage.value = "⚠️ Passwords do not match!";
        return;
      }

      try {
        await API.post("/auth/register", {
          name: name.value,
          email: email.value,
          password: password.value,
        });

        successMessage.value = "✅ Registration successful! Redirecting to login...";
        setTimeout(() => router.push("/login"), 2000);
      } catch (error) {
        console.error("❌ Registration failed:", error);
        errorMessage.value = error.response?.data?.message || "⚠️ Registration failed. Try again.";
      }
    };

    return {
      name,
      email,
      password,
      confirmPassword,
      errorMessage,
      successMessage,
      register,
    };
  },
};
</script>

<style scoped>
.register-container {
  max-width: 400px;
  margin: auto;
  padding: 20px;
  text-align: center;
}

input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border-radius: 5px;
  border: 1px solid #ccc;
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
  margin-top: 10px;
}

.success {
  color: green;
  font-weight: bold;
  margin-top: 10px;
}
</style>
