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
      <div v-for="(group, index) in categorizedPartners" :key="group.category" class="carousel-row">
        <h3>{{ group.category }}</h3>
        <div class="carousel-tiles">
          <div class="carousel-tile" v-for="(partner, pIndex) in group.partners" :key="partner._id || `${group.category}-${pIndex}`">
            <div class="new-ribbon" v-if="!partner.ratingCount || partner.ratingCount === 0">NEW</div>

            <img
              class="partner-logo"
              :src="partner.imageUrl"
              :alt="partner.name"
              @error="onImgError($event)"
            />
            <h4 class="partner-name" :title="partner.name">{{ partner.name }}</h4>

            <div class="badge" v-if="partner.isVerified">🛡 Verified</div>

            <div class="rating">
              <template v-if="partner.rating !== undefined && partner.ratingCount > 0">
                <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= Math.round(partner.rating) }">★</span>
                <span class="rating-value">
                  {{ partner.rating.toFixed(1) }}/5
                  <span class="user-count">
                    ({{ formatCount(partner.ratingCount) }} user{{ partner.ratingCount === 1 ? '' : 's' }})
                  </span>
                </span>
              </template>
              <template v-else>
                <span class="no-rating">No ratings yet</span>
              </template>
            </div>

            <div class="tile-actions">
              <a :href="partner.affiliateLink" class="visit-btn" target="_blank" rel="noopener">Visit</a>
              <router-link :to="`/partner/${partner._id}`" class="details-btn">Details</router-link>
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
  { quote: 'Every partner I tried from BundleBee delivered real value.', author: 'Tom, Bristol' },
  { quote: 'Reviews actually reflect reality. Love the clean design too!', author: 'Samira, London' }
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
    const res = await API.get('/boxes/public');
    const newData = JSON.stringify(res.data);
    const currentData = JSON.stringify(boxes.value);
    if (newData !== currentData) {
      boxes.value = res.data;
    }
  } catch (err) {
    console.error('❌ Failed to fetch boxes:', err);
  }
};

const onImgError = (e) => {
  if (!e.target.src.includes('/default.png')) {
    e.target.src = '/default.png';
  }
};

const formatCount = (count) => {
  return count < 1000 ? count : `${(count / 1000).toFixed(1).replace('.0', '')}k+`;
};

onMounted(() => {
  fetchBoxes();
  setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % testimonials.value.length;
  }, 5000);
});
</script>

<style scoped>
/* ===== SEARCH BAR ===== */
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
  background-color: #ffffff;
}
.search-bar:focus {
  box-shadow: 0 0 12px rgba(0, 119, 204, 0.3);
  transform: scale(1.02);
}

/* ===== HERO SECTION ===== */
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

/* ===== BUNDLEBEE SECTION ===== */
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

/* ===== HOW IT WORKS ===== */
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

/* ===== TESTIMONIAL ===== */
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
.testimonial footer {
  margin-top: 0.8rem;
  font-weight: 600;
  color: #777;
}

/* ===== TRENDING CAROUSEL ===== */
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

/* ===== CAROUSEL TILES: DESKTOP (default) ===== */
.carousel-tiles {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding-bottom: 0.5rem;
  flex-wrap: nowrap;
}
.carousel-tiles::-webkit-scrollbar {
  height: 6px;
}
.carousel-tiles::-webkit-scrollbar-thumb {
  background: #cccccc;
  border-radius: 4px;
}

/* ===== PARTNER TILE ===== */
.carousel-tile {
  background-color: #f8faff;
  border-radius: 10px;
  padding: 1rem;
  width: 220px;
  height: 340px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.carousel-tile .new-ribbon {
  position: absolute;
  top: 0;
  left: 0;
  background: #ff4d4f;
  color: #fff;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 4px 40px;
  text-align: center;
  transform: rotate(-45deg);
  transform-origin: 0 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
  pointer-events: none;
}
.carousel-tile .partner-logo {
  max-width: 100%;
  max-height: 80px;
  object-fit: contain;
  margin-bottom: 0.5rem;
}
.carousel-tile .partner-name {
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
.carousel-tile .badge {
  font-size: 0.85rem;
  color: #007700;
  margin-top: 0.25rem;
}
.carousel-tile .rating {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
  margin: 0.3rem 0;
}
.carousel-tile .star {
  font-size: 1rem;
  color: #ccc;
}
.carousel-tile .star.filled {
  color: #ffaa00;
}
.carousel-tile .rating-value {
  font-size: 0.85rem;
  color: #444;
}
.carousel-tile .user-count {
  color: #888;
  margin-left: 0.25rem;
  font-size: 0.8rem;
}
.carousel-tile .no-rating {
  font-size: 0.85rem;
  color: #888;
  font-style: italic;
}
.carousel-tile .tile-actions {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
  flex-direction: column;
  width: 100%;
}
.carousel-tile .visit-btn,
.carousel-tile .details-btn {
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
.carousel-tile .visit-btn {
  background-color: #0077cc;
  color: white;
}
.carousel-tile .visit-btn:hover {
  background-color: #005fa3;
}
.carousel-tile .details-btn {
  background-color: #e8f0ff;
  color: #005fa3;
}
.carousel-tile .details-btn:hover {
  background-color: #d0e4ff;
}

/* ===== RESPONSIVE: TABLET (2 per row) ===== */
@media (max-width: 1024px) {
  .carousel-tiles {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    overflow-x: hidden;
  }
  .carousel-tile {
    width: 100%;
    max-width: 100%;
    height: auto;
    margin: 0 auto;
  }
}

/* ===== RESPONSIVE: MOBILE (1 per row) ===== */
@media (max-width: 640px) {
  .carousel-tiles {
    display: block;
  }
  .carousel-tile {
    width: 100%;
    max-width: 100%;
    margin-bottom: 1.5rem;
  }
}
  
</style>
