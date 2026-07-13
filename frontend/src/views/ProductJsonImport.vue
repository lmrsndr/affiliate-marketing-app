<template>
  <section class="import-shell">
    <header class="import-heading">
      <div>
        <p class="eyebrow">BundleBee administration · Products</p>
        <h1>AI product import</h1>
        <p>Paste the final BundleBee JSON, review the draft, then save it for editorial checking.</p>
      </div>
      <router-link class="button" to="/admin">Back to Products</router-link>
    </header>

    <div v-if="error" class="notice error">{{ error }}</div>
    <div v-if="message" class="notice success">{{ message }}</div>

    <section class="import-grid">
      <div class="panel paste-panel">
        <h2>1. Paste AI JSON</h2>
        <p>Raw JSON and fenced <code>```json</code> output are accepted.</p>
        <textarea v-model="rawJson" rows="22" spellcheck="false" placeholder='{"name":"...","maker":"..."}'></textarea>
        <div class="actions"><button class="button primary" type="button" @click="importJson">Import into draft</button><button class="button" type="button" @click="clearImport">Clear</button></div>
      </div>

      <form class="panel review-panel" @submit.prevent="saveDraft">
        <h2>2. Review the draft</h2>
        <p class="hint">The URL slug is generated automatically in the background.</p>
        <label><span>Product name</span><input v-model.trim="draft.name" required /></label>
        <label><span>Maker or shop</span><select v-model="draft.brand" required><option value="">Choose an existing maker</option><option v-for="brand in brands" :key="brand._id" :value="brand._id">{{ brand.name }}</option></select></label>
        <p v-if="suggestedMaker && !draft.brand" class="warning">AI suggested “{{ suggestedMaker }}”, but no matching Maker exists yet.</p>
        <label><span>Short description</span><textarea v-model.trim="draft.shortDescription" maxlength="240" rows="3" required></textarea></label>
        <label><span>Why BundleBee picked it</span><textarea v-model.trim="draft.curatorNote" maxlength="320" rows="3"></textarea></label>
        <div class="two"><label><span>Price</span><input v-model.number="draft.price" type="number" min="0" step="0.01" /></label><label><span>Product type</span><select v-model="draft.productType"><option v-for="type in productTypes" :key="type" :value="type">{{ type }}</option></select></label></div>
        <label><span>Public product URL</span><input v-model.trim="draft.productUrl" type="url" required /></label>
        <label><span>Affiliate tracking URL</span><input v-model.trim="draft.affiliateUrl" type="url" required /></label>
        <label><span>Main image URL</span><input v-model.trim="draft.imageUrl" type="url" required /></label>
        <ChoiceSet title="Moods" v-model="draft.moods" :options="moodOptions" />
        <ChoiceSet title="Recipients" v-model="draft.recipients" :options="recipientOptions" />
        <ChoiceSet title="Occasions" v-model="draft.occasions" :options="occasionOptions" />
        <ChoiceSet title="Qualities" v-model="draft.qualities" :options="qualityOptions" />
        <label><span>Search tags</span><input v-model.trim="draft.tagsText" /></label>
        <div v-if="reviewNotes.length" class="review-notes"><strong>AI review notes</strong><ul><li v-for="note in reviewNotes" :key="note">{{ note }}</li></ul></div>
        <button class="button primary save" type="submit" :disabled="saving || !canSave">{{ saving ? 'Saving draft…' : 'Save as draft' }}</button>
      </form>
    </section>
  </section>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue';
import API from '@/api';

const ChoiceSet=defineComponent({props:{title:String,modelValue:Array,options:Array},emits:['update:modelValue'],setup(p,{emit}){const toggle=v=>emit('update:modelValue',p.modelValue.includes(v)?p.modelValue.filter(x=>x!==v):[...p.modelValue,v]);return()=>h('fieldset',[h('legend',p.title),h('div',{class:'chips'},p.options.map(v=>h('label',{class:{selected:p.modelValue.includes(v)}},[h('input',{type:'checkbox',checked:p.modelValue.includes(v),onChange:()=>toggle(v)}),v])))]);}});
const productTypes=['physical','digital','subscription','experience','service'];
const moodOptions=['one of a kind','elegant','meaningful','unexpected','playful','beautifully useful'];
const recipientOptions=['partner','parent','teenager','friend','teacher','couple','someone who has everything'];
const occasionOptions=['birthday','anniversary','wedding','new home','Christmas','thank you'];
const qualityOptions=['handmade','personalised','limited edition','made in Britain','small batch','sustainable claim'];
const rawJson=ref(''),brands=ref([]),suggestedMaker=ref(''),reviewNotes=ref([]),saving=ref(false),error=ref(''),message=ref('');
const blank=()=>({name:'',brand:'',shortDescription:'',curatorNote:'',price:null,currency:'GBP',productType:'physical',productUrl:'',affiliateUrl:'',imageUrl:'',moods:[],recipients:[],occasions:[],qualities:[],tagsText:''});
const draft=reactive(blank());
const canSave=computed(()=>Boolean(draft.name&&draft.brand&&draft.shortDescription&&draft.productUrl&&draft.affiliateUrl&&draft.imageUrl));

function slugify(v){return String(v||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function cleanArray(v,allowed){const list=Array.isArray(v)?v:[];const normal=list.map(x=>String(x).trim().toLowerCase());return allowed.filter(x=>normal.includes(x.toLowerCase()));}
function cleanTags(v){const list=Array.isArray(v)?v:String(v||'').split(',');return [...new Set(list.map(x=>String(x).trim().toLowerCase()).filter(Boolean))];}
function stripFence(v){return String(v||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();}
function replaceDraft(v){Object.keys(draft).forEach(k=>delete draft[k]);Object.assign(draft,blank(),v);}
function findMaker(name){const n=String(name||'').trim().toLowerCase();return brands.value.find(b=>String(b.name||'').trim().toLowerCase()===n)||null;}

function importJson(){
  error.value='';message.value='';
  try{
    const parsed=JSON.parse(stripFence(rawJson.value));const source=parsed.product||parsed;
    if(!source||typeof source!=='object'||Array.isArray(source))throw new Error('The JSON must contain one product object.');
    suggestedMaker.value=String(source.maker||source.brand||'').trim();
    const maker=findMaker(suggestedMaker.value);
    const type=String(source.productType||'physical').toLowerCase();
    const price=source.price==null||source.price===''?null:Number(source.price);
    reviewNotes.value=Array.isArray(source.reviewNotes)?source.reviewNotes.map(String):[];
    replaceDraft({
      name:String(source.name||'').trim(),
      brand:maker?._id:'',
      shortDescription:String(source.shortDescription||source.description||'').trim().slice(0,240),
      curatorNote:String(source.curatorNote||source.whyBundleBeePickedIt||'').trim().slice(0,320),
      price:Number.isFinite(price)?price:null,
      currency:String(source.currency||'GBP').toUpperCase(),
      productType:productTypes.includes(type)?type:'physical',
      productUrl:String(source.productUrl||source.retailerProductUrl||source.url||'').trim(),
      affiliateUrl:String(source.affiliateUrl||'').trim(),
      imageUrl:String(source.imageUrl||source.mainImageUrl||'').trim(),
      moods:cleanArray(source.moods,moodOptions),
      recipients:cleanArray(source.recipients,recipientOptions),
      occasions:cleanArray(source.occasions,occasionOptions),
      qualities:cleanArray(source.qualities,qualityOptions),
      tagsText:cleanTags(source.tags).join(', ')
    });
    message.value='JSON imported. Review the draft and complete any missing fields.';
  }catch(e){error.value=e instanceof SyntaxError?'The pasted text is not valid JSON.':e.message||'The JSON could not be imported.';}
}
function clearImport(){rawJson.value='';suggestedMaker.value='';reviewNotes.value=[];error.value='';message.value='';replaceDraft(blank());}
async function saveDraft(){
  if(!canSave.value)return;
  saving.value=true;error.value='';message.value='';
  try{
    const payload={...draft,slug:slugify(draft.name),tags:cleanTags(draft.tagsText),active:true,featured:false,publishedAt:null};
    delete payload.tagsText;
    await API.post('/admin/products',payload);
    message.value='Draft product created. Return to Products to review or publish it.';
    clearImport();
  }catch(e){error.value=e?.response?.data?.message||'The draft could not be saved.';}finally{saving.value=false;}
}
onMounted(async()=>{try{brands.value=(await API.get('/admin/brands')).data;}catch(e){error.value=e?.response?.data?.message||'Unable to load makers.';}});
</script>

<style scoped>
.import-shell{max-width:1120px;margin:auto;text-align:left}.import-heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1.25rem}.import-heading h1{margin:.25rem 0;font-size:2.25rem}.import-heading p,.hint,.paste-panel p{color:var(--bb-muted)}.eyebrow{color:var(--bb-primary-dark);font-weight:900;text-transform:uppercase;letter-spacing:.09em;font-size:.76rem}.import-grid{display:grid;grid-template-columns:minmax(320px,.8fr) minmax(420px,1.2fr);gap:1rem;align-items:start}.panel,.notice{border:1px solid var(--bb-border);border-radius:18px;padding:1.15rem;background:var(--bb-surface);box-shadow:var(--bb-shadow-sm)}.paste-panel{position:sticky;top:88px}.paste-panel textarea,.review-panel input,.review-panel select,.review-panel textarea{width:100%;box-sizing:border-box;padding:.75rem;border:1px solid var(--bb-border);border-radius:10px;background:var(--bb-bg);color:var(--bb-text);font:inherit}.review-panel{display:grid;gap:.85rem}.review-panel label{display:grid;gap:.35rem}.review-panel label>span{font-weight:800}.two{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}fieldset{border:1px solid var(--bb-border);border-radius:14px;padding:.8rem}.chips{display:flex;flex-wrap:wrap;gap:.45rem}.chips label{display:flex;align-items:center;gap:.35rem;padding:.48rem .62rem;border:1px solid var(--bb-border);border-radius:999px}.chips label.selected{border-color:var(--bb-primary-dark)}.chips input{width:auto}.actions{display:flex;gap:.6rem;margin-top:.8rem}.button{display:inline-flex;justify-content:center;border:1px solid var(--bb-border);border-radius:10px;padding:.68rem .9rem;background:var(--bb-surface);color:var(--bb-text);text-decoration:none;cursor:pointer}.button.primary{background:var(--bb-primary-dark);color:white}.notice.error,.warning{color:#b33}.notice.success{color:#17652c}.save{min-height:46px}@media(max-width:820px){.import-grid{grid-template-columns:1fr}.paste-panel{position:static}}@media(max-width:560px){.import-heading{flex-direction:column}.two{grid-template-columns:1fr}}
</style>
