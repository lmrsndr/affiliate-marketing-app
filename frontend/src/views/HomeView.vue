<template>
  <div :class="['landing-page', isDark ? 'dark-mode' : '']">
    <!-- HERO SECTION -->
    <section class="hero updated-hero">
      <div class="hero-bee-overlay"></div>
      <div class="hero-content">
        <h1><span class="highlight">Trusted Subscriptions</span>, Curated for You</h1>
        <p>BundleBee is the UK’s marketplace for authentic reviews, verified partners, and unbiased recommendations. Discover smart, secure subscriptions you can actually trust.</p>
        <router-link to="/login" class="cta-btn">Join the Hive</router-link>
        <div class="trust-points">
          <span>✔ Verified Brands</span>
          <span>⭐ Honest Reviews</span>
          <span>🔐 100% Transparency</span>
        </div>
        <button class="dark-toggle" @click="toggleDark">{{ isDark ? 'Light Mode' : 'Dark Mode' }}</button>
      </div>
    </section>

    <!-- TESTIMONIAL CAROUSEL -->
    <section class="testimonial-carousel">
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

    <!-- HOW IT WORKS -->
    <section class="how-it-works">
      <h2>How It Works</h2>
      <div class="steps">
        <div class="step">
          <span>🔍</span>
          <h3>Browse</h3>
          <p>Explore curated UK brands by lifestyle, values, or category.</p>
        </div>
        <div class="step">
          <span>🎯</span>
          <h3>Get Matched</h3>
          <p>Smart suggestions based on your preferences, no ads ever.</p>
        </div>
        <div class="step">
          <span>💬</span>
          <h3>Read Reviews</h3>
          <p>Genuine, helpful reviews from real users like you.</p>
        </div>
        <div class="step">
          <span>🛒</span>
          <h3>Subscribe Securely</h3>
          <p>Join trusted partners with verified badges & safe checkout.</p>
        </div>
      </div>
    </section>

    <!-- FEATURED PARTNERS -->
    <section class="featured-grid">
      <h2>Trending UK Partners</h2>
      <div v-if="boxes.length === 0" class="loading">Loading trusted brands...</div>
      <div v-for="box in boxes" :key="box._id" class="card">
        <img :src="box.imageUrl" :alt="box.name" class="logo" @error="onImgError($event)" />
        <h3>
          {{ box.name }}
          <span v-if="box.isTrending" class="trending-icon">⭐</span>
        </h3>
        <p>{{ box.description }}</p>
        <div class="badge" v-if="box.isVerified">Verified Partner</div>
        <div class="card-actions">
          <a :href="box.affiliateLink" target="_blank" class="visit-btn">Visit</a>
          <router-link :to="`/partner/${box._id}`" class="details-btn">More Info</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
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

    const toggleDark = () => {
      isDark.value = !isDark.value;
    };

    onMounted(() => {
      fetchBoxes();
      setInterval(() => {
        currentIndex.value = (currentIndex.value + 1) % testimonials.value.length;
      }, 5000);
    });

    return { boxes, onImgError, testimonials, currentIndex, isDark, toggleDark };
  }
};
</script>

<style scoped>
.landing-page {
  background-color: #f7fcfe;
  transition: background-color 0.3s ease, color 0.3s ease;
}
.dark-mode {
  background-color: #121212;
  color: #f2f2f2;
}
.updated-hero {
  background: linear-gradient(130deg, #bee9e8, #ffffff);
  position: relative;
  padding: 3rem 2rem;
  border-radius: 18px;
  text-align: center;
  margin-bottom: 3rem;
  overflow: hidden;
}
.hero-bee-overlay {
  position: absolute;
  inset: 0;
  background-image: url('/bees-bg.svg');
  background-size: cover;
  opacity: 0.08;
  pointer-events: none;
}
.cta-btn, .dark-toggle {
  margin-top: 1rem;
}
.trending-icon {
  color: #f39c12;
  margin-left: 0.5rem;
  font-size: 1rem;
  vertical-align: middle;
}
@media (max-width: 768px) {
  .hero-content h1 {
    font-size: 2rem;
  }
  .steps {
    flex-direction: column;
    align-items: center;
  }
  .card {
    margin-bottom: 2rem;
  }
}
</style>
