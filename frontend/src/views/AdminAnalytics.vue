<template>
  <div class="analytics">
    <h2>📊 Admin Analytics</h2>

    <!-- 🔎 Date & Partner Filter -->
    <div class="filters">
      <div class="date-filters">
        <label>From: <input type="date" v-model="startDate" /></label>
        <label>To: <input type="date" v-model="endDate" /></label>
      </div>
      <div class="partner-filter">
        <label>
          Partner:
          <select v-model="selectedPartnerId">
            <option value="">All Partners</option>
            <option v-for="partner in partners" :key="partner._id" :value="partner._id">
              {{ partner.name }}
            </option>
          </select>
        </label>
      </div>
      <button class="btn" @click="fetchAnalytics">Apply Filter</button>
    </div>

    <div v-if="loading" class="loading">Loading analytics...</div>

    <div v-else-if="error" class="error">
      ⚠️ {{ error }}
      <button @click="fetchAnalytics">Retry</button>
    </div>

    <div v-else>
      <!-- Charts Grid -->
      <div class="chart-grid">
        <div class="chart-container">
          <h3>Page Views</h3>
          <canvas v-if="hasPageViews" ref="pageViewsChart"></canvas>
          <p v-else class="no-data">No page view data available.</p>
        </div>

        <div class="chart-container">
          <h3>New Subscriptions</h3>
          <canvas v-if="hasSubscriptions" ref="subscriptionChart"></canvas>
          <p v-else class="no-data">No subscription data available.</p>
        </div>

        <div class="chart-container">
          <h3>Affiliate Clicks</h3>
          <canvas v-if="hasAffiliateClicks" ref="affiliateChart"></canvas>
          <p v-else class="no-data">No affiliate click data available.</p>
        </div>
      </div>

      <!-- Export Buttons -->
      <div class="export-controls">
        <button class="export-btn" @click="exportUsersCSV">⬇️ Export Users CSV</button>
        <button class="export-btn" @click="exportAnalyticsCSV">⬇️ Export Analytics CSV</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick, computed } from "vue";
import Chart from "chart.js/auto";
import API from "../api.js";

export default {
  name: "AdminAnalytics",
  setup() {
    const analytics = ref(null);
    const loading = ref(true);
    const error = ref(null);
    const pageViewsChart = ref(null);
    const subscriptionChart = ref(null);
    const affiliateChart = ref(null);

    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const startDate = ref(thirtyDaysAgo);
    const endDate = ref(today);
    const selectedPartnerId = ref("");
    const partners = ref([]);

    const hasPageViews = computed(() => analytics.value?.pageViews?.length > 0);
    const hasSubscriptions = computed(() => analytics.value?.subscriptions?.length > 0);
    const hasAffiliateClicks = computed(() => analytics.value?.affiliateClicks?.length > 0);

    const fetchPartners = async () => {
      try {
        const res = await API.get("/admin/affiliates");
        partners.value = res.data;
      } catch (err) {
        console.error("❌ Failed to fetch partners:", err);
      }
    };

    const fetchAnalytics = async () => {
      try {
        loading.value = true;
        error.value = null;

        const params = {
          startDate: startDate.value,
          endDate: endDate.value,
        };
        if (selectedPartnerId.value) {
          params.partnerId = selectedPartnerId.value;
        }

        const res = await API.get("/admin/analytics", { params });
        analytics.value = res.data;
        await nextTick();
        renderCharts();
      } catch (err) {
        error.value = "Failed to fetch analytics. Please try again.";
        console.error("❌ Analytics Fetch Failed:", err);
      } finally {
        loading.value = false;
      }
    };

    const renderCharts = () => {
      if (!analytics.value) return;

      if (hasPageViews.value) {
        const ctx1 = pageViewsChart.value.getContext("2d");
        new Chart(ctx1, {
          type: "bar",
          data: {
            labels: analytics.value.pageViews.map(pv => pv.category),
            datasets: [{
              label: "Page Views",
              data: analytics.value.pageViews.map(pv => pv.views),
              backgroundColor: "#007bff",
            }],
          },
        });
      }

      if (hasSubscriptions.value) {
        const ctx2 = subscriptionChart.value.getContext("2d");
        new Chart(ctx2, {
          type: "line",
          data: {
            labels: analytics.value.subscriptions.map(s => s.date),
            datasets: [{
              label: "New Subscriptions",
              data: analytics.value.subscriptions.map(s => s.count),
              borderColor: "#28a745",
              fill: false,
              tension: 0.3,
            }],
          },
        });
      }

      if (hasAffiliateClicks.value) {
        const ctx3 = affiliateChart.value.getContext("2d");
        new Chart(ctx3, {
          type: "pie",
          data: {
            labels: analytics.value.affiliateClicks.map(a => a.partner),
            datasets: [{
              label: "Affiliate Clicks",
              data: analytics.value.affiliateClicks.map(a => a.clicks),
              backgroundColor: ["#ffc107", "#17a2b8", "#6f42c1"],
            }],
          },
        });
      }
    };

    const exportUsersCSV = async () => {
      try {
        const response = await API.get("/admin/export-users", { responseType: "blob" });
        const blob = new Blob([response.data], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "users.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err) {
        alert("❌ Failed to export user data.");
        console.error("User CSV Export Error:", err);
      }
    };

    const exportAnalyticsCSV = async () => {
      try {
        const response = await API.get("/admin/export-analytics", {
          responseType: "blob",
          params: {
            startDate: startDate.value,
            endDate: endDate.value,
            partnerId: selectedPartnerId.value || undefined,
          },
        });
        const blob = new Blob([response.data], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "analytics.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err) {
        alert("❌ Failed to export analytics data.");
        console.error("Analytics CSV Export Error:", err);
      }
    };

    onMounted(() => {
      fetchPartners();
      fetchAnalytics();
    });

    return {
      analytics,
      loading,
      error,
      pageViewsChart,
      subscriptionChart,
      affiliateChart,
      fetchAnalytics,
      exportUsersCSV,
      exportAnalyticsCSV,
      startDate,
      endDate,
      hasPageViews,
      hasSubscriptions,
      hasAffiliateClicks,
      selectedPartnerId,
      partners,
    };
  },
};
</script>

<style scoped>
.analytics {
  text-align: center;
  padding: 20px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.filters label {
  display: flex;
  flex-direction: column;
  font-weight: bold;
}

select, input[type="date"] {
  padding: 6px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.chart-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  justify-content: center;
  margin-top: 30px;
}

.chart-container {
  width: 400px;
  background: #f9f9f9;
  padding: 15px;
  border-radius: 10px;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1);
}

.loading {
  font-size: 18px;
  font-weight: bold;
  margin-top: 30px;
}

.error {
  color: red;
  font-weight: bold;
  margin-top: 30px;
}

.export-controls {
  margin-top: 30px;
  display: flex;
  justify-content: center;
  gap: 20px;
}

.export-btn {
  padding: 10px 20px;
  background-color: #ffc107;
  border: none;
  color: black;
  font-weight: bold;
  border-radius: 5px;
  cursor: pointer;
}

.export-btn:hover {
  background-color: #e0a800;
}

.no-data {
  color: #888;
  font-style: italic;
  margin-top: 10px;
}
</style>
