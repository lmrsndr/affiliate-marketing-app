<template>
  <main class="maker-page">
    <router-link class="back-link" to="/">← Back to all makers</router-link>

    <div v-if="loading" class="state">Opening the shop window…</div>
    <div v-else-if="error" class="state error"><h1>We could not open this maker page</h1><p>{{ error }}</p></div>
    <template v-else-if="maker">
      <section class="maker-hero">
        <div class="hero-image">
          <img :src="heroImage" :alt="maker.name" @error="usePlaceholder" />
        </div>
        <div class="hero-copy">
          <div class="identity">
            <img v-if="maker.logoUrl" :src="maker.logoUrl" :alt="`${maker.name} logo`" @error="hideBrokenImage" />
            <p class="eyebrow">{{ makerLabel }}</p>
          </div>
          <h1>{{ maker.name }}</h1>
          <p class="tagline">{{ maker.tagline || maker.description }}</p>
          <div class="maker-tags"><span v-for="tag in maker.qualities" :key="tag">{{ tag }}</span></div>
          <button class="btn primary" type="button" @click="openMakerShop">Visit {{ maker.name }} ↗</button>
          <small class="disclosure">You buy directly from the maker. BundleBee may earn a commission if you purchase through our links, at no extra cost to you.</small>
        </div>
      </section>

      <section v-if="maker.story || maker.curatorNote" class="story-grid">
        <article v-if="maker.story">
          <p class="eyebrow">Inside the studio</p>
          <h2>The story behind the work</h2>
          <p class="long-copy">{{ maker.story }}</p>
        </article>
        <aside v-if="maker.curatorNote">
          <p class="eyebrow">BundleBee’s view</p>
          <h2>Why we stopped here</h2>
          <p>{{ maker.curatorNote }}</p>
        </aside>
      </section>

      <section class="selection">
        <header>
          <div><p class="eyebrow">A place to begin</p><h2>Our selection from {{ maker.name }}</h2></div>
          <span>{{ products.length }} piece{{ products.length===1?'':'s' }}</span>
        </header>
        <p class="selection-intro">This is an edit, not the whole catalogue. Choose a piece or visit the maker to explore further.</p>
        <div v-if="products.length" class="product-grid">
          <article v-for="product in products" :key="product._id" class="product-card">
            <img :src="product.imageUrl||placeholderImage" :alt="product.name" loading="lazy" @error="usePlaceholder" />
            <div class="product-copy">
              <p class="eyebrow">{{ product.productType || 'Selected piece' }}</p>
              <h3>{{ product.name }}</h3>
              <p>{{ product.shortDescription }}</p>
              <div v-if="product.curatorNote" class="curator-note"><strong>Why we picked it</strong><span>{{ product.curatorNote }}</span></div>
              <div class="product-footer">
                <strong v-if="normalisePrice(product.price)!==null">{{ formatPrice(normalisePrice(product.price),product.currency) }}</strong>
                <button class="text-link" type="button" @click="openProduct(product)">See this piece ↗</button>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="state">The first pieces are still being selected. You can visit the maker’s shop in the meantime.</div>
      </section>

      <section v-if="gallery.length" class="gallery">
        <p class="eyebrow">A closer look</p>
        <div><img v-for="(image,index) in gallery" :key="image" :src="image" :alt="`${maker.name} studio view ${index+1}`" loading="lazy" @error="hideBrokenImage" /></div>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed,ref,watch } from 'vue';
import { useRoute } from 'vue-router';
import API from '../api.js';

const route=useRoute();
const loading=ref(true),error=ref(''),maker=ref(null),products=ref([]);
const placeholderImage='/icon-512x512.png';
const heroImage=computed(()=>maker.value?.heroImageUrl||products.value[0]?.imageUrl||placeholderImage);
const gallery=computed(()=>[...(maker.value?.galleryImages||[])].filter(image=>image&&image!==heroImage.value).slice(0,4));
const makerLabel=computed(()=>{if(maker.value?.independent&&maker.value?.smallBusiness)return 'Independent small maker';if(maker.value?.independent)return 'Independent maker';if(maker.value?.smallBusiness)return 'Small business';return maker.value?.country||'Selected maker';});

async function load(){
 loading.value=true;error.value='';
 try{
  const {data}=await API.get(`/brands/${route.params.slug}`);
  maker.value={...data.brand,qualities:Array.isArray(data.brand?.qualities)?data.brand.qualities:[]};
  products.value=Array.isArray(data.products)?data.products:[];
  document.title=`${maker.value.name} | BundleBee maker edit`;
 }catch(requestError){console.error(requestError);error.value=requestError?.response?.status===404?'This maker is not published yet.':'Please try again in a moment.';maker.value=null;products.value=[];}
 finally{loading.value=false;}
}
function normalisePrice(value){if(value===null||value===undefined||value==='')return null;const number=Number(value);return Number.isFinite(number)?number:null;}
function formatPrice(value,currency='GBP'){return new Intl.NumberFormat('en-GB',{style:'currency',currency:currency||'GBP'}).format(value);}
function usePlaceholder(event){event.target.src=placeholderImage;}
function hideBrokenImage(event){event.target.style.display='none';}
async function openMakerShop(){let url=maker.value?.affiliateUrl||maker.value?.website;try{const {data}=await API.post(`/brands/${maker.value._id}/click`);url=data?.url||url;}catch(requestError){console.warn('Maker click tracking failed',requestError);}if(url)window.open(url,'_blank','noopener,noreferrer');}
async function openProduct(product){let url=product.affiliateUrl||product.productUrl;try{const {data}=await API.post(`/products/${product._id}/click`);url=data?.url||url;}catch(requestError){console.warn('Product click tracking failed',requestError);}if(url)window.open(url,'_blank','noopener,noreferrer');}
watch(()=>route.params.slug,load,{immediate:true});
</script>

<style scoped>
.maker-page{display:grid;gap:2rem;width:100%;padding:1rem 1rem 4rem;color:var(--bb-text)}.back-link{width:max-content;color:var(--bb-text);font-weight:800;text-decoration:none}.maker-hero{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(320px,.88fr);min-height:570px;overflow:hidden;border:1px solid var(--bb-border);border-radius:28px;background:var(--bb-surface)}.hero-image{min-height:570px;background:var(--bb-bg)}.hero-image img{width:100%;height:100%;object-fit:cover}.hero-copy{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:clamp(1.5rem,4vw,3.5rem)}.identity{display:flex;align-items:center;gap:.8rem}.identity img{width:56px;height:56px;object-fit:contain;border:1px solid var(--bb-border);border-radius:14px;background:white}.eyebrow{margin:0;font-size:.76rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:var(--bb-primary-dark)}h1{margin:.5rem 0;font-size:clamp(3rem,6vw,5rem);line-height:.95;letter-spacing:-.05em}.tagline{font-size:1.15rem;line-height:1.65;color:var(--bb-muted)}.maker-tags{display:flex;flex-wrap:wrap;gap:.45rem;margin:1rem 0}.maker-tags span{padding:.4rem .65rem;border:1px solid var(--bb-border);border-radius:999px;text-transform:capitalize}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;margin-top:1rem;padding:.75rem 1rem;border:1px solid var(--bb-border);border-radius:999px;font-weight:800;cursor:pointer}.primary{background:var(--bb-primary-dark);color:white}.disclosure{max-width:460px;margin-top:1rem;color:var(--bb-muted);line-height:1.45}
.story-grid{display:grid;grid-template-columns:1.35fr .65fr;gap:1.2rem}.story-grid article,.story-grid aside{padding:clamp(1.4rem,3vw,2.4rem);border:1px solid var(--bb-border);border-radius:22px;background:var(--bb-surface)}.story-grid aside{align-self:start;background:var(--bb-bg)}h2{margin:.35rem 0 1rem;font-size:clamp(1.8rem,3.5vw,2.8rem);line-height:1.05}.long-copy,.story-grid aside p:last-child{white-space:pre-line;color:var(--bb-muted);font-size:1.03rem;line-height:1.75}
.selection{margin-top:1rem}.selection>header{display:flex;align-items:end;justify-content:space-between;gap:1rem}.selection>header span{color:var(--bb-muted);white-space:nowrap}.selection-intro{max-width:680px;color:var(--bb-muted);line-height:1.6}.product-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;margin-top:1.4rem}.product-card{overflow:hidden;border:1px solid var(--bb-border);border-radius:20px;background:var(--bb-surface);box-shadow:var(--bb-shadow-sm)}.product-card>img{width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--bb-bg)}.product-copy{display:grid;gap:.6rem;padding:1.1rem}.product-copy h3{margin:0;font-size:1.25rem}.product-copy>p:not(.eyebrow){margin:0;color:var(--bb-muted);line-height:1.5}.curator-note{display:grid;gap:.25rem;padding:.8rem;border-radius:12px;background:var(--bb-bg)}.curator-note span{color:var(--bb-muted);line-height:1.45}.product-footer{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:.4rem}.text-link{padding:.25rem 0;border:0;background:transparent;color:var(--bb-primary-dark);font-weight:900;cursor:pointer}.state{padding:2rem;border:1px solid var(--bb-border);border-radius:18px;background:var(--bb-surface);text-align:center}.error{color:#b33}.gallery>div{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.7rem;margin-top:1rem}.gallery img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:16px}
@media(max-width:900px){.maker-hero{grid-template-columns:1fr;min-height:0}.hero-image{min-height:420px}.story-grid{grid-template-columns:1fr}.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gallery>div{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){.maker-page{padding:.5rem 0 3rem;gap:1.3rem}.maker-hero{border-radius:20px}.hero-image{min-height:310px}.hero-copy{padding:1.25rem}h1{font-size:2.8rem}.story-grid article,.story-grid aside{padding:1.2rem}.selection>header{display:block}.selection>header span{display:block;margin-top:.5rem}.product-grid{grid-template-columns:1fr}.product-footer{align-items:flex-start}.gallery>div{display:flex;overflow-x:auto}.gallery img{flex:0 0 78%}}
</style>
