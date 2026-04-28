<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import API from "@/api";                       // axios instance (withCredentials)
import { guardedGet } from "@/lib/guarded-api"; // same helper used elsewhere

/* ────────────────────────────────────────────────────────────
   State
──────────────────────────────────────────────────────────── */
const router = useRouter();

const loading = ref(true);
const user = ref(null); // { name, email, profilePicture, role, ... }
const enabledViews = ref([]);

const catLoading = ref(true);
const catsError = ref("");
const categories = ref([]); // normalized: [{ name, avgRating, totalClicks }]

const boxesLoading = ref(true);
const boxesError = ref("");
const boxes = ref([]); // normalized: [{ id, name, category, description, price, rating, ratingsCount, imageUrl, website, affiliateLink }]

const defaultAvatar = "https://via.placeholder.com/150?text=User";
const defaultImage  = "https://via.placeholder.com/320x240?text=BundleBee";

/* ────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────── */
async function logInteraction(action, details = {}) {
  try {
    await API.post("/interactions", { action, details });
  } catch {
    // non-blocking
  }
}

function normCategory(item) {
  // Accept shapes:
  // 1) { _id: "Beauty", avgRating, totalClicks }
  // 2) { name: "Beauty", ... }
  // 3) plain string
  const name = item?.name ?? item?._id ?? (typeof item === "string" ? item : "");
  return {
    name: String(name || ""),
    avgRating: Number(item?.avgRating ?? 0) || 0,
    totalClicks: Number(item?.totalClicks ?? 0) || 0,
  };
}

function normBox(b) {
  const priceNum = Number(String(b?.price ?? "").replace(/[^\d.]/g, "")) || 0;
  const rating   = Number(b?.rating ?? b?.ratings ?? 0) || 0;
  const ratingsCount = Number(b?.ratingsCount ?? 0) || 0;
  return {
    id: b?._id || b?.id || `${b?.name}-${priceNum}`,
    name: b?.name || "Untitled",
    category: b?.category?.name || b?.category || "",
    description: b?.description || "",
    price: priceNum,
    rating,
    ratingsCount,
    imageUrl: b?.imageUrl || b?.logoUrl || "",
    website: b?.website || b?.url || "#",
    affiliateLink: b?.affiliateLink || b?.affiliate_url || "",
  };
}

/* ────────────────────────────────────────────────────────────
   Data loading
──────────────────────────────────────────────────────────── */
async function loadAuth() {
  // guardedGet handles 401→/login and 403(MFA)→/verify-2fa
  const data = await guardedGet("/auth/status");
  // expected shape: { ok, user, mfaVerified, ... }
  user.value = data?.user || null;

  // Enabled views (optional)
  try {
    const res = await API.get("/auth/enabled-views");
    // accept { enabledViews: [...] } or an array
    enabledViews.value = Array.isArray(res?.data)
      ? res.data
      : (res?.data?.enabledViews || []);
  } catch {
    enabledViews.value = [];
  }
}

async function loadCategories() {
  catLoading.value = true;
  catsError.value = "";
  try {
    const res = await API.get("/top-categories");
    const raw = Array.isArray(res?.data)
      ? res.data
      : (res?.data?.categories || res?.data?.items || []);
    categories.value = raw.map(normCategory).filter(c => c.name);
  } catch (e) {
    catsError.value = "Failed to load categories.";
    categories.value = [];
  } finally {
    catLoading.value = false;
  }
}

async function loadBoxes() {
  boxesLoading.value = true;
  boxesError.value = "";
  try {
    let raw = [];
    try {
      const res = await API.get("/boxes/public");
      raw = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
    } catch {
      const res = await API.get("/boxes");
      raw = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
    }
    boxes.value = raw.map(normBox).slice(0, 12); // show a curated slice
  } catch (e) {
    boxesError.value = "Failed to load subscription boxes.";
    boxes.value = [];
  } finally {
    boxesLoading.value = false;
  }
}

onMounted(async () => {
  try {
    await loadAuth();
  } catch {
    // redirected by guardedGet
    return;
  } finally {
    loading.value = false;
  }

  loadCategories();
  loadBoxes();
  logInteraction("viewed_page", { page: "User Dashboard" });
});

/* ────────────────────────────────────────────────────────────
   Computed
──────────────────────────────────────────────────────────── */
const isLoggedIn = computed(() => !!user.value);
const displayName = computed(() => user.value?.name || "");
const displayEmail = computed(() => user.value?.email || "");

/* ────────────────────────────────────────────────────────────
   Actions
──────────────────────────────────────────────────────────── */
async function logout() {
  try {
    await API.get("/auth/logout");
  } catch {}
  router.replace("/login");
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8 dashboard">
    <!-- Header -->
    <header class="mb-6 text-center">
      <h1 class="text-3xl font-bold" style="font-family: var(--bb-font-heading);">
        <template v-if="displayName">Welcome, {{ displayName }}</template>
        <template v-else>Welcome to BundleBee</template>
      </h1>
      <p v-if="displayEmail" class="text-muted">{{ displayEmail }}</p>
    </header>

    <!-- Profile strip -->
    <section v-if="isLoggedIn" class="bb-card p-4 mb-6 flex items-center gap-4">
      <img
        :src="user?.profilePicture || defaultAvatar"
        alt="Profile picture"
        style="width:72px;height:72px;border-radius:50%;object-fit:cover"
      />
      <div class="flex-1">
        <div class="font-semibold">{{ displayName || 'User' }}</div>
        <div class="text-sm text-muted">{{ displayEmail || '—' }}</div>
      </div>
      <div class="flex gap-2">
        <router-link class="bb-btn bb-btn--ghost" to="/profile">Profile</router-link>
        <button class="bb-btn bb-btn--primary" @click="logout">Logout</button>
      </div>
    </section>

    <!-- Quick Actions -->
    <section class="bb-card p-4 mb-6">
      <div class="flex flex-wrap gap-3 justify-center">
        <router-link class="bb-btn bb-btn--primary" to="/questionnaire">Find Your Box</router-link>
        <router-link class="bb-btn bb-btn--ghost" to="/results">View Matches</router-link>
        <router-link v-if="enabledViews.includes('manage-affiliates')" class="bb-btn bb-btn--ghost" to="/manage-affiliates">
          Affiliate Partners
        </router-link>
      </div>
    </section>

    <!-- Popular Boxes for guests (and logged-in too) -->
    <section class="partners-section">
      <h2 class="text-2xl font-bold mb-3" style="font-family: var(--bb-font-heading);">Explore Subscription Boxes</h2>

      <div v-if="boxesLoading" class="bb-card p-4" aria-busy="true">Loading subscription boxes…</div>
      <p v-else-if="boxesError" class="bb-card p-3 text-red-600">{{ boxesError }}</p>

      <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="b in boxes"
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
            <p class="mt-2 text-sm" :style="{ color: 'var(--bb-foreground)' }">
              {{ b.description || 'No description provided.' }}
            </p>

            <div class="mt-3 flex items-center justify-between">
              <div class="font-bold">£{{ Number(b.price || 0).toFixed(2) }}</div>
              <div class="text-sm">⭐ {{ (b.rating || 0).toFixed(1) }}<span class="text-muted"> ({{ b.ratingsCount || 0 }})</span></div>
            </div>

            <div class="mt-3 flex gap-2">
              <a class="bb-btn bb-btn--ghost flex-1 text-center" :href="b.website || '#'" target="_blank" rel="noopener">Visit</a>
              <a
                class="bb-btn bb-btn--primary flex-1 text-center"
                :href="b.affiliateLink || b.website || '#'"
                target="_blank"
                rel="noopener"
              >Get Deal</a>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Top Categories -->
    <section class="mt-10">
      <h2 class="text-2xl font-bold mb-3" style="font-family: var(--bb-font-heading);">Top Categories</h2>

      <div v-if="catLoading" class="bb-card p-4" aria-busy="true">Loading categories…</div>
      <p v-else-if="catsError" class="bb-card p-3 text-red-600">{{ catsError }}</p>

      <div v-else-if="!categories.length" class="bb-card p-3 text-muted">
        No category stats yet. Check back soon!
      </div>

      <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <article v-for="c in categories" :key="c.name" class="bb-card p-3">
          <h3 class="font-semibold">{{ c.name }}</h3>
          <p class="text-sm">Average Rating: <strong>{{ c.avgRating.toFixed(1) }}</strong></p>
          <p class="text-sm">Popularity: <strong>{{ c.totalClicks }}</strong> clicks</p>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard { text-align: center; }

/* spacing & layout are handled by brand.css; minimal local styles here */
.partners-section { margin-top: 24px; }
</style>
