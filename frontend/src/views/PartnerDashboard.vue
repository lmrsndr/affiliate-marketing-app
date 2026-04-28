<script setup>
import { ref, onMounted, computed, nextTick } from "vue";
import Chart from "chart.js/auto";
import API from "@/api";                         // axios with cookies + interceptor
import { guardedGet } from "@/lib/guarded-api";  // handles 401/403 (MFA redirects)
import PartnerInvoices from "@/views/PartnerInvoices.vue";

/* ────────────────────────────────────────────────────────────
   State
──────────────────────────────────────────────────────────── */
const loading = ref(true);

const infoText = ref("");
const errorText = ref("");

const analytics = ref(null);
const comments = ref([]);

const currentTier = ref("");
const selectedTier = ref("");

const hasChartAccess = computed(
  () => currentTier.value === "gold" || currentTier.value === "dynamic"
);

// chart
const chartCanvas = ref(null);
let chartInst = null;

/* ────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────── */
function showInfo(msg, ms = 2200) {
  infoText.value = msg;
  setTimeout(() => (infoText.value = ""), ms);
}
function showError(msg) {
  errorText.value = msg;
}
function clearMsgs() {
  infoText.value = "";
  errorText.value = "";
}
function destroyChart() {
  try { chartInst?.destroy(); } catch {}
  chartInst = null;
}

/* ────────────────────────────────────────────────────────────
   Data load
──────────────────────────────────────────────────────────── */
async function fetchDashboard() {
  loading.value = true;
  clearMsgs();
  try {
    const [analyticsRes, commentsRes, tierRes] = await Promise.all([
      guardedGet("/partner/analytics"),
      guardedGet("/partner/comments"),
      guardedGet("/partner/subscription"),
    ]);

    // normalize analytics
    analytics.value = analyticsRes || {};
    comments.value = (commentsRes?.reviews || commentsRes || []).map(c => ({ ...c, reply: "" }));

    // subscription tier
    const sub = tierRes?.subscription || tierRes?.tier || tierRes;
    currentTier.value = typeof sub === "string" ? sub : (sub?.type || "bronze");
    selectedTier.value = currentTier.value;

    await nextTick();
    if (hasChartAccess.value) renderChart();
    else destroyChart();
  } catch (e) {
    console.error("Failed to load partner dashboard:", e?.response?.data || e);
    showError(e?.response?.data?.message || "Failed to load dashboard.");
  } finally {
    loading.value = false;
  }
}

/* ────────────────────────────────────────────────────────────
   Chart
──────────────────────────────────────────────────────────── */
function renderChart() {
  destroyChart();
  if (!analytics.value || !chartCanvas.value) return;

  const labels = (analytics.value?.clicks || []).map(d => d.date);
  const clicks = (analytics.value?.clicks || []).map(d => d.count);
  const subs   = (analytics.value?.subscriptions || []).map(d => d.count);

  if (!labels.length && !clicks.length && !subs.length) return;

  const ctx = chartCanvas.value.getContext("2d");
  chartInst = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Clicks", data: clicks, fill: false, tension: 0.3 },
        { label: "Subscriptions", data: subs, fill: false, tension: 0.3 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

/* ────────────────────────────────────────────────────────────
   CSV export
──────────────────────────────────────────────────────────── */
const exporting = ref(false);
async function downloadCSV() {
  exporting.value = true;
  clearMsgs();
  try {
    const res = await API.get("/partner/export-analytics", { responseType: "blob" });
    const blob = new Blob([res.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "partner_analytics.csv";
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showInfo("CSV downloaded.");
  } catch (e) {
    console.error("Export CSV failed:", e?.response?.data || e);
    showError(e?.response?.data?.message || "Failed to download CSV.");
  } finally {
    exporting.value = false;
  }
}

/* ────────────────────────────────────────────────────────────
   Tier update (PUT /partner/subscription)
   - Try { tier }, fall back to { type } for older handlers
──────────────────────────────────────────────────────────── */
const savingTier = ref(false);
async function updateTier() {
  if (!selectedTier.value || selectedTier.value === currentTier.value) return;
  savingTier.value = true;
  clearMsgs();
  try {
    // attempt preferred shape
    await API.put("/partner/subscription", { tier: selectedTier.value });
  } catch (e1) {
    // fallback shape
    try {
      await API.put("/partner/subscription", { type: selectedTier.value });
    } catch (e2) {
      console.error("Tier update failed:", e2?.response?.data || e2);
      showError(e2?.response?.data?.message || "Failed to update tier.");
      savingTier.value = false;
      return;
    }
  }
  currentTier.value = selectedTier.value;
  showInfo("Subscription tier updated.");
  savingTier.value = false;
}

/* ────────────────────────────────────────────────────────────
   Comments: reply
──────────────────────────────────────────────────────────── */
const replyingId = ref(null);
async function submitReply(comment) {
  if (!comment.reply || !comment._id) return;
  replyingId.value = comment._id;
  clearMsgs();
  try {
    await API.post("/partner/reply", { commentId: comment._id, reply: comment.reply });
    comment.reply = "";
    showInfo("Reply sent.");
  } catch (e) {
    console.error("Reply failed:", e?.response?.data || e);
    showError(e?.response?.data?.message || "Failed to submit reply.");
  } finally {
    replyingId.value = null;
  }
}

/* ────────────────────────────────────────────────────────────
   Upload ad (image or video)
──────────────────────────────────────────────────────────── */
const uploadingKind = ref(""); // 'image' | 'video' | ''
async function uploadAd(kind, ev) {
  const input = ev?.target;
  const file = input?.files?.[0];
  if (!file) return;

  uploadingKind.value = kind;
  clearMsgs();

  // Optional size sanity (e.g., <= 100MB)
  const MAX_SIZE = 100 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    showError("File is too large. Please upload a smaller file (≤100MB).");
    uploadingKind.value = "";
    input.value = "";
    return;
  }

  try {
    const formData = new FormData();
    formData.append("adMedia", file);
    await API.post("/partner/upload-ad", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    showInfo("Upload successful.");
    input.value = "";
  } catch (e) {
    console.error("Upload failed:", e?.response?.data || e);
    showError(e?.response?.data?.message || "Upload failed.");
  } finally {
    uploadingKind.value = "";
  }
}

onMounted(fetchDashboard);
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8 partner-dashboard">
    <header class="mb-6 text-center">
      <h1 class="text-3xl font-bold" style="font-family: var(--bb-font-heading);">Partner Dashboard</h1>
      <p class="text-muted">Manage your tier, review analytics, upload promos, and reply to comments.</p>
    </header>

    <div v-if="loading" class="bb-card p-4" aria-busy="true">Loading…</div>

    <div v-else class="space-y-6">
      <p v-if="infoText" class="bb-card p-3 text-green-700">{{ infoText }}</p>
      <p v-if="errorText" class="bb-card p-3 text-red-600">{{ errorText }}</p>

      <!-- Tier -->
      <section class="bb-card p-5 tier-section">
        <div class="flex flex-col md:flex-row md:items-end gap-3">
          <div class="flex-1">
            <h3 class="text-xl font-semibold" style="font-family: var(--bb-font-heading);">
              Your Current Tier: <span class="tier">{{ currentTier }}</span>
            </h3>
            <p class="text-muted">Upgrade to Gold for charts and CSV export.</p>
          </div>
          <div class="flex gap-2 md:justify-end">
            <select class="bb-select" v-model="selectedTier" :disabled="currentTier === 'dynamic'">
              <option disabled value="">Select Tier</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option disabled value="dynamic">Dynamic (automatic)</option>
            </select>
            <button class="bb-btn bb-btn--primary" :disabled="savingTier || currentTier === selectedTier" @click="updateTier">
              {{ savingTier ? "Saving…" : "Update Tier" }}
            </button>
          </div>
        </div>
      </section>

      <!-- Overview -->
      <section class="bb-card p-5 analytics-overview">
        <h2 class="text-xl font-semibold mb-2" style="font-family: var(--bb-font-heading);">Overview</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <div class="text-sm text-muted">Total Clicks</div>
            <div class="text-2xl font-bold">{{ analytics?.totalClicks || 0 }}</div>
          </div>
          <div>
            <div class="text-sm text-muted">Total Subscriptions</div>
            <div class="text-2xl font-bold">{{ analytics?.totalSubscriptions || 0 }}</div>
          </div>
        </div>
      </section>

      <!-- Charts & CSV -->
      <section class="bb-card p-5" v-if="hasChartAccess">
        <h2 class="text-xl font-semibold mb-3" style="font-family: var(--bb-font-heading);">Your Traffic Over Time</h2>
        <div style="height: 320px;">
          <canvas ref="chartCanvas"></canvas>
        </div>
        <div class="mt-4">
          <button class="bb-btn bb-btn--warning" :disabled="exporting" @click="downloadCSV">
            {{ exporting ? "Preparing…" : "⬇️ Download CSV" }}
          </button>
        </div>
      </section>
      <section class="bb-card p-5" v-else>
        <h2 class="text-xl font-semibold mb-1" style="font-family: var(--bb-font-heading);">Analytics</h2>
        <p class="text-muted">Charts and CSV export are available on the Gold or Dynamic tier.</p>
      </section>

      <!-- Uploads -->
      <section class="bb-card p-5 upload-section">
        <h2 class="text-xl font-semibold mb-3" style="font-family: var(--bb-font-heading);">Promote Your Product</h2>
        <div class="grid gap-3 md:grid-cols-2">
          <label class="flex flex-col">
            <span class="text-sm text-muted mb-1">Upload Video Ad (max 30s)</span>
            <input class="bb-input" type="file" accept="video/*" @change="ev => uploadAd('video', ev)" :disabled="uploadingKind==='video'"/>
          </label>
          <label class="flex flex-col">
            <span class="text-sm text-muted mb-1">Upload Promo Image</span>
            <input class="bb-input" type="file" accept="image/*" @change="ev => uploadAd('image', ev)" :disabled="uploadingKind==='image'"/>
          </label>
        </div>
      </section>

      <!-- Comments -->
      <section class="bb-card p-5 review-section">
        <h2 class="text-xl font-semibold mb-3" style="font-family: var(--bb-font-heading);">Customer Comments</h2>
        <div v-if="!comments.length" class="text-muted">No comments yet.</div>

        <div v-for="c in comments" :key="c._id" class="p-3 rounded-md" :style="{ background: 'var(--bb-surface-2)' }">
          <p><strong>{{ c.user }}</strong>: {{ c.message }}</p>
          <textarea class="bb-input mt-2" v-model="c.reply" placeholder="Write a reply…"></textarea>
          <button
            class="bb-btn bb-btn--primary mt-2"
            :disabled="!c.reply || replyingId === c._id"
            @click="submitReply(c)"
          >
            {{ replyingId === c._id ? "Sending…" : "Reply" }}
          </button>
        </div>
      </section>

      <!-- Invoices -->
      <section class="bb-card p-5">
        <h2 class="text-xl font-semibold mb-3" style="font-family: var(--bb-font-heading);">Your Invoices</h2>
        <PartnerInvoices />
      </section>
    </div>
  </div>
</template>

<style scoped>
.partner-dashboard { /* visuals are from brand.css; minimal here */ }
.tier { font-weight: 700; color: var(--bb-primary); }
</style>
