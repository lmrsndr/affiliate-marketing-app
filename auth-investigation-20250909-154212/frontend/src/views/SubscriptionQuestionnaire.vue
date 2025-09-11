<template>
  <div class="container">
    <h2>Find Your Perfect Subscription Box</h2>

    <!-- ✅ Subscription Form -->
    <form @submit.prevent="submitQuestionnaire">
      <h3>What type of subscription are you interested in?</h3>

      <div v-if="loading" class="loading">Loading categories...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else>
        <div v-if="categories.length > 0">
          <div v-for="(category, index) in categories" :key="index">
            <label>
              <input v-model="selectedCategories" type="checkbox" :value="category.name">
              {{ category.name }}
            </label>
          </div>
        </div>
        <p v-else>⚠️ No categories available.</p>
      </div>

      <!-- ✅ User Subscription Priorities -->
      <h3>What's most important to you?</h3>
      <div v-for="(priority, index) in priorities" :key="index">
        <label>
          <input v-model="selectedPriority" type="radio" :value="priority">
          {{ priority }}
        </label>
      </div>

      <!-- ✅ Form Submission Button -->
      <button type="submit" class="submit-btn">See My Matches</button>
      <p v-if="formError" class="error">{{ formError }}</p>
    </form>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import API from "../api.js";

export default {
  setup() {
    const router = useRouter();
    const selectedCategories = ref([]);
    const selectedPriority = ref("");
    const categories = ref([]);
    const priorities = ref(["Price", "Variety", "Quality"]);
    const loading = ref(true);
    const error = ref(null);
    const formError = ref("");

    onMounted(async () => {
      try {
        const status = await API.get("/auth/status");
        if (!status.data.isAuthenticated) {
          router.push("/login");
          return;
        }

        await API.get("/auth/me");
      } catch (err) {
        console.error("❌ Auth check failed:", err);
        router.push("/login");
        return;
      }

      try {
        const response = await API.get("/categories");
        categories.value = response.data;
      } catch (err) {
        error.value = "Failed to load categories. Please try again later.";
      } finally {
        loading.value = false;
      }

      logInteraction("viewed_page", { page: "Subscription Questionnaire" });
    });

    const submitQuestionnaire = async () => {
      if (selectedCategories.value.length === 0) {
        formError.value = "⚠️ Please select at least one category.";
        return;
      }

      formError.value = "";

      try {
        await logInteraction("selected_subscription", {
          categories: selectedCategories.value,
          priority: selectedPriority.value || "None",
        });

        router.push("/results");
      } catch (err) {
        console.error("❌ Failed to log interaction:", err);
        formError.value = "⚠️ Error processing request. Try again.";
      }
    };

    const logInteraction = async (action, details) => {
      try {
        await API.post("/logInteraction", { action, details });
      } catch (err) {
        console.error("Interaction log failed:", err);
      }
    };

    return {
      selectedCategories,
      selectedPriority,
      categories,
      priorities,
      loading,
      error,
      formError,
      submitQuestionnaire,
    };
  },
};
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: auto;
  padding: 20px;
}

.loading {
  font-weight: bold;
  color: #ff9900;
}

.error {
  color: red;
  font-size: 14px;
  margin-top: 5px;
}

.submit-btn {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  border-radius: 5px;
  margin-top: 20px;
}

.submit-btn:hover {
  background-color: #0056b3;
}
</style>
