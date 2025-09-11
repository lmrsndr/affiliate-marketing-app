<template>
  <div class="forgot-password-container">
    <h2>Reset Password</h2>

    <form @submit.prevent="sendResetLink">
      <input v-model="email" type="email" placeholder="Enter your email" required />
      <button type="submit">Send Reset Link</button>
      <p v-if="successMessage" class="success">{{ successMessage }}</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </form>

    <p>
      Remembered your password?
      <router-link to="/login">Login</router-link>
    </p>
  </div>
</template>

<script>
import { ref } from "vue";
import API from "../api.js";

export default {
  setup() {
    const email = ref("");
    const successMessage = ref("");
    const errorMessage = ref("");

    const sendResetLink = async () => {
      successMessage.value = "";
      errorMessage.value = "";

      try {
        await API.post("/auth/forgot-password", { email: email.value });
        successMessage.value = "✅ Reset link sent to your email.";
      } catch (error) {
        errorMessage.value = "⚠️ Failed to send reset link. Try again.";
        console.error("Reset link error:", error);
      }
    };

    return { email, successMessage, errorMessage, sendResetLink };
  },
};
</script>

<style scoped>
.forgot-password-container {
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

.success {
  color: green;
  font-weight: bold;
  margin-top: 10px;
}

.error {
  color: red;
  font-weight: bold;
  margin-top: 10px;
}
</style>
