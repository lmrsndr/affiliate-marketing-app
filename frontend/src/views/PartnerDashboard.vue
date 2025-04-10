<template>
  <div class="partner-dashboard">
    <h1>📈 Partner Dashboard</h1>

    <!-- Subscription Tier -->
    <section class="tier-section">
      <h3>Your Current Tier: <span class="tier">{{ currentTier }}</span></h3>
      <select v-model="selectedTier" :disabled="currentTier === 'dynamic'" @change="updateTier">
        <option disabled value="">Select Tier</option>
        <option value="bronze">Bronze</option>
        <option value="silver">Silver</option>
        <option value="gold">Gold</option>
        <option disabled value="dynamic">Dynamic (automatic)</option>
      </select>
    </section>

    <!-- Analytics Overview -->
    <section class="analytics-overview">
      <h2>📊 Overview</h2>
      <p>Total Clicks: {{ analytics?.totalClicks || 0 }}</p>
      <p>Total Subscriptions: {{ analytics?.totalSubscriptions || 0 }}</p>
    </section>

    <!-- Chart + CSV (Gold/Dynamic only) -->
    <section v-if="hasChartAccess">
      <h2>📈 Your Traffic Over Time</h2>
      <canvas ref="chartCanvas" style="max-width: 700px;"></canvas>
      <button @click="downloadCSV" class="export-btn">⬇️ Download CSV</button>
    </section>

    <!-- Ad Upload -->
    <section class="upload-section">
      <h2>📤 Promote Your Product</h2>
      <div>
        <label>Upload Video Ad (max 30s):</label>
        <input type="file" accept="video/*" @change="uploadAd('video')" />
      </div>
      <div>
        <label>Upload Promo Image:</label>
        <input type="file" accept="image/*" @change="uploadAd('image')" />
      </div>
    </section>

    <!-- User Comments -->
    <section class="review-section">
      <h2>📝 Customer Comments</h2>
      <div v-if="comments.length === 0">No comments yet.</div>
      <div v-for="comment in comments" :key="comment._id" class="comment-box">
        <p><strong>{{ comment.user }}</strong>: {{ comment.message }}</p>
        <textarea v-model="comment.reply" placeholder="Write a reply..."></textarea>
        <button @click="submitReply(comment)">Reply</button>
      </div>
    </section>

    <!-- 💼 Partner Invoices -->
    <section class="mt-12">
      <PartnerInvoices />
    </section>
  </div>
</template>

<script>
import { ref, onMounted, computed, nextTick } from "vue";
import Chart from "chart.js/auto";
import API from "../api.js";
import PartnerInvoices from "@/views/PartnerInvoices.vue"; // ⬅️ Import added

export default {
  name: "PartnerDashboard",
  components: {
    PartnerInvoices, // ⬅️ Register the component
  },
  setup() {
    const analytics = ref(null);
    const comments = ref([]);
    const currentTier = ref("");
    const selectedTier = ref("");
    const chartCanvas = ref(null);

    const hasChartAccess = computed(() => currentTier.value === "gold" || currentTier.value === "dynamic");

    const fetchDashboard = async () => {
      try {
        const [analyticsRes, commentsRes, tierRes] = await Promise.all([
          API.get("/partner/analytics", { withCredentials: true }),
          API.get("/partner/comments", { withCredentials: true }),
          API.get("/partner/subscription", { withCredentials: true }),
        ]);
        analytics.value = analyticsRes.data;
        comments.value = commentsRes.data.reviews.map(c => ({ ...c, reply: "" }));
        currentTier.value = tierRes.data.subscription;
        selectedTier.value = tierRes.data.subscription;

        await nextTick();
        if (hasChartAccess.value) renderChart();
      } catch (err) {
        console.error("❌ Failed to load dashboard:", err);
      }
    };

    const renderChart = () => {
      if (!analytics.value || !chartCanvas.value) return;

      const ctx = chartCanvas.value.getContext("2d");
      new Chart(ctx, {
        type: "line",
        data: {
          labels: analytics.value.clicks?.map(d => d.date) || [],
          datasets: [
            {
              label: "Clicks",
              data: analytics.value.clicks?.map(d => d.count) || [],
              borderColor: "#007bff",
              fill: false,
            },
            {
              label: "Subscriptions",
              data: analytics.value.subscriptions?.map(d => d.count) || [],
              borderColor: "#28a745",
              fill: false,
            },
          ],
        },
      });
    };

    const downloadCSV = async () => {
      try {
        const res = await API.get("/partner/export-analytics", {
          responseType: "blob",
          withCredentials: true,
        });
        const blob = new Blob([res.data], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "partner_analytics.csv";
        a.click();
        a.remove();
      } catch (err) {
        alert("❌ Failed to download CSV.");
        console.error(err);
      }
    };

    const updateTier = async () => {
      try {
        await API.put("/partner/subscription", { type: selectedTier.value }, { withCredentials: true });
        currentTier.value = selectedTier.value;
        alert("✅ Subscription tier updated");
      } catch (err) {
        console.error("❌ Tier update failed:", err);
        alert("Failed to update tier.");
      }
    };

    const submitReply = async (comment) => {
      try {
        await API.post(`/partner/comments/${comment._id}/reply`, {
          reply: comment.reply,
        }, { withCredentials: true });
        alert("✅ Reply sent");
        comment.reply = "";
      } catch (err) {
        console.error("❌ Failed to submit reply:", err);
        alert("Reply failed");
      }
    };

    const uploadAd = async (type) => {
      try {
        const input = event.target;
        const file = input.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("adMedia", file);

        await API.post("/partner/upload-ad", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        });

        alert("✅ Upload successful");
        input.value = "";
      } catch (err) {
        console.error("❌ Upload failed:", err);
        alert("Upload failed");
      }
    };

    onMounted(fetchDashboard);

    return {
      analytics,
      comments,
      currentTier,
      selectedTier,
      chartCanvas,
      hasChartAccess,
      updateTier,
      submitReply,
      uploadAd,
      downloadCSV,
    };
  },
};
</script>

<style scoped>
.partner-dashboard {
  max-width: 900px;
  margin: auto;
  padding: 20px;
  text-align: center;
}
.tier-section, .analytics-overview, .review-section, .upload-section {
  margin-bottom: 30px;
}
.tier {
  font-weight: bold;
  color: #007bff;
}
.comment-box {
  background: #f4f4f4;
  padding: 10px;
  margin: 10px 0;
  text-align: left;
  border-radius: 6px;
}
.comment-box textarea {
  width: 100%;
  min-height: 60px;
  margin-top: 8px;
  border-radius: 4px;
  padding: 6px;
}
.comment-box button {
  margin-top: 8px;
  padding: 6px 10px;
}
.export-btn {
  margin-top: 15px;
  padding: 10px 15px;
  background-color: #ffc107;
  color: black;
  font-weight: bold;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.export-btn:hover {
  background-color: #e0a800;
}
</style>
