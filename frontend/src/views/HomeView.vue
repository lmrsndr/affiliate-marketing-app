<template>
  <div class="landing-page">
    <!-- TRUSTED HERO SECTION -->
    <section class="hero updated-hero">
      <div class="hero-bee-overlay"></div>
      <div class="hero-content">
        <h1>Trust What You Subscribe To</h1>
        <p>
          BundleBee connects you with verified UK subscription brands — powered
          by real reviews, curated rankings, and complete transparency.
        </p>
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
      <p>
        We're not just a marketplace — we’re a movement for honest, smart, and
        ethical subscription discovery. Backed by trust, powered by transparency.
      </p>
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
      <div
        v-for="(group, index) in categorizedPartners"
        :key="index"
        class="carousel-row"
      >
        <h3>{{ group.category }}</h3>
        <div class="carousel-tiles">
          <div
            class="carousel-tile"
            v-for="partner in group.partners"
            :key="partner._id"
          >
            <img
              class="partner-logo"
              :src="partner.imageUrl"
              :alt="partner.name"
              @error="onImgError($event)"
            />
            <h4 class="partner-name" :title="partner.name">
              {{ partner.name }}
            </h4>
            <div class="badge" v-if="partner.isVerified">🛡 Verified</div>
            <div class="tile-actions">
              <a
                :href="partner.affiliateLink"
                class="visit-btn"
                target="_blank"
                rel="noopener"
                >Visit</a
              >
              <router-link
                :to="`/partner/${partner._id}`"
                class="details-btn"
                >Details</router-link
              >
            </div>
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
  { quote: 'Finally a marketplace I can trust.', author: 'Alice, Leeds' },
  {
    quote: 'Every partner I tried from BundleBee delivered real value.',
    author: 'Tom, Bristol',
  },
  {
    quote: 'Reviews actually reflect reality. Love the clean design too!',
    author: 'Samira, London',
  },
]);
const currentIndex = ref(0);

const categorizedPartners = computed(() => {
  const categories = {};
  for (const box of boxes.value) {
    const cat = box.category || 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(box);
  }
  return Object.entries(categories).map(([category, partners]) => ({
    category,
    partners,
  }));
});

const fetchBoxes = async () => {
  try {
    const res = await API.get('/boxes/public');
    boxes.value = res.data;
  } catch (err) {
    console.error('❌ Failed to fetch boxes:', err);
  }
};

const onImgError = (e) => {
  e.target.src = '/default.png';
};

onMounted(() => {
  fetchBoxes();
  setInterval(() => {
    currentIndex.value =
      (currentIndex.value + 1) % testimonials.value.length;
  }, 5000);
});
</script>

<style scoped>
/* Existing styles omitted for brevity — keep them */
/* New / Updated styles below */

.carousel-tile {
  background-color: #f8faff;
  border-radius: 10px;
  padding: 1rem;
  min-width: 220px;
  width: 220px;
  height: 300px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  text-align: center;
  position: relative;
}

.partner-logo {
  max-width: 100%;
  max-height: 80px;
  object-fit: contain;
  margin-bottom: 0.5rem;
}

.partner-name {
  font-size: 1rem;
  font-weight: 600;
  color: #003366;
  margin: 0.25rem 0;
  height: 2.4em;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.badge {
  font-size: 0.85rem;
  color: #007700;
  margin-top: 0.25rem;
}

.tile-actions {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
  flex-direction: column;
  width: 100%;
}

.visit-btn,
.details-btn {
  padding: 0.5rem;
  font-size: 0.85rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  display: inline-block;
  width: 100%;
  text-align: center;
  transition: background-color 0.3s;
}

.visit-btn {
  background-color: #0077cc;
  color: white;
}
.visit-btn:hover {
  background-color: #005fa3;
}

.details-btn {
  background-color: #e8f0ff;
  color: #005fa3;
}
.details-btn:hover {
  background-color: #d0e4ff;
}
</style>