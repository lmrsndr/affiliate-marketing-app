<template>
  <div class="admin-affiliates">
    <h2>Manage Affiliate Partners</h2>

    <!-- 🔍 Search, Filter, Sort -->
    <div class="filter-bar">
      <input v-model="searchQuery" placeholder="Search by name or keyword..." />
      <select v-model="filterTier">
        <option value="">All Tiers</option>
        <option value="bronze">Bronze</option>
        <option value="silver">Silver</option>
        <option value="gold">Gold</option>
      </select>
      <select v-model="sortOption">
        <option value="name">Sort by Name</option>
        <option value="recent">Sort by Recent</option>
        <option value="popularity">Sort by Popularity</option>
        <option value="rating">Sort by Rating</option>
      </select>
    </div>

    <!-- ✅ Add New Partner -->
    <form @submit.prevent="createPartner" class="form-container">
      <h3>Add New Partner</h3>
      <input v-model="partner.name" type="text" placeholder="Partner Name" required />
      <input v-model="partner.website" type="url" placeholder="Partner Website" required />
      <input v-model="partner.affiliateLink" type="url" placeholder="Affiliate Link" required />
      <input v-model="partner.commission" type="number" placeholder="% Commission" required />
      <select v-model="partner.tier">
        <option value="bronze">Bronze</option>
        <option value="silver">Silver</option>
        <option value="gold">Gold</option>
      </select>

      <button @click.prevent="scrapePartner" class="btn scrape-btn">Auto-Fill from Website</button>

      <textarea v-model="partner.shortDescription" placeholder="Short Description"></textarea>
      <textarea v-model="partner.longDescription" placeholder="Long Description"></textarea>
      <input v-model="partner.keywords" placeholder="Keywords (comma separated)" />
      <input v-model="partner.logoUrl" placeholder="Logo URL" />

      <select v-model="partner.subscriptionTier">
        <option value="free">Free</option>
        <option value="premium">Premium (Video Ad + Replies)</option>
      </select>

      <label>
        <input type="checkbox" v-model="partner.isActive" /> Active Partner
      </label>

      <button type="submit" class="btn">Save Partner</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>

    <!-- ✅ Paginated Partner List -->
    <div class="partner-list" v-if="paginatedPartners.length">
      <h3>Existing Partners</h3>
      <div v-for="p in paginatedPartners" :key="p._id" class="partner-card">
        <img :src="p.logoUrl || defaultLogo" class="logo" alt="logo" />
        <div class="info">
          <h4>{{ p.name }}</h4>
          <p><strong>Website:</strong> <a :href="p.website" target="_blank">{{ p.website }}</a></p>
          <p><strong>Tier:</strong> {{ p.tier }}</p>
          <p><strong>Commission:</strong> {{ p.commission }}%</p>
          <p><strong>Subscription:</strong> {{ p.subscriptionTier }}</p>
          <p><strong>Keywords:</strong> {{ p.keywords }}</p>
          <p><strong>Status:</strong> <span :style="{ color: p.isActive ? 'green' : 'gray' }">{{ p.isActive ? 'Active' : 'Inactive' }}</span></p>

          <button @click="editPartner(p)">Edit</button>
          <button @click="deletePartner(p._id)" class="delete-btn">Delete</button>
        </div>
      </div>

      <!-- ✅ Pagination Controls -->
      <div class="pagination">
        <button :disabled="currentPage === 1" @click="currentPage--">Prev</button>
        <span>Page {{ currentPage }}</span>
        <button :disabled="currentPage * itemsPerPage >= sortedPartners.length" @click="currentPage++">Next</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import API from "../api"; // ✅ Uses API wrapper that resolves correct baseURL

export default {
  name: "AdminAffiliates",
  setup() {
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
    const defaultLogo = ref("https://via.placeholder.com/80");
    const currentPage = ref(1);
    const itemsPerPage = 5;

    const fetchPartners = async () => {
      try {
        const res = await API.get("/boxes");
        partners.value = res.data;
      } catch (err) {
        console.error("❌ Failed to load partners:", err);
        error.value = "Failed to load partners.";
      }
    };

    const filteredPartners = computed(() => {
      return partners.value.filter((p) => {
        const matchesTier = filterTier.value ? p.tier === filterTier.value : true;
        const matchesSearch = searchQuery.value
          ? p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            p.keywords?.toLowerCase().includes(searchQuery.value.toLowerCase())
          : true;
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
          return list.sort((a, b) => a.name.localeCompare(b.name));
      }
    });

    const paginatedPartners = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage;
      return sortedPartners.value.slice(start, start + itemsPerPage);
    });

    const scrapePartner = async () => {
      try {
        const res = await API.post("/boxes/scrape", { website: partner.value.website });
        partner.value.shortDescription = res.data.shortDescription;
        partner.value.longDescription = res.data.longDescription;
        partner.value.logoUrl = res.data.logoUrl;
        partner.value.keywords = res.data.keywords;
      } catch (err) {
        console.error("❌ Scraping failed:", err);
        error.value = "Unable to auto-fill from website.";
      }
    };

    const createPartner = async () => {
      try {
        await API.post("/boxes", partner.value);
        alert("✅ Partner saved successfully!");
        fetchPartners();
      } catch (err) {
        console.error("❌ Failed to save partner:", err);
        error.value = "Failed to create partner.";
      }
    };

    const editPartner = (p) => {
      partner.value = { ...p };
    };

    const deletePartner = async (id) => {
      if (!confirm("Are you sure you want to delete this partner?")) return;
      try {
        await API.delete(`/boxes/${id}`);
        fetchPartners();
      } catch (err) {
        console.error("❌ Delete failed:", err);
        error.value = "Failed to delete partner.";
      }
    };

    onMounted(fetchPartners);

    return {
      partner,
      partners,
      searchQuery,
      filterTier,
      sortOption,
      currentPage,
      paginatedPartners,
      sortedPartners,
      filteredPartners,
      error,
      defaultLogo,
      scrapePartner,
      createPartner,
      editPartner,
      deletePartner,
      itemsPerPage,
    };
  },
};
</script>

<style scoped>
.pagination {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: center;
  align-items: center;
}
.admin-affiliates {
  max-width: 700px;
  margin: auto;
  padding: 20px;
}
.form-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
input, select, textarea {
  padding: 10px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}
.btn {
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.scrape-btn {
  background-color: #ffb700;
}
.btn:hover {
  background-color: #0056b3;
}
.partner-list {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.partner-card {
  display: flex;
  gap: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
.logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
  background: white;
  border-radius: 8px;
}
.info {
  flex: 1;
}
.delete-btn {
  background-color: #dc3545;
  color: white;
  margin-left: 10px;
}
.delete-btn:hover {
  background-color: #c82333;
}
.error {
  color: red;
  font-weight: bold;
}
</style>
