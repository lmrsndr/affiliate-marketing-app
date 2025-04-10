<template>
  <div class="home-view">
    <header class="header">
      <h1>Welcome to BundleBee</h1>
      <router-link to="/login" class="login-btn">Sign In / Register</router-link>
    </header>

    <section class="affiliate-grid">
      <div v-if="boxes.length === 0" class="loading">Loading partners...</div>
      <div v-for="box in boxes" :key="box._id" class="card">
        <img :src="box.imageUrl" :alt="box.name" class="logo" @error="onImgError($event)" />
        <h2>{{ box.name }}</h2>
        <p>{{ box.description }}</p>
        <div class="card-actions">
          <a :href="box.affiliateLink" target="_blank" class="visit-btn">Visit Partner</a>
          <router-link :to="`/partner/${box._id}`" class="details-btn">More Info</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import API from "../api.js";
import { useRouter } from "vue-router";

export default {
  name: "HomePage",
  setup() {
    const boxes = ref([]);
    const router = useRouter();

    const fetchBoxes = async () => {
      try {
        const response = await API.get("/boxes/public");
        boxes.value = response.data;
      } catch (error) {
        console.error("❌ Failed to fetch partner boxes:", error);
      }
    };

    const goToDetails = (id) => {
      router.push(`/partner/${id}`);
    };

    // ✅ Call only once when component is mounted
    onMounted(() => {
      fetchBoxes();
    });

    return { boxes, goToDetails };
  },
};
</script>

<style scoped>
.home-view {
  padding: 2rem;
  max-width: 1200px;
  margin: auto;
  font-family: Arial, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.login-btn {
  background-color: #ffb700;
  color: black;
  padding: 0.6rem 1rem;
  border-radius: 5px;
  text-decoration: none;
}

.affiliate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.card img.logo {
  max-height: 100px;
  margin-bottom: 1rem;
  object-fit: contain;
}

.card-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

.visit-btn, .details-btn {
  padding: 0.5rem 0.8rem;
  border-radius: 5px;
  text-decoration: none;
  font-size: 0.9rem;
}

.visit-btn {
  background-color: #2ecc71;
  color: white;
}

.details-btn {
  background-color: #3498db;
  color: white;
}

.loading {
  text-align: center;
  font-size: 1.2rem;
  color: #555;
}
</style>
