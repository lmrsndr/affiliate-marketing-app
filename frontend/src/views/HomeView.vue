<template>
  <div :class="['landing-page', isDark ? 'dark-mode' : '']">
    <!-- TRUSTED HERO SECTION -->
    <section class="hero updated-hero">
      <div class="hero-bee-overlay"></div>
      <div class="hero-content">
        <h1><span class="highlight">Discover Subscription Brands You Can Trust</span></h1>
        <p>BundleBee is the UK’s home for curated discovery, real reviews, and verified subscription partners. No fake ratings. No ads. Just smart shopping made simple.</p>
        <input type="text" placeholder="Search subscription boxes..." class="search-bar" />
        <router-link to="/login" class="cta-btn">Join the Hive</router-link>
        <div class="trust-points">
          <span>✔ Verified Brands</span>
          <span>⭐ Authentic Reviews</span>
          <span>🔐 Trusted Discovery</span>
        </div>
        <button class="dark-toggle" @click="toggleDark">
          <transition name="toggle">
            <span :key="isDark">{{ isDark ? 'Light Mode' : 'Dark Mode' }}</span>
          </transition>
        </button>
      </div>
    </section>

    <!-- WHY BUNDLEBEE SECTION -->
    <section class="why-bundlebee">
      <h2>Why BundleBee?</h2>
      <div class="tiles">
        <div class="tile">
          <span>⚙️</span>
          <h3>Intelligent Discovery</h3>
          <p>Get tailored recommendations with no fluff or ads.</p>
        </div>
        <div class="tile">
          <span>✔</span>
          <h3>Verified Partners</h3>
          <p>Brands pass transparency & satisfaction checks to earn our badge.</p>
        </div>
        <div class="tile">
          <span>🔗</span>
          <h3>No Fake Ratings</h3>
          <p>We prioritize human feedback, not algorithms or paid rankings.</p>
        </div>
        <div class="tile">
          <span>🧠</span>
          <h3>Zero Ads</h3>
          <p>Focus on discovery, not distractions. We never sell your attention.</p>
        </div>
      </div>
    </section>

    <!-- FEATURED VERIFIED PARTNERS -->
    <section class="verified-strip">
      <h2>Verified Partners</h2>
      <div class="verified-row">
        <div v-for="box in boxes.filter(b => b.isVerified).slice(0, 4)" :key="box._id" class="verified-box">
          <img :src="box.imageUrl" :alt="box.name" @error="onImgError($event)" />
          <p>{{ box.name }}</p>
          <span class="badge verified-badge">🛡 Verified</span>
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
        <div class="badge" v-if="box.isVerified" @click="showModal = true">🛡 Verified Partner</div>
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
