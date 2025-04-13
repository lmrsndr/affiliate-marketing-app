<template>
  <div class="landing-page">
    <!-- TRUST HERO SECTION (Redesigned Banner) -->
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
        <h3>{{ box.name }}</h3>
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

    return { boxes, onImgError, testimonials, currentIndex };
  }
};
</script>

<style scoped>
.landing-page {
  font-family: 'Segoe UI', sans-serif;
  color: #222;
  padding: 2rem;
  max-width: 1200px;
  margin: auto;
  background-color: #f7fcfe;
}

/* Redesigned Hero */
.updated-hero {
  background: linear-gradient(130deg, #d2f4ea, #ffffff);
  position: relative;
  padding: 3rem 2rem;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  text-align: center;
  margin-bottom: 3rem;
}

.hero-bee-overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-image: url('/bees-bg.svg');
  opacity: 0.08;
  background-size: cover;
  background-position: center;
  pointer-events: none;
}

.hero-content h1 {
  font-size: 2.6rem;
  margin-bottom: 0.5rem;
}

.highlight {
  color: #007f5f;
}

.hero-content p {
  font-size: 1.15rem;
  margin-bottom: 1.5rem;
}

.cta-btn {
  background-color: #ffb700;
  color: #000;
  font-weight: bold;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  display: inline-block;
}

.trust-points {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.95rem;
  margin-top: 1rem;
}

/* Testimonial */
.testimonial-carousel {
  text-align: center;
  margin-top: 2rem;
}

.testimonial-carousel h2 {
  font-size: 1.7rem;
  margin-bottom: 1rem;
}

.testimonial blockquote {
  font-style: italic;
  max-width: 700px;
  margin: 0 auto;
  font-size: 1.2rem;
  color: #333;
}

.testimonial footer {
  font-weight: bold;
  margin-top: 0.5rem;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Verified Badge */
.badge {
  background-color: #e3f9e5;
  color: #2e7d32;
  padding: 0.3rem 0.7rem;
  border-radius: 5px;
  font-size: 0.8rem;
  font-weight: 600;
  margin: 0.5rem 0;
}
</style>
