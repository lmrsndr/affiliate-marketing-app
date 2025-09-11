<template>
  <div class="container">
    <h2>Your Subscription Box Matches</h2>

    <div v-if="loading" class="loading">Loading subscription boxes...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <ul v-else>
      <li v-for="(box, index) in sortedResults" :key="index">
        <span v-if="index < 3" class="top-pick">⭐ Most Likely Fit</span>
        <div class="box-card">
          <img :src="box.imageUrl || defaultImage" :alt="box.name" class="box-image" />
          <div class="box-details">
            <h3>{{ box.name }}</h3>
            <p>Category: {{ formatCategory(box.category) }}</p>
            <p>{{ box.description }}</p>
            <p>Price: £{{ parseFloat(box.price).toFixed(2) }}</p>
            <p>⭐ {{ box.ratings.toFixed(1) }} ({{ box.ratingsCount }} ratings)</p>

            <div class="link-buttons">
              <a :href="box.website" target="_blank" class="visit-link">Visit Website</a>
              <a href="#" @click.prevent="openAffiliateLink(box)" class="affiliate-link">Affiliate Link</a>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import API from "../api.js";

export default {
  setup() {
    const router = useRouter();
    const sortedResults = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const defaultImage = ref("https://via.placeholder.com/150");

    onMounted(async () => {
      try {
        const status = await API.get("/auth/status");
        if (!status.data.isAuthenticated) {
          router.push("/login");
          return;
        }

        await API.get("/auth/me");

        const response = await API.get("/boxes/recommendations");
        sortedResults.value = response.data;
      } catch (err) {
        console.error("Error fetching subscription box matches:", err);
        error.value = "Failed to load subscription boxes. Try again later.";
      } finally {
        loading.value = false;
      }

      logInteraction("viewed_page", { page: "Subscription Results" });
    });

    const openAffiliateLink = async (box) => {
      try {
        if (!box.affiliateLink) {
          alert("⚠️ No affiliate link available.");
          return;
        }

        await logInteraction("clicked_affiliate_link", {
          boxName: box.name,
          url: box.affiliateLink,
        });

        setTimeout(() => {
          window.open(box.affiliateLink, "_blank");
        }, 500);
      } catch (error) {
        console.error("Failed to log affiliate link click:", error);
        alert("⚠️ Unable to track affiliate link. Try again.");
      }
    };

    const logInteraction = async (action, details) => {
      try {
        await API.post("/logInteraction", { action, details });
      } catch (error) {
        console.error("Failed to log interaction:", error);
      }
    };

    const formatCategory = (category) => {
      return typeof category === "object" && category.name ? category.name : category;
    };

    return {
      sortedResults,
      loading,
      error,
      openAffiliateLink,
      defaultImage,
      formatCategory,
    };
  },
};
</script>

<style scoped>
.container {
  max-width: 800px;
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

.top-pick {
  color: gold;
  font-weight: bold;
}

.box-card {
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  padding: 15px;
  margin-bottom: 15px;
  background: #f9f9f9;
  border-radius: 10px;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1);
}

.box-image {
  width: 120px;
  height: 120px;
  border-radius: 5px;
  object-fit: cover;
  margin-right: 20px;
}

.box-details {
  flex: 1;
}

.link-buttons {
  margin-top: 10px;
}

.visit-link,
.affiliate-link {
  text-decoration: none;
  font-weight: bold;
  padding: 8px 15px;
  border-radius: 5px;
  display: inline-block;
  margin-right: 10px;
}

.visit-link {
  background-color: #007bff;
  color: white;
}

.visit-link:hover {
  background-color: #0056b3;
}

.affiliate-link {
  background-color: #28a745;
  color: white;
}

.affiliate-link:hover {
  background-color: #1e7e34;
}
</style>
