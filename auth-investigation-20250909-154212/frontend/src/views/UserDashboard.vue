<template>
  <div class="dashboard">
    <h1 v-if="user.name">Welcome, {{ user.name }}</h1>
    <h1 v-else>Welcome to BundleBee</h1>

    <img
      v-if="user.profilePicture"
      :src="user.profilePicture"
      alt="Profile Picture"
      class="profile-pic"
    />

    <p v-if="user.email">Email: {{ user.email }}</p>
    <p v-else>Discover amazing subscription boxes below!</p>

    <div v-if="!user.name" class="partners-section">
      <h2>Explore Our Subscription Boxes</h2>
      <div v-if="isLoading" class="loading">Loading subscription boxes...</div>
      <div v-else class="partners-grid">
        <div v-for="box in subscriptionBoxes" :key="box._id" class="partner-card">
          <a :href="box.affiliateLink" target="_blank" rel="noopener noreferrer">
            <img v-if="box.imageUrl" :src="box.imageUrl" :alt="box.name" class="partner-logo" />
            <h3>{{ box.name }}</h3>
            <p class="category">Category: {{ box.category }}</p>
            <p>{{ box.description }}</p>
            <p class="price">Price: £{{ box.price }}</p>
            <p v-if="box.ratings !== null">⭐ {{ box.ratings.toFixed(1) }} ({{ box.ratingsCount }} reviews)</p>
            <p>🔥 {{ box.clicks }} clicks</p>
          </a>
        </div>
      </div>
    </div>

    <h2 v-if="categories.length">Top Subscription Categories</h2>
    <div v-if="isLoading" class="loading">Loading categories...</div>
    <div v-else class="categories">
      <div v-for="category in categories" :key="category._id" class="category-box">
        <h2>{{ category._id }}</h2>
        <p>Average Rating: {{ category.avgRating.toFixed(1) }}</p>
        <p>Popularity: {{ category.totalClicks }} clicks</p>
      </div>
    </div>

    <h2 v-if="user.name">Available Pages</h2>
    <ul v-if="user.name">
      <li v-if="enabledViews.includes('questionnaire')">
        <router-link to="/questionnaire">Subscription Questionnaire</router-link>
      </li>
      <li v-if="enabledViews.includes('results')">
        <router-link to="/results">Subscription Results</router-link>
      </li>
      <li v-if="enabledViews.includes('manage-affiliates')">
        <router-link to="/manage-affiliates">Affiliate Partners</router-link>
      </li>
    </ul>

    <button v-if="user.name" @click="logout" class="logout-button">Logout</button>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import API from "../api.js";

export default {
  name: "UserDashboard",
  setup() {
    const router = useRouter();
    const user = ref({ name: "", email: "", profilePicture: "" });
    const enabledViews = ref([]);
    const categories = ref([]);
    const subscriptionBoxes = ref([]);
    const isLoading = ref(true);

    onMounted(async () => {
      try {
        const status = await API.get("/auth/status");
        if (!status.data.isAuthenticated) {
          router.push("/login");
          return;
        }

        const userRes = await API.get("/auth/me");
        user.value = {
          name: userRes.data.name,
          email: userRes.data.email,
          profilePicture: userRes.data.profilePicture || "https://via.placeholder.com/150",
        };

        const enabled = await API.get("/auth/enabled-views");
        enabledViews.value = enabled.data.enabledViews;
      } catch (err) {
        console.error("❌ Auth error:", err);
        router.push("/login");
        return;
      }

      try {
        const response = await API.get("/top-categories");
        categories.value = response.data.categories;
      } catch (err) {
        console.error("Error fetching categories", err);
      }

      try {
        const partnersResponse = await API.get("/subscription-boxes");
        subscriptionBoxes.value = partnersResponse.data.boxes;
      } catch (err) {
        console.error("Error fetching subscription boxes", err);
      } finally {
        isLoading.value = false;
      }
    });

    const logout = async () => {
      try {
        await API.get("/auth/logout");
      } catch (e) {
        console.error("Logout failed", e);
      }
      router.push("/");
    };

    return { user, enabledViews, categories, subscriptionBoxes, isLoading, logout };
  },
};
</script>

<style scoped>
.dashboard {
  padding: 20px;
  text-align: center;
}

/* ✅ Profile Picture */
.profile-pic {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin-bottom: 10px;
}

/* ✅ Loading */
.loading {
  font-size: 18px;
  font-weight: bold;
  margin-top: 20px;
}

/* ✅ Categories */
.categories {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
  margin-top: 20px;
}

.category-box {
  padding: 15px;
  background: #f5f5f5;
  border-radius: 10px;
  width: 250px;
  text-align: center;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1);
}

/* ✅ Subscription Boxes */
.partners-section {
  margin-top: 40px;
}

.partners-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
}

.partner-card {
  padding: 15px;
  background: #fff;
  border-radius: 10px;
  width: 250px;
  text-align: center;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1);
}

.partner-card a {
  text-decoration: none;
  color: black;
}

.partner-logo {
  width: 100px;
  height: 100px;
  object-fit: contain;
  margin-bottom: 10px;
}

/* ✅ Logout Button */
.logout-button {
  background-color: #d9534f;
  color: white;
  padding: 10px 20px;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  border-radius: 5px;
  margin-top: 20px;
}

.logout-button:hover {
  background-color: #c9302c;
}
</style>
