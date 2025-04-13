<template>
  <div class="home-view">
    <!-- 🐝 Hero Banner -->
    <section class="hero">
      <div class="hero-text">
        <h1>Discover Smart Subscriptions</h1>
        <p>Curated partners. Personalized picks. Seamless rewards.</p>
        <router-link to="/login" class="cta-btn">Join the Hive</router-link>
      </div>
    </section>

    <!-- 💼 Partner Grid -->
    <section class="affiliate-grid">
      <div v-if="boxes.length === 0" class="loading">Loading partners...</div>
      <div v-for="box in boxes" :key="box._id" class="card">
        <img :src="box.imageUrl" :alt="box.name" class="logo" @error="onImgError($event)" />
        <div class="card-badges">
          <span class="badge trending">🔥 Trending</span>
          <span class="badge verified">✔ Verified</span>
        </div>
        <h2>{{ box.name }}</h2>
        <p>{{ box.description }}</p>
        <div class="match-score">🎯 Your Match: 91%</div>
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

export default {
  name: "HomePage",
  setup() {
    const boxes = ref([]);

    const fetchBoxes = async () => {
      try {
        const response = await API.get("/boxes/public");
        boxes.value = response.data;
      } catch (error) {
        console.error("❌ Failed to fetch partner boxes:", error);
      }
    };

    const onImgError = (e) => {
      e.target.src = "/default-logo.png"; // fallback image
    };

    onMounted(() => {
      fetchBoxes();
    });

    return { boxes, onImgError };
  },
};
</script>

<style scoped>
.home-view {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 2rem;
  max-width: 1200px;
  margin: auto;
}

/* 🌟 Hero Section */
.hero {
  background: linear-gradient(135deg, #ffdc80, #fcb045);
  border-radius: 18px;
  padding: 2.5rem;
  text-align: center;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.hero-text h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.hero-text p {
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.cta-btn {
  background-color: #000;
  color: #fff;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
}

/* 🔳 Grid Display */
.affiliate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 2rem;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 14px rgba(0,0,0,0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-align: center;
  position: relative;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.12);
}

.card img.logo {
  max-height: 100px;
  object-fit: contain;
  margin-bottom: 1rem;
}

/* 📛 Badges */
.card-badges {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 5px;
  color: #fff;
  font-weight: bold;
}

.badge.trending {
  background: #e74c3c;
}

.badge.verified {
  background: #2ecc71;
}

/* 🎯 Match Score */
.match-score {
  font-size: 0.9rem;
  color: #555;
  margin-top: 0.5rem;
}

/* 📎 Buttons */
.card-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

.visit-btn, .details-btn {
  padding: 0.5rem 0.9rem;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.9rem;
  transition: background 0.3s ease;
}

.visit-btn {
  background-color: #27ae60;
  color: white;
}

.details-btn {
  background-color: #2980b9;
  color: white;
}

.loading {
  text-align: center;
  font-size: 1.2rem;
  color: #555;
}
</style>
