<template>
  <div class="landing-page">
    <!-- TRUST HERO SECTION -->
    <section class="hero">
      <div class="hero-content">
        <h1>Trust What You Subscribe To</h1>
        <p>BundleBee connects you with verified UK subscription brands — powered by real reviews, curated rankings, and complete transparency.</p>
        <router-link to="/login" class="cta-btn">Join the Hive</router-link>
        <div class="trust-points">
          <span>✔ Verified Partners</span>
          <span>⭐ Genuine Reviews</span>
          <span>🔒 Secure, Ad-Free Discovery</span>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="how-it-works">
      <h2>How It Works</h2>
      <div class="steps">
        <div class="step">
          <span>🔍</span>
          <h3>Browse</h3>
          <p>Explore curated, verified UK subscription brands by interest or values.</p>
        </div>
        <div class="step">
          <span>🎯</span>
          <h3>Get Matched</h3>
          <p>Receive smart, bias-free recommendations — no ads or fake rankings.</p>
        </div>
        <div class="step">
          <span>💬</span>
          <h3>Trust the Reviews</h3>
          <p>Every review is user-authenticated and ranked by helpfulness.</p>
        </div>
        <div class="step">
          <span>🛒</span>
          <h3>Subscribe Confidently</h3>
          <p>Click through securely, knowing you’re making an informed choice.</p>
        </div>
      </div>
    </section>

    <!-- FEATURED PARTNERS -->
    <section class="featured-grid">
      <h2>Trending UK Partners</h2>
      <div v-if="boxes.length === 0" class="loading">Loading trusted brands...</div>
      <div v-for="box in boxes" :key="box._id" class="card">
        <img :src="box.imageUrl" :alt="box.name" class="logo" @error="onImgError($event)" />
        <h3>{{ box.name }}</h3>
        <p>{{ box.description }}</p>
        <div class="card-actions">
          <a :href="box.affiliateLink" target="_blank" class="visit-btn">Visit</a>
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
        const res = await API.get("/boxes/public");
        boxes.value = res.data;
      } catch (err) {
        console.error("❌ Failed to fetch partner boxes:", err);
      }
    };

    const onImgError = (e) => {
      e.target.src = "/default.png";
    };

    onMounted(() => {
      fetchBoxes();
    });

    return { boxes, onImgError };
  },
};
</script>

<style scoped>
.landing-page {
  font-family: 'Segoe UI', sans-serif;
  background-color: #f6f9fc;
  color: #222;
  padding: 2rem;
  max-width: 1200px;
  margin: auto;
}

/* HERO SECTION */
.hero {
  background: linear-gradient(145deg, #e6f7ff, #ffffff);
  padding: 3rem 2rem;
  border-radius: 16px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  text-align: center;
  margin-bottom: 2.5rem;
}

.hero-content h1 {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.hero-content p {
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
}

.cta-btn {
  background-color: #ffb700;
  color: #000;
  font-weight: 600;
  padding: 0.8rem 1.6rem;
  border-radius: 8px;
  text-decoration: none;
  display: inline-block;
}

.trust-points {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  font-size: 0.9rem;
  flex-wrap: wrap;
}

/* HOW IT WORKS */
.how-it-works {
  margin-top: 3rem;
  text-align: center;
}

.how-it-works h2 {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
}

.steps {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
}

.step {
  background: #fff;
  padding: 1.2rem;
  border-radius: 12px;
  width: 250px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.06);
}

.step span {
  font-size: 2rem;
  margin-bottom: 0.4rem;
  display: block;
}

/* FEATURED PARTNERS */
.featured-grid {
  margin-top: 4rem;
}

.featured-grid h2 {
  text-align: center;
  font-size: 1.6rem;
  margin-bottom: 2rem;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  margin-bottom: 2rem;
  text-align: center;
}

.card img.logo {
  max-height: 80px;
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
  padding: 0.6rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
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
