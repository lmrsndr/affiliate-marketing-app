<template>
  <section class="import-shell">
    <header class="import-heading">
      <div>
        <p class="eyebrow">AI-assisted curation</p>
        <h1>Import a product from JSON</h1>
        <p>Paste the final JSON from the BundleBee product-analysis prompt. Nothing is published automatically: the importer creates a draft for review.</p>
      </div>
      <router-link class="button secondary" to="/admin">Back to admin</router-link>
    </header>

    <div v-if="error" class="notice error" role="alert">{{ error }}</div>
    <div v-if="message" class="notice success">{{ message }}</div>

    <section class="import-grid">
      <div class="panel paste-panel">
        <h2>1. Paste AI JSON</h2>
        <p>Raw JSON and fenced <code>```json</code> output are both accepted.</p>
        <textarea v-model="rawJson" rows="22" spellcheck="false" placeholder='{"name":"...","maker":"..."}'></textarea>
        <div class="actions">
          <button class="button primary" type="button" @click="importJson">Import into draft</button>
          <button class="button" type="button" @click="clearImport">Clear</button>
        </div>
      </div>

      <form class="panel review-panel" @submit.prevent="saveDraft">
        <h2>2. Review the draft</h2>
        <p class="hint">AI suggestions are starting points. Check every claim, link and label before saving.</p>

        <label><span>Product name</span><input v-model.trim="draft.name" required @blur="fillSlug" /></label>
        <label><span>Slug</span><input v-model.trim="draft.slug" required /></label>
        <label><span>Maker or shop</span>
          <select v-model="draft.brand" required>
            <option value="">Choose an existing maker</option>
            <option v-for="brand in brands" :key="brand._id" :value="brand._id">{{ brand.name }}</option>
          </select>
        </label>
        <p v-if="suggestedMaker && !draft.brand" class="maker-warning">AI suggested “{{ suggestedMaker }}”, but no matching Maker exists yet. Add it in the Makers tab first.</p>

        <label><span>Short description</span><textarea v-model.trim="draft.shortDescription" maxlength="240" rows="3" required></textarea></label>
        <label><span>Why BundleBee picked it</span><textarea v-model.trim="draft.curatorNote" maxlength="320" rows="3"></textarea></label>

        <div class="two">
          <label><span>Price</span><input v-model.number="draft.price" type="number" min="0" step="0.01" /></label>
          <label><span>Product type</span><select v-model="draft.productType"><option v-for="type in productTypes" :key="type" :value="type">{{ type }}</option></select></label>
        </div>

        <label><span>Public product URL</span><input v-model.trim="draft.productUrl" type="url" required placeholder="https://..." /></label>
        <label><span>Affiliate tracking URL</span><input v-model.trim="draft.affiliateUrl" type="url" required placeholder="https://..." /></label>
        <label><span>Main image URL</span><input v-model.trim="draft.imageUrl" type="url" required placeholder="https://..." /></label>

        <fieldset><legend>Moods</legend><div class="chips"><label v-for="item in moodOptions" :key="item" :class="{ selected: draft.moods.includes(item) }"><input v-model="draft.moods" type="checkbox" :value="item" />{{ item }}</label></div></fieldset>
        <fieldset><legend>Recipients</legend><div class="chips"><label v-for="item in recipientOptions" :key="item" :class="{ selected: draft.recipients.includes(item) }"><input v-model="draft.recipients" type="checkbox" :value="item" />{{ item }}</label></div></fieldset>
        <fieldset><legend>Occasions</legend><div class="chips"><label v-for="item in occasionOptions" :key="item" :class="{ selected: draft.occasions.includes(item) }"><input v-model="draft.occasions" type="checkbox" :value="item" />{{ item }}</label></div></fieldset>
        <fieldset><legend>Qualities</legend><div class="chips"><label v-for="item in qualityOptions" :key="item" :class="{ selected: draft.qualities.includes(item) }"><input v-model="draft.qualities" type="checkbox" :value="item" />{{ item }}</label></div></fieldset>

        <label><span>Search tags</span><input v-model.trim="draft.tagsText" placeholder="ceramics, coastal, handmade" /></label>

        <div v-if="reviewNotes.length" class="review-notes">
          <strong>AI review notes</strong>
          <ul><li v-for="note in reviewNotes" :key="note">{{ note }}</li></ul>
        </div>

        <button class="button primary save" type="submit" :disabled="saving || !canSave">{{ saving ? 'Saving draft…' : 'Save as draft' }}</button>
        <p v-if="!canSave" class="hint">Complete the name, slug, maker, description, product URL, affiliate URL and image URL before saving.</p>
      </form>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import API from '@/api';

const productTypes = ['physical', 'digital', 'subscription', 'experience', 'service'];
const moodOptions = ['one of a kind', 'elegant', 'meaningful', 'unexpected', 'playful', 'beautifully useful'];
const recipientOptions = ['partner', 'parent', 'teenager', 'friend', 'teacher', 'couple', 'someone who has everything'];
const occasionOptions = ['birthday', 'anniversary', 'wedding', 'new home', 'Christmas', 'thank you'];
const qualityOptions = ['handmade', 'personalised', 'limited edition', 'made in Britain', 'small batch', 'sustainable claim'];

const rawJson = ref('');
const brands = ref([]);
const suggestedMaker = ref('');
const reviewNotes = ref([]);
const saving = ref(false);
const error = ref('');
const message = ref('');

const blankDraft = () => ({
  name: '', slug: '', brand: '', shortDescription: '', curatorNote: '', price: null,
  currency: 'GBP', productType: 'physical', productUrl: '', affiliateUrl: '', imageUrl: '',
  moods: [], recipients: [], occasions: [], qualities: [], tagsText: '',
});
const draft = reactive(blankDraft());

const canSave = computed(() => Boolean(
  draft.name && draft.slug && draft.brand && draft.shortDescription &&
  draft.productUrl && draft.affiliateUrl && draft.imageUrl
));

function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function fillSlug() { if (!draft.slug) draft.slug = slugify(draft.name); }
function cleanArray(value, allowed) {
  const list = Array.isArray(value) ? value : [];
  const normalised = list.map((item) => String(item).trim().toLowerCase());
  return allowed.filter((item) => normalised.includes(item.toLowerCase()));
}
function cleanTags(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(list.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
}
function stripFence(value) {
  return String(value || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}
function findMaker(name) {
  const needle = String(name || '').trim().toLowerCase();
  return brands.value.find((brand) => String(brand.name || '').trim().toLowerCase() === needle) || null;
}
function replaceDraft(value) {
  Object.keys(draft).forEach((key) => delete draft[key]);
  Object.assign(draft, blankDraft(), value);
}

function importJson() {
  error.value = '';
  message.value = '';
  try {
    const parsed = JSON.parse(stripFence(rawJson.value));
    const source = parsed.product || parsed;
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('The JSON must contain one product object.');

    suggestedMaker.value = String(source.maker || source.brand || '').trim();
    const maker = findMaker(suggestedMaker.value);
    reviewNotes.value = Array.isArray(source.reviewNotes) ? source.reviewNotes.map(String) : [];

    const type = String(source.productType || 'physical').toLowerCase();
    const price = source.price === null || source.price === '' || source.price === undefined ? null : Number(source.price);
    const productUrl = source.productUrl || source.retailerProductUrl || source.retailerUrl || source.url || '';

    replaceDraft({
      name: String(source.name || '').trim(),
      slug: String(source.slug || slugify(source.name)).trim(),
      brand: maker?._id || '',
      shortDescription: String(source.shortDescription || source.description || '').trim().slice(0, 240),
      curatorNote: String(source.curatorNote || source.whyBundleBeePickedIt || '').trim().slice(0, 320),
      price: Number.isFinite(price) ? price : null,
      currency: String(source.currency || 'GBP').toUpperCase(),
      productType: productTypes.includes(type) ? type : 'physical',
      productUrl: String(productUrl).trim(),
      affiliateUrl: String(source.affiliateUrl || '').trim(),
      imageUrl: String(source.imageUrl || source.mainImageUrl || '').trim(),
      moods: cleanArray(source.moods, moodOptions),
      recipients: cleanArray(source.recipients, recipientOptions),
      occasions: cleanArray(source.occasions, occasionOptions),
      qualities: cleanArray(source.qualities, qualityOptions),
      tagsText: cleanTags(source.tags).join(', '),
    });

    message.value = 'JSON imported. Review the draft and complete any missing fields.';
  } catch (importError) {
    error.value = importError instanceof SyntaxError
      ? 'The pasted text is not valid JSON. Copy only the final JSON object from the AI response.'
      : importError.message || 'The JSON could not be imported.';
  }
}

function clearImport() {
  rawJson.value = '';
  suggestedMaker.value = '';
  reviewNotes.value = [];
  error.value = '';
  message.value = '';
  replaceDraft(blankDraft());
}

async function saveDraft() {
  if (!canSave.value) return;
  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    const payload = {
      ...draft,
      tags: cleanTags(draft.tagsText),
      active: true,
      featured: false,
      publishedAt: null,
    };
    delete payload.tagsText;
    await API.post('/admin/products', payload);
    message.value = 'Draft product created. Open Products in the admin area to review or publish it.';
    rawJson.value = '';
    suggestedMaker.value = '';
    reviewNotes.value = [];
    replaceDraft(blankDraft());
  } catch (saveError) {
    error.value = saveError?.response?.data?.message || 'The draft could not be saved.';
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try { brands.value = (await API.get('/admin/brands')).data; }
  catch (loadError) { error.value = loadError?.response?.data?.message || 'Unable to load makers.'; }
});
</script>

<style scoped>
.import-shell{max-width:1120px;margin:auto;text-align:left}.import-heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1.25rem}.import-heading h1{margin:.25rem 0;font-size:2.25rem}.import-heading p{max-width:760px;color:var(--bb-muted);line-height:1.55}.eyebrow{color:var(--bb-primary-dark);font-weight:900;text-transform:uppercase;letter-spacing:.09em;font-size:.76rem}.import-grid{display:grid;grid-template-columns:minmax(320px,.8fr) minmax(420px,1.2fr);gap:1rem;align-items:start}.panel,.notice{border:1px solid var(--bb-border);border-radius:18px;padding:1.15rem;background:var(--bb-surface);box-shadow:var(--bb-shadow-sm)}.panel h2{margin-top:0}.panel>p,.hint{color:var(--bb-muted);line-height:1.5}.paste-panel{position:sticky;top:88px}.paste-panel textarea{width:100%;box-sizing:border-box;padding:.8rem;border:1px solid var(--bb-border);border-radius:12px;background:var(--bb-bg);color:var(--bb-text);font:500 .84rem/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}.review-panel{display:grid;gap:.85rem}.review-panel label{display:grid;gap:.35rem}.review-panel label>span{font-weight:800}.review-panel input,.review-panel select,.review-panel textarea{width:100%;box-sizing:border-box;padding:.72rem;border:1px solid var(--bb-border);border-radius:10px;background:var(--bb-bg);color:var(--bb-text);font:inherit}.two{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}fieldset{border:1px solid var(--bb-border);border-radius:14px;padding:.8rem}legend{font-weight:900;padding:0 .3rem}.chips{display:flex;flex-wrap:wrap;gap:.45rem}.chips label{display:flex;grid-template-columns:auto 1fr;align-items:center;gap:.35rem;padding:.48rem .62rem;border:1px solid var(--bb-border);border-radius:999px;cursor:pointer}.chips label.selected{border-color:var(--bb-primary-dark);background:color-mix(in srgb,var(--bb-primary-dark) 12%,var(--bb-bg))}.chips input{width:auto}.actions{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.8rem}.button{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--bb-border);border-radius:10px;padding:.68rem .9rem;background:var(--bb-surface);color:var(--bb-text);font:inherit;text-decoration:none;cursor:pointer}.button.primary{background:var(--bb-primary-dark);color:white}.button:disabled{opacity:.55;cursor:not-allowed}.save{min-height:46px}.notice{margin-bottom:1rem}.notice.error{color:#b33}.notice.success{color:#17652c}.maker-warning{padding:.65rem;border-radius:10px;background:color-mix(in srgb,#d88a22 14%,var(--bb-bg));color:var(--bb-text)!important}.review-notes{padding:.8rem;border:1px solid var(--bb-border);border-radius:12px}.review-notes ul{margin:.5rem 0 0;padding-left:1.2rem}@media(max-width:850px){.import-grid{grid-template-columns:1fr}.paste-panel{position:static}}@media(max-width:560px){.import-heading{flex-direction:column}.two{grid-template-columns:1fr}}
</style>
