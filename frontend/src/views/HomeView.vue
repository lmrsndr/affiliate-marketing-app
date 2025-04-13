<template>
  <div class="landing-page">
     <!-- TRUSTED HERO SECTION -->
    <section class="hero updated-hero">
  <div class="hero-bee-overlay"></div>
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
    
    <!-- BUNDLEBEE SECTION -->
    <section class="bundlebee-brand">
      <img src="/logo512.png" alt="BundleBee Logo" />
      <h2>Why BundleBee?</h2>
      <p>We're not just a marketplace — we’re a movement for honest, smart, and ethical subscription discovery. Backed by trust, powered by transparency.</p>
    </section>

    <!-- HOW IT WORKS TILES -->
    <section class="how-it-works">
      <h2>How It Works</h2>
      <div class="tiles">
        <div class="tile">
          <span>🔍</span>
          <h3>Browse</h3>
          <p>Explore curated UK brands by lifestyle, values, or category.</p>
        </div>
        <div class="tile">
          <span>🎯</span>
          <h3>Get Matched</h3>
          <p>Smart suggestions based on your preferences, no ads ever.</p>
        </div>
        <div class="tile">
          <span>💬</span>
          <h3>Read Reviews</h3>
          <p>Genuine, helpful reviews from real users like you.</p>
        </div>
        <div class="tile">
          <span>🛒</span>
          <h3>Subscribe Securely</h3>
          <p>Join trusted partners with verified badges & safe checkout.</p>
        </div>
      </div>
    </section>

    <!-- TRENDING PARTNERS CAROUSEL -->
    <section class="trending-carousel">
      <h2>Trending UK Partners</h2>
      <div v-for="(group, index) in categorizedPartners" :key="index" class="carousel-row">
        <h3>{{ group.category }}</h3>
        <div class="carousel-tiles">
          <div class="carousel-tile" v-for="partner in group.partners" :key="partner._id">
            <img :src="partner.imageUrl" :alt="partner.name" @error="onImgError($event)" />
            <p>{{ partner.name }}</p>
            <div class="badge" v-if="partner.isVerified">🛡 Verified</div>
          </div>
        </div>
      </div>
    </section>

    <!-- TESTIMONIAL CAROUSEL -->
    <section class="testimonial-carousel">
      <h2>What Our Users Are Saying</h2>
      <div class="testimonial">
        <transition name="fade" mode="out-in">
          <blockquote :key="currentIndex">
            {{ testimonials[currentIndex].quote }}
            <footer>— {{ testimonials[currentIndex].author }}</footer>
          </blockquote>
        </transition>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import API from '../api.js';

const boxes = ref([]);
const testimonials = ref([
  { quote: "Finally a marketplace I can trust.", author: "Alice, Leeds" },
  { quote: "Every partner I tried from BundleBee delivered real value.", author: "Tom, Bristol" },
  { quote: "Reviews actually reflect reality. Love the clean design too!", author: "Samira, London" }
]);
const currentIndex = ref(0);

const categorizedPartners = computed(() => {
  const categories = {};
  for (const box of boxes.value) {
    const cat = box.category || 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(box);
  }
  return Object.entries(categories).map(([category, partners]) => ({ category, partners }));
});

const fetchBoxes = async () => {
  try {
    const res = await API.get("/boxes/public");
    boxes.value = res.data;
  } catch (err) {
    console.error("❌ Failed to fetch boxes:", err);
  }
};

const onImgError = (e) => {
  e.target.src = "/default.png";
};

onMounted(() => {
  fetchBoxes();
  setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % testimonials.value.length;
  }, 5000);
});
</script>

<style scoped>
.search-bar {
  margin-top: 1rem;
  padding: 1rem 1.5rem;
  width: 100%;
  max-width: 480px;
  border: 2px solid #0077cc;
  border-radius: 12px;
  font-size: 1.15rem;
  outline: none;
  transition: box-shadow 0.3s, transform 0.2s;
  box-shadow: 0 0 0 rgba(0, 119, 204, 0);
  background-color: #ffffff;
}
.search-bar:focus {
  box-shadow: 0 0 12px rgba(0, 119, 204, 0.3);
  transform: scale(1.02);
}

.how-it-works {
  background-color: #f7fbff;
  padding: 3rem 1.5rem;
  border-radius: 16px;
  margin: 3rem auto;
  max-width: 960px;
  text-align: center;
}
.how-it-works h2 {
  font-size: 2rem;
  margin-bottom: 2rem;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  justify-items: center;
}
.tile {
  background-color: #ffffff;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  max-width: 280px;
  text-align: center;
  transition: transform 0.2s;
}
.tile:hover {
  transform: translateY(-3px);
}

.trending-carousel {
  background: #ffffff;
  padding: 3rem 1.5rem;
  margin: 3rem auto;
  max-width: 1000px;
  border-radius: 1rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
}
.trending-carousel h2 {
  font-size: 1.9rem;
  margin-bottom: 2rem;
  color: #003366;
}
.carousel-row {
  margin-bottom: 2rem;
}
.carousel-row h3 {
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 1rem;
}
.carousel-tiles {
  display: flex;
  overflow-x: auto;
  gap: 1rem;
  scroll-behavior: smooth;
}
.carousel-tiles::-webkit-scrollbar {
  height: 6px;
}
.carousel-tiles::-webkit-scrollbar-thumb {
  background: #cccccc;
  border-radius: 4px;
}
.carousel-tile {
  background-color: #f8faff;
  border-radius: 10px;
  padding: 1rem;
  min-width: 200px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  flex: 0 0 auto;
  text-align: center;
}

.bundlebee-brand {
  background: linear-gradient(135deg, #eef9ff, #ffffff);
  padding: 3rem 1.5rem;
  border-radius: 18px;
  margin: 3rem auto;
  text-align: center;
  max-width: 960px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.03);
}
.bundlebee-brand h2 {
  font-size: 2.2rem;
  margin-bottom: 1rem;
}
.bundlebee-brand img {
  max-width: 120px;
  margin-bottom: 1rem;
}
.bundlebee-brand p {
  font-size: 1rem;
  color: #444;
  max-width: 640px;
  margin: 0 auto;
}


.hero.updated-hero {
  background: linear-gradient(to right, #ebf5ff, #ffffff);
  padding: 4rem 2rem;
  border-radius: 20px;
  text-align: center;
  margin: 2rem auto;
  max-width: 1000px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.05);
}
.hero-content h1 {
  font-size: 2.6rem;
  color: #003366;
  font-weight: 700;
  margin-bottom: 1rem;
}
.hero-content p {
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 1.5rem;
}
.cta-btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: #0077cc;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  border-radius: 8px;
  text-decoration: none;
  margin-top: 0.5rem;
  transition: background-color 0.3s;
}
.cta-btn:hover {
  background-color: #005fa3;
}
.trust-points {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 2rem;
  font-size: 1rem;
  color: #005c99;
  font-weight: 500;
}
.testimonial-carousel {
  background: #fcfdff;
  padding: 2rem;
  border-radius: 1rem;
  margin: 2rem auto;
  max-width: 700px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  border: 1px solid #e0e6ee;
}
.testimonial-carousel h2 {
  margin-bottom: 1.2rem;
  font-size: 1.6rem;
  color: #005c99;
}
.testimonial blockquote {
  font-size: 1.2rem;
  font-style: italic;
  color: #444;
  padding: 0 1rem;
  position: relative;
  margin: 0 auto;
  max-width: 600px;
}
.testimonial blockquote::before {
  content: '';
  font-size: 2.5rem;
  color: #0077cc;
  position: absolute;
  left: -10px;
  top: -15px;
  font-weight: bold;
}
.testimonial footer {
  margin-top: 0.8rem;
  font-weight: 600;
  color: #777;
}
</style>
