<script setup>
import { ref, onMounted, nextTick, computed } from "vue";
import Chart from "chart.js/auto";
import API from "@/api";                     // for blob downloads (works with interceptor)
import { guardedGet } from "@/lib/guarded-api"; // guards 401/403, routes to 2FA when needed

/* ────────────────────────────────────────────────────────────
   State
──────────────────────────────────────────────────────────── */
const analytics = ref(null);
const loading = ref(true);
const errorText = ref("");

const pageViewsCanvas = ref(null);
const subscriptionCanvas = ref(null);
const affiliateCanvas = ref(null);

// keep Chart instances so we can destroy before re-render
let charts = {
  pv: null,
  sub: null,
  aff: null,
};

const today = new Date();
const pad = (n) => String(n).padStart(2, "0");
const isoDay = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const endDate = ref(isoDay(today));
const startDate = ref(isoDay(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)));
const selectedPartnerId = ref("");

const partners = ref([]);

const hasPageViews       = computed(() => (analytics.value?.pageViews ?? []).length > 0);
const hasSubscriptions   = computed(() => (analytics.value?.subscriptions ?? []).length > 0);
const hasAffiliateClicks = computed(() => (analytics.value?.affiliateClicks ?? []).length > 0);

/* ────────────────────────────────────────────────────────────
   Data load
──────────────────────────────────────────────────────────── */
async function fetchPartners() {
  try {
    const data = await guardedGet("/admin/affiliates");
    partners.value = Array.isArray(data) ? data : (data?.items || []);
  } catch (e) {
    // not fatal for the view — just log
    console.error("Failed to fetch partners:", e?.response?.data || e);
  }
}

async function fetchAnalytics() {
  loading.value = true;
  errorText.value = "";
  try {
    const params = {
      startDate: startDate.value,
      endDate: endDate.value,
    };
    if (selectedPartnerId.value) params.partnerId = selectedPartnerId.value;

    const data = await guardedGet("/admin/analytics", { params });
    analytics.value = data || null;
    await nextTick();
    renderCharts();
  } catch (e) {
    console.error("Analytics Fetch Failed:", e?.response?.data || e);
    errorText.value = e?.response?.data?.message || "Failed to fetch analytics. Please try again.";
    destroyCharts();
  } finally {
    loading.value = false;
  }
}

/* ────────────────────────────────────────────────────────────
   Charts
──────────────────────────────────────────────────────────── */
function destroyCharts() {
  try { charts.pv?.destroy(); } catch {}
  try { charts.sub?.destroy(); } catch {}
  try { charts.aff?.destroy(); } catch {}
  charts = { pv: null, sub: null, aff: null };
}

function renderCharts() {
  destroyCharts();
  if (!analytics.value) return;

  // Page Views (bar)
  if (hasPageViews.value && pageViewsCanvas.value) {
    const ctx = pageViewsCanvas.value.getContext("2d");
    charts.pv = new Chart(ctx, {
      type: "bar",
      data: {
        labels: analytics.value.pageViews.map((pv) => pv.category),
        datasets: [
          {
            label: "Page Views",
            data: analytics.value.pageViews.map((pv) => pv.views),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }

  // Subscriptions (line)
  if (hasSubscriptions.value && subscriptionCanvas.value) {
    const ctx = subscriptionCanvas.value.getContext("2d");
    charts.sub = new Chart(ctx, {
      type: "line",
      data: {
        labels: analytics.value.subscriptions.map((s) => s.date),
        datasets: [
          {
            label: "New Subscriptions",
            data: analytics.value.subscriptions.map((s) => s.count),
            fill: false,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }

  // Affiliate Clicks (pie)
  if (hasAffiliateClicks.value && affiliateCanvas.value) {
    const ctx = affiliateCanvas.value.getContext("2d");
    charts.aff = new Chart(ctx, {
      type: "pie",
      data: {
        labels: analytics.value.affiliateClicks.map((a) => a.partner),
        datasets: [
          {
            label: "Affiliate Clicks",
            data: analytics.value.affiliateClicks.map((a) => a.clicks),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }
}

/* ────────────────────────────────────────────────────────────
   CSV exports (blob downloads)
──────────────────────────────────────────────────────────── */
async function exportUsersCSV() {
  try {
    const res = await API.get("/admin/export-users", { responseType: "blob" });
    const blob = new Blob([res.data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("User CSV Export Error:", e?.response?.data || e);
    errorText.value = "Failed to export user data.";
  }
}

async function exportAnalyticsCSV() {
  try {
    const res = await API.get("/admin/export-analytics", {
      responseType: "blob",
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
        partnerId: selectedPartnerId.value || undefined,
      },
    });
    const blob = new Blob([res.data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analytics.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Analytics CSV Export Error:", e?.response?.data || e);
    errorText.value = "Failed to export analytics data.";
  }
}

onMounted(async () => {
  await fetchPartners();
  await fetchAnalytics();
});
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8 analytics">
    <header class="mb-6">
      <h1 class="text-3xl font-bold" style="font-family: var(--bb-font-heading);">
        📊 Admin Analytics
      </h1>
      <p class="text-muted mt-1">Page views, subscriptions, and affiliate clicks at a glance.</p>
    </header>

    <!-- Filters -->
    <section class="bb-card p-4 mb-6">
      <div class="grid gap-3 md:grid-cols-4 items-end">
        <label class="flex flex-col">
          <span class="text-sm text-muted mb-1">From</span>
          <input class="bb-input" type="date" v-model="startDate" />
        </label>

        <label class="flex flex-col">
          <span class="text-sm text-muted mb-1">To</span>
          <input class="bb-input" type="date" v-model="endDate" />
        </label>

        <label class="flex flex-col md:col-span-1">
          <span class="text-sm text-muted mb-1">Partner</span>
          <select class="bb-select" v-model="selectedPartnerId">
            <option value="">All Partners</option>
            <option v-for="p in partners" :key="p._id" :value="p._id">{{ p.name }}</option>
          </select>
        </label>

        <button class="bb-btn bb-btn--primary md:justify-self-end" @click="fetchAnalytics">
          Apply Filter
        </button>
      </div>
    </section>

    <!-- Status -->
    <div v-if="loading" class="bb-card p-4 mb-6" aria-busy="true">
      Loading analytics…
    </div>

    <div v-else-if="errorText" class="bb-card p-4 mb-6">
      <div class="text-red-600 font-semibold">Error</div>
      <div class="mt-1">{{ errorText }}</div>
      <button class="bb-btn bb-btn--ghost mt-3" @click="fetchAnalytics">Retry</button>
    </div>

    <!-- Charts -->
    <div v-else class="space-y-6">
      <div class="grid gap-6 md:grid-cols-3">
        <!-- Page Views -->
        <div class="bb-card p-4">
          <h3 class="font-semibold mb-2" style="font-family: var(--bb-font-heading);">Page Views</h3>
          <div v-if="hasPageViews" style="height: 260px;">
            <canvas ref="pageViewsCanvas"></canvas>
          </div>
          <p v-else class="text-muted">No page view data available.</p>
        </div>

        <!-- Subscriptions -->
        <div class="bb-card p-4">
          <h3 class="font-semibold mb-2" style="font-family: var(--bb-font-heading);">New Subscriptions</h3>
          <div v-if="hasSubscriptions" style="height: 260px;">
            <canvas ref="subscriptionCanvas"></canvas>
          </div>
          <p v-else class="text-muted">No subscription data available.</p>
        </div>

        <!-- Affiliate Clicks -->
        <div class="bb-card p-4">
          <h3 class="font-semibold mb-2" style="font-family: var(--bb-font-heading);">Affiliate Clicks</h3>
          <div v-if="hasAffiliateClicks" style="height: 260px;">
            <canvas ref="affiliateCanvas"></canvas>
          </div>
          <p v-else class="text-muted">No affiliate click data available.</p>
        </div>
      </div>

      <!-- Export -->
      <div class="bb-card p-4 flex flex-wrap gap-3 items-center justify-center">
        <button class="bb-btn bb-btn--warning" @click="exportUsersCSV">⬇️ Export Users CSV</button>
        <button class="bb-btn bb-btn--warning" @click="exportAnalyticsCSV">⬇️ Export Analytics CSV</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analytics { /* container tweaks only; visuals come from brand.css */ }
</style>
