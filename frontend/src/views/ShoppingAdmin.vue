<template>
  <section class="admin-shell">
    <header class="admin-heading">
      <div>
        <p class="eyebrow">BundleBee administration</p>
        <h1>Shopping catalogue</h1>
        <p>Manage the products, brands, collections and affiliate programmes that power the public catalogue.</p>
      </div>
      <router-link to="/" class="secondary-button">View public site</router-link>
    </header>

    <div v-if="loading" class="status-card">Loading catalogue data…</div>
    <div v-else-if="error" class="status-card error">{{ error }}</div>

    <template v-else>
      <nav class="tabs" aria-label="Shopping administration sections">
        <button v-for="tab in tabs" :key="tab.key" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
          {{ tab.label }} <span>{{ counts[tab.key] }}</span>
        </button>
      </nav>

      <div v-if="message" class="status-card success">{{ message }}</div>

      <section v-if="activeTab === 'products'" class="workspace">
        <form class="editor" @submit.prevent="saveProduct">
          <h2>{{ productForm._id ? 'Edit product' : 'Add product' }}</h2>
          <label>Product name<input v-model.trim="productForm.name" required /></label>
          <label>Slug<input v-model.trim="productForm.slug" required placeholder="use-lowercase-hyphens" /></label>
          <label>Brand<select v-model="productForm.brand" required><option value="">Choose brand</option><option v-for="brand in brands" :key="brand._id" :value="brand._id">{{ brand.name }}</option></select></label>
          <label>Short description<textarea v-model.trim="productForm.shortDescription" required maxlength="240" rows="3" /></label>
          <div class="two-columns"><label>Price<input v-model.number="productForm.price" type="number" min="0" step="0.01" /></label><label>Type<select v-model="productForm.productType"><option value="physical">Physical</option><option value="digital">Digital</option><option value="subscription">Subscription</option><option value="experience">Experience</option><option value="service">Service</option></select></label></div>
          <label>Product URL<input v-model.trim="productForm.productUrl" type="url" required /></label>
          <label>Affiliate URL<input v-model.trim="productForm.affiliateUrl" type="url" required /></label>
          <label>Image URL<input v-model.trim="productForm.imageUrl" type="url" required /></label>
          <label>Tags, comma separated<input v-model.trim="productForm.tagsText" /></label>
          <div class="checks"><label><input v-model="productForm.featured" type="checkbox" /> Featured</label><label><input v-model="productForm.active" type="checkbox" /> Active</label><label><input v-model="productForm.published" type="checkbox" /> Published</label></div>
          <div class="actions"><button class="primary-button" type="submit">Save product</button><button v-if="productForm._id" class="secondary-button" type="button" @click="resetProduct">Cancel</button></div>
        </form>

        <div class="records"><article v-for="product in products" :key="product._id" class="record"><div><strong>{{ product.name }}</strong><p>{{ product.brand?.name || 'No brand' }} · {{ product.productType }} · {{ money(product.price) }}</p><small>{{ product.publishedAt ? 'Published' : 'Draft' }} · {{ product.active ? 'Active' : 'Hidden' }} · {{ product.clicks || 0 }} clicks</small></div><div class="record-actions"><button @click="editProduct(product)">Edit</button><button @click="hideProduct(product)">Hide</button></div></article><p v-if="!products.length">No products yet.</p></div>
      </section>

      <section v-else-if="activeTab === 'brands'" class="workspace">
        <form class="editor" @submit.prevent="saveBrand"><h2>{{ brandForm._id ? 'Edit brand' : 'Add brand' }}</h2><label>Name<input v-model.trim="brandForm.name" required /></label><label>Slug<input v-model.trim="brandForm.slug" required /></label><label>Website<input v-model.trim="brandForm.website" type="url" required /></label><label>Logo URL<input v-model.trim="brandForm.logoUrl" type="url" /></label><label>Description<textarea v-model.trim="brandForm.description" rows="4" /></label><div class="checks"><label><input v-model="brandForm.independent" type="checkbox" /> Independent</label><label><input v-model="brandForm.smallBusiness" type="checkbox" /> Small business</label><label><input v-model="brandForm.approved" type="checkbox" /> Approved</label><label><input v-model="brandForm.active" type="checkbox" /> Active</label></div><div class="actions"><button class="primary-button" type="submit">Save brand</button><button v-if="brandForm._id" class="secondary-button" type="button" @click="resetBrand">Cancel</button></div></form>
        <div class="records"><article v-for="brand in brands" :key="brand._id" class="record"><div><strong>{{ brand.name }}</strong><p>{{ brand.website }}</p><small>{{ brand.approved ? 'Approved' : 'Needs review' }} · {{ brand.active ? 'Active' : 'Hidden' }}</small></div><button @click="editBrand(brand)">Edit</button></article><p v-if="!brands.length">No brands yet.</p></div>
      </section>

      <section v-else-if="activeTab === 'collections'" class="workspace">
        <form class="editor" @submit.prevent="saveCollection"><h2>{{ collectionForm._id ? 'Edit collection' : 'Add collection' }}</h2><label>Name<input v-model.trim="collectionForm.name" required /></label><label>Slug<input v-model.trim="collectionForm.slug" required /></label><label>Description<textarea v-model.trim="collectionForm.description" rows="4" /></label><label>Image URL<input v-model.trim="collectionForm.imageUrl" type="url" /></label><label>Products<select v-model="collectionForm.products" multiple size="8"><option v-for="product in products" :key="product._id" :value="product._id">{{ product.name }}</option></select></label><div class="checks"><label><input v-model="collectionForm.featured" type="checkbox" /> Featured</label><label><input v-model="collectionForm.active" type="checkbox" /> Active</label><label><input v-model="collectionForm.published" type="checkbox" /> Published</label></div><div class="actions"><button class="primary-button" type="submit">Save collection</button><button v-if="collectionForm._id" class="secondary-button" type="button" @click="resetCollection">Cancel</button></div></form>
        <div class="records"><article v-for="collection in collections" :key="collection._id" class="record"><div><strong>{{ collection.name }}</strong><p>{{ collection.products?.length || 0 }} products</p><small>{{ collection.publishedAt ? 'Published' : 'Draft' }} · {{ collection.active ? 'Active' : 'Hidden' }}</small></div><button @click="editCollection(collection)">Edit</button></article><p v-if="!collections.length">No collections yet.</p></div>
      </section>

      <section v-else class="workspace">
        <form class="editor" @submit.prevent="saveProgramme"><h2>{{ programmeForm._id ? 'Edit programme' : 'Add programme' }}</h2><label>Name<input v-model.trim="programmeForm.name" required /></label><label>Network<input v-model.trim="programmeForm.network" required /></label><label>Status<select v-model="programmeForm.status"><option value="researching">Researching</option><option value="applied">Applied</option><option value="approved">Approved</option><option value="declined">Declined</option><option value="paused">Paused</option><option value="closed">Closed</option></select></label><label>Application URL<input v-model.trim="programmeForm.applicationUrl" type="url" /></label><div class="two-columns"><label>Commission value<input v-model.number="programmeForm.commissionValue" type="number" min="0" step="0.01" /></label><label>Cookie days<input v-model.number="programmeForm.cookieDurationDays" type="number" min="0" /></label></div><label>Notes<textarea v-model.trim="programmeForm.notes" rows="5" /></label><div class="actions"><button class="primary-button" type="submit">Save programme</button><button v-if="programmeForm._id" class="secondary-button" type="button" @click="resetProgramme">Cancel</button></div></form>
        <div class="records"><article v-for="programme in programmes" :key="programme._id" class="record"><div><strong>{{ programme.name }}</strong><p>{{ programme.network }} · {{ programme.status }}</p><small>{{ programme.commissionValue ?? 'Unknown' }} commission · {{ programme.cookieDurationDays ?? 'Unknown' }} cookie days</small></div><button @click="editProgramme(programme)">Edit</button></article><p v-if="!programmes.length">No programmes yet.</p></div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import API from '@/api';

const tabs = [{ key: 'products', label: 'Products' }, { key: 'brands', label: 'Brands' }, { key: 'collections', label: 'Collections' }, { key: 'programmes', label: 'Affiliate programmes' }];
const activeTab = ref('products'); const loading = ref(true); const error = ref(''); const message = ref('');
const products = ref([]); const brands = ref([]); const collections = ref([]); const programmes = ref([]);
const counts = computed(() => ({ products: products.value.length, brands: brands.value.length, collections: collections.value.length, programmes: programmes.value.length }));
const blankProduct = () => ({ _id: '', name: '', slug: '', brand: '', shortDescription: '', price: null, productType: 'physical', productUrl: '', affiliateUrl: '', imageUrl: '', tagsText: '', featured: false, active: true, published: false });
const blankBrand = () => ({ _id: '', name: '', slug: '', website: '', logoUrl: '', description: '', independent: false, smallBusiness: false, approved: false, active: true });
const blankCollection = () => ({ _id: '', name: '', slug: '', description: '', imageUrl: '', products: [], featured: false, active: true, published: false });
const blankProgramme = () => ({ _id: '', name: '', network: 'Direct', status: 'researching', applicationUrl: '', commissionValue: null, cookieDurationDays: null, notes: '' });
const productForm = reactive(blankProduct()); const brandForm = reactive(blankBrand()); const collectionForm = reactive(blankCollection()); const programmeForm = reactive(blankProgramme());
function replaceForm(target, value) { Object.keys(target).forEach((key) => delete target[key]); Object.assign(target, value); }
function notify(text) { message.value = text; window.setTimeout(() => { message.value = ''; }, 3000); }
function money(value) { return value == null ? 'Price unavailable' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value); }
async function loadAll() { loading.value = true; error.value = ''; try { const [p, b, c, a] = await Promise.all([API.get('/admin/products'), API.get('/admin/brands'), API.get('/admin/collections'), API.get('/admin/affiliate-programmes')]); products.value = p.data; brands.value = b.data; collections.value = c.data; programmes.value = a.data; } catch (e) { error.value = e?.response?.data?.message || e?.response?.data?.msg || 'Unable to load the shopping administration area.'; } finally { loading.value = false; } }
function resetProduct() { replaceForm(productForm, blankProduct()); } function resetBrand() { replaceForm(brandForm, blankBrand()); } function resetCollection() { replaceForm(collectionForm, blankCollection()); } function resetProgramme() { replaceForm(programmeForm, blankProgramme()); }
function editProduct(item) { replaceForm(productForm, { ...blankProduct(), ...item, brand: item.brand?._id || item.brand || '', tagsText: (item.tags || []).join(', '), published: !!item.publishedAt }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function editBrand(item) { replaceForm(brandForm, { ...blankBrand(), ...item }); }
function editCollection(item) { replaceForm(collectionForm, { ...blankCollection(), ...item, products: (item.products || []).map((p) => p._id || p), published: !!item.publishedAt }); }
function editProgramme(item) { replaceForm(programmeForm, { ...blankProgramme(), ...item }); }
async function saveProduct() { const id = productForm._id; const payload = { ...productForm, tags: productForm.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean), publishedAt: productForm.published ? (products.value.find((p) => p._id === id)?.publishedAt || new Date().toISOString()) : null }; delete payload._id; delete payload.tagsText; delete payload.published; await (id ? API.put(`/admin/products/${id}`, payload) : API.post('/admin/products', payload)); resetProduct(); await loadAll(); notify('Product saved.'); }
async function hideProduct(item) { await API.delete(`/admin/products/${item._id}`); await loadAll(); notify('Product hidden.'); }
async function saveBrand() { const id = brandForm._id; const payload = { ...brandForm }; delete payload._id; await (id ? API.put(`/admin/brands/${id}`, payload) : API.post('/admin/brands', payload)); resetBrand(); await loadAll(); notify('Brand saved.'); }
async function saveCollection() { const id = collectionForm._id; const payload = { ...collectionForm, publishedAt: collectionForm.published ? (collections.value.find((c) => c._id === id)?.publishedAt || new Date().toISOString()) : null }; delete payload._id; delete payload.published; await (id ? API.put(`/admin/collections/${id}`, payload) : API.post('/admin/collections', payload)); resetCollection(); await loadAll(); notify('Collection saved.'); }
async function saveProgramme() { const id = programmeForm._id; const payload = { ...programmeForm }; delete payload._id; await (id ? API.put(`/admin/affiliate-programmes/${id}`, payload) : API.post('/admin/affiliate-programmes', payload)); resetProgramme(); await loadAll(); notify('Affiliate programme saved.'); }
onMounted(loadAll);
</script>

<style scoped>
.admin-shell { text-align: left; } .admin-heading { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; margin-bottom:1.5rem; } .eyebrow { color:var(--bb-primary-dark); font-weight:700; text-transform:uppercase; letter-spacing:.08em; font-size:.78rem; } h1,h2,p { margin-top:0; } .tabs { display:flex; flex-wrap:wrap; gap:.5rem; margin-bottom:1rem; } .tabs button,.record button,.secondary-button,.primary-button { border:1px solid var(--bb-border); border-radius:10px; padding:.65rem .85rem; cursor:pointer; background:var(--bb-surface); color:var(--bb-text); text-decoration:none; } .tabs button.active,.primary-button { background:var(--bb-primary-dark); color:white; } .tabs span { opacity:.7; margin-left:.25rem; } .workspace { display:grid; grid-template-columns:minmax(280px, .85fr) minmax(320px, 1.15fr); gap:1rem; align-items:start; } .editor,.records,.status-card { border:1px solid var(--bb-border); border-radius:var(--bb-radius); padding:1rem; background:var(--bb-surface); box-shadow:var(--bb-shadow-sm); } .editor { display:grid; gap:.8rem; position:sticky; top:84px; } label { display:grid; gap:.3rem; font-weight:650; } input,textarea,select { width:100%; box-sizing:border-box; border:1px solid var(--bb-border); border-radius:9px; padding:.65rem; background:var(--bb-bg); color:var(--bb-text); } select[multiple] { min-height:11rem; } .two-columns,.checks,.actions,.record-actions { display:flex; flex-wrap:wrap; gap:.7rem; } .two-columns > label { flex:1; min-width:140px; } .checks label { display:flex; grid-template-columns:auto 1fr; align-items:center; font-weight:500; } .checks input { width:auto; } .record { display:flex; justify-content:space-between; gap:1rem; padding:.9rem 0; border-bottom:1px solid var(--bb-border); } .record:last-child { border-bottom:0; } .record p,.record small { color:var(--bb-muted); margin:.25rem 0 0; } .status-card { margin-bottom:1rem; } .status-card.error { border-color:#b42318; } .status-card.success { border-color:var(--bb-primary-dark); } @media(max-width:780px){ .workspace{grid-template-columns:1fr}.editor{position:static}.admin-heading{display:block}.secondary-button{display:inline-block;margin-bottom:1rem} }
</style>
