<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import API from "@/api";                      // axios with baseURL=/api + withCredentials
import { guardedGet } from "@/lib/guarded-api"; // 401→/login, 403(MFA)→/verify-2fa

/* ────────────────────────────────────────────────────────────
   State
──────────────────────────────────────────────────────────── */
const router = useRouter();

const loading = ref(true);
const saving  = ref(false);
const errorText = ref("");
const infoText  = ref("");

const categories = ref([]);            // [{ _id, name }]
const search = ref("");
const selectedCategories = ref([]);    // store category names for simplicity

const priorities = ["Price", "Variety", "Quality"];
const selectedPriority = ref("");

const budget = ref(40);                // £ per month
const frequency = ref("monthly");      // 'monthly' | 'quarterly' | 'annual'

// Live preview (top 3 matches)
const previewLoading = ref(false);
const preview = ref([]);               // [{ name, price, category, imageUrl, website }]

/* ────────────────────────────────────────────────────────────
   Derived
──────────────────────────────────────────────────────────── */
const filteredCategories = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return categories.value;
  return categories.value.filter(c => c.name.toLowerCase().includes(q));
});

const canSubmit = computed(() =>
  selectedCategories.value.length > 0 && !saving.value
);

/* ────────────────────────────────────────────────────────────
   Local storage (persist state)
──────────────────────────────────────────────────────────── */
const LS_KEY = "bb_sub_q";
function saveLocal() {
  const payload = {
    selectedCategories: selectedCategories.value,
    selectedPriority: selectedPriority.value,
    budget: budget.value,
    frequency: frequency.value,
  };
  localStorage.setItem(LS_KEY, JSON.stringify(payload));
}
function restoreLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.selectedCategories)) selectedCategories.value = data.selectedCategories;
    if (typeof data.selectedPriority === "string") selectedPriority.value = data.selectedPriority;
    if (typeof data.budget === "number") budget.value = data.budget;
    if (typeof data.frequency === "string") frequency.value = data.frequency;
  } catch {}
}

/* ────────────────────────────────────────────────────────────
   Load
──────────────────────────────────────────────────────────── */
async function loadCategories() {
  // Primary
  try {
    const res = await API.get("/categories");
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.items)) return res.data.items;
  } catch {}
  // Fallback to top categories (optional)
  try {
    const res = await API.get("/top-categories");
    return Array.isArray(res.data) ? res.data : (res.data?.items || []);
  } catch {}
  return [];
}

async function logInteraction(action, details = {}) {
  try {
    await API.post("/interactions", { action, details });
  } catch (e) {
    // non-blocking
    console.warn("Interaction log failed:", e?.response?.data || e);
  }
}

onMounted(async () => {
  try {
    // Guarded auth (handles redirects on its own)
    await guardedGet("/auth/status");
  } catch {
    return; // redirected by guardedGet
  }

  restoreLocal();

  try {
    const cats = await loadCategories();
    categories.value = cats.map((c) => ({ _id: c._id || c.id || c.name, name: c.name || c.title || "" }))
                           .filter((c) => c.name);
  } catch (e) {
    errorText.value = "Failed to load categories. Please try again later.";
  } finally {
    loading.value = false;
  }

  await nextTick();
  logInteraction("viewed_page", { page: "Subscription Questionnaire" });
  debouncedPreview(); // initial preview if we have local selections
});

/* ────────────────────────────────────────────────────────────
   Select helpers
──────────────────────────────────────────────────────────── */
function toggleCategory(name) {
  const i = selectedCategories.value.indexOf(name);
  if (i === -1) selectedCategories.value.push(name);
  else selectedCategories.value.splice(i, 1);
}
function selectAll() {
  selectedCategories.value = categories.value.map((c) => c.name);
}
function clearAll() {
  selectedCategories.value = [];
}

/* ────────────────────────────────────────────────────────────
   Live preview (best-effort client filter on /boxes/public)
──────────────────────────────────────────────────────────── */
let previewTimer = null;
function debouncedPreview() {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(loadPreview, 250);
}

async function loadPreview() {
  previewLoading.value = true;
  try {
    // Prefer public endpoint if present
    let boxes = [];
    try {
      const res = await API.get("/boxes/public");
      boxes = Array.isArray(res.data) ? res.data : (res.data?.items || []);
    } catch {
      const res = await API.get("/boxes");
      boxes = Array.isArray(res.data) ? res.data : (res.data?.items || []);
    }

    // Normalize for filtering
    const want = new Set(selectedCategories.value.map((s) => s.toLowerCase()));
    const freq = frequency.value;

    const scored = boxes
      .map((b) => ({
        ...b,
        _cat: (b.category?.name || b.category || "").toLowerCase(),
        _price: Number((b.price || "").toString().replace(/[^\d.]/g, "")) || 0,
      }))
      .filter((b) => (want.size ? want.has(b._cat) : true))
      .filter((b) => (budget.value ? b._price <= budget.value : true))
      .map((b) => {
        // Simple score: prioritize the user-selected priority
        let score = 0;
        if (selectedPriority.value === "Price")   score += (budget.value - b._price >= 0 ? 2 : 0);
        if (selectedPriority.value === "Variety") score += Array.isArray(b.tags) ? Math.min(3, b.tags.length / 3) : 0;
        if (selectedPriority.value === "Quality") score += (b.rating || 0);
        // Prefer matching frequency keywords in description (best effort)
        const desc = (b.description || "").toLowerCase();
        if (freq === "monthly"   && /monthly|every month/.test(desc)) score += 0.5;
        if (freq === "quarterly" && /quarter|every 3 months/.test(desc)) score += 0.5;
        if (freq === "annual"    && /annual|yearly/.test(desc)) score += 0.5;
        return { ...b, _score: score };
      })
      .sort((a, b) => b._score - a._score);

    preview.value = scored.slice(0, 3).map(b => ({
      name: b.name,
      price: b._price,
      category: b.category?.name || b.category || "",
      imageUrl: b.imageUrl || b.logoUrl,
      website: b.website || b.url || "#",
    }));
  } catch (e) {
    // non-blocking
    preview.value = [];
  } finally {
    previewLoading.value = false;
  }
}

/* Update preview + save locally when inputs change */
watch([selectedCategories, selectedPriority, budget, frequency], () => {
  saveLocal();
  debouncedPreview();
});

/* ────────────────────────────────────────────────────────────
   Submit
──────────────────────────────────────────────────────────── */
async function submitQuestionnaire() {
  if (!selectedCategories.value.length) {
    errorText.value = "Please select at least one category.";
    return;
  }
  errorText.value = "";
  saving.value = true;

  try {
    await logInteraction("selected_subscription", {
      categories: selectedCategories.value,
      priority: selectedPriority.value || "None",
      budget: budget.value,
      frequency: frequency.value,
    });

    // Persist for results page and navigate
    saveLocal();
    const query = {
      cats: selectedCategories.value.join(","),
      pr: selectedPriority.value || "",
      b: String(budget.value),
      f: frequency.value,
    };
    router.push({ path: "/results", query });
  } catch (e) {
    console.error("Questionnaire submit failed:", e?.response?.data || e);
    errorText.value = "We couldn't process your request. Please try again.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8">
    <header class="mb-6 text-center">
      <h2 class="text-3xl font-bold" style="font-family: var(--bb-font-heading);">
        Find Your Perfect Subscription Box
      </h2>
      <p class="text-muted">Tell us what you love and we’ll suggest the best matches.</p>
    </header>

    <div v-if="loading" class="bb-card p-4" aria-busy="true">Loading categories…</div>

    <div v-else class="space-y-6">
      <p v-if="infoText" class="bb-card p-3 text-green-700">{{ infoText }}</p>
      <p v-if="errorText" class="bb-card p-3 text-red-600">{{ errorText }}</p>

      <!-- Categories -->
      <section class="bb-card p-5">
        <h3 class="text-xl font-semibold mb-3" style="font-family: var(--bb-font-heading);">
          What categories are you into?
        </h3>

        <div class="grid gap-3 md:grid-cols-[1fr_auto] items-end">
          <input class="bb-input" v-model="search" placeholder="Search categories…" />
          <div class="flex gap-2 md:justify-end">
            <button class="bb-btn bb-btn--ghost" type="button" @click="selectAll"  :disabled="!categories.length">Select all</button>
            <button class="bb-btn bb-btn--ghost" type="button" @click="clearAll"  :disabled="!selectedCategories.length">Clear</button>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-8" v-if="categories.length">
          <div class="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full">
            <label
              v-for="c in filteredCategories"
              :key="c._id"
              class="inline-flex items-center gap-2 p-2 rounded-md cursor-pointer"
              :style="{ background: 'var(--bb-surface-2)' }"
            >
              <input
                type="checkbox"
                :value="c.name"
                v-model="selectedCategories"
              />
              <span>{{ c.name }}</span>
            </label>
          </div>
        </div>
        <p v-else class="text-muted">⚠️ No categories available.</p>
      </section>

      <!-- Priorities & Budget -->
      <section class="bb-card p-5">
        <div class="grid gap-6 md:grid-cols-2">
          <div>
            <h3 class="text-xl font-semibold mb-3" style="font-family: var(--bb-font-heading);">
              What’s most important to you?
            </h3>
            <div class="flex flex-wrap gap-8">
              <label
                v-for="p in priorities"
                :key="p"
                class="inline-flex items-center gap-2 p-2 rounded-md cursor-pointer"
                :style="{ background: 'var(--bb-surface-2)' }"
              >
                <input type="radio" name="priority" :value="p" v-model="selectedPriority" />
                <span>{{ p }}</span>
              </label>
            </div>
            <p class="text-muted mt-2">This helps us sort your matches.</p>
          </div>

          <div>
            <h3 class="text-xl font-semibold mb-3" style="font-family: var(--bb-font-heading);">
              Your budget (per month)
            </h3>
            <div class="flex items-center gap-3">
              <input class="flex-1" type="range" min="5" max="200" step="5" v-model="budget" />
              <div class="w-24 text-right font-semibold">£{{ budget }}</div>
            </div>

            <div class="mt-4">
              <span class="text-sm text-muted mb-1 block">Delivery frequency</span>
              <div class="flex flex-wrap gap-2">
                <label class="bb-chip" :class="{ 'is-active': frequency==='monthly' }">
                  <input type="radio" value="monthly"   v-model="frequency" hidden />
                  Monthly
                </label>
                <label class="bb-chip" :class="{ 'is-active': frequency==='quarterly' }">
                  <input type="radio" value="quarterly" v-model="frequency" hidden />
                  Quarterly
                </label>
                <label class="bb-chip" :class="{ 'is-active': frequency==='annual' }">
                  <input type="radio" value="annual"    v-model="frequency" hidden />
                  Annual
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Preview -->
      <section class="bb-card p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xl font-semibold" style="font-family: var(--bb-font-heading);">
            Preview Matches
          </h3>
          <div class="text-sm text-muted">Top suggestions update as you tweak filters</div>
        </div>

        <div v-if="previewLoading" aria-busy="true" class="text-muted">Finding matches…</div>

        <div v-else-if="!preview.length" class="text-muted">
          No preview yet — select a few categories or adjust your budget.
        </div>

        <div v-else class="grid gap-4 md:grid-cols-3">
          <a
            v-for="card in preview"
            :key="card.name + card.category"
            class="bb-card p-3 block hover:opacity-90 transition"
            :href="card.website || '#'"
            target="_blank"
            rel="noopener"
          >
            <div class="aspect-[4/3] mb-2 overflow-hidden rounded" :style="{ background: 'var(--bb-surface-2)' }">
              <img
                v-if="card.imageUrl"
                :src="card.imageUrl"
                alt=""
                style="width:100%;height:100%;object-fit:cover"
              />
            </div>
            <div class="font-semibold">{{ card.name }}</div>
            <div class="text-sm text-muted">{{ card.category }}</div>
            <div class="mt-1 font-bold">£{{ Number(card.price || 0).toFixed(2) }}</div>
          </a>
        </div>
      </section>

      <!-- Submit -->
      <section class="bb-card p-5">
        <button
          class="bb-btn bb-btn--primary"
          :disabled="!canSubmit"
          @click="submitQuestionnaire"
          :aria-busy="saving ? 'true' : 'false'"
        >
          {{ saving ? "Preparing your matches…" : "See My Matches" }}
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Most visuals come from brand.css. Small chip helper: */
.bb-chip {
  padding: 8px 12px;
  border: 1px solid var(--bb-border);
  background: var(--bb-surface);
  border-radius: 999px;
  cursor: pointer;
  user-select: none;
}
.bb-chip.is-active {
  background: var(--bb-primary-ghost, rgba(255,184,0,.12));
  border-color: var(--bb-primary, #ffb800);
}
</style>
