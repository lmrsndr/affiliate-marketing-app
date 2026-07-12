<template>
  <main class="shop-home">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Curated shopping, without the endless scrolling</p>
        <h1>Interesting products from independent and specialist brands</h1>
        <p class="hero-text">
          BundleBee brings together useful, unusual and giftable finds from brands that are easy to
          miss on the big shopping platforms.
        </p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#catalogue">Browse products</a>
          <a class="btn btn-secondary" href="#how-it-works">How BundleBee works</a>
        </div>
      </div>

      <div class="hero-card" aria-label="What we look for">
        <span class="hero-icon" aria-hidden="true">🐝</span>
        <h2>What makes the cut?</h2>
        <ul>
          <li>Genuinely useful or distinctive</li>
          <li>Especially giftable</li>
          <li>Harder to discover elsewhere</li>
          <li>From a specialist or independent brand</li>
        </ul>
      </div>
    </section>

    <section class="collections" aria-labelledby="collection-heading">
      <div class="section-heading">
        <div>
          <p class="eyebrow">A better way to browse</p>
          <h2 id="collection-heading">Start with an idea</h2>
        </div>
      </div>

      <div class="collection-grid">
        <button
          v-for="item in quickCollections"
          :key="item.label"
          class="collection-card"
          type="button"
          @click="applyQuickCollection(item)"
        >
          <span class="collection-icon" aria-hidden="true">{{ item.icon }}</span>
          <strong>{{ item.label }}</strong>
          <span>{{ item.description }}</span>
        </button>
      </div>
    </section>

    <section id="catalogue" class="catalogue" aria-labelledby="catalogue-heading">
      <div class="section-heading catalogue-heading">
        <div>
          <p class="eyebrow">The BundleBee catalogue</p>
          <h2 id="catalogue-heading">Browse all products</h2>
        </div>
        <p v-if="!loading" class="result-count">
          {{ filteredProducts.length }} product{{ filteredProducts.length === 1 ? '' : 's' }}
        </p>
      </div>

      <div class="filters" aria-label="Product filters">
        <label>
          <span>Search</span>
          <input v-model.trim="search" type="search" placeholder="Product, brand or keyword" />
        </label>

        <label>
          <span>Category</span>
          <select v-model="category">
            <option value="">All categories</option>
            <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label>
          <span>Type</span>
          <select v-model="productType">
            <option value="">All product types</option>
            <option value="physical">Physical products</option>
            <option value="digital">Digital products</option>
            <option value="subscription">Subscriptions</option>
            <option value="experience">Experiences</option>
            <option value="service">Services</option>
          </select>
        </label>

        <label>
          <span>Sort</span>
          <select v-model="sort">
            <option value="featured">Featured first</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="popular">Most viewed</option>
          </select>
        </label>
      </div>

      <div v-if="loading" class="state-card">Loading the catalogue…</div>
      <div v-else-if="error" class="state-card state-error">{{ error }}</div>
      <div v-else-if="products.length === 0" class="state-card empty-catalogue">
        <h3>The catalogue is being prepared</h3>
        <p>No products have been published yet. New finds will appear here after they have been reviewed.</p>
      </div>
      <div v-else-if="filteredProducts.length === 0" class="state-card">
        <h3>No matching products</h3>
        <p>Try clearing one or more filters.</p>
        <button class="btn btn-secondary" type="button" @click="clearFilters">Clear filters</button>
      </div>

      <div v-else class="product-grid">
        <article v-for="product in visibleProducts" :key="product.id" class="product-card">
          <div class="image-wrap">
            <img :src="product.imageUrl || placeholderImage" :alt="product.name" loading="lazy" @error="usePlaceholder" />
            <span v-if="product.badge" class="badge">{{ product.badge }}</span>
          </div>

          <div class="product-body">
            <p class="brand-name">{{ product.brandName || 'Specialist brand' }}</p>
            <h3>{{ product.name }}</h3>
            <p class="description">{{ product.shortDescription || product.description }}</p>

            <div class="product-meta">
              <strong v-if="product.price !== null">{{ formatPrice(product.price, product.currency) }}</strong>
              <span>{{ product.category || 'Other' }}</span>
            </div>

            <button class="btn btn-primary product-button" type="button" @click="openRetailer(product)">
              Visit retailer
            </button>
          </div>
        </article>
      </div>

      <div v-if="visibleProducts.length < filteredProducts.length" class="load-more">
        <button class="btn btn-secondary" type="button" @click="shown += pageSize">Load more</button>
      </div>
    </section>

    <section id="how-it-works" class="how-it-works" aria-labelledby="how-heading">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Simple and transparent</p>
          <h2 id="how-heading">How BundleBee works</h2>
        </div>
      </div>

      <div class="steps">
        <article>
          <span>1</span>
          <h3>We find products</h3>
          <p>We look for useful, giftable and distinctive products from independent and specialist brands.</p>
        </article>
        <article>
          <span>2</span>
          <h3>You browse here</h3>
          <p>Search the catalogue or use collections to narrow down what would actually suit you.</p>
        </article>
        <article>
          <span>3</span>
          <h3>The retailer handles the order</h3>
          <p>BundleBee does not take payment or deliver products. You complete the purchase with the retailer.</p>
        </article>
      </div>
    </section>

    <section class="disclosure" aria-labelledby="disclosure-heading">
      <h2 id="disclosure-heading">How BundleBee earns money</h2>
      <p>
        Some retailer links are affiliate links. BundleBee may receive a commission when you buy something
        after following one of those links. It does not increase the price you pay. Products should earn their
        place in the catalogue because they fit our selection standards, not simply because they pay the
        highest commission.
      </p>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import API from "../api.js";

const loading = ref(true);
const error = ref("");
const products = ref([]);
const search = ref("");
const category = ref("");
const productType = ref("");
const sort = ref("featured");
const shown = ref(12);
const pageSize = 12;
const placeholderImage = "/icon-512x512.png";

const quickCollections = [
  { label: "Gifts under £25", icon: "🎁", description: "Affordable finds that still feel thoughtful", search: "gift" },
  { label: "Independent brands", icon: "🏪", description: "Products from smaller specialist businesses", search: "independent" },
  { label: "Teen favourites", icon: "✨", description: "Useful and fun finds for teenagers", search: "teen" },
  { label: "Subscriptions", icon: "📦", description: "Regular treats, hobbies and useful services", type: "subscription" },
];

function normaliseProduct(item) {
  const brand = typeof item?.brand === "object" ? item.brand : null;
  const itemCategories = Array.isArray(item?.categories) ? item.categories : [];
  const firstCategory = itemCategories[0];
  const categoryName = typeof firstCategory === "object" ? firstCategory?.name : firstCategory;
  const parsedPrice = Number(String(item?.price ?? "").replace(/[^0-9.]/g, ""));

  return {
    id: item?._id || item?.id || item?.slug || item?.name,
    slug: item?.slug || "",
    name: item?.name || "Untitled product",
    brandName: brand?.name || "",
    shortDescription: item?.shortDescription || item?.description || "",
    description: item?.description || "",
    price: Number.isFinite(parsedPrice) ? parsedPrice : null,
    currency: item?.currency || "GBP",
    productUrl: item?.productUrl || "",
    affiliateUrl: item?.affiliateUrl || "",
    imageUrl: item?.imageUrl || "",
    category: categoryName || "Other",
    productType: item?.productType || "physical",
    featured: Boolean(item?.featured),
    clicks: Number(item?.clicks || 0),
    badge: Array.isArray(item?.badges) ? item.badges[0] : "",
    tags: Array.isArray(item?.tags) ? item.tags.join(" ") : String(item?.tags || ""),
  };
}

async function fetchCatalogue() {
  loading.value = true;
  error.value = "";

  try {
    const { data } = await API.get("/products", { params: { limit: 100 } });
    const items = Array.isArray(data?.items) ? data.items : [];
    products.value = items.map(normaliseProduct);
  } catch (requestError) {
    console.error("Catalogue request failed:", requestError);
    error.value = "The catalogue could not be loaded. Please try again shortly.";
  } finally {
    loading.value = false;
  }
}

const categories = computed(() =>
  [...new Set(products.value.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b))
);

const filteredProducts = computed(() => {
  const needle = search.value.toLowerCase();
  const list = products.value.filter((item) => {
    const searchable = `${item.name} ${item.brandName} ${item.shortDescription} ${item.description} ${item.tags}`.toLowerCase();
    return (
      (!needle || searchable.includes(needle)) &&
      (!category.value || item.category === category.value) &&
      (!productType.value || item.productType === productType.value)
    );
  });

  return [...list].sort((a, b) => {
    if (sort.value === "newest") return String(b.id).localeCompare(String(a.id));
    if (sort.value === "price-asc") return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER);
    if (sort.value === "price-desc") return (b.price ?? -1) - (a.price ?? -1);
    if (sort.value === "popular") return b.clicks - a.clicks;
    return Number(b.featured) - Number(a.featured);
  });
});

const visibleProducts = computed(() => filteredProducts.value.slice(0, shown.value));

watch([search, category, productType, sort], () => {
  shown.value = pageSize;
});

function clearFilters() {
  search.value = "";
  category.value = "";
  productType.value = "";
  sort.value = "featured";
}

function applyQuickCollection(item) {
  clearFilters();
  if (item.search) search.value = item.search;
  if (item.type) productType.value = item.type;
  document.querySelector("#catalogue")?.scrollIntoView({ behavior: "smooth" });
}

function formatPrice(value, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
}

function usePlaceholder(event) {
  event.target.src = placeholderImage;
}

async function openRetailer(product) {
  let destination = product.affiliateUrl || product.productUrl;

  if (product.id) {
    try {
      const { data } = await API.post(`/products/${product.id}/click`);
      destination = data?.url || destination;
    } catch (clickError) {
      console.warn("Click tracking failed; opening the known destination instead.", clickError);
    }
  }

  if (destination) window.open(destination, "_blank", "noopener,noreferrer");
}

onMounted(fetchCatalogue);
</script>

<style scoped>
.shop-home{max-width:1240px;margin:0 auto;padding:2rem 1.25rem 4rem;color:var(--bb-text,#172018)}
.hero{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(280px,.8fr);gap:2rem;align-items:center;padding:clamp(2rem,5vw,4.5rem);border:1px solid #d9e5cc;border-radius:28px;background:linear-gradient(135deg,#fff7c8 0%,#f6fbef 52%,#e8f4dc 100%);box-shadow:0 20px 60px rgba(31,52,28,.12)}
.eyebrow{margin:0 0 .6rem;color:#537230;font-size:.78rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
h1,h2,h3,p{margin-top:0}h1{max-width:800px;margin-bottom:1rem;font-size:clamp(2.25rem,5vw,4.8rem);line-height:.98;letter-spacing:-.045em}.hero-text{max-width:700px;font-size:1.15rem;line-height:1.65;color:#465247}.hero-actions{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:1.5rem}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.75rem 1.1rem;border:1px solid transparent;border-radius:999px;font:inherit;font-weight:750;text-decoration:none;cursor:pointer}.btn-primary{background:#263f20;color:#fff}.btn-secondary{border-color:#a7b99c;background:rgba(255,255,255,.82);color:#263f20}.hero-card{padding:1.6rem;border:1px solid rgba(55,83,43,.22);border-radius:22px;background:rgba(255,255,255,.82)}.hero-icon,.collection-icon{display:block;margin-bottom:.75rem;font-size:2rem}.hero-card ul{display:grid;gap:.65rem;padding-left:1.2rem;margin-bottom:0}
.collections,.catalogue,.how-it-works,.disclosure{margin-top:4rem}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin-bottom:1.35rem}.section-heading h2,.disclosure h2{margin-bottom:0;font-size:clamp(1.8rem,3vw,2.8rem);letter-spacing:-.025em}.collection-grid,.steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem}.collection-card,.steps article{min-height:170px;padding:1.25rem;border:1px solid #dce5d7;border-radius:20px;background:#fff;text-align:left}.collection-card{color:inherit;cursor:pointer}.collection-card:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(34,58,28,.1)}.collection-card strong,.collection-card span:last-child{display:block}.collection-card span:last-child{margin-top:.4rem;color:#657166;line-height:1.4}.catalogue-heading{align-items:center}.result-count{margin:0;color:#687169}
.filters{display:grid;grid-template-columns:2fr repeat(3,minmax(150px,1fr));gap:.85rem;margin-bottom:1.5rem;padding:1rem;border:1px solid #dce5d7;border-radius:18px;background:#f2f6ef}.filters label{display:grid;gap:.35rem;font-size:.8rem;font-weight:750}.filters input,.filters select{width:100%;min-height:44px;padding:.65rem .75rem;border:1px solid #cbd8c5;border-radius:11px;background:#fff;color:#172018;font:inherit}.product-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1.15rem}.product-card{display:flex;min-width:0;flex-direction:column;overflow:hidden;border:1px solid #dce5d7;border-radius:20px;background:#fff;box-shadow:0 8px 28px rgba(42,61,37,.07)}.image-wrap{position:relative;aspect-ratio:4/3;overflow:hidden;background:#f2f5ef}.image-wrap img{width:100%;height:100%;object-fit:cover}.badge{position:absolute;top:.75rem;left:.75rem;padding:.35rem .6rem;border-radius:999px;background:#fff3a8;color:#3d470d;font-size:.72rem;font-weight:800}.product-body{display:flex;flex:1;flex-direction:column;padding:1rem}.brand-name{margin-bottom:.35rem;color:#586558;font-size:.78rem;font-weight:750;text-transform:uppercase}.product-body h3{margin-bottom:.55rem;line-height:1.25}.description{display:-webkit-box;overflow:hidden;margin-bottom:1rem;color:#4d584e;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:3}.product-meta{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-top:auto;margin-bottom:.9rem;color:#566256;font-size:.85rem}.product-meta strong{color:#1f2e1d;font-size:1rem}.product-button{width:100%}.state-card,.disclosure{padding:1.4rem;border:1px solid #dce5d7;border-radius:18px;background:#f8faf6}.state-card p{margin-bottom:0;color:#4d584e;line-height:1.6}.state-card .btn{margin-top:1rem}.empty-catalogue{text-align:center;padding:2.2rem}.state-error{border-color:#e8b6b6;background:#fff5f5;color:#8a2828}.load-more{margin-top:1.5rem;text-align:center}.steps article span{display:inline-flex;width:34px;height:34px;align-items:center;justify-content:center;margin-bottom:1rem;border-radius:50%;background:#263f20;color:#fff;font-weight:800}.steps article p,.disclosure p{margin-bottom:0;color:#4d584e;line-height:1.6}.disclosure{background:#fff9df}
:global(.theme-dark) .shop-home{color:#f3fff5}:global(.theme-dark) .hero{border-color:#3d5d45;background:linear-gradient(135deg,#172219 0%,#101713 52%,#18261b 100%);box-shadow:0 20px 60px rgba(0,0,0,.5)}:global(.theme-dark) .eyebrow{color:#91e49c}:global(.theme-dark) .hero-text{color:#d3e3d6}:global(.theme-dark) .hero-card{border-color:#48604d;background:#1b241d;color:#f5fff6}:global(.theme-dark) .btn-primary{background:#72dc7c;color:#07130a}:global(.theme-dark) .btn-secondary{border-color:#66806b;background:#202a22;color:#f2fff4}:global(.theme-dark) .collection-card,:global(.theme-dark) .steps article,:global(.theme-dark) .product-card{border-color:#3b5140;background:#182019;color:#f3fff5}:global(.theme-dark) .collection-card span:last-child,:global(.theme-dark) .result-count,:global(.theme-dark) .brand-name,:global(.theme-dark) .description,:global(.theme-dark) .product-meta,:global(.theme-dark) .steps article p,:global(.theme-dark) .disclosure p,:global(.theme-dark) .state-card p{color:#c9d9cc}:global(.theme-dark) .filters{border-color:#3b5140;background:#151d17}:global(.theme-dark) .filters input,:global(.theme-dark) .filters select{border-color:#57705c;background:#0f1511;color:#f4fff5}:global(.theme-dark) .filters input::placeholder{color:#9fb0a2}:global(.theme-dark) .image-wrap{background:#101612}:global(.theme-dark) .product-meta strong{color:#f6fff7}:global(.theme-dark) .state-card{border-color:#3b5140;background:#182019;color:#f3fff5}:global(.theme-dark) .state-error{border-color:#a64d58;background:#321b1f;color:#ffd9dd}:global(.theme-dark) .disclosure{border-color:#695f32;background:#28240f;color:#fff9d8}
@media(max-width:1000px){.product-grid,.collection-grid,.steps{grid-template-columns:repeat(2,minmax(0,1fr))}.filters{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){.shop-home{padding:1rem .8rem 3rem}.hero{grid-template-columns:1fr;padding:1.5rem}.product-grid,.collection-grid,.steps,.filters{grid-template-columns:1fr}.section-heading{align-items:flex-start;flex-direction:column}}
</style>
