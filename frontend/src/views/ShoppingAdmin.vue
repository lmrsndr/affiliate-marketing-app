<template>
  <section class="admin-shell">
    <header class="admin-heading">
      <div>
        <p class="eyebrow">BundleBee administration</p>
        <h1>Shopping catalogue</h1>
        <p>Manage the products, brands, collections and affiliate programmes shown on BundleBee.</p>
      </div>
      <router-link to="/" class="button secondary">View public site</router-link>
    </header>

    <div v-if="loading" class="notice">Loading catalogue data…</div>
    <div v-else-if="error" class="notice error">{{ error }}</div>

    <template v-else>
      <nav class="tabs" aria-label="Catalogue administration">
        <button v-for="tab in tabs" :key="tab.key" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
          {{ tab.label }} <span>{{ counts[tab.key] }}</span>
        </button>
      </nav>
      <div v-if="message" class="notice success">{{ message }}</div>

      <section class="workspace">
        <form v-if="activeTab === 'products'" class="editor" @submit.prevent="saveProduct">
          <h2>{{ productForm._id ? 'Edit product' : 'Add product' }}</h2>
          <Field label="Product name"><input v-model.trim="productForm.name" required /></Field>
          <Field label="Slug"><input v-model.trim="productForm.slug" required placeholder="lowercase-with-hyphens" /></Field>
          <Field label="Brand"><select v-model="productForm.brand" required><option value="">Choose a brand</option><option v-for="brand in brands" :key="brand._id" :value="brand._id">{{ brand.name }}</option></select></Field>
          <Field label="Short description"><textarea v-model.trim="productForm.shortDescription" required maxlength="240" rows="3"></textarea></Field>
          <div class="row"><Field label="Price"><input v-model.number="productForm.price" type="number" min="0" step="0.01" /></Field><Field label="Type"><select v-model="productForm.productType"><option v-for="type in productTypes" :key="type" :value="type">{{ type }}</option></select></Field></div>
          <Field label="Product URL"><input v-model.trim="productForm.productUrl" type="url" required /></Field>
          <Field label="Affiliate URL"><input v-model.trim="productForm.affiliateUrl" type="url" required /></Field>
          <Field label="Image URL"><input v-model.trim="productForm.imageUrl" type="url" required /></Field>
          <Field label="Tags, comma separated"><input v-model.trim="productForm.tagsText" /></Field>
          <div class="checks"><label><input v-model="productForm.featured" type="checkbox" /> Featured</label><label><input v-model="productForm.active" type="checkbox" /> Active</label><label><input v-model="productForm.published" type="checkbox" /> Published</label></div>
          <FormActions :editing="!!productForm._id" :saving="saving" @cancel="resetProduct" />
        </form>

        <form v-else-if="activeTab === 'brands'" class="editor" @submit.prevent="saveBrand">
          <h2>{{ brandForm._id ? 'Edit brand' : 'Add brand' }}</h2>
          <Field label="Name"><input v-model.trim="brandForm.name" required /></Field>
          <Field label="Slug"><input v-model.trim="brandForm.slug" required /></Field>
          <Field label="Website"><input v-model.trim="brandForm.website" type="url" required /></Field>
          <Field label="Logo URL"><input v-model.trim="brandForm.logoUrl" type="url" /></Field>
          <Field label="Description"><textarea v-model.trim="brandForm.description" rows="4"></textarea></Field>
          <div class="checks"><label><input v-model="brandForm.independent" type="checkbox" /> Independent</label><label><input v-model="brandForm.smallBusiness" type="checkbox" /> Small business</label><label><input v-model="brandForm.approved" type="checkbox" /> Approved</label><label><input v-model="brandForm.active" type="checkbox" /> Active</label></div>
          <FormActions :editing="!!brandForm._id" :saving="saving" @cancel="resetBrand" />
        </form>

        <form v-else-if="activeTab === 'collections'" class="editor" @submit.prevent="saveCollection">
          <h2>{{ collectionForm._id ? 'Edit collection' : 'Add collection' }}</h2>
          <Field label="Name"><input v-model.trim="collectionForm.name" required /></Field>
          <Field label="Slug"><input v-model.trim="collectionForm.slug" required /></Field>
          <Field label="Description"><textarea v-model.trim="collectionForm.description" rows="4"></textarea></Field>
          <Field label="Image URL"><input v-model.trim="collectionForm.imageUrl" type="url" /></Field>
          <Field label="Products"><select v-model="collectionForm.products" multiple size="8"><option v-for="product in products" :key="product._id" :value="product._id">{{ product.name }}</option></select></Field>
          <div class="checks"><label><input v-model="collectionForm.featured" type="checkbox" /> Featured</label><label><input v-model="collectionForm.active" type="checkbox" /> Active</label><label><input v-model="collectionForm.published" type="checkbox" /> Published</label></div>
          <FormActions :editing="!!collectionForm._id" :saving="saving" @cancel="resetCollection" />
        </form>

        <form v-else class="editor" @submit.prevent="saveProgramme">
          <h2>{{ programmeForm._id ? 'Edit programme' : 'Add programme' }}</h2>
          <Field label="Name"><input v-model.trim="programmeForm.name" required /></Field>
          <Field label="Network"><input v-model.trim="programmeForm.network" required /></Field>
          <Field label="Status"><select v-model="programmeForm.status"><option v-for="status in programmeStatuses" :key="status" :value="status">{{ status }}</option></select></Field>
          <Field label="Application URL"><input v-model.trim="programmeForm.applicationUrl" type="url" /></Field>
          <div class="row"><Field label="Commission value"><input v-model.number="programmeForm.commissionValue" type="number" min="0" step="0.01" /></Field><Field label="Cookie days"><input v-model.number="programmeForm.cookieDurationDays" type="number" min="0" /></Field></div>
          <Field label="Notes"><textarea v-model.trim="programmeForm.notes" rows="5"></textarea></Field>
          <FormActions :editing="!!programmeForm._id" :saving="saving" @cancel="resetProgramme" />
        </form>

        <div class="records">
          <article v-for="item in activeRecords" :key="item._id" class="record">
            <div><strong>{{ recordTitle(item) }}</strong><p>{{ recordSummary(item) }}</p><small>{{ recordStatus(item) }}</small></div>
            <div class="record-actions"><button @click="editRecord(item)">Edit</button><button v-if="activeTab === 'products'" @click="hideProduct(item)">Hide</button></div>
          </article>
          <p v-if="!activeRecords.length">Nothing has been added here yet.</p>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue';
import API from '@/api';

const Field = defineComponent({ props: { label: String }, setup(props, { slots }) { return () => h('label', { class: 'field' }, [h('span', props.label), slots.default?.()]); } });
const FormActions = defineComponent({ props: { editing: Boolean, saving: Boolean }, emits: ['cancel'], setup(props, { emit }) { return () => h('div', { class: 'actions' }, [h('button', { class: 'button primary', type: 'submit', disabled: props.saving }, props.saving ? 'Saving…' : 'Save'), props.editing ? h('button', { class: 'button secondary', type: 'button', onClick: () => emit('cancel') }, 'Cancel') : null]); } });

const tabs = [{ key: 'products', label: 'Products' }, { key: 'brands', label: 'Brands' }, { key: 'collections', label: 'Collections' }, { key: 'programmes', label: 'Affiliate programmes' }];
const productTypes = ['physical', 'digital', 'subscription', 'experience', 'service'];
const programmeStatuses = ['researching', 'applied', 'approved', 'declined', 'paused', 'closed'];
const activeTab = ref('products'); const loading = ref(true); const saving = ref(false); const error = ref(''); const message = ref('');
const products = ref([]); const brands = ref([]); const collections = ref([]); const programmes = ref([]);
const blankProduct = () => ({ _id:'', name:'', slug:'', brand:'', shortDescription:'', price:null, productType:'physical', productUrl:'', affiliateUrl:'', imageUrl:'', tagsText:'', featured:false, active:true, published:false });
const blankBrand = () => ({ _id:'', name:'', slug:'', website:'', logoUrl:'', description:'', independent:false, smallBusiness:false, approved:false, active:true });
const blankCollection = () => ({ _id:'', name:'', slug:'', description:'', imageUrl:'', products:[], featured:false, active:true, published:false });
const blankProgramme = () => ({ _id:'', name:'', network:'Direct', status:'researching', applicationUrl:'', commissionValue:null, cookieDurationDays:null, notes:'' });
const productForm = reactive(blankProduct()); const brandForm = reactive(blankBrand()); const collectionForm = reactive(blankCollection()); const programmeForm = reactive(blankProgramme());
const counts = computed(() => ({ products:products.value.length, brands:brands.value.length, collections:collections.value.length, programmes:programmes.value.length }));
const activeRecords = computed(() => ({ products:products.value, brands:brands.value, collections:collections.value, programmes:programmes.value }[activeTab.value]));
function replace(target, value) { Object.keys(target).forEach((key) => delete target[key]); Object.assign(target, value); }
function flash(text) { message.value = text; setTimeout(() => { message.value = ''; }, 3000); }
function resetProduct(){ replace(productForm, blankProduct()); } function resetBrand(){ replace(brandForm, blankBrand()); } function resetCollection(){ replace(collectionForm, blankCollection()); } function resetProgramme(){ replace(programmeForm, blankProgramme()); }
async function loadAll(){ loading.value=true; error.value=''; try { const [p,b,c,a]=await Promise.all([API.get('/admin/products'),API.get('/admin/brands'),API.get('/admin/collections'),API.get('/admin/affiliate-programmes')]); products.value=p.data; brands.value=b.data; collections.value=c.data; programmes.value=a.data; } catch(e){ error.value=e?.response?.data?.message||e?.response?.data?.msg||'Unable to load catalogue administration.'; } finally { loading.value=false; } }
async function runSave(action, success){ saving.value=true; error.value=''; try { await action(); await loadAll(); flash(success); } catch(e){ error.value=e?.response?.data?.message||e?.response?.data?.msg||'The change could not be saved.'; } finally { saving.value=false; } }
function editRecord(item){ if(activeTab.value==='products') replace(productForm,{...blankProduct(),...item,brand:item.brand?._id||item.brand||'',tagsText:(item.tags||[]).join(', '),published:!!item.publishedAt}); if(activeTab.value==='brands') replace(brandForm,{...blankBrand(),...item}); if(activeTab.value==='collections') replace(collectionForm,{...blankCollection(),...item,products:(item.products||[]).map((p)=>p._id||p),published:!!item.publishedAt}); if(activeTab.value==='programmes') replace(programmeForm,{...blankProgramme(),...item}); window.scrollTo({top:0,behavior:'smooth'}); }
async function saveProduct(){ const id=productForm._id; const payload={...productForm,tags:productForm.tagsText.split(',').map((v)=>v.trim()).filter(Boolean),publishedAt:productForm.published?(products.value.find((v)=>v._id===id)?.publishedAt||new Date().toISOString()):null}; delete payload._id; delete payload.tagsText; delete payload.published; await runSave(async()=>{ await(id?API.put(`/admin/products/${id}`,payload):API.post('/admin/products',payload)); resetProduct(); },'Product saved.'); }
async function hideProduct(item){ await runSave(()=>API.delete(`/admin/products/${item._id}`),'Product hidden.'); }
async function saveBrand(){ const id=brandForm._id; const payload={...brandForm}; delete payload._id; await runSave(async()=>{ await(id?API.put(`/admin/brands/${id}`,payload):API.post('/admin/brands',payload)); resetBrand(); },'Brand saved.'); }
async function saveCollection(){ const id=collectionForm._id; const payload={...collectionForm,publishedAt:collectionForm.published?(collections.value.find((v)=>v._id===id)?.publishedAt||new Date().toISOString()):null}; delete payload._id; delete payload.published; await runSave(async()=>{ await(id?API.put(`/admin/collections/${id}`,payload):API.post('/admin/collections',payload)); resetCollection(); },'Collection saved.'); }
async function saveProgramme(){ const id=programmeForm._id; const payload={...programmeForm}; delete payload._id; await runSave(async()=>{ await(id?API.put(`/admin/affiliate-programmes/${id}`,payload):API.post('/admin/affiliate-programmes',payload)); resetProgramme(); },'Programme saved.'); }
function recordTitle(item){ return item.name; }
function recordSummary(item){ if(activeTab.value==='products') return `${item.brand?.name||'No brand'} · ${item.productType} · ${item.price==null?'Price unavailable':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(item.price)}`; if(activeTab.value==='brands') return item.website; if(activeTab.value==='collections') return `${item.products?.length||0} products`; return `${item.network} · ${item.status}`; }
function recordStatus(item){ if(activeTab.value==='products') return `${item.publishedAt?'Published':'Draft'} · ${item.active?'Active':'Hidden'} · ${item.clicks||0} clicks`; if(activeTab.value==='brands') return `${item.approved?'Approved':'Needs review'} · ${item.active?'Active':'Hidden'}`; if(activeTab.value==='collections') return `${item.publishedAt?'Published':'Draft'} · ${item.active?'Active':'Hidden'}`; return `${item.commissionValue??'Unknown'} commission · ${item.cookieDurationDays??'Unknown'} cookie days`; }
onMounted(loadAll);
</script>

<style scoped>
.admin-shell{text-align:left}.admin-heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1.5rem}.eyebrow{color:var(--bb-primary-dark);font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.78rem}.tabs{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem}.tabs button,.button,.record button{border:1px solid var(--bb-border);border-radius:10px;padding:.65rem .85rem;cursor:pointer;background:var(--bb-surface);color:var(--bb-text);text-decoration:none}.tabs button.active,.button.primary{background:var(--bb-primary-dark);color:white}.tabs span{opacity:.7}.workspace{display:grid;grid-template-columns:minmax(280px,.85fr) minmax(320px,1.15fr);gap:1rem;align-items:start}.editor,.records,.notice{border:1px solid var(--bb-border);border-radius:var(--bb-radius);padding:1rem;background:var(--bb-surface);box-shadow:var(--bb-shadow-sm)}.editor{display:grid;gap:.8rem;position:sticky;top:84px}.field{display:grid;gap:.3rem;font-weight:650}.field input,.field textarea,.field select{width:100%;box-sizing:border-box;border:1px solid var(--bb-border);border-radius:9px;padding:.65rem;background:var(--bb-bg);color:var(--bb-text)}.field select[multiple]{min-height:11rem}.row,.checks,.actions,.record-actions{display:flex;flex-wrap:wrap;gap:.7rem}.row>.field{flex:1;min-width:140px}.checks label{display:flex;align-items:center;gap:.35rem}.records{min-width:0}.record{display:flex;justify-content:space-between;gap:1rem;padding:.9rem 0;border-bottom:1px solid var(--bb-border)}.record:last-child{border-bottom:0}.record p,.record small{display:block;color:var(--bb-muted);margin:.25rem 0 0}.notice{margin-bottom:1rem}.notice.error{border-color:#b42318}.notice.success{border-color:var(--bb-primary-dark)}@media(max-width:780px){.workspace{grid-template-columns:1fr}.editor{position:static}.admin-heading{display:block}}
</style>
