<template>
  <section class="admin-shell">
    <header class="admin-heading">
      <div>
        <p class="eyebrow">BundleBee administration</p>
        <h1>Curate the catalogue</h1>
        <p>Use AI-assisted import for consistent product drafts, with manual entry available when needed.</p>
      </div>
      <router-link to="/" class="button secondary">View public site</router-link>
    </header>

    <div v-if="loading" class="notice">Loading administration…</div>
    <div v-else-if="error" class="notice error">{{ error }}</div>

    <template v-else>
      <nav class="tabs" aria-label="BundleBee administration">
        <button v-for="tab in tabs" :key="tab.key" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
          <span>{{ tab.label }}</span><small>{{ tab.help }}</small><b>{{ counts[tab.key] }}</b>
        </button>
      </nav>

      <div v-if="message" class="notice success">{{ message }}</div>

      <section v-if="activeTab === 'products'" class="products-section">
        <div class="creation-card">
          <header class="creation-heading">
            <div><p class="eyebrow">Create a product</p><h2>{{ productForm._id ? 'Edit product' : 'Choose how to start' }}</h2></div>
            <div v-if="!productForm._id" class="mode-toggle">
              <button type="button" :class="{ active: productMode === 'ai' }" @click="productMode = 'ai'">AI import</button>
              <button type="button" :class="{ active: productMode === 'manual' }" @click="productMode = 'manual'">Manual entry</button>
            </div>
          </header>

          <div v-if="productMode === 'ai' && !productForm._id" class="ai-choice">
            <div>
              <h3>Recommended: import the AI JSON</h3>
              <p>Paste the final output from the BundleBee analysis prompt, review every field, then save it as a draft.</p>
            </div>
            <router-link class="button primary" to="/admin/import-product">Open AI importer</router-link>
          </div>

          <form v-else class="editor" @submit.prevent="saveProduct">
            <Field label="Product name"><input v-model.trim="productForm.name" required /></Field>
            <Field label="Maker or shop"><select v-model="productForm.brand" required><option value="">Choose a maker</option><option v-for="brand in brands" :key="brand._id" :value="brand._id">{{ brand.name }}</option></select></Field>
            <Field label="Short description"><textarea v-model.trim="productForm.shortDescription" required maxlength="240" rows="3"></textarea></Field>
            <Field label="Why BundleBee picked it"><textarea v-model.trim="productForm.curatorNote" maxlength="320" rows="3"></textarea></Field>
            <div class="two"><Field label="Price"><input v-model.number="productForm.price" type="number" min="0" step="0.01" /></Field><Field label="Product type"><select v-model="productForm.productType"><option v-for="type in productTypes" :key="type" :value="type">{{ type }}</option></select></Field></div>
            <Field label="Product page"><input v-model.trim="productForm.productUrl" type="url" required /></Field>
            <Field label="Affiliate link"><input v-model.trim="productForm.affiliateUrl" type="url" required /></Field>
            <Field label="Main image URL"><input v-model.trim="productForm.imageUrl" type="url" required /></Field>
            <ChoiceGroup title="What should it feel like?" v-model="productForm.moods" :options="moodOptions" />
            <ChoiceGroup title="Who could it suit?" v-model="productForm.recipients" :options="recipientOptions" />
            <ChoiceGroup title="Useful occasions" v-model="productForm.occasions" :options="occasionOptions" />
            <ChoiceGroup title="Verified or marketer-supplied qualities" v-model="productForm.qualities" :options="qualityOptions" />
            <Field label="Other search words"><input v-model.trim="productForm.tagsText" placeholder="ceramics, coastal, blue" /></Field>
            <div class="checks"><label><input v-model="productForm.featured" type="checkbox" /> Featured</label><label><input v-model="productForm.active" type="checkbox" /> Active</label><label><input v-model="productForm.published" type="checkbox" /> Published</label></div>
            <FormActions :editing="!!productForm._id" :saving="saving" @cancel="resetProduct" />
          </form>
        </div>

        <RecordList title="Products" :items="products" empty="No products yet.">
          <template #summary="{ item }">{{ item.brand?.name || 'No maker' }} · {{ item.moods?.join(', ') || 'No mood labels' }}</template>
          <template #status="{ item }">{{ item.publishedAt ? 'Published' : 'Draft' }} · {{ item.active ? 'Active' : 'Hidden' }} · {{ item.clicks || 0 }} clicks</template>
          <template #actions="{ item }"><button @click="editProduct(item)">Edit</button><button @click="hideProduct(item)">Hide</button></template>
        </RecordList>
      </section>

      <section v-else-if="activeTab === 'makers'" class="workspace">
        <form class="editor card" @submit.prevent="saveBrand">
          <header><p class="eyebrow">Reusable information</p><h2>{{ brandForm._id ? 'Edit maker' : 'Add a maker or shop' }}</h2></header>
          <Field label="Name"><input v-model.trim="brandForm.name" required /></Field>
          <Field label="Website"><input v-model.trim="brandForm.website" type="url" required /></Field>
          <Field label="Logo URL"><input v-model.trim="brandForm.logoUrl" type="url" /></Field>
          <Field label="Short story"><textarea v-model.trim="brandForm.description" rows="5"></textarea></Field>
          <div class="checks"><label><input v-model="brandForm.independent" type="checkbox" /> Independent</label><label><input v-model="brandForm.smallBusiness" type="checkbox" /> Small business</label><label><input v-model="brandForm.approved" type="checkbox" /> Approved</label><label><input v-model="brandForm.active" type="checkbox" /> Active</label></div>
          <FormActions :editing="!!brandForm._id" :saving="saving" @cancel="resetBrand" />
        </form>
        <RecordList title="Makers & shops" :items="brands" empty="No makers yet."><template #summary="{ item }">{{ item.website }}</template><template #status="{ item }">{{ item.approved ? 'Approved' : 'Needs review' }}</template><template #actions="{ item }"><button @click="editBrand(item)">Edit</button></template></RecordList>
      </section>

      <section v-else-if="activeTab === 'guides'" class="workspace">
        <form class="editor card" @submit.prevent="saveCollection">
          <header><p class="eyebrow">Editorial layer</p><h2>{{ collectionForm._id ? 'Edit gift guide' : 'Create a gift guide' }}</h2></header>
          <Field label="Guide name"><input v-model.trim="collectionForm.name" required /></Field>
          <Field label="Introduction"><textarea v-model.trim="collectionForm.description" rows="4"></textarea></Field>
          <Field label="Cover image URL"><input v-model.trim="collectionForm.imageUrl" type="url" /></Field>
          <Field label="Included products"><select v-model="collectionForm.products" multiple size="10"><option v-for="product in products" :key="product._id" :value="product._id">{{ product.name }}</option></select></Field>
          <div class="checks"><label><input v-model="collectionForm.featured" type="checkbox" /> Featured</label><label><input v-model="collectionForm.active" type="checkbox" /> Active</label><label><input v-model="collectionForm.published" type="checkbox" /> Published</label></div>
          <FormActions :editing="!!collectionForm._id" :saving="saving" @cancel="resetCollection" />
        </form>
        <RecordList title="Gift guides" :items="collections" empty="No gift guides yet."><template #summary="{ item }">{{ item.products?.length || 0 }} products</template><template #status="{ item }">{{ item.publishedAt ? 'Published' : 'Draft' }}</template><template #actions="{ item }"><button @click="editCollection(item)">Edit</button></template></RecordList>
      </section>

      <section v-else-if="activeTab === 'platforms'" class="workspace">
        <form class="editor card" @submit.prevent="saveProgramme">
          <header><p class="eyebrow">Affiliate control centre</p><h2>{{ programmeForm._id ? 'Edit affiliate platform' : 'Add affiliate platform' }}</h2></header>
          <div class="two"><Field label="Programme or retailer"><input v-model.trim="programmeForm.name" required /></Field><Field label="Network or platform"><input v-model.trim="programmeForm.network" required /></Field></div>
          <Field label="Dashboard login URL"><input v-model.trim="programmeForm.dashboardUrl" type="url" /></Field>
          <Field label="Application URL"><input v-model.trim="programmeForm.applicationUrl" type="url" /></Field>
          <div class="two"><Field label="Status"><select v-model="programmeForm.status"><option v-for="status in programmeStatuses" :key="status" :value="status">{{ status }}</option></select></Field><Field label="Contact email"><input v-model.trim="programmeForm.contactEmail" type="email" /></Field></div>
          <div class="two"><Field label="Last checked"><input v-model="programmeForm.lastCheckedAt" type="date" /></Field><Field label="Check again on"><input v-model="programmeForm.nextCheckDueAt" type="date" /></Field></div>
          <Field label="Notes"><textarea v-model.trim="programmeForm.notes" rows="5"></textarea></Field>
          <FormActions :editing="!!programmeForm._id" :saving="saving" @cancel="resetProgramme" />
        </form>
        <section class="records card"><h2>Affiliate platforms</h2><article v-for="item in programmes" :key="item._id" class="record"><div><strong>{{ item.name }}</strong><p>{{ item.network }} · {{ item.status }}</p><small>{{ platformTiming(item) }} · {{ programmeProductCount(item) }} products</small></div><div class="record-actions"><a v-if="item.dashboardUrl" class="button primary" :href="item.dashboardUrl" target="_blank" rel="noopener">Open dashboard</a><button @click="markChecked(item)">Checked today</button><button @click="editProgramme(item)">Edit</button></div></article><p v-if="!programmes.length">No affiliate platforms yet.</p></section>
      </section>

      <section v-else class="access-panel card">
        <div><p class="eyebrow">Access</p><h2>Approved administrators</h2><p>Supabase manages accounts and Render’s <code>BUNDLEBEE_ADMIN_EMAILS</code> controls access.</p></div>
        <div class="access-list"><article v-for="user in users" :key="user._id"><strong>{{ user.name || user.email }}</strong><span>{{ user.email }}</span></article></div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue';
import API from '@/api';

const Field = defineComponent({ props:{label:String}, setup(p,{slots}){return()=>h('label',{class:'field'},[h('span',p.label),slots.default?.()]);} });
const FormActions = defineComponent({ props:{editing:Boolean,saving:Boolean}, emits:['cancel'], setup(p,{emit}){return()=>h('div',{class:'actions'},[h('button',{class:'button primary',type:'submit',disabled:p.saving},p.saving?'Saving…':'Save'),p.editing?h('button',{class:'button',type:'button',onClick:()=>emit('cancel')},'Cancel'):null]);} });
const ChoiceGroup = defineComponent({ props:{title:String,modelValue:Array,options:Array}, emits:['update:modelValue'], setup(p,{emit}){const toggle=v=>emit('update:modelValue',p.modelValue.includes(v)?p.modelValue.filter(x=>x!==v):[...p.modelValue,v]);return()=>h('fieldset',{class:'choice-group'},[h('legend',p.title),h('div',{class:'choice-grid'},p.options.map(v=>h('label',{class:{selected:p.modelValue.includes(v)}},[h('input',{type:'checkbox',checked:p.modelValue.includes(v),onChange:()=>toggle(v)}),v])))]);} });
const RecordList = defineComponent({ props:{title:String,items:Array,empty:String}, setup(p,{slots}){return()=>h('section',{class:'records card'},[h('h2',p.title),...(p.items?.length?p.items.map(item=>h('article',{class:'record',key:item._id},[h('div',[h('strong',item.name||item.email),h('p',slots.summary?.({item})),h('small',slots.status?.({item}))]),h('div',{class:'record-actions'},slots.actions?.({item}))])):[h('p',p.empty)])]);} });

const tabs=[{key:'products',label:'Products',help:'AI or manual creation'},{key:'makers',label:'Makers',help:'Reusable stories'},{key:'guides',label:'Gift guides',help:'Editorial collections'},{key:'platforms',label:'Affiliate platforms',help:'Dashboards and checks'},{key:'access',label:'Access',help:'Approved admins'}];
const moodOptions=['one of a kind','elegant','meaningful','unexpected','playful','beautifully useful'];
const recipientOptions=['partner','parent','teenager','friend','teacher','couple','someone who has everything'];
const occasionOptions=['birthday','anniversary','wedding','new home','Christmas','thank you'];
const qualityOptions=['handmade','personalised','limited edition','made in Britain','small batch','sustainable claim'];
const productTypes=['physical','digital','subscription','experience','service'];
const programmeStatuses=['researching','applied','approved','declined','paused','closed'];

const activeTab=ref('products'),productMode=ref('ai'),loading=ref(true),saving=ref(false),error=ref(''),message=ref('');
const products=ref([]),brands=ref([]),collections=ref([]),programmes=ref([]),users=ref([]);
const blankProduct=()=>({_id:'',name:'',slug:'',brand:'',shortDescription:'',curatorNote:'',price:null,productType:'physical',productUrl:'',affiliateUrl:'',imageUrl:'',tagsText:'',moods:[],recipients:[],occasions:[],qualities:[],featured:false,active:true,published:false});
const blankBrand=()=>({_id:'',name:'',slug:'',website:'',logoUrl:'',description:'',independent:true,smallBusiness:true,approved:false,active:true});
const blankCollection=()=>({_id:'',name:'',slug:'',description:'',imageUrl:'',products:[],featured:false,active:true,published:false});
const blankProgramme=()=>({_id:'',name:'',network:'Direct',status:'researching',applicationUrl:'',dashboardUrl:'',contactEmail:'',lastCheckedAt:'',nextCheckDueAt:'',notes:'',active:true});
const productForm=reactive(blankProduct()),brandForm=reactive(blankBrand()),collectionForm=reactive(blankCollection()),programmeForm=reactive(blankProgramme());
const counts=computed(()=>({products:products.value.length,makers:brands.value.length,guides:collections.value.length,platforms:programmes.value.length,access:users.value.length}));

function replace(t,v){Object.keys(t).forEach(k=>delete t[k]);Object.assign(t,v);}
function slugify(v){return String(v||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function flash(t){message.value=t;setTimeout(()=>message.value='',3000);}
function toDateInput(v){return v?new Date(v).toISOString().slice(0,10):'';}
function resetProduct(){replace(productForm,blankProduct());productMode.value='ai';}
function resetBrand(){replace(brandForm,blankBrand());}
function resetCollection(){replace(collectionForm,blankCollection());}
function resetProgramme(){replace(programmeForm,blankProgramme());}

async function loadAll(){loading.value=true;error.value='';try{const [p,b,c,a,u]=await Promise.all([API.get('/admin/products'),API.get('/admin/brands'),API.get('/admin/collections'),API.get('/admin/affiliate-programmes'),API.get('/admin/users')]);products.value=p.data;brands.value=b.data;collections.value=c.data;programmes.value=a.data;users.value=u.data;}catch(e){error.value=e?.response?.data?.message||'Unable to load administration.';}finally{loading.value=false;}}
async function run(action,text){saving.value=true;error.value='';try{await action();await loadAll();flash(text);}catch(e){error.value=e?.response?.data?.message||'The change could not be saved.';}finally{saving.value=false;}}

function editProduct(item){replace(productForm,{...blankProduct(),...item,brand:item.brand?._id||item.brand||'',tagsText:(item.tags||[]).join(', '),moods:item.moods||[],recipients:item.recipients||[],occasions:item.occasions||[],qualities:item.qualities||[],published:!!item.publishedAt});productMode.value='manual';window.scrollTo({top:0,behavior:'smooth'});}
function editBrand(item){replace(brandForm,{...blankBrand(),...item});window.scrollTo({top:0,behavior:'smooth'});}
function editCollection(item){replace(collectionForm,{...blankCollection(),...item,products:(item.products||[]).map(p=>p._id||p),published:!!item.publishedAt});window.scrollTo({top:0,behavior:'smooth'});}
function editProgramme(item){replace(programmeForm,{...blankProgramme(),...item,lastCheckedAt:toDateInput(item.lastCheckedAt),nextCheckDueAt:toDateInput(item.nextCheckDueAt)});window.scrollTo({top:0,behavior:'smooth'});}

async function saveProduct(){const id=productForm._id,payload={...productForm,slug:productForm.slug||slugify(productForm.name),tags:productForm.tagsText.split(',').map(v=>v.trim()).filter(Boolean),publishedAt:productForm.published?(products.value.find(v=>v._id===id)?.publishedAt||new Date().toISOString()):null};delete payload._id;delete payload.tagsText;delete payload.published;await run(async()=>{await(id?API.put(`/admin/products/${id}`,payload):API.post('/admin/products',payload));resetProduct();},'Product saved.');}
async function hideProduct(item){await run(()=>API.delete(`/admin/products/${item._id}`),'Product hidden.');}
async function saveBrand(){const id=brandForm._id,payload={...brandForm,slug:brandForm.slug||slugify(brandForm.name)};delete payload._id;await run(async()=>{await(id?API.put(`/admin/brands/${id}`,payload):API.post('/admin/brands',payload));resetBrand();},'Maker saved.');}
async function saveCollection(){const id=collectionForm._id,payload={...collectionForm,slug:collectionForm.slug||slugify(collectionForm.name),publishedAt:collectionForm.published?(collections.value.find(v=>v._id===id)?.publishedAt||new Date().toISOString()):null};delete payload._id;delete payload.published;await run(async()=>{await(id?API.put(`/admin/collections/${id}`,payload):API.post('/admin/collections',payload));resetCollection();},'Gift guide saved.');}
async function saveProgramme(){const id=programmeForm._id,payload={...programmeForm,lastCheckedAt:programmeForm.lastCheckedAt||null,nextCheckDueAt:programmeForm.nextCheckDueAt||null};delete payload._id;await run(async()=>{await(id?API.put(`/admin/affiliate-programmes/${id}`,payload):API.post('/admin/affiliate-programmes',payload));resetProgramme();},'Affiliate platform saved.');}
async function markChecked(item){const next=new Date();next.setMonth(next.getMonth()+1);const {_id,createdAt,updatedAt,__v,...editable}=item;await run(()=>API.put(`/admin/affiliate-programmes/${_id}`,{...editable,lastCheckedAt:new Date().toISOString(),nextCheckDueAt:next.toISOString()}),'Platform marked as checked.');}
function programmeProductCount(programme){return products.value.filter(p=>String(p.affiliateProgramme?._id||p.affiliateProgramme||'')===String(programme._id)).length;}
function platformTiming(item){if(item.nextCheckDueAt)return `Next check ${new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(item.nextCheckDueAt))}`;return item.lastCheckedAt?'Previously checked':'Not checked yet';}
onMounted(loadAll);
</script>

<style scoped>
.admin-shell{max-width:1180px;margin:auto;text-align:left}.admin-heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1.5rem}.admin-heading h1{font-size:2.4rem;margin:.3rem 0}.admin-heading p,.ai-choice p{color:var(--bb-muted)}.eyebrow{color:var(--bb-primary-dark);font-weight:900;text-transform:uppercase;letter-spacing:.09em;font-size:.76rem}.tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:.65rem;margin-bottom:1rem}.tabs button{position:relative;display:grid;gap:.2rem;text-align:left;padding:.85rem;border:1px solid var(--bb-border);border-radius:14px;background:var(--bb-surface);color:var(--bb-text);cursor:pointer}.tabs button.active{border-color:var(--bb-primary-dark);box-shadow:0 0 0 2px color-mix(in srgb,var(--bb-primary-dark) 20%,transparent)}.tabs small{color:var(--bb-muted)}.tabs b{position:absolute;right:.7rem;top:.7rem}.products-section,.workspace{display:grid;grid-template-columns:minmax(360px,.95fr) minmax(380px,1.05fr);gap:1rem;align-items:start}.creation-card,.card,.notice{border:1px solid var(--bb-border);border-radius:18px;padding:1.1rem;background:var(--bb-surface);box-shadow:var(--bb-shadow-sm)}.creation-heading{display:flex;justify-content:space-between;gap:1rem;align-items:center}.creation-heading h2{margin:.2rem 0}.mode-toggle{display:flex;border:1px solid var(--bb-border);border-radius:12px;padding:.2rem}.mode-toggle button{border:0;border-radius:9px;padding:.55rem .7rem;background:transparent;color:var(--bb-text);cursor:pointer}.mode-toggle button.active{background:var(--bb-primary-dark);color:white}.ai-choice{display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:1.2rem;border:1px dashed var(--bb-primary-dark);border-radius:14px;margin-top:1rem}.editor{display:grid;gap:.9rem;margin-top:1rem}.field{display:grid;gap:.35rem}.field>span{font-weight:800}.field input,.field select,.field textarea{width:100%;box-sizing:border-box;border:1px solid var(--bb-border);border-radius:10px;padding:.72rem;background:var(--bb-bg);color:var(--bb-text);font:inherit}.two{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}.choice-group{border:1px solid var(--bb-border);border-radius:14px;padding:.8rem}.choice-grid,.checks,.actions,.record-actions{display:flex;flex-wrap:wrap;gap:.5rem}.choice-grid label{display:flex;align-items:center;gap:.35rem;padding:.5rem .65rem;border:1px solid var(--bb-border);border-radius:999px}.choice-grid label.selected{border-color:var(--bb-primary-dark)}.button,.record button,.record a{display:inline-flex;border:1px solid var(--bb-border);border-radius:10px;padding:.65rem .85rem;background:var(--bb-surface);color:var(--bb-text);text-decoration:none;cursor:pointer}.button.primary{background:var(--bb-primary-dark);color:white}.records{display:grid;gap:.75rem}.record{display:flex;justify-content:space-between;gap:1rem;padding:.75rem 0;border-bottom:1px solid var(--bb-border)}.record p{margin:.25rem 0;color:var(--bb-muted)}.notice.error{color:#b33}.notice.success{color:#17652c;margin-bottom:1rem}.access-panel{display:grid;grid-template-columns:.8fr 1.2fr;gap:1.5rem}.access-list{display:grid;gap:.6rem}.access-list article{display:grid;padding:.8rem;border:1px solid var(--bb-border);border-radius:12px}@media(max-width:900px){.tabs{grid-template-columns:1fr 1fr}.products-section,.workspace,.access-panel{grid-template-columns:1fr}}@media(max-width:560px){.admin-heading,.creation-heading,.ai-choice,.record{flex-direction:column;align-items:stretch}.tabs,.two{grid-template-columns:1fr}}
</style>
