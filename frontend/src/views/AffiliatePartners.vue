<template>
  <div class="container">
    <h2>Manage Subscription Boxes</h2>

    <!-- ✅ Form for Adding Subscription Boxes -->
    <form class="form-container" @submit.prevent="addSubscriptionBox">
      <div class="form-group">
        <input v-model="newBox.name" placeholder="Subscription Box Name" required />
      </div>

      <!-- ✅ Category Selection with 'Add New' Option -->
      <div class="form-group">
        <select v-model="newBox.category" required @change="checkNewCategory">
          <option value="" disabled>Select a Category</option>
          <option v-for="category in categories" :key="category._id" :value="category._id">
            {{ category.name }}
          </option>
          <option value="new">+ Add New Category</option>
        </select>
      </div>

      <!-- ✅ New Category Input -->
      <div v-if="addingNewCategory" class="form-group">
        <input v-model="newCategoryName" placeholder="Enter New Category" required />
        <button type="button" class="btn" @click="saveNewCategory">Save Category</button>
        <p v-if="categoryExistsError" class="error">{{ categoryExistsError }}</p>
      </div>

      <div class="form-group">
        <input v-model="newBox.description" placeholder="Brief Description" required />
      </div>
      <div class="form-group">
        <input v-model="newBox.price" placeholder="Price" required />
      </div>
      <div class="form-group">
        <input v-model="newBox.website" placeholder="Website URL" required />
      </div>
      <div class="form-group">
        <input v-model="newBox.affiliateLink" placeholder="Affiliate Link" required />
      </div>
      <div class="form-group">
        <input v-model="newBox.imageUrl" placeholder="Image URL" required />
      </div>

      <button type="submit" class="btn btn-primary">Add Subscription Box</button>
      <p v-if="submissionError" class="error">{{ submissionError }}</p>
    </form>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import API from "../api.js";
import { useRouter } from "vue-router";

export default {
  setup() {
    const router = useRouter();
    const categories = ref([]);
    const newBox = ref({
      name: "",
      category: "",
      description: "",
      price: "",
      website: "",
      affiliateLink: "",
      imageUrl: "",
    });

    const addingNewCategory = ref(false);
    const newCategoryName = ref("");
    const categoryExistsError = ref("");
    const submissionError = ref("");

    // ✅ Check Admin Authentication using secure backend endpoints
    const checkAuth = async () => {
      try {
        const status = await API.get("/api/auth/status");
        if (!status.data.isAuthenticated) {
          alert("⚠️ Unauthorized. Redirecting to login.");
          router.push("/admin-login");
          return;
        }

        const profile = await API.get("/api/auth/me");
        if (profile.data.role !== "admin") {
          alert("⚠️ Access Denied. Admins only.");
          router.push("/");
        }
      } catch (err) {
        console.error("❌ Auth error:", err);
        router.push("/admin-login");
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await API.get("/categories");
        categories.value = response.data;
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    const checkNewCategory = () => {
      if (newBox.value.category === "new") {
        addingNewCategory.value = true;
        newBox.value.category = "";
      } else {
        addingNewCategory.value = false;
      }
    };

    const saveNewCategory = async () => {
      if (!newCategoryName.value.trim()) return;
      try {
        const existing = categories.value.find(
          (c) => c.name.toLowerCase() === newCategoryName.value.toLowerCase()
        );
        if (existing) {
          categoryExistsError.value = "⚠️ Category already exists!";
          return;
        }

        categoryExistsError.value = "";

        const response = await API.post("/categories", { name: newCategoryName.value });
        const newCategory = response.data;
        categories.value.push(newCategory);
        newBox.value.category = newCategory._id;
        newCategoryName.value = "";
        addingNewCategory.value = false;
      } catch (error) {
        console.error("Error adding new category:", error);
      }
    };

    const addSubscriptionBox = async () => {
      try {
        await API.post("/boxes", newBox.value); // ✅ Auth cookies sent automatically
        alert("✅ Subscription Box added successfully!");
        newBox.value = { name: "", category: "", description: "", price: "", website: "", affiliateLink: "", imageUrl: "" };
        submissionError.value = "";
      } catch (error) {
        console.error("Error adding box:", error);
        submissionError.value = error.response?.data?.message || "Failed to add subscription box.";
      }
    };

    onMounted(() => {
      checkAuth();
      fetchCategories();
    });

    return {
      categories,
      newBox,
      addingNewCategory,
      newCategoryName,
      categoryExistsError,
      submissionError,
      fetchCategories,
      checkNewCategory,
      saveNewCategory,
      addSubscriptionBox,
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

.form-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.btn {
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

.btn:hover {
  background-color: #0056b3;
}

.error {
  color: red;
  font-size: 14px;
  margin-top: 5px;
}
</style>
