<template>
  <div :class="['landing-page', isDark ? 'dark-mode' : '']">
    <!-- TRUSTED HERO SECTION -->
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
        <button class="dark-toggle" @click="toggleDark">
          <transition name="toggle">
            <span :key="isDark">{{ isDark ? 'Light Mode' : 'Dark Mode' }}</span>
          </transition>
        </button>
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

    <!-- VERIFIED PARTNERS PREVIEW -->
    <section class="verified-strip">
      <h2>Verified Partners</h2>
      <div class="verified-row">
        <div v-if="verifiedBoxes.length" v-for="box in verifiedBoxes.slice(0, 4)" :key="box._id" class="verified-box">
          <img :src="box.imageUrl" :alt="box.name" @error="onImgError($event)" />
          <p>{{ box.name }}</p>
          <span class="badge verified-badge">🛡 Verified</span>
        </div>
      </div>
    </section>

    <!-- FEATURED PARTNERS GRID -->
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
        <h3>What is a Verified Partner?</h3>
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
        currentIndex.value = (currentIndex.value + 1) % testimonials.value.length;
      }, 5000);
    });

    return { boxes, verifiedBoxes, onImgError, testimonials, currentIndex, isDark, toggleDark, showModal };
  }
};
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

.testimonial-carousel {
  background: radial-gradient(circle at top left, #fefefe, #e9f4ff);
  padding: 2.5rem 2rem;
  border-radius: 1.25rem;
  margin: 2.5rem auto;
  max-width: 800px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
  text-align: center;
  border: 1px solid #e6f0ff;
}
.testimonial-carousel h2 {
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
  color: #005c99;
  font-weight: 600;
}
.testimonial blockquote {
  font-size: 1.3rem;
  font-style: italic;
  color: #333;
  max-width: 650px;
  margin: 0 auto;
  position: relative;
  padding: 0 1rem;
}
.testimonial blockquote::before {
  content: '“';
  font-size: 3rem;
  color: #0077cc;
  position: absolute;
  left: -10px;
  top: -20px;
  font-weight: bold;
}
.testimonial footer {
  margin-top: 1rem;
  font-weight: 600;
  color: #666;
}

.hoverable {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.hoverable:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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

