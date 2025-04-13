<template>
  <div :class="['landing-page', isDark ? 'dark-mode' : '']">
    <!-- TRUSTED HERO SECTION -->
    <section class="hero updated-hero">
      <div class="hero-bee-overlay"></div>
      <div class="hero-content">
        <h1><span class="highlight">Trusted Subscriptions</span>, Curated for You</h1>
        <p>BundleBee is the UK’s marketplace for authentic reviews, verified partners, and unbiased recommendations. Discover smart, secure subscriptions you can actually trust.</p>
        <input type="text" placeholder="Search subscription boxes..." class="search-bar" />
        <router-link to="/login" class="cta-btn animate-cta">Join the Hive</router-link>
        <div class="trust-points">
          <span>✔ Verified Brands</span>
          <span>⭐ Honest Reviews</span>
          <span>🔐 100% Transparency</span>
        </div>
        <button class="dark-toggle" @click="toggleDark">
          <transition name="toggle">
            <span :key="isDark">{{ isDark ? 'Light Mode' : 'Dark Mode' }}</span>
          </transition>
        </button>
      </div>
    </section>

    <!-- TESTIMONIAL CAROUSEL -->
    <section class="testimonial-carousel" @mouseenter="pauseCarousel = true" @mouseleave="pauseCarousel = false">
      <h2>What Our Users Are Saying</h2>
      <div class="testimonial">
        <transition name="fade" mode="out-in">
          <blockquote :key="currentIndex">
            “{{ testimonials[currentIndex].quote }}”
            <footer>— {{ testimonials[currentIndex].author }}</footer>
          </blockquote>
        </transition>
      </div>
    </section>

    <!-- HOW IT WORKS TILES -->
    <section class="how-it-works animate-fade-in">
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

    <!-- VERIFIED PARTNERS PREVIEW -->
    <section class="verified-strip animate-fade-in">
      <h2>Verified Partners</h2>
      <div class="verified-row">
        <div v-if="verifiedBoxes.length" v-for="box in verifiedBoxes.slice(0, 4)" :key="box._id" class="verified-box hoverable">
          <img :src="box.imageUrl" :alt="box.name" @error="onImgError($event)" />
          <p>{{ box.name }}</p>
          <span class="badge verified-badge">🛡 Verified</span>
        </div>
      </div>
    </section>

    <!-- FEATURED PARTNERS GRID -->
    <section class="featured-grid animate-fade-in">
      <h2>Trending UK Partners</h2>
      <div v-if="boxes.length === 0" class="loading">Loading trusted brands...</div>
      <div v-for="box in boxes" :key="box._id" class="card hoverable">
        <img :src="box.imageUrl" :alt="box.name" class="logo" @error="onImgError($event)" />
        <h3>
          {{ box.name }}
          <span v-if="box.isTrending" class="trending-icon">⭐</span>
        </h3>
        <p>{{ box.description }}</p>
        <div class="badge" v-if="box.isVerified" @click="showModal = true">Verified Partner</div>
        <div class="card-actions">
          <a :href="box.affiliateLink" target="_blank" class="visit-btn">Visit</a>
          <router-link :to="`/partner/${box._id}`" class="details-btn">More Info</router-link>
        </div>
      </div>
    </section>

    <!-- VERIFIED MODAL -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <h3>🛡 What is a Verified Partner?</h3>
        <p>Verified partners on BundleBee meet our highest standards of transparency, service, and verified customer satisfaction. We ensure they've passed authenticity checks and meet ongoing quality benchmarks.</p>
        <button @click="showModal = false">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import API from '../api.js';

export default {
  name: 'HomePage',
  setup() {
    const boxes = ref([]);
    const testimonials = ref([
      { quote: "Finally a marketplace I can trust.", author: "Alice, Leeds" },
      { quote: "Every partner I tried from BundleBee delivered real value.", author: "Tom, Bristol" },
      { quote: "Reviews actually reflect reality. Love the clean design too!", author: "Samira, London" }
    ]);
    const currentIndex = ref(0);
    const isDark = ref(false);
    const showModal = ref(false);
    const pauseCarousel = ref(false);

    const fetchBoxes = async () => {
      try {
        const res = await API.get("/boxes/public");
        boxes.value = res.data;
      } catch (err) {
        console.error("❌ Failed to fetch boxes:", err);
      }
    };

    const verifiedBoxes = computed(() => (boxes.value || []).filter(b => b.isVerified));

    const onImgError = (e) => {
      e.target.src = "/default.png";
    };

    const toggleDark = () => {
      isDark.value = !isDark.value;
    };

    onMounted(() => {
      fetchBoxes();
      setInterval(() => {
        if (!pauseCarousel.value) {
          currentIndex.value = (currentIndex.value + 1) % testimonials.value.length;
        }
      }, 5000);
    });

    return { boxes, verifiedBoxes, onImgError, testimonials, currentIndex, isDark, toggleDark, showModal, pauseCarousel };
  }
};
</script>

<style scoped>
.search-bar {
  margin-top: 1rem;
  padding: 0.8rem 1.2rem;
  width: 100%;
  max-width: 420px;
  border: 2px solid #00aaff;
  border-radius: 10px;
  font-size: 1.1rem;
  outline: none;
  transition: box-shadow 0.3s;
  box-shadow: 0 0 0 rgba(0, 170, 255, 0);
}
.search-bar:focus {
  box-shadow: 0 0 8px rgba(0, 170, 255, 0.3);
}

.testimonial-carousel {
  background: linear-gradient(135deg, #ffffff, #f2f9ff);
  padding: 2rem;
  border-radius: 1rem;
  margin: 2rem auto;
  max-width: 720px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.05);
  text-align: center;
}
.testimonial-carousel h2 {
  margin-bottom: 1.2rem;
  color: #222;
}
.testimonial blockquote {
  font-size: 1.2rem;
  font-style: italic;
  color: #333;
  max-width: 600px;
  margin: 0 auto;
}
.testimonial footer {
  margin-top: 0.8rem;
  font-weight: bold;
  color: #777;
}

.hoverable {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hoverable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.animate-fade-in {
  animation: fadeIn 0.8s ease-out both;
}
.animate-cta {
  animation: pulse 2.5s infinite;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
</style>
