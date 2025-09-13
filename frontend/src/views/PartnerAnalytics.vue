<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import Chart from "chart.js/auto";
import API from "@/api";                   // axios with cookies + interceptor
import { guardedGet } from "@/lib/guarded-api"; // handles 401/403 (MFA redirects)

/* ────────────────────────────────────────────────────────────
   State
──────────────────────────────────────────────────────────── */
const loading = ref(true);
const errorText = ref("");

const analytics = ref(null);

// Date range (default: last 30 days)
const today = new Date();
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const endDate = ref(toISO(today));
const startDate = ref(toISO(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)));

// Charts
const revenueCanvas = ref(null);
const clicksCanvas  = ref(null);
const convCanvas    = ref(null);

let charts = { rev: null, clk: null, conv: null };

/* ────────────────────────────────────────────────────────────
   Normalizers (accept multiple backend shapes safely)
──────────────────────────────────────────────────────────── */
const series = computed(() => {
  // Accept: analytics.value.timeseries OR analytics.value.series.daily OR []
  const raw =
    analytics.value?.timeseries ||
    analytics.value?.series?.daily ||
    [];
  // Normalize fields: { date, revenue, clicks, conversions }
  return raw.map((d) => ({
    date: d.date || d.day || d.ts || "",
    revenue: Number(d.revenue ?? d.amount ?? 0),
    clicks: Number(d.clicks ?? d.cts ?? 0),
    conversions: Number(d.conversions ?? d.cnv ?? 0),
  }));
});

function sumSeries(key) {
  return series.value.reduce((acc, d) => acc + (Number(d[key]) || 0), 0);
}

const totalRevenue = computed(() =>
  Number(analytics.value?.totalRevenue ?? sumSeries("revenue"))
);
const totalClicks = computed(() =>
  Number(analytics.value?.totalClicks ?? sumSeries("clicks"))
);
const totalConversions = computed(() =>
  Number(analytics.value?.totalConversions ?? sumSeries("conversions"))
);

const convRate = computed(() => {
  const clicks = totalClicks.value || 0;
  const conv = totalConversions.value || 0;
  return clicks > 0 ? (conv / clicks) * 100 : 0;
});

/* ────────────────────────────────────────────────────────────
   Data load
──────────────────────────────────────────────────────────── */
async function fetchAnalytics() {
  loading.value = true;
  errorText.value = "";
  try {
    const params = { startDate: startDate.value, endDate: endDate.value };
    // GET /partner/analytics
    const data = await guardedGet("/partner/analytics", { params });
    analytics.value = data || {};
    await nextTick();
    renderCharts();
  } catch (e) {
    console.error("❌ Partner analytics fetch failed:", e?.response?.data || e);
    errorText.value = e?.response?.data?.message || "Failed to load analytics.";
    destroyCharts();
  } finally {
    loading.value = false;
  }
}

onMounted(fetchAnalytics);

/* ────────────────────────────────────────────────────────────
   Charts
──────────────────────────────────────────────────────────── */
function destroyCharts() {
  try { charts.rev?.destroy(); } catch {}
  try { charts.clk?.destroy(); } catch {}
  try { charts.conv?.destroy(); } catch {}
  charts = { rev: null, clk: null, conv: null };
}

function renderCharts() {
  destroyCharts();
  const s = series.value;
  if (!s.length) return;

  const labels = s.map((d) => d.date);

  if (revenueCanvas.value) {
    charts.rev = new Chart(revenueCanvas.value.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Revenue (£)", data: s.map((d) => d.revenue), fill: false, tension: 0.3 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  }

  if (clicksCanvas.value) {
    charts.clk = new Chart(clicksCanvas.value.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Clicks", data: s.map((d) => d.clicks) },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  }

  if (convCanvas.value) {
    const rate = s.map((d) => {
      const c = Number(d.clicks) || 0;
      const v = Number(d.conversions) || 0;
      return c > 0 ? (v / c) * 100 : 0;
    });
    charts.conv = new Chart(convCanvas.value.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [{ label: "Conversion Rate (%)", data: rate, fill: false, tension: 0.3 }],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  }
}

/* ────────────────────────────────────────────────────────────
   Export CSV
──────────────────────────────────────────────────────────── */
async function exportCSV() {
  try {
    const res = await API.get("/partner/export-analytics", {
      responseType: "blob",
      params: { startDate: startDate.value, endDate: endDate.value },
    });
    const blob = new Blob([res.data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "partner-analytics.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("CSV export failed:", e?.response?.data || e);
    errorText.value = e?.response?.data?.message || "Failed to export CSV.";
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <header class="mb-6">
      <h1 class="text-3xl font-bold" style="font-family: var(--bb-font-heading);">
        Your Partner Analytics
      </h1>
      <p class="text-muted">Track your performance over time.</p>
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
        <div class="md:col-span-2 md:justify-self-end flex gap-2">
          <button class="bb-btn bb-btn--ghost" @click="exportCSV">⬇️ Export CSV</button>
          <button class="bb-btn bb-btn--primary" @click="fetchAnalytics">Apply Filter</button>
        </div>
      </div>
    </section>

    <!-- Status -->
    <div v-if="loading" class="bb-card p-4" aria-busy="true">Loading analytics…</div>

    <div v-else-if="errorText" class="bb-card p-4">
      <div class="text-red-600 font-semibold">Error</div>
      <div class="mt-1">{{ errorText }}</div>
    </div>

    <!-- Totals + Charts -->
    <div v-else class="space-y-6">
      <!-- Totals -->
      <section class="grid gap-4 md:grid-cols-3">
        <div class="bb-card p-4">
          <div class="text-sm text-muted">Total Revenue</div>
          <div class="text-2xl font-bold">£{{ totalRevenue.toFixed(2) }}</div>
        </div>
        <div class="bb-card p-4">
          <div class="text-sm text-muted">Total Clicks</div>
          <div class="text-2xl font-bold">{{ totalClicks }}</div>
        </div>
        <div class="bb-card p-4">
          <div class="text-sm text-muted">Total Conversions</div>
          <div class="text-2xl font-bold">{{ totalConversions }}</div>
          <div class="text-sm text-muted mt-1">Conv. Rate: {{ convRate.toFixed(2) }}%</div>
        </div>
      </section>

      <!-- Charts -->
      <section class="grid gap-6 md:grid-cols-3">
        <div class="bb-card p-4">
          <h3 class="font-semibold mb-2" style="font-family: var(--bb-font-heading);">Revenue</h3>
          <div style="height: 240px;">
            <canvas ref="revenueCanvas" v-if="series.length"></canvas>
            <p v-else class="text-muted">No data for this range.</p>
          </div>
        </div>

        <div class="bb-card p-4">
          <h3 class="font-semibold mb-2" style="font-family: var(--bb-font-heading);">Clicks</h3>
          <div style="height: 240px;">
            <canvas ref="clicksCanvas" v-if="series.length"></canvas>
            <p v-else class="text-muted">No data for this range.</p>
          </div>
        </div>

        <div class="bb-card p-4">
          <h3 class="font-semibold mb-2" style="font-family: var(--bb-font-heading);">Conversion Rate</h3>
          <div style="height: 240px;">
            <canvas ref="convCanvas" v-if="series.length"></canvas>
            <p v-else class="text-muted">No data for this range.</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* visuals come from brand.css; keep local styles minimal */
</style>
