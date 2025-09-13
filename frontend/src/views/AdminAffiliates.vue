<script setup>
import { ref, computed, onMounted, watch } from "vue";
import API from "@/api";
import { guardedGet, guardedPost } from "@/lib/guarded-api";

/* ────────────────────────────────────────────────────────────
   State
──────────────────────────────────────────────────────────── */
const partner = ref({
  name: "",
  website: "",
  affiliateLink: "",
  commission: "",
  tier: "bronze",
  shortDescription: "",
  longDescription: "",
  logoUrl: "",
  keywords: "",
  subscriptionTier: "free",
  allowVideo: false,
  allowReply: false,
  isActive: true,
});

const partners = ref([]);
const searchQuery = ref("");
const filterTier = ref("");
const sortOption = ref("name");
const error = ref("");
const loading = ref(true);

const defaultLogo = "https://via.placeholder.com/80";

const currentPage = ref(1);
const itemsPerPage = 5;

/* ────────────────────────────────────────────────────────────
   Data load
   NOTE: list is served by admin API; creation uses /boxes
──────────────────────────────────────────────────────────── */
async function fetchPartners() {
  loading.value = true;
  error.value = "";
  try {
    // Admin list
    const data = await guardedGet("/admin/affiliates");
    partners.value = Array.isArray(data) ? data : (data?.items || []);
  } catch (err) {
    console.error("❌ Failed to load partners:", err?.response?.data || err);
    error.value = err?.response?.data?.message || "Failed to load partners.";
  } finally {
    loading.value = false;
  }
}

/* ────────────────────────────────────────────────────────────
   Filtering / sorting / pagination
──────────────────────────────────────────────────────────── */
const filteredPartners = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return partners.value.filter((p) => {
    const matchesTier = filterTier.value ? p.tier === filterTier.value : true;
    const matchesSearch = !q
      ? true
      : (p.name || "").toLowerCase().includes(q) ||
        (p.keywords || "").toLowerCase().includes(q);
    return matchesTier && matchesSearch;
  });
});

const sortedPartners = computed(() => {
  const list = [...filteredPartners.value];
  switch (sortOption.value) {
    case "recent":
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case "popularity":
      return list.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    case "rating":
      return list.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
    default:
      return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }
});

const paginatedPartners = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return sortedPartners.value.slice(start, start + itemsPerPage);
});

// Reset to page 1 on filter/sort/search change
watch([searchQuery, filterTier, sortOption], () => (currentPage.value = 1));

/* ────────────────────────────────────────────────────────────
   Actions
──────────────────────────────────────────────────────────── */
async function scrapePartner() {
  error.value = "";
  try {
    const data = await guardedPost("/boxes/scrape", { website: partner.value.website });
    partner.value.shortDescription = data.shortDescription ?? partner.value.shortDescription;
    partner.value.longDescription  = data.longDescription  ?? partner.value.longDescription;
    partner.value.logoUrl          = data.logoUrl          ?? partner.value.logoUrl;
    partner.value.keywords         = data.keywords         ?? partner.value.keywords;
  } catch (err) {
    console.error("❌ Scraping failed:", err?.response?.data || err);
    error.value = err?.response?.data?.message || "Unable to auto-fill from website.";
  }
}

async function createPartner() {
  error.value = "";
  try {
    await guardedPost("/boxes", partner.value);
    // soft toast feel without alert():
    console.info("✅ Partner saved successfully");
    await fetchPartners();
    // reset form (keep tier defaults)
    partner.value = {
      name: "",
      website: "",
      affiliateLink: "",
      commission: "",
      tier: partner.value.tier || "bronze",
      shortDescription: "",
      longDescription: "",
      logoUrl: "",
      keywords: "",
      subscriptionTier: "free",
      allowVideo: false,
      allowReply: false,
      isActive: true,
    };
  } catch (err) {
    console.error("❌ Failed to save partner:", err?.response?.data || err);
    error.value = err?.response?.data?.message || "Failed to create partner.";
  }
}

function editPartner(p) {
  partner.value = { ...p };
}

// local guarded DELETE
async function deletePartner(id) {
  if (!confirm("Delete this partner?")) return;
  error.value = "";
  try {
    const res = await API.delete(`/boxes/${id}`);
    if (res?.status >= 200 && res?.status < 300) {
      await fetchPartners();
    } else {
      throw new Error("Delete failed");
    }
  } catch (err) {
    console.error("❌ Delete failed:", err?.response?.data || err);
    error.value = err?.response?.data?.message || "Failed to delete partner.";
  }
}

onMounted(fetchPartners);
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8 admin-affiliates">
    <header class="mb-6">
      <h1 class="text-3xl font-bold" style="font-family: var(--bb-font-heading);">
        Manage Affiliate Partners
      </h1>
      <p class="text-muted mt-1">Search, sort, add and maintain partner entries.</p>
    </header>

    <!-- Status -->
    <div v-if="loading" class="bb-card p-4 mb-6" aria-busy="true">Loading partners…</div>
    <div v-else-if="error" class="bb-card p-4 mb-6">
      <div class="text-red-600 font-semibold">Error</div>
      <div class="mt-1">{{ error }}</div>
    </div>

    <!-- Filters -->
    <section class="bb-card p-4 mb-6">
      <div class="grid gap-3 grid-cols-1 md:grid-cols-3">
        <input class="bb-input" v-model="searchQuery" placeholder="Search by name or keyword…" />
        <select class="bb-select" v-model="filterTier">
          <option value="">All tiers</option>
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
        </select>
        <select class="bb-select" v-model="sortOption">
          <option value="name">Sort by name</option>
          <option value="recent">Sort by recent</option>
          <option value="popularity">Sort by popularity</option>
          <option value="rating">Sort by rating</option>
        </select>
      </div>
    </section>

    <!-- Create / Edit -->
    <section class="bb-card p-5 mb-8">
      <h2 class="text-xl font-semibold mb-3" style="font-family: var(--bb-font-heading);">Add / Edit Partner</h2>
      <form class="grid gap-3 md:grid-cols-2" @submit.prevent="createPartner">
        <input class="bb-input" v-model="partner.name" type="text" placeholder="Partner name" required />
        <input class="bb-input" v-model="partner.website" type="url" placeholder="Partner website" required />
        <input class="bb-input" v-model="partner.affiliateLink" type="url" placeholder="Affiliate link" required />
        <input class="bb-input" v-model="partner.commission" type="number" placeholder="% Commission" required />
        <select class="bb-select" v-model="partner.tier">
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
        </select>

        <div class="md:col-span-2 flex flex-wrap gap-2">
          <button type="button" class="bb-btn bb-btn--warning" @click.prevent="scrapePartner">
            Auto-fill from website
          </button>
        </div>

        <textarea class="bb-input md:col-span-2" rows="3" v-model="partner.shortDescription" placeholder="Short description"></textarea>
        <textarea class="bb-input md:col-span-2" rows="5" v-model="partner.longDescription"  placeholder="Long description"></textarea>
        <input class="bb-input md:col-span-2" v-model="partner.keywords" placeholder="Keywords (comma separated)" />
        <input class="bb-input md:col-span-2" v-model="partner.logoUrl" placeholder="Logo URL" />

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 md:col-span-2">
          <select class="bb-select" v-model="partner.subscriptionTier">
            <option value="free">Free</option>
            <option value="premium">Premium (Video Ad + Replies)</option>
          </select>

          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="partner.allowVideo" />
            <span>Allow video</span>
          </label>
          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="partner.allowReply" />
            <span>Allow replies</span>
          </label>
        </div>

        <label class="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" v-model="partner.isActive" />
          <span>Active partner</span>
        </label>

        <div class="md:col-span-2 flex justify-end gap-2">
          <button type="submit" class="bb-btn bb-btn--primary">Save partner</button>
        </div>
      </form>
    </section>

    <!-- List -->
    <section class="bb-card p-5" v-if="sortedPartners.length">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl font-semibold" style="font-family: var(--bb-font-heading);">Existing partners</h2>
        <span class="bb-badge">Total: {{ sortedPartners.length }}</span>
      </div>

      <div class="space-y-3">
        <article
          v-for="p in paginatedPartners"
          :key="p._id"
          class="bb-card bb-card--hover p-3 flex gap-4 items-center"
        >
          <img :src="p.logoUrl || defaultLogo" class="logo" alt="logo" />
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold truncate">{{ p.name }}</h3>
            <p class="text-sm text-muted truncate">
              <strong>Website:</strong>
              <a :href="p.website" target="_blank" rel="noopener" class="underline">{{ p.website }}</a>
            </p>
            <p class="text-sm text-muted">
              <strong>Tier:</strong> {{ p.tier }} ·
              <strong>Commission:</strong> {{ p.commission }}% ·
              <strong>Subscription:</strong> {{ p.subscriptionTier }}
            </p>
            <p class="text-sm text-muted truncate">
              <strong>Keywords:</strong> {{ p.keywords }}
            </p>
            <p class="text-sm">
              <strong>Status:</strong>
              <span :class="p.isActive ? 'text-green-600' : 'text-muted'">
                {{ p.isActive ? 'Active' : 'Inactive' }}
              </span>
            </p>
          </div>

          <div class="shrink-0 flex gap-2">
            <button class="bb-btn bb-btn--ghost" @click="editPartner(p)">Edit</button>
            <button class="bb-btn bb-btn--danger" @click="deletePartner(p._id)">Delete</button>
          </div>
        </article>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-center gap-3 mt-4">
        <button class="bb-btn bb-btn--ghost" :disabled="currentPage === 1" @click="currentPage--">Prev</button>
        <span>Page {{ currentPage }}</span>
        <button
          class="bb-btn bb-btn--ghost"
          :disabled="currentPage * itemsPerPage >= sortedPartners.length"
          @click="currentPage++"
        >Next</button>
      </div>
    </section>

    <section v-else class="bb-card p-4 text-muted">
      No partners found.
    </section>
  </div>
</template>

<style scoped>
.admin-affiliates { /* container tweaks only; visuals come from brand.css */
}
.logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
  background: var(--bb-surface);
  border-radius: 10px;
  border: 1px solid var(--bb-border);
}
</style>
