<script setup>
import { ref, reactive, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import API from "@/api"; // axios with cookies + interceptor
import { guardedGet, guardedPost } from "@/lib/guarded-api";

/* ────────────────────────────────────────────────────────────
   State
──────────────────────────────────────────────────────────── */
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const catSaving = ref(false);

const infoText = ref("");
const errorText = ref("");

const categories = ref([]); // [{ _id, name }]
const addingNewCategory = ref(false);
const newCategoryName = ref("");
const categoryExistsError = ref("");

const newBox = reactive({
  name: "",
  category: "",
  description: "",
  price: "",
  website: "",
  affiliateLink: "",
  imageUrl: "",
});

/* ────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────── */
function showInfo(msg, ms = 2200) {
  infoText.value = msg;
  setTimeout(() => (infoText.value = ""), ms);
}
const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

/* ────────────────────────────────────────────────────────────
   Auth guard + data load
──────────────────────────────────────────────────────────── */
async function checkAuth() {
  try {
    const status = await guardedGet("/auth/status"); // { ok, user, mfaVerified }
    const authed = !!status?.user;
    if (!authed) {
      router.replace("/login?reason=auth");
      return false;
    }
    if (!status?.mfaVerified) {
      router.replace("/verify-2fa");
      return false;
    }
    if ((status.user?.role || "user") !== "admin") {
      router.replace("/dashboard");
      return false;
    }
    return true;
  } catch (e) {
    router.replace("/login?reason=auth");
    return false;
  }
}

async function fetchCategories() {
  try {
    const data = await guardedGet("/categories");
    categories.value = Array.isArray(data) ? data : (data?.items || []);
  } catch (e) {
    console.error("Error fetching categories:", e?.response?.data || e);
    // non-fatal — page still usable, but category select will be empty until server recovers
  }
}

onMounted(async () => {
  loading.value = true;
  errorText.value = "";
  if (await checkAuth()) {
    await fetchCategories();
  }
  loading.value = false;
});

/* ────────────────────────────────────────────────────────────
   Category add flow
──────────────────────────────────────────────────────────── */
function checkNewCategory(e) {
  if (newBox.category === "new") {
    addingNewCategory.value = true;
    newBox.category = "";
    categoryExistsError.value = "";
  } else {
    addingNewCategory.value = false;
    categoryExistsError.value = "";
  }
}

async function saveNewCategory() {
  const name = newCategoryName.value.trim();
  if (!name) return;

  // duplicate detection (case/space-insensitive)
  const exists = categories.value.some((c) => norm(c.name) === norm(name));
  if (exists) {
    categoryExistsError.value = "Category already exists.";
    return;
  }

  categoryExistsError.value = "";
  catSaving.value = true;
  try {
    const created = await guardedPost("/categories", { name });
    const doc = created?._id ? created : created?.category || created; // accept common shapes
    if (doc && doc._id) {
      categories.value.push(doc);
      newBox.category = doc._id;
      newCategoryName.value = "";
      addingNewCategory.value = false;
      showInfo("Category added.");
    } else {
      throw new Error("Invalid response creating category");
    }
  } catch (e) {
    console.error("Add category failed:", e?.response?.data || e);
    errorText.value = e?.response?.data?.message || "Failed to add category.";
  } finally {
    catSaving.value = false;
  }
}

/* ────────────────────────────────────────────────────────────
   Submit new subscription box
──────────────────────────────────────────────────────────── */
const formValid = computed(() => {
  return (
    newBox.name.trim() &&
    newBox.category &&
    newBox.description.trim() &&
    newBox.price !== "" &&
    newBox.website.trim() &&
    newBox.affiliateLink.trim() &&
    newBox.imageUrl.trim()
  );
});

async function addSubscriptionBox() {
  errorText.value = "";
  infoText.value = "";

  // client sanity: coerce price to number
  const priceNum = Number(newBox.price);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    errorText.value = "Please enter a valid non-negative price.";
    return;
  }

  if (!formValid.value) {
    errorText.value = "Please complete all required fields.";
    return;
  }

  saving.value = true;
  try {
    const payload = {
      name: newBox.name.trim(),
      category: newBox.category, // expects category _id
      description: newBox.description.trim(),
      price: priceNum,
      website: newBox.website.trim(),
      affiliateLink: newBox.affiliateLink.trim(),
      imageUrl: newBox.imageUrl.trim(),
    };
    await guardedPost("/boxes", payload);

    // reset form
    newBox.name = "";
    newBox.category = "";
    newBox.description = "";
    newBox.price = "";
    newBox.website = "";
    newBox.affiliateLink = "";
    newBox.imageUrl = "";

    showInfo("Subscription box added.");
  } catch (e) {
    console.error("Add box failed:", e?.response?.data || e);
    errorText.value = e?.response?.data?.message || "Failed to add subscription box.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <header class="mb-6">
      <h1 class="text-3xl font-bold" style="font-family: var(--bb-font-heading);">
        Manage Subscription Boxes
      </h1>
      <p class="text-muted mt-1">Create new entries and add categories on the fly.</p>
    </header>

    <div v-if="loading" class="bb-card p-4" aria-busy="true">Loading…</div>

    <section v-else class="bb-card p-5">
      <!-- Inline banners -->
      <p v-if="infoText" class="mb-3 text-green-700">{{ infoText }}</p>
      <p v-if="errorText" class="mb-3 text-red-600">{{ errorText }}</p>

      <form class="grid gap-3" @submit.prevent="addSubscriptionBox">
        <!-- Name -->
        <label class="flex flex-col">
          <span class="text-sm text-muted mb-1">Subscription Box Name</span>
          <input class="bb-input" v-model="newBox.name" required placeholder="e.g., Coffee Lovers Monthly" />
        </label>

        <!-- Category select -->
        <label class="flex flex-col">
          <span class="text-sm text-muted mb-1">Category</span>
          <select class="bb-select" v-model="newBox.category" required @change="checkNewCategory">
            <option value="" disabled>Select a category</option>
            <option v-for="category in categories" :key="category._id" :value="category._id">
              {{ category.name }}
            </option>
            <option value="new">+ Add New Category</option>
          </select>
        </label>

        <!-- Add new category row -->
        <div v-if="addingNewCategory" class="grid md:grid-cols-[1fr_auto] gap-2 items-end">
          <input class="bb-input" v-model="newCategoryName" placeholder="Enter new category" />
          <button type="button" class="bb-btn bb-btn--primary" :disabled="catSaving" @click="saveNewCategory">
            {{ catSaving ? "Saving…" : "Save Category" }}
          </button>
          <p v-if="categoryExistsError" class="text-red-600 md:col-span-2">{{ categoryExistsError }}</p>
        </div>

        <!-- Description -->
        <label class="flex flex-col">
          <span class="text-sm text-muted mb-1">Brief Description</span>
          <input class="bb-input" v-model="newBox.description" required placeholder="What’s included?" />
        </label>

        <!-- Price -->
        <label class="flex flex-col">
          <span class="text-sm text-muted mb-1">Price (GBP)</span>
          <input class="bb-input" v-model="newBox.price" required type="number" step="0.01" min="0" placeholder="19.99" />
        </label>

        <!-- Website -->
        <label class="flex flex-col">
          <span class="text-sm text-muted mb-1">Website URL</span>
          <input class="bb-input" v-model="newBox.website" required type="url" placeholder="https://example.com" />
        </label>

        <!-- Affiliate Link -->
        <label class="flex flex-col">
          <span class="text-sm text-muted mb-1">Affiliate Link</span>
          <input class="bb-input" v-model="newBox.affiliateLink" required type="url" placeholder="https://partner.link/..." />
        </label>

        <!-- Image URL -->
        <label class="flex flex-col">
          <span class="text-sm text-muted mb-1">Image URL</span>
          <input class="bb-input" v-model="newBox.imageUrl" required type="url" placeholder="https://cdn.example.com/box.jpg" />
        </label>

        <!-- Submit -->
        <div class="flex justify-end">
          <button type="submit" class="bb-btn bb-btn--primary" :disabled="saving || !formValid">
            {{ saving ? "Saving…" : "Add Subscription Box" }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
/* visuals come from brand.css; keep local styles minimal */
</style>
