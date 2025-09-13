<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import API from "@/api";                       // axios with baseURL=/api, withCredentials
import { guardedGet } from "@/lib/guarded-api"; // 401/403-safe GET

/* ────────────────────────────────────────────────────────────
   State
──────────────────────────────────────────────────────────── */
const route = useRoute();
const router = useRouter();

const loading = ref(true);
const errorText = ref("");
const infoText = ref("");

const results = ref([]);       // normalized box list with _score
const showCount = ref(12);     // "Load more" pagination
const sortBy = ref("best");    // 'best' | 'price-asc' | 'rating-desc'

const defaultImage = "https://via.placeholder.com/320x240?text=BundleBee";

/* ────────────────────────────────────────────────────────────
   Read user choices (from query or localStorage)
──────────────────────────────────────────────────────────── */
function readChoices() {
  const q = route.query || {};
  const cats = (q.cats ? String(q.cats).split(",").filter(Boolean) : null);
  const pr = q.pr ? String(q.pr) : null;
  const b  = q.b  ? Number(q.b)  : null;
  const f  = q.f  ? String(q.f)  : null;

  if (cats && cats.length) return { categories: cats, priority: pr, budget: b, frequency: f };

  // fallback to localStorage (from Questionnaire)
  try {
    const raw = localStorage.getItem("bb_sub_q");
    if (raw) {
      const obj = JSON.parse(raw);
      return {
        categories: Array.isArray(obj.selectedCategories) ? obj.selectedCategories : [],
        priority: obj.selectedPriority || "",
        budget: typeof obj.budget === "number" ? obj.budget : undefined,
        frequency: obj.frequency || "",
      };
    }
  } catch {}
  return { categories: [], priority: "", budget: undefined, frequency: "" };
}

/* ────────────────────────────────────────────────────────────
   Logging (best-effort)
──────────────────────────────────────────────────────────── */
async function logInteraction(action, details = {}) {
  try {
    await API.post("/interactions", { action, details });
  } catch (e) {
    // non-blocking
    console.warn("Interaction log failed:", e?.response?.data || e);
  }
}

/* ────────────────────────────────────────────────────────────
   Normalize & scoring (fallback path)
──────────────────────────────────────────────────────────── */
function normBox(b) {
  const priceNum = Number(String(b.price ?? "").replace(/[^\d.]/g, "")) || 0;
  const rating   = Number(b.rating ?? b.ratings ?? 0) || 0;
  const ratingsCount = Number(b.ratingsCount ?? 0) || 0;

  return {
    id: b._id || b.id || `${b.name}-${priceNum}`,
    name: b.name || "Untitled",
    category: (b.category?.name || b.category || "").toString(),
    description: b.description || "",
    price: priceNum,
    rating,
    ratingsCount,
    imageUrl: b.imageUrl || b.logoUrl || "",
    website: b.website || b.url || "#",
    affiliateLink: b.affiliateLink || b.affiliate_url || "",
    raw: b,
  };
}

function scoreBox(box, choices) {
  // Choices
  const want = new Set((choices.categories || []).map(s => s.toLowerCase()));
  const prio = (choices.priority || "").toLowerCase();
  const budget = Number(choices.budget || 0) || 0;
  const freq = (choices.frequency || "").toLowerCase();

  let s = 0;

  // Category match
  if (!want.size || want.has((box.category || "").toLowerCase())) s += 2;

  // Budget
  if (!budget || box.price <= budget) s += 1;

  // Priority
  if (prio === "price")   s += (budget && box.price <= budget) ? 2 : 0;
  if (prio === "variety") s += Array.isArray(box.raw?.tags) ? Math.min(3, box.raw.tags.length / 3) : 0;
  if (prio === "quality") s += box.rating;

  // Frequency hints (regex on description)
  const d = (box.description || "").toLowerCase();
  if (freq === "monthly"   && /monthly|every month/.test(d)) s += 0.5;
  if (freq === "quarterly" && /quarter|every 3 months/.test(d)) s += 0.5;
  if (freq === "annual"    && /annual|yearly/.test(d)) s += 0.5;

  return s;
}

/* ────────────────────────────────────────────────────────────
   Data load
──────────────────────────────────────────────────────────── */
async function loadResults() {
  loading.value = true;
  errorText.value = "";
  infoText.value = "";

  try {
    // guard auth; redirection handled by guardedGet
    await guardedGet("/auth/status");

    const choices = readChoices();

    // 1) Preferred: server recommendations (if your backend supports it)
    try {
      const { data } = await API.get("/boxes/recommendations", {
        params: {
          cats: choices.categories?.join(",") || undefined,
          pr: choices.priority || undefined,
          b: choices.budget || undefined,
          f: choices.frequency || undefined,
        },
      });
      const list = Array.isArray(data) ? data : (data?.items || []);
      results.value = list.map(normBox).map(b => ({ ...b, _score: scoreBox(b, choices) }));
    } catch {
      // 2) Fallback: pull public/all and score on client
      let boxes = [];
      try {
        const { data } = await API.get("/boxes/public");
        boxes = Array.isArray(data) ? data : (data?.items || []);
      } catch {
        const { data } = await API.get("/boxes");
        boxes = Array.isArray(data) ? data : (data?.items || []);
      }
      const normalized = boxes.map(normBox);
      results.value = normalized.map(b => ({ ...b, _score: scoreBox(b, choices) }));
    }
  } catch (e) {
    console.error("Results load failed:", e?.response?.data || e);
    errorText.value = e?.response?.data?.message || "Failed to load subscription boxes. Try again later.";
  } finally {
    loading.value = false;
    logInteraction("viewed_page", { page: "Subscription Results" });
  }
}

/* ────────────────────────────────────────────────────────────
   Sorting & pagination
──────────────────────────────────────────────────────────── */
const sortedResults = computed(() => {
  const list = [...results.value];
  if (sortBy.value === "price-asc") {
    return list.sort((a, b) => a.price - b.price);
  }
  if (sortBy.value === "rating-desc") {
    return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
  // default: best match
  return list.sort((a, b) => (b._score || 0) - (a._score || 0));
});

const visibleResults = computed(() => sortedResults.value.slice(0, showCount.value));

function loadMore() {
  showCount.value += 12;
}

/* ────────────────────────────────────────────────────────────
   Affiliate clicks
──────────────────────────────────────────────────────────── */
async function openAffiliateLink(box) {
  try {
    if (!box.affiliateLink) {
      infoText.value = "No affiliate link available for this box.";
      setTimeout(() => (infoText.value = ""), 2200);
      return;
    }
    await logInteraction("clicked_affiliate_link", {
      boxId: box.id,
      boxName: box.name,
      url: box.affiliateLink,
    });
    window.open(box.affiliateLink, "_blank", "noopener");
  } catch (e) {
    console.error("Affiliate click log failed:", e?.response?.data || e);
    infoText.value = "Link opened, but we couldn’t record the click.";
    setTimeout(() => (infoText.value = ""), 2200);
    window.open(box.affiliateLink, "_blank", "noopener");
  }
}

/* ────────────────────────────────────────────────────────────
   Init
──────────────────────────────────────────────────────────── */
onMounted(loadResults);
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <header class="mb-6 text-center">
      <h2 class="text-3xl font-bold" style="font-family: var(--bb-font-heading);">
        Your Subscription Box Matches
      </h2>
      <p class="text-muted">Sorted for you based on your choices.</p>
    </header>

    <!-- banners -->
    <div v-if="loading" class="bb-card p-4" aria-busy="true">Loading subscription boxes…</div>
    <p v-if="infoText && !loading" class="bb-card p-3 text-green-700">{{ infoText }}</p>
    <p v-if="errorText && !loading" class="bb-card p-3 text-red-600">{{ errorText }}</p>

    <div v-if="!loading && !errorText" class="space-y-4">
      <!-- Controls -->
      <section class="bb-card p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div class="text-sm text-muted">
          Showing <strong>{{ visibleResults.length }}</strong> of <strong>{{ sortedResults.length }}</strong> results
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-muted">Sort by</label>
          <select class="bb-select" v-model="sortBy">
            <option value="best">Best Match</option>
            <option value="price-asc">Lowest Price</option>
            <option value="rating-desc">Highest Rating</option>
          </select>
          <button class="bb-btn bb-btn--ghost" @click="$router.push('/questionnaire')">Refine filters</button>
        </div>
      </section>

      <!-- Results grid -->
      <section class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <article v-for="(box, idx) in visibleResults" :key="box.id" class="bb-card p-3 flex flex-col">
          <div class="relative aspect-[4/3] w-full overflow-hidden rounded" :style="{ background: 'var(--bb-surface-2)' }">
            <img
              :src="box.imageUrl || defaultImage"
              :alt="box.name"
              style="width:100%;height:100%;object-fit:cover"
            />
            <span
              v-if="idx < 3 && sortBy==='best'"
              class="absolute top-2 left-2 px-2 py-1 text-xs font-semibold"
              :style="{
                background: 'var(--bb-primary, #ffb800)',
                color: 'var(--bb-primary-text, #1b1b1b)',
                borderRadius: '6px'
              }"
            >⭐ Top pick</span>
          </div>

          <div class="mt-3 flex-1 flex flex-col">
            <h3 class="text-lg font-semibold">{{ box.name }}</h3>
            <div class="text-sm text-muted">{{ box.category || '—' }}</div>
            <p class="mt-2 text-sm" :style="{ color: 'var(--bb-foreground)' }">
              {{ box.description || 'No description provided.' }}
            </p>

            <div class="mt-3 flex items-center justify-between">
              <div class="font-bold">£{{ Number(box.price || 0).toFixed(2) }}</div>
              <div class="text-sm">⭐ {{ (box.rating || 0).toFixed(1) }}<span class="text-muted"> ({{ box.ratingsCount || 0 }})</span></div>
            </div>

            <div class="mt-3 flex gap-2">
              <a
                class="bb-btn bb-btn--ghost flex-1 text-center"
                :href="box.website || '#'"
                target="_blank"
                rel="noopener"
              >Visit Website</a>
              <button
                class="bb-btn bb-btn--primary flex-1"
                :disabled="!box.affiliateLink"
                @click="openAffiliateLink(box)"
              >
                Get Deal
              </button>
            </div>
          </div>
        </article>
      </section>

      <div class="flex justify-center mt-4" v-if="visibleResults.length < sortedResults.length">
        <button class="bb-btn bb-btn--ghost" @click="loadMore">Load more</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Visuals rely on brand.css; minor helpers only */
</style>
