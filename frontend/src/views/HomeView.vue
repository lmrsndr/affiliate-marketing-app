<template>
  <div class="landing-page">
    <!-- TRUSTED HERO SECTION -->
    <section class="hero updated-hero">
      <div class="hero-content">
        <div class="hero-badge bb-badge">
          <span aria-hidden="true">🛡</span> Trusted UK Subscriptions
        </div>

        <h1 class="hero-title">Trust What You Subscribe To</h1>
        <p class="hero-subtitle">
          BundleBee connects you with verified UK subscription brands — powered by real reviews,
          curated rankings, and complete transparency.
        </p>

        <div class="hero-cta">
          <router-link to="/login" class="bb-btn bb-btn--primary" aria-label="Join BundleBee">
            Join the Hive
          </router-link>
          <router-link to="/questionnaire" class="bb-btn bb-btn--ghost" aria-label="Find your matches">
            Take the Match Quiz
          </router-link>
        </div>

        <ul class="trust-points" aria-label="Trust points">
          <li><span aria-hidden="true">✔</span> Verified Partners</li>
          <li><span aria-hidden="true">⭐</span> Genuine Reviews</li>
          <li><span aria-hidden="true">🔒</span> Secure, Ad-Free Discovery</li>
        </ul>
      </div>

      <div class="hero-mark" aria-hidden="true">
        <img
          src="/icon-512x512.png"
          alt="BundleBee logo"
          width="256"
          height="256"
          loading="eager"
          decoding="async"
        />
      </div>
    </section>

    <!-- BUNDLEBEE SECTION -->
    <section class="bundlebee-brand bb-card bb-card--hover">
      <img
        src="/icon-192x192.png"
        alt="BundleBee emblem"
        class="brand-mark"
        width="96"
        height="96"
        loading="lazy"
        decoding="async"
      />
      <h2>Why BundleBee?</h2>
      <p>
        We’re not just a marketplace — we’re a movement for honest, smart, and ethical subscription
        discovery. Backed by <strong>trust</strong>, powered by <strong>transparency</strong>.
      </p>
    </section>

    <!-- HOW IT WORKS -->
    <section class="how-it-works">
      <h2>How It Works</h2>
      <div class="tiles">
        <article class="tile bb-card">
          <span class="tile-emoji" aria-hidden="true">🔍</span>
          <h3>Browse</h3>
          <p>Explore curated UK brands by lifestyle, values, or category.</p>
        </article>
        <article class="tile bb-card">
          <span class="tile-emoji" aria-hidden="true">🎯</span>
          <h3>Get Matched</h3>
          <p>Smart suggestions based on your preferences — no ads, ever.</p>
        </article>
        <article class="tile bb-card">
          <span class="tile-emoji" aria-hidden="true">💬</span>
          <h3>Read Reviews</h3>
          <p>Genuine, helpful reviews from real users like you.</p>
        </article>
        <article class="tile bb-card">
          <span class="tile-emoji" aria-hidden="true">🛒</span>
          <h3>Subscribe Securely</h3>
          <p>Join trusted partners with verified badges & safe checkout.</p>
        </article>
      </div>
    </section>

    <!-- TRENDING PARTNERS -->
    <section class="trending-carousel bb-card">
      <div class="flex items-center justify-between gap-2">
        <h2>Trending UK Partners</h2>
        <a class="bb-btn bb-btn--ghost" href="#explore">Explore all</a>
      </div>

      <!-- error / empty states -->
      <p v-if="boxesError" class="bb-card p-3 text-red-600">{{ boxesError }}</p>
      <div v-else-if="loading" class="bb-card p-4" aria-busy="true">Loading partners…</div>

      <template v-else>
        <div
          v-for="(group, index) in categorizedPartners"
          :key="group.category || index"
          class="carousel-row"
        >
          <h3>{{ group.category }}</h3>

          <div class="carousel-tiles" role="list">
            <div
              class="carousel-tile"
              v-for="(partner, pIndex) in group.partners"
              :key="partner.id || partner._id || `${group.category}-${pIndex}`"
              role="listitem"
            >
              <div class="new-ribbon" v-if="!partner.ratingsCount || partner.ratingsCount === 0">NEW</div>

              <img
                class="partner-logo"
                :src="partner.imageUrl || placeholderImg"
                :alt="`${partner.name} logo`"
                @error="onImgError($event)"
                loading="lazy"
                decoding="async"
              />

              <h4 class="partner-name" :title="partner.name">{{ partner.name }}</h4>

              <div class="badge" v-if="partner.isVerified">🛡 Verified</div>

              <div class="rating" aria-label="Partner rating">
                <template v-if="partner.rating !== undefined && partner.ratingsCount > 0">
                  <div class="bb-stars" :data-rating="Math.round(partner.rating)">
                    <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= Math.round(partner.rating) }">★</span>
                  </div>
                  <span class="rating-value">
                    {{ partner.rating.toFixed(1) }}/5
                    <span class="user-count">
                      ({{ formatCount(partner.ratingsCount) }} user{{ partner.ratingsCount === 1 ? '' : 's' }})
                    </span>
                  </span>
                </template>
                <template v-else>
                  <span class="no-rating">No ratings yet</span>
                </template>
              </div>

              <div class="tile-actions">
                <a
                  href="#"
                  class="visit-btn bb-btn bb-btn--primary"
                  @click.prevent="openAffiliate(partner)"
                  rel="sponsored noopener"
                >
                  Visit
                </a>
                <router-link :to="`/partner/${partner.id || partner._id}`" class="details-btn bb-btn bb-btn--ghost">
                  Details
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!categorizedPartners.length" class="bb-card p-3 text-muted">
          No partners to show right now. Check back soon!
        </div>
      </template>
    </section>

    <!-- EXPLORE (public catalogue) -->
    <section id="explore" class="explore bb-card">
      <div class="explore-header">
        <h2>Explore All Boxes</h2>
        <div class="explore-controls">
          <input
            v-model.trim="q"
            type="search"
            class="bb-input"
            placeholder="Search by name or keyword…"
            aria-label="Search boxes"
          />

          <select v-model="cat" class="bb-input" aria-label="Filter by category">
            <option value="">All categories</option>
            <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
          </select>

          <select v-model="sort" class="bb-input" aria-label="Sort">
            <option value="relevance">Relevance</option>
            <option value="rating">Top rated</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="popularity">Popularity</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="bb-card p-4" aria-busy="true">Loading catalogue…</div>

      <template v-else>
        <p v-if="exploreTotal === 0" class="text-muted">No matches. Try a different search or filter.</p>

        <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="b in explorePageItems"
            :key="b.id"
            class="bb-card p-3 flex flex-col"
          >
            <a :href="b.website || '#'" target="_blank" rel="noopener" class="block">
              <div class="aspect-[4/3] w-full overflow-hidden rounded" :style="{ background: 'var(--bb-surface-2)' }">
                <img :src="b.imageUrl || defaultImage" :alt="b.name" style="width:100%;height:100%;object-fit:cover" />
              </div>
            </a>

            <div class="mt-3 flex-1 flex flex-col">
              <h3 class="text-lg font-semibold">{{ b.name }}</h3>
              <div class="text-sm text-muted">{{ b.category || '—' }}</div>
              <p class="mt-2 text-sm">{{ b.description || 'No description provided.' }}</p>

              <div class="mt-3 flex items-center justify-between">
                <div class="font-bold">£{{ Number(b.price || 0).toFixed(2) }}</div>
                <div class="text-sm">⭐ {{ (b.rating || 0).toFixed(1) }}<span class="text-muted"> ({{ b.ratingsCount || 0 }})</span></div>
              </div>

              <div class="mt-3 flex gap-2">
                <a class="bb-btn bb-btn--ghost flex-1 text-center" :href="b.website || '#'" target="_blank" rel="noopener">Visit</a>
                <a
                  class="bb-btn bb-btn--primary flex-1 text-center"
                  href="#"
                  @click.prevent="openAffiliate(b)"
                  rel="sponsored noopener"
                >Get Deal</a>
              </div>
            </div>
          </article>
        </div>

        <div v-if="exploreShown < exploreTotal" class="mt-4 text-center">
          <button class="bb-btn bb-btn--primary" @click="loadMore">Load more</button>
          <p class="text-muted mt-2">{{ exploreShown }} of {{ exploreTotal }} shown</p>
        </div>
      </template>
    </section>

    <!-- TESTIMONIALS -->
    <section class="testimonial-carousel bb-card">
      <h2>What Our Users Are Saying</h2>
      <div class="testimonial" aria-live="polite">
        <transition name="fade" mode="out-in">
          <blockquote :key="currentIndex">
            “{{ testimonials[currentIndex].quote }}”
            <footer>— {{ testimonials[currentIndex].author }}</footer>
          </blockquote>
        </transition>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import API from '../api.js';

/* ────────────────────────────────────────────────────────────
   State
──────────────────────────────────────────────────────────── */
const loading = ref(true);
const boxesError = ref('');
const boxes = ref([]);

const placeholders = ['/android-chrome-192x192.png', '/icon-192x192.png'];
const placeholderImg = placeholders[0];

const defaultImage  = 'https://via.placeholder.com/320x240?text=BundleBee';

const testimonials = ref([
  { quote: 'Finally a marketplace I can trust.', author: 'Alice, Leeds' },
  { quote: 'Every partner I tried from BundleBee delivered real value.', author: 'Tom, Bristol' },
  { quote: 'Reviews actually reflect reality. Love the clean design too!', author: 'Samira, London' }
]);
const currentIndex = ref(0);
let testimonialTimer = null;
let controller = null;

/* ────────────────────────────────────────────────────────────
   Normaliser
──────────────────────────────────────────────────────────── */
function normBox(b) {
  const priceNum = Number(String(b?.price ?? '').replace(/[^\d.]/g, '')) || 0;
  const rating = Number(b?.rating ?? b?.ratings ?? 0) || 0;
  const ratingsCount = Number(b?.ratingsCount ?? 0) || 0;

  const category =
    typeof b?.category === 'object'
      ? (b?.category?.name || '')
      : (b?.category || '');

  return {
    id: b?._id || b?.id || `${b?.name}-${priceNum}`,
    name: b?.name || 'Untitled',
    category: category || 'Other',
    description: b?.description || '',
    price: priceNum,
    rating,
    ratingsCount,
    clicks: Number(b?.clicks ?? 0) || 0,
    imageUrl: b?.imageUrl || b?.logoUrl || '',
    website: b?.website || b?.url || '#',
    affiliateLink: b?.affiliateLink || b?.affiliate_url || '',
    isVerified: !!b?.isVerified,
    keywords: String(b?.keywords || '').toLowerCase(),
  };
}

/* ────────────────────────────────────────────────────────────
   Data
──────────────────────────────────────────────────────────── */
async function fetchBoxes() {
  loading.value = true;
  boxesError.value = '';

  if (controller) controller.abort();
  controller = new AbortController();

  try {
    let raw = [];
    try {
      const res = await API.get('/boxes/public', { signal: controller.signal });
      raw = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
    } catch {
      const res = await API.get('/boxes', { signal: controller.signal });
      raw = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
    }
    boxes.value = raw.map(normBox);
  } catch (err) {
    if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
      console.error('❌ Failed to fetch boxes:', err);
      boxesError.value = 'We couldn’t load partners just now. Please try again.';
    }
  } finally {
    loading.value = false;
  }
}

/* ────────────────────────────────────────────────────────────
   Trending (same data, grouped)
──────────────────────────────────────────────────────────── */
const categorizedPartners = computed(() => {
  const groups = new Map();
  for (const box of boxes.value) {
    const key = box.category || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(box);
  }
  return Array.from(groups.entries()).map(([category, partners]) => ({
    category,
    partners: partners.slice(0, 10) // small trending slice per category
  }));
});

/* ────────────────────────────────────────────────────────────
   Explore: search / filter / sort / paging (client-side)
──────────────────────────────────────────────────────────── */
const q = ref('');
const cat = ref('');
const sort = ref('relevance');

const pageSize = ref(9);
const page = ref(1);

const allCategories = computed(() => {
  const set = new Set();
  for (const b of boxes.value) if (b.category) set.add(b.category);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
});
const categoryOptions = computed(() => allCategories.value);

const explored = computed(() => {
  const query = q.value.toLowerCase().trim();
  const category = cat.value;

  let list = boxes.value;

  // filter
  if (category) list = list.filter(b => b.category === category);
  if (query) {
    list = list.filter(b =>
      b.name.toLowerCase().includes(query) ||
      b.keywords?.includes(query) ||
      b.description?.toLowerCase().includes(query)
    );
  }

  // sort
  switch (sort.value) {
    case 'rating':
      list = [...list].sort((a, b) => (b.rating - a.rating) || (b.ratingsCount - a.ratingsCount));
      break;
    case 'price-asc':
      list = [...list].sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      list = [...list].sort((a, b) => b.price - a.price);
      break;
    case 'popularity':
      list = [...list].sort((a, b) => (b.clicks - a.clicks) || (b.rating - a.rating));
      break;
    default:
      // relevance: naive score = name hit, keywords hit, rating, clicks
      list = [...list].sort((a, b) => score(b, query) - score(a, query));
  }

  return list;
});

function score(item, qstr) {
  if (!qstr) return (item.rating * 2) + (item.clicks / 100);
  const nameHit = item.name.toLowerCase().includes(qstr) ? 5 : 0;
  const kwHit = item.keywords?.includes(qstr) ? 3 : 0;
  const descHit = item.description?.toLowerCase().includes(qstr) ? 1 : 0;
  return nameHit + kwHit + descHit + (item.rating || 0);
}

const exploreTotal = computed(() => explored.value.length);
const exploreShown = computed(() => Math.min(page.value * pageSize.value, exploreTotal.value));
const explorePageItems = computed(() => explored.value.slice(0, exploreShown.value));

function loadMore() {
  if (exploreShown.value < exploreTotal.value) page.value += 1;
}

// reset pagination on filter change
watch([q, cat, sort], () => { page.value = 1; });

/* ────────────────────────────────────────────────────────────
   UX helpers
──────────────────────────────────────────────────────────── */
function onImgError(e) {
  if (!placeholders.includes(e.target.src)) {
    e.target.src = placeholderImg;
  }
}
function formatCount(count) {
  return count < 1000 ? count : `${(count / 1000).toFixed(1).replace('.0', '')}k+`;
}

/* ────────────────────────────────────────────────────────────
   Revenue-safe click: log then open
──────────────────────────────────────────────────────────── */
async function openAffiliate(partner) {
  try {
    const url = partner.affiliateLink || partner.website;
    if (!url) return;

    try {
      await API.post('/interactions', {
        action: 'clicked_affiliate_link',
        details: { boxId: partner.id, name: partner.name, url }
      });
    } catch {
      // non-blocking
    }

    window.open(url, '_blank', 'noopener');
  } catch (err) {
    console.error('Affiliate open failed:', err);
  }
}

/* ────────────────────────────────────────────────────────────
   Lifecycle
──────────────────────────────────────────────────────────── */
onMounted(() => {
  fetchBoxes();
  testimonialTimer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % testimonials.value.length;
  }, 5000);
});

onUnmounted(() => {
  if (testimonialTimer) clearInterval(testimonialTimer);
  if (controller) controller.abort();
});
</script>

<style scoped>
/* ===== HERO SECTION ===== */
.hero.updated-hero {
  position: relative;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 2rem;
  align-items: center;
  background:
    radial-gradient(1200px 400px at 10% 20%, color-mix(in srgb, var(--bb-primary-light) 20%, transparent), transparent),
    linear-gradient(180deg, color-mix(in srgb, var(--bb-primary-light) 6%, var(--bb-bg) 94%), var(--bb-bg));
  padding: clamp(2rem, 4vw, 4rem) clamp(1rem, 4vw, 2rem);
  border-radius: var(--bb-radius);
  margin: 2rem auto;
  max-width: 1120px;
  box-shadow: var(--bb-shadow-md);
}

.hero-content { text-align: left; }
.hero-badge { margin-bottom: .75rem; }
.hero-title {
  font-family: var(--bb-font-heading);
  font-size: clamp(1.75rem, 3.4vw, 3rem);
  line-height: 1.1;
  margin: 0 0 .5rem;
}
.hero-subtitle {
  color: var(--bb-muted);
  font-size: clamp(1rem, 1.4vw, 1.15rem);
  max-width: 52ch;
}
.hero-cta { display: flex; gap: .75rem; margin-top: 1rem; flex-wrap: wrap; }
.hero-mark { display: grid; place-items: center; }
.hero-mark img { width: min(280px, 60vw); height: auto; filter: drop-shadow(0 12px 26px rgba(0,0,0,.06)); }

/* ===== BRAND SECTION ===== */
.bundlebee-brand { text-align: center; padding: 2rem 1.25rem; margin: 2rem auto 0; max-width: 960px; }
.bundlebee-brand .brand-mark { height: 96px; width: 96px; margin-bottom: .5rem; }
.bundlebee-brand h2 { font-size: clamp(1.4rem, 2.2vw, 2rem); margin-bottom: .5rem; }
.bundlebee-brand p { color: var(--bb-muted); max-width: 60ch; margin: 0 auto; }

/* ===== HOW IT WORKS ===== */
.how-it-works { margin: 2rem auto; padding: 2rem 1.25rem; max-width: 1120px; text-align: center; }
.how-it-works h2 { font-size: clamp(1.4rem, 2.2vw, 2rem); margin-bottom: 1.25rem; }
.tiles { display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 1rem; }
.tile { padding: 1rem; border-radius: var(--bb-radius); transition: transform var(--bb-duration) var(--bb-ease), box-shadow var(--bb-duration) var(--bb-ease); }
.tile:hover { transform: translateY(-2px); box-shadow: var(--bb-shadow-md); }
.tile-emoji { font-size: 1.5rem; display: inline-block; margin-bottom: .5rem; }
.tile h3 { margin: .25rem 0; font-size: 1.05rem; }
.tile p { color: var(--bb-muted); font-size: .95rem; }

/* ===== TRENDING PARTNERS ===== */
.trending-carousel { background: var(--bb-surface); border: 1px solid var(--bb-border); border-radius: var(--bb-radius); padding: 1.5rem; margin: 2rem auto; max-width: 1120px; }
.trending-carousel h2 { font-size: clamp(1.3rem, 2vw, 1.8rem); margin-bottom: 1rem; }
.carousel-row { margin-bottom: 1.25rem; }
.carousel-row h3 { font-size: 1.05rem; margin: .25rem 0 .75rem; color: var(--bb-muted); }
.carousel-tiles { display: flex; gap: .75rem; overflow-x: auto; scroll-behavior: smooth; padding-bottom: .25rem; }
.carousel-tiles::-webkit-scrollbar { height: 6px; }
.carousel-tiles::-webkit-scrollbar-thumb { background: var(--bb-border); border-radius: 4px; }
.carousel-tile { background: var(--bb-surface); border: 1px solid var(--bb-border); border-radius: var(--bb-radius-md); padding: .9rem; width: 220px; min-height: 320px; flex: 0 0 auto; text-align: center; position: relative; }
.new-ribbon { position: absolute; top: 0; right: 0; background: var(--bb-accent); color: #1a1a1a; font-size: .7rem; font-weight: 800; padding: 2px 36px; transform: rotate(45deg) translate(22%, -65%); transform-origin: top right; box-shadow: var(--bb-shadow-sm); }
.partner-logo { max-width: 100%; max-height: 80px; object-fit: contain; margin-bottom: .5rem; }
.partner-name { font-weight: 700; margin: 0.25rem 0 .35rem; height: 2.4em; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.badge { color: var(--bb-primary-dark); font-weight: 700; font-size: .85rem; }
.rating { display: grid; place-items: center; gap: .25rem; margin: .35rem 0; }
.star { color: var(--bb-border); }
.star.filled { color: var(--bb-accent); }
.rating-value { font-size: .85rem; }
.user-count { color: var(--bb-muted); margin-left: .25rem; font-size: .8rem; }
.tile-actions { margin-top: .6rem; display: grid; gap: .5rem; }
.visit-btn, .details-btn { width: 100%; }

/* ===== EXPLORE ===== */
.explore { margin: 2rem auto; max-width: 1120px; padding: 1.25rem; }
.explore-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; margin-bottom: 1rem; }
.explore-controls { display: flex; flex-wrap: wrap; gap: .5rem; }
.bb-input { padding: .6rem .7rem; border: 1px solid var(--bb-border); background: var(--bb-surface); border-radius: .6rem; min-width: 200px; }

/* ===== TESTIMONIALS ===== */
.testimonial-carousel { margin: 2rem auto; max-width: 840px; padding: 1.5rem; border: 1px solid var(--bb-border); border-radius: var(--bb-radius); }
.testimonial-carousel h2 { margin-bottom: .75rem; font-size: clamp(1.2rem, 1.8vw, 1.6rem); }
.testimonial blockquote { font-size: 1.05rem; font-style: italic; color: var(--bb-text); opacity: .9; margin: 0 auto; max-width: 60ch; }
.testimonial footer { margin-top: .6rem; font-weight: 600; color: var(--bb-muted); }

/* ===== RESPONSIVE ===== */
@media (max-width: 920px) {
  .hero.updated-hero { grid-template-columns: 1fr; text-align: center; }
  .hero-content { text-align: center; }
  .hero-cta { justify-content: center; }
}
@media (max-width: 720px) {
  .tiles { grid-template-columns: repeat(2, minmax(140px, 1fr)); }
}
@media (max-width: 420px) {
  .tiles { grid-template-columns: 1fr; }
  .carousel-tile { width: 85vw; }
}

/* Fade transition for testimonials */
.fade-enter-active, .fade-leave-active { transition: opacity .35s var(--bb-ease); }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
