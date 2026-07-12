<template>
  <section class="admin-shell">
    <header class="admin-heading">
      <div>
        <p class="eyebrow">BundleBee administration</p>
        <h1>Curate the catalogue</h1>
        <p>Most work happens in Products. Makers, gift guides and retailer links support that main curation flow.</p>
      </div>
      <router-link to="/" class="button secondary">View public site</router-link>
    </header>

    <div v-if="loading" class="notice">Loading administration…</div>
    <div v-else-if="error" class="notice error">{{ error }}</div>

    <template v-else>
      <nav class="tabs" aria-label="BundleBee administration">
        <button v-for="tab in tabs" :key="tab.key" :class="{active:activeTab===tab.key}" @click="activeTab=tab.key">
          <span class="tab-label">{{ tab.label }}</span><small>{{ tab.help }}</small><b>{{ counts[tab.key] }}</b>
        </button>
      </nav>

      <div v-if="message" class="notice success">{{ message }}</div>

      <section v-if="activeTab==='products'" class="workspace">
        <form class="editor" @submit.prevent="saveProduct">
          <header><p class="eyebrow">Main workflow</p><h2>{{ productForm._id?'Edit product':'Add a product' }}</h2><p>Add the facts first, then explain why it deserves a place in BundleBee.</p></header>
          <div class="two"><Field label="Product name"><input v-model.trim="productForm.name" required @blur="fillSlug(productForm)" /></Field><Field label="Slug"><input v-model.trim="productForm.slug" required placeholder="lowercase-with-hyphens" /></Field></div>
          <Field label="Maker or shop"><select v-model="productForm.brand" required><option value="">Choose a maker</option><option v-for="brand in brands" :key="brand._id" :value="brand._id">{{ brand.name }}</option></select></Field>
          <Field label="Short description"><textarea v-model.trim="productForm.shortDescription" required maxlength="240" rows="3" placeholder="What is it, in plain English?"></textarea></Field>
          <Field label="Why BundleBee picked it"><textarea v-model.trim="productForm.curatorNote" maxlength="320" rows="3" placeholder="What makes it thoughtful, distinctive or difficult to find elsewhere?"></textarea></Field>
          <div class="two"><Field label="Price"><input v-model.number="productForm.price" type="number" min="0" step="0.01" /></Field><Field label="Product type"><select v-model="productForm.productType"><option v-for="type in productTypes" :key="type" :value="type">{{ type }}</option></select></Field></div>
          <Field label="Product page"><input v-model.trim="productForm.productUrl" type="url" required /></Field>
          <Field label="Affiliate link"><input v-model.trim="productForm.affiliateUrl" type="url" required /></Field>
          <Field label="Main image URL"><input v-model.trim="productForm.imageUrl" type="url" required /></Field>

          <ChoiceGroup title="What should it feel like?" hint="These power the main public browsing cards." v-model="productForm.moods" :options="moodOptions" />
          <ChoiceGroup title="Who could it suit?" v-model="productForm.recipients" :options="recipientOptions" />
          <ChoiceGroup title="Useful occasions" v-model="productForm.occasions" :options="occasionOptions" />
          <ChoiceGroup title="Verified or marketer-supplied qualities" hint="Only tick claims you are comfortable displaying." v-model="productForm.qualities" :options="qualityOptions" />

          <Field label="Other search words"><input v-model.trim="productForm.tagsText" placeholder="ceramics, coastal, blue, homeware" /></Field>
          <div class="checks"><label><input v-model="productForm.featured" type="checkbox" /> Feature prominently</label><label><input v-model="productForm.active" type="checkbox" /> Active</label><label><input v-model="productForm.published" type="checkbox" /> Published</label></div>
          <FormActions :editing="!!productForm._id" :saving="saving" @cancel="resetProduct" />
        </form>
        <RecordList title="Products" :items="products" empty="No products yet." @edit="editProduct">
          <template #summary="{item}">{{ item.brand?.name||'No maker' }} · {{ item.moods?.join(', ')||'No mood labels' }}</template>
          <template #status="{item}">{{ item.publishedAt?'Published':'Draft' }} · {{ item.active?'Active':'Hidden' }} · {{ item.clicks||0 }} clicks</template>
          <template #actions="{item}"><button @click="editProduct(item)">Edit</button><button @click="hideProduct(item)">Hide</button></template>
        </RecordList>
      </section>

      <section v-else-if="activeTab==='makers'" class="workspace">
        <form class="editor" @submit.prevent="saveBrand">
          <header><p class="eyebrow">Reusable information</p><h2>{{ brandForm._id?'Edit maker':'Add a maker or shop' }}</h2><p>Create this once, then attach any number of products to it.</p></header>
          <Field label="Name"><input v-model.trim="brandForm.name" required @blur="fillSlug(brandForm)" /></Field><Field label="Slug"><input v-model.trim="brandForm.slug" required /></Field>
          <Field label="Website"><input v-model.trim="brandForm.website" type="url" required /></Field><Field label="Logo URL"><input v-model.trim="brandForm.logoUrl" type="url" /></Field>
          <Field label="Short story"><textarea v-model.trim="brandForm.description" rows="5" placeholder="Who are they, what do they make and why are they a good fit?"></textarea></Field>
          <div class="checks"><label><input v-model="brandForm.independent" type="checkbox" /> Independent</label><label><input v-model="brandForm.smallBusiness" type="checkbox" /> Small business</label><label><input v-model="brandForm.approved" type="checkbox" /> Approved</label><label><input v-model="brandForm.active" type="checkbox" /> Active</label></div>
          <FormActions :editing="!!brandForm._id" :saving="saving" @cancel="resetBrand" />
        </form>
        <RecordList title="Makers & shops" :items="brands" empty="No makers yet."><template #summary="{item}">{{ item.website }}</template><template #status="{item}">{{ item.approved?'Approved':'Needs review' }} · {{ item.active?'Active':'Hidden' }}</template><template #actions="{item}"><button @click="editBrand(item)">Edit</button></template></RecordList>
      </section>

      <section v-else-if="activeTab==='guides'" class="workspace">
        <form class="editor" @submit.prevent="saveCollection">
          <header><p class="eyebrow">Editorial layer</p><h2>{{ collectionForm._id?'Edit gift guide':'Create a gift guide' }}</h2><p>Use this for hand-picked stories such as “Elegant gifts under £50”, not basic product categories.</p></header>
          <Field label="Guide name"><input v-model.trim="collectionForm.name" required @blur="fillSlug(collectionForm)" /></Field><Field label="Slug"><input v-model.trim="collectionForm.slug" required /></Field>
          <Field label="Introduction"><textarea v-model.trim="collectionForm.description" rows="4"></textarea></Field><Field label="Cover image URL"><input v-model.trim="collectionForm.imageUrl" type="url" /></Field>
          <Field label="Included products"><select v-model="collectionForm.products" multiple size="10"><option v-for="product in products" :key="product._id" :value="product._id">{{ product.name }}</option></select></Field>
          <div class="checks"><label><input v-model="collectionForm.featured" type="checkbox" /> Featured guide</label><label><input v-model="collectionForm.active" type="checkbox" /> Active</label><label><input v-model="collectionForm.published" type="checkbox" /> Published</label></div>
          <FormActions :editing="!!collectionForm._id" :saving="saving" @cancel="resetCollection" />
        </form>
        <RecordList title="Gift guides" :items="collections" empty="No gift guides yet."><template #summary="{item}">{{ item.products?.length||0 }} products</template><template #status="{item}">{{ item.publishedAt?'Published':'Draft' }} · {{ item.featured?'Featured':'Standard' }}</template><template #actions="{item}"><button @click="editCollection(item)">Edit</button></template></RecordList>
      </section>

      <section v-else-if="activeTab==='links'" class="workspace">
        <form class="editor" @submit.prevent="saveProgramme">
          <header><p class="eyebrow">Back-office only</p><h2>{{ programmeForm._id?'Edit retailer link setup':'Add affiliate programme' }}</h2><p>Track the commercial relationship here. It should not complicate everyday product curation.</p></header>
          <Field label="Programme or retailer"><input v-model.trim="programmeForm.name" required /></Field><Field label="Network"><input v-model.trim="programmeForm.network" required /></Field>
          <Field label="Status"><select v-model="programmeForm.status"><option v-for="status in programmeStatuses" :key="status" :value="status">{{ status }}</option></select></Field>
          <Field label="Application URL"><input v-model.trim="programmeForm.applicationUrl" type="url" /></Field>
          <div class="two"><Field label="Commission value"><input v-model.number="programmeForm.commissionValue" type="number" min="0" step="0.01" /></Field><Field label="Cookie days"><input v-model.number="programmeForm.cookieDurationDays" type="number" min="0" /></Field></div>
          <Field label="Notes"><textarea v-model.trim="programmeForm.notes" rows="5"></textarea></Field><FormActions :editing="!!programmeForm._id" :saving="saving" @cancel="resetProgramme" />
        </form>
        <RecordList title="Affiliate programmes" :items="programmes" empty="No programmes yet."><template #summary="{item}">{{ item.network }} · {{ item.status }}</template><template #status="{item}">{{ item.cookieDurationDays??'Unknown' }} day cookie</template><template #actions="{item}"><button @click="editProgramme(item)">Edit</button></template></RecordList>
      </section>

      <section v-else class="access-panel">
        <div class="access-copy"><p class="eyebrow">Access</p><h2>Approved administrators</h2><p>This list is read-only. Supabase manages the accounts and Render’s <code>BUNDLEBEE_ADMIN_EMAILS</code> variable decides who is allowed into BundleBee.</p></div>
        <div class="access-list"><article v-for="user in users" :key="user._id"><strong>{{ user.name||user.email }}</strong><span>{{ user.email }}</span><small>{{ user.lastSignInAt?'Last signed in '+formatDate(user.lastSignInAt):'Not signed in yet' }}</small></article></div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed,defineComponent,h,onMounted,reactive,ref } from 'vue';
import API from '@/api';
const Field=defineComponent({props:{label:String},setup(props,{slots}){return()=>h('label',{class:'field'},[h('span',props.label),slots.default?.()]);}});
const FormActions=defineComponent({props:{editing:Boolean,saving:Boolean},emits:['cancel'],setup(props,{emit}){return()=>h('div',{class:'actions'},[h('button',{class:'button primary',type:'submit',disabled:props.saving},props.saving?'Saving…':'Save'),props.editing?h('button',{class:'button secondary',type:'button',onClick:()=>emit('cancel')},'Cancel'):null]);}});
const ChoiceGroup=defineComponent({props:{title:String,hint:String,modelValue:Array,options:Array},emits:['update:modelValue'],setup(props,{emit}){const toggle=(v)=>emit('update:modelValue',props.modelValue.includes(v)?props.modelValue.filter(x=>x!==v):[...props.modelValue,v]);return()=>h('fieldset',{class:'choice-group'},[h('legend',props.title),props.hint?h('p',props.hint):null,h('div',{class:'choice-grid'},props.options.map(v=>h('label',{class:{selected:props.modelValue.includes(v)}},[h('input',{type:'checkbox',checked:props.modelValue.includes(v),onChange:()=>toggle(v)}),v])))]);}});
const RecordList=defineComponent({props:{title:String,items:Array,empty:String},emits:['edit'],setup(props,{slots}){return()=>h('section',{class:'records'},[h('h2',props.title),...(props.items?.length?props.items.map(item=>h('article',{class:'record',key:item._id},[h('div',[h('strong',item.name||item.email),h('p',slots.summary?.({item})),h('small',slots.status?.({item}))]),h('div',{class:'record-actions'},slots.actions?.({item}))])):[h('p',props.empty)])]);}});
const tabs=[{key:'products',label:'Products',help:'Curate and publish'},{key:'makers',label:'Makers',help:'Reusable brand stories'},{key:'guides',label:'Gift guides',help:'Editorial collections'},{key:'links',label:'Retail links',help:'Affiliate setup'},{key:'access',label:'Access',help:'Approved admins'}];
const moodOptions=['one of a kind','elegant','meaningful','unexpected','playful','beautifully useful'];
const recipientOptions=['partner','parent','teenager','friend','teacher','couple','someone who has everything'];
const occasionOptions=['birthday','anniversary','wedding','new home','Christmas','thank you'];
const qualityOptions=['handmade','personalised','limited edition','made in Britain','small batch','sustainable claim'];
const productTypes=['physical','digital','subscription','experience','service'];
const programmeStatuses=['researching','applied','approved','declined','paused','closed'];
const activeTab=ref('products'),loading=ref(true),saving=ref(false),error=ref(''),message=ref('');
const products=ref([]),brands=ref([]),collections=ref([]),programmes=ref([]),users=ref([]);
const blankProduct=()=>({_id:'',name:'',slug:'',brand:'',shortDescription:'',curatorNote:'',price:null,productType:'physical',productUrl:'',affiliateUrl:'',imageUrl:'',tagsText:'',moods:[],recipients:[],occasions:[],qualities:[],featured:false,active:true,published:false});
const blankBrand=()=>({_id:'',name:'',slug:'',website:'',logoUrl:'',description:'',independent:true,smallBusiness:true,approved:false,active:true});
const blankCollection=()=>({_id:'',name:'',slug:'',description:'',imageUrl:'',products:[],featured:false,active:true,published:false});
const blankProgramme=()=>({_id:'',name:'',network:'Direct',status:'researching',applicationUrl:'',commissionValue:null,cookieDurationDays:null,notes:''});
const productForm=reactive(blankProduct()),brandForm=reactive(blankBrand()),collectionForm=reactive(blankCollection()),programmeForm=reactive(blankProgramme());
const counts=computed(()=>({products:products.value.length,makers:brands.value.length,guides:collections.value.length,links:programmes.value.length,access:users.value.length}));
function replace(target,value){Object.keys(target).forEach(k=>delete target[k]);Object.assign(target,value);}function slugify(v){return String(v||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}function fillSlug(form){if(!form.slug)form.slug=slugify(form.name);}function flash(text){message.value=text;setTimeout(()=>message.value='',3000);}
function resetProduct(){replace(productForm,blankProduct())}function resetBrand(){replace(brandForm,blankBrand())}function resetCollection(){replace(collectionForm,blankCollection())}function resetProgramme(){replace(programmeForm,blankProgramme())}
async function loadAll(){loading.value=true;error.value='';try{const [p,b,c,a,u]=await Promise.all([API.get('/admin/products'),API.get('/admin/brands'),API.get('/admin/collections'),API.get('/admin/affiliate-programmes'),API.get('/admin/users')]);products.value=p.data;brands.value=b.data;collections.value=c.data;programmes.value=a.data;users.value=u.data;}catch(e){error.value=e?.response?.data?.message||'Unable to load administration.';}finally{loading.value=false;}}
async function run(action,text){saving.value=true;error.value='';try{await action();await loadAll();flash(text);}catch(e){error.value=e?.response?.data?.message||'The change could not be saved.';}finally{saving.value=false;}}
function editProduct(item){replace(productForm,{...blankProduct(),...item,brand:item.brand?._id||item.brand||'',tagsText:(item.tags||[]).join(', '),moods:item.moods||[],recipients:item.recipients||[],occasions:item.occasions||[],qualities:item.qualities||[],published:!!item.publishedAt});window.scrollTo({top:0,behavior:'smooth'});}function editBrand(item){replace(brandForm,{...blankBrand(),...item});window.scrollTo({top:0,behavior:'smooth'});}function editCollection(item){replace(collectionForm,{...blankCollection(),...item,products:(item.products||[]).map(p=>p._id||p),published:!!item.publishedAt});window.scrollTo({top:0,behavior:'smooth'});}function editProgramme(item){replace(programmeForm,{...blankProgramme(),...item});window.scrollTo({top:0,behavior:'smooth'});}
async function saveProduct(){const id=productForm._id,payload={...productForm,tags:productForm.tagsText.split(',').map(v=>v.trim()).filter(Boolean),publishedAt:productForm.published?(products.value.find(v=>v._id===id)?.publishedAt||new Date().toISOString()):null};delete payload._id;delete payload.tagsText;delete payload.published;await run(async()=>{await(id?API.put(`/admin/products/${id}`,payload):API.post('/admin/products',payload));resetProduct();},'Product saved.');}
async function hideProduct(item){await run(()=>API.delete(`/admin/products/${item._id}`),'Product hidden.');}
async function saveBrand(){const id=brandForm._id,payload={...brandForm};delete payload._id;await run(async()=>{await(id?API.put(`/admin/brands/${id}`,payload):API.post('/admin/brands',payload));resetBrand();},'Maker saved.');}
async function saveCollection(){const id=collectionForm._id,payload={...collectionForm,publishedAt:collectionForm.published?(collections.value.find(v=>v._id===id)?.publishedAt||new Date().toISOString()):null};delete payload._id;delete payload.published;await run(async()=>{await(id?API.put(`/admin/collections/${id}`,payload):API.post('/admin/collections',payload));resetCollection();},'Gift guide saved.');}
async function saveProgramme(){const id=programmeForm._id,payload={...programmeForm};delete payload._id;await run(async()=>{await(id?API.put(`/admin/affiliate-programmes/${id}`,payload):API.post('/admin/affiliate-programmes',payload));resetProgramme();},'Retail link setup saved.');}
function formatDate(value){return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(value));}
onMounted(loadAll);
</script>

<style scoped>
.admin-shell{max-width:1180px;margin:auto;text-align:left}.admin-heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1.5rem}.admin-heading h1{font-size:2.4rem;margin:.3rem 0}.admin-heading p{max-width:720px;color:var(--bb-muted)}.eyebrow{color:var(--bb-primary-dark);font-weight:900;text-transform:uppercase;letter-spacing:.09em;font-size:.76rem}.tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:.65rem;margin-bottom:1rem}.tabs button{position:relative;display:grid;gap:.2rem;text-align:left;padding:.85rem;border:1px solid var(--bb-border);border-radius:14px;background:var(--bb-surface);color:var(--bb-text);cursor:pointer}.tabs button.active{border-color:var(--bb-primary-dark);box-shadow:0 0 0 2px color-mix(in srgb,var(--bb-primary-dark) 20%,transparent)}.tabs small{color:var(--bb-muted)}.tabs b{position:absolute;right:.7rem;top:.7rem}.workspace{display:grid;grid-template-columns:minmax(340px,.9fr) minmax(380px,1.1fr);gap:1rem;align-items:start}.editor,.records,.notice,.access-panel{border:1px solid var(--bb-border);border-radius:18px;padding:1.1rem;background:var(--bb-surface);box-shadow:var(--bb-shadow-sm)}.editor{display:grid;gap:.9rem}.editor header h2{margin:.25rem 0}.editor header p{color:var(--bb-muted);line-height:1.5}.field{display:grid;gap:.35rem}.field>span{font-weight:800}.field input,.field select,.field textarea{width:100%;box-sizing:border-box;border:1px solid var(--bb-border);border-radius:10px;padding:.72rem;background:var(--bb-bg);color:var(--bb-text);font:inherit}.two{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}.choice-group{border:1px solid var(--bb-border);border-radius:14px;padding:.8rem}.choice-group legend{font-weight:900;padding:0 .3rem}.choice-group p{margin:.2rem 0 .7rem;color:var(--bb-muted);font-size:.88rem}.choice-grid{display:flex;flex-wrap:wrap;gap:.45rem}.choice-grid label{display:flex;align-items:center;gap:.35rem;padding:.5rem .65rem;border:1px solid var(--bb-border);border-radius:999px;cursor:pointer}.choice-grid label.selected{background:color-mix(in srgb,var(--bb-primary-dark) 12%,var(--bb-bg));border-color:var(--bb-primary-dark)}.checks,.actions,.record-actions{display:flex;flex-wrap:wrap;gap:.6rem}.checks label{display:flex;align-items:center;gap:.35rem}.button,.record button{border:1px solid var(--bb-border);border-radius:10px;padding:.65rem .85rem;background:var(--bb-surface);color:var(--bb-text);text-decoration:none;cursor:pointer}.button.primary{background:var(--bb-primary-dark);color:white}.records{display:grid;gap:.75rem}.records h2{margin:0}.record{display:flex;justify-content:space-between;gap:1rem;padding-bottom:.75rem;border-bottom:1px solid var(--bb-border)}.record:last-child{border-bottom:0}.record p{margin:.25rem 0;color:var(--bb-muted)}.record small{color:var(--bb-muted)}.notice.error{color:#b33}.notice.success{color:#17652c;margin-bottom:1rem}.access-panel{display:grid;grid-template-columns:.8fr 1.2fr;gap:1.5rem}.access-copy p{color:var(--bb-muted);line-height:1.6}.access-list{display:grid;gap:.7rem}.access-list article{display:grid;gap:.2rem;padding:.9rem;border:1px solid var(--bb-border);border-radius:12px}.access-list span,.access-list small{color:var(--bb-muted)}code{font-size:.85em}@media(max-width:900px){.tabs{grid-template-columns:1fr 1fr}.workspace,.access-panel{grid-template-columns:1fr}}@media(max-width:560px){.admin-heading,.record{flex-direction:column}.tabs,.two{grid-template-columns:1fr}}
</style>
