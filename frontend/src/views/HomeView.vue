<template>
  <main class="shop-home">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Thoughtful finds, without the obvious choices</p>
        <h1>Find something they will actually remember</h1>
        <p class="hero-text">Distinctive gifts, original art and beautiful products from independent makers and specialist shops.</p>
        <div class="hero-actions">
          <a class="btn primary" href="#discover">Find a special gift</a>
          <a class="btn secondary" href="#how-it-works">How BundleBee works</a>
        </div>
      </div>
      <aside class="promise">
        <span aria-hidden="true">🐝</span>
        <h2>Not just more products</h2>
        <p>Everything should earn its place by being thoughtful, distinctive, beautifully made or genuinely hard to find elsewhere.</p>
      </aside>
    </section>

    <section id="discover" class="discovery-section">
      <header class="section-heading">
        <p class="eyebrow">Start with a feeling</p>
        <h2>What should the gift feel like?</h2>
        <p>You do not need to know what the item is yet. Begin with the impression you want it to make.</p>
      </header>
      <div class="carousel-hint" aria-hidden="true">Swipe to explore <span>→</span></div>
      <div class="idea-grid" role="list" aria-label="Gift moods">
        <button v-for="item in moodIdeas" :key="item.value" type="button" role="listitem" :class="['idea-card',{active:mood===item.value}]" @click="chooseMood(item.value)">
          <span>{{ item.icon }}</span><strong>{{ item.label }}</strong><small>{{ item.description }}</small>
        </button>
      </div>
    </section>

    <section class="guided-search">
      <div class="guided-block">
        <p class="eyebrow">Make it personal</p>
        <h2>Who is it for?</h2>
        <div class="chips" role="list" aria-label="Gift recipients"><button v-for="item in recipientOptions" :key="item" role="listitem" :class="{active:recipient===item}" @click="recipient=recipient===item?'':item">{{ item }}</button></div>
      </div>
      <div class="guided-block">
        <p class="eyebrow">What is the moment?</p>
        <h2>Choose an occasion</h2>
        <div class="chips" role="list" aria-label="Gift occasions"><button v-for="item in occasionOptions" :key="item" role="listitem" :class="{active:occasion===item}" @click="occasion=occasion===item?'':item">{{ item }}</button></div>
      </div>
    </section>

    <section id="catalogue" class="catalogue">
      <header class="catalogue-heading">
        <div><p class="eyebrow">Curated by BundleBee</p><h2>{{ activeHeading }}</h2></div>
        <span v-if="!loading">{{ filteredProducts.length }} find{{ filteredProducts.length===1?'':'s' }}</span>
      </header>

      <div v-if="products.length" class="filters">
        <input v-model.trim="search" type="search" placeholder="Search product, maker or keyword" aria-label="Search products" />
        <select v-model="quality" aria-label="Quality"><option value="">Any quality</option><option v-for="item in qualityOptions" :key="item" :value="item">{{ item }}</option></select>
        <select v-model="priceBand" aria-label="Price"><option value="">Any price</option><option value="under-25">Under £25</option><option value="25-50">£25–£50</option><option value="50-100">£50–£100</option><option value="over-100">Over £100</option></select>
        <button class="clear" type="button" @click="clearFilters">Clear</button>
      </div>

      <div v-if="loading" class="state">Loading thoughtful finds…</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <div v-else-if="!products.length" class="state"><h3>The first finds are being curated</h3><p>Products will appear here after they have been reviewed and given a clear reason to belong.</p></div>
      <div v-else-if="!filteredProducts.length" class="state"><h3>No exact match yet</h3><p>Try removing one filter. A smaller catalogue is part of the point—we would rather show fewer good choices.</p></div>
      <div v-else class="product-grid">
        <article v-for="product in visibleProducts" :key="product.id" class="product-card">
          <div class="image-wrap"><img :src="product.imageUrl||placeholderImage" :alt="product.name" loading="lazy" @error="usePlaceholder" /><span v-if="product.primaryMood" class="badge">{{ product.primaryMood }}</span></div>
          <div class="product-copy">
            <p class="maker">{{ product.brandName||'Independent maker' }}</p>
            <h3>{{ product.name }}</h3>
            <p>{{ product.shortDescription }}</p>
            <div v-if="product.curatorNote" class="curator-note"><strong>Why we picked it</strong><span>{{ product.curatorNote }}</span></div>
            <div class="tag-row"><span v-for="tag in product.displayTags" :key="tag">{{ tag }}</span></div>
            <div class="product-footer"><strong v-if="product.price!==null">{{ formatPrice(product.price,product.currency) }}</strong><button class="btn primary" @click="openRetailer(product)">See it at the retailer</button></div>
          </div>
        </article>
      </div>
      <div v-if="visibleProducts.length<filteredProducts.length" class="load-more"><button class="btn secondary" @click="shown+=pageSize">Show more</button></div>
    </section>

    <section id="how-it-works" class="how-it-works">
      <header class="section-heading"><p class="eyebrow">A smaller, better catalogue</p><h2>How BundleBee works</h2></header>
      <div class="steps">
        <article><span>1</span><h3>We look beyond the obvious</h3><p>Independent makers, artists and specialist shops are reviewed for products with a genuine reason to stand out.</p></article>
        <article><span>2</span><h3>You browse by intent</h3><p>Start with a feeling, a person or an occasion instead of scrolling through thousands of near-identical products.</p></article>
        <article><span>3</span><h3>You buy from the retailer</h3><p>The maker or retailer handles payment and delivery. Some links earn BundleBee a commission at no extra cost to you.</p></article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed,onMounted,ref,watch } from 'vue';
import API from '../api.js';
const loading=ref(true),error=ref(''),products=ref([]),search=ref(''),mood=ref(''),recipient=ref(''),occasion=ref(''),quality=ref(''),priceBand=ref(''),shown=ref(12);
const pageSize=12,placeholderImage='/icon-512x512.png';
const moodIdeas=[
 {value:'one of a kind',label:'One of a kind',icon:'🎨',description:'Original art, handmade pieces and limited editions'},
 {value:'elegant',label:'Elegant',icon:'◇',description:'Refined gifts and beautifully designed objects'},
 {value:'meaningful',label:'Meaningful',icon:'♡',description:'Personal gifts, keepsakes and things with a story'},
 {value:'unexpected',label:'Unexpected',icon:'✦',description:'Unusual finds they probably have not seen before'},
 {value:'playful',label:'Playful',icon:'☀',description:'Clever, colourful and joyfully different'},
 {value:'beautifully useful',label:'Beautifully useful',icon:'⌂',description:'Practical things that still feel special'}
];
const recipientOptions=['partner','parent','teenager','friend','teacher','couple','someone who has everything'];
const occasionOptions=['birthday','anniversary','wedding','new home','Christmas','thank you'];
const qualityOptions=['handmade','personalised','limited edition','made in Britain','small batch'];
const normaliseList=value=>Array.isArray(value)?value.map(v=>String(v).toLowerCase()):[];
function normaliseProduct(item){const brand=typeof item?.brand==='object'?item.brand:null;const price=Number(item?.price);const moods=normaliseList(item?.moods);const recipients=normaliseList(item?.recipients);const occasions=normaliseList(item?.occasions);const qualities=normaliseList(item?.qualities);return{id:item?._id||item?.id,name:item?.name||'Untitled product',brandName:brand?.name||'',shortDescription:item?.shortDescription||item?.description||'',curatorNote:item?.curatorNote||'',price:Number.isFinite(price)?price:null,currency:item?.currency||'GBP',affiliateUrl:item?.affiliateUrl||'',productUrl:item?.productUrl||'',imageUrl:item?.imageUrl||'',moods,recipients,occasions,qualities,primaryMood:moods[0]||'',displayTags:[...qualities,...recipients].slice(0,3),searchText:[item?.name,brand?.name,item?.shortDescription,item?.description,item?.tags,moods,recipients,occasions,qualities].flat().filter(Boolean).join(' ').toLowerCase()};}
async function load(){loading.value=true;try{const {data}=await API.get('/products',{params:{limit:100}});products.value=(data?.items||[]).map(normaliseProduct);}catch(e){console.error(e);error.value='The catalogue could not be loaded just now.';}finally{loading.value=false;}}
const filteredProducts=computed(()=>products.value.filter(p=>{const q=search.value.toLowerCase();const priceOk=!priceBand.value||(priceBand.value==='under-25'&&p.price<25)||(priceBand.value==='25-50'&&p.price>=25&&p.price<=50)||(priceBand.value==='50-100'&&p.price>50&&p.price<=100)||(priceBand.value==='over-100'&&p.price>100);return(!q||p.searchText.includes(q))&&(!mood.value||p.moods.includes(mood.value))&&(!recipient.value||p.recipients.includes(recipient.value))&&(!occasion.value||p.occasions.includes(occasion.value))&&(!quality.value||p.qualities.includes(quality.value))&&priceOk;}));
const visibleProducts=computed(()=>filteredProducts.value.slice(0,shown.value));
const activeHeading=computed(()=>mood.value?`${moodIdeas.find(x=>x.value===mood.value)?.label||mood.value} finds`:recipient.value?`Something special for a ${recipient.value}`:occasion.value?`${occasion.value} gift ideas`:'Browse distinctive finds');
watch([search,mood,recipient,occasion,quality,priceBand],()=>shown.value=pageSize);
function chooseMood(value){mood.value=mood.value===value?'':value;document.querySelector('#catalogue')?.scrollIntoView({behavior:'smooth'});}
function clearFilters(){search.value='';mood.value='';recipient.value='';occasion.value='';quality.value='';priceBand.value='';}
function formatPrice(value,currency='GBP'){return new Intl.NumberFormat('en-GB',{style:'currency',currency}).format(value);}
function usePlaceholder(e){e.target.src=placeholderImage;}
async function openRetailer(product){let url=product.affiliateUrl||product.productUrl;try{const {data}=await API.post(`/products/${product.id}/click`);url=data?.url||url;}catch(e){console.warn('Click tracking failed',e);}if(url)window.open(url,'_blank','noopener,noreferrer');}
onMounted(load);
</script>

<style scoped>
.shop-home{max-width:1240px;margin:auto;padding:1.5rem 1rem 4rem;color:var(--bb-text);overflow-x:hidden}
.hero{display:grid;grid-template-columns:1.55fr .75fr;gap:2rem;padding:clamp(2rem,5vw,4.5rem);border:1px solid var(--bb-border);border-radius:28px;background:linear-gradient(135deg,var(--bb-surface),color-mix(in srgb,var(--bb-primary-light) 12%,var(--bb-surface)))}
h1{font-size:clamp(2.5rem,6vw,5.2rem);line-height:.98;letter-spacing:-.055em;max-width:820px;margin:.45rem 0 1rem}.hero-text{font-size:1.15rem;line-height:1.65;max-width:650px;color:var(--bb-muted)}
.eyebrow{font-size:.76rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:var(--bb-primary-dark)}
.hero-actions{display:flex;gap:.7rem;flex-wrap:wrap;margin-top:1.5rem}.btn{border:1px solid var(--bb-border);border-radius:999px;padding:.75rem 1rem;font-weight:800;cursor:pointer;text-decoration:none}.primary{background:var(--bb-primary-dark);color:white}.secondary{background:var(--bb-surface);color:var(--bb-text)}
.promise{align-self:center;padding:1.4rem;border:1px solid var(--bb-border);border-radius:20px;background:var(--bb-bg)}.promise>span{font-size:2rem}.promise h2{margin:.6rem 0}.promise p,.section-heading>p{color:var(--bb-muted);line-height:1.6}
.discovery-section,.guided-search,.catalogue,.how-it-works{margin-top:4rem}.section-heading h2,.catalogue-heading h2{font-size:clamp(2rem,4vw,3.1rem);margin:.3rem 0}
.carousel-hint{display:none}
.idea-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:1.5rem}.idea-card{display:grid;gap:.5rem;text-align:left;min-height:165px;padding:1.3rem;border:1px solid var(--bb-border);border-radius:20px;background:var(--bb-surface);color:var(--bb-text);cursor:pointer}.idea-card>span{font-size:1.6rem}.idea-card strong{font-size:1.15rem}.idea-card small{color:var(--bb-muted);font-size:.92rem;line-height:1.45}.idea-card.active,.chips button.active{outline:3px solid color-mix(in srgb,var(--bb-primary-dark) 28%,transparent);border-color:var(--bb-primary-dark)}
.guided-search{display:grid;grid-template-columns:1fr 1fr;gap:2rem;padding:1.5rem;border:1px solid var(--bb-border);border-radius:24px;background:var(--bb-surface)}.guided-search h2{margin:.25rem 0 1rem}.chips{display:flex;flex-wrap:wrap;gap:.55rem}.chips button,.clear{padding:.6rem .8rem;border:1px solid var(--bb-border);border-radius:999px;background:var(--bb-bg);color:var(--bb-text);cursor:pointer;white-space:nowrap}
.catalogue-heading{display:flex;justify-content:space-between;align-items:end;gap:1rem}.filters{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:.7rem;margin:1rem 0 1.5rem}.filters input,.filters select{min-width:0;padding:.75rem;border:1px solid var(--bb-border);border-radius:12px;background:var(--bb-surface);color:var(--bb-text)}
.state{padding:2rem;border:1px solid var(--bb-border);border-radius:18px;background:var(--bb-surface);text-align:center}.error{color:#b33}
.product-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.2rem}.product-card{overflow:hidden;border:1px solid var(--bb-border);border-radius:20px;background:var(--bb-surface);box-shadow:var(--bb-shadow-sm)}.image-wrap{position:relative;aspect-ratio:4/3;background:var(--bb-bg)}.image-wrap img{width:100%;height:100%;object-fit:cover}.badge{position:absolute;left:.8rem;top:.8rem;padding:.45rem .65rem;border-radius:999px;background:var(--bb-surface);color:var(--bb-text);font-weight:800;text-transform:capitalize}.product-copy{display:grid;gap:.65rem;padding:1.1rem}.product-copy h3{margin:0;font-size:1.25rem}.product-copy>p{margin:0;color:var(--bb-muted);line-height:1.55}.maker{font-size:.78rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:var(--bb-primary-dark)!important}.curator-note{display:grid;gap:.25rem;padding:.8rem;border-radius:12px;background:var(--bb-bg)}.curator-note span{color:var(--bb-muted);line-height:1.45}.tag-row{display:flex;gap:.4rem;flex-wrap:wrap}.tag-row span{padding:.35rem .5rem;border:1px solid var(--bb-border);border-radius:999px;font-size:.78rem;text-transform:capitalize}.product-footer{display:flex;align-items:center;justify-content:space-between;gap:.7rem;margin-top:.2rem}.load-more{text-align:center;margin-top:1.5rem}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}.steps article{padding:1.25rem;border:1px solid var(--bb-border);border-radius:18px;background:var(--bb-surface)}.steps article>span{display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:var(--bb-primary-dark);color:white;font-weight:900}.steps h3{margin:.8rem 0 .4rem}.steps p{margin:0;color:var(--bb-muted);line-height:1.55}
@media(max-width:900px){.hero{grid-template-columns:1fr}.promise{max-width:none}.product-grid{grid-template-columns:repeat(2,1fr)}.steps{grid-template-columns:1fr}.filters{grid-template-columns:1fr 1fr}.filters input{grid-column:1/-1}.guided-search{grid-template-columns:1fr}}
@media(max-width:640px){
 .shop-home{padding:.45rem .25rem 3rem}
 .hero{gap:1rem;padding:1.35rem;border-radius:22px}.hero-copy{min-width:0}h1{font-size:clamp(2.25rem,12vw,3.35rem);line-height:.98;margin:.35rem 0 .8rem}.hero-text{font-size:1rem;line-height:1.5}.hero-actions{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;margin-top:1rem}.hero-actions .btn{text-align:center;padding:.72rem .65rem;font-size:.86rem}.promise{padding:1rem;border-radius:16px}.promise>span{font-size:1.5rem}.promise h2{font-size:1.15rem;margin:.35rem 0}.promise p{font-size:.9rem;line-height:1.45;margin:.2rem 0}
 .discovery-section,.guided-search,.catalogue,.how-it-works{margin-top:2.5rem}.section-heading{padding:0 .25rem}.section-heading h2,.catalogue-heading h2{font-size:1.9rem;line-height:1.05}.section-heading>p{font-size:.92rem;line-height:1.45}.carousel-hint{display:flex;justify-content:flex-end;gap:.35rem;align-items:center;margin:.7rem .25rem -.2rem;color:var(--bb-muted);font-size:.78rem}.carousel-hint span{font-size:1.1rem}
 .idea-grid{display:flex;overflow-x:auto;gap:.75rem;margin:1rem -.25rem 0;padding:0 .25rem .75rem;scroll-snap-type:x mandatory;scroll-padding-inline:.25rem;-webkit-overflow-scrolling:touch;scrollbar-width:none}.idea-grid::-webkit-scrollbar{display:none}.idea-card{flex:0 0 78vw;max-width:285px;min-height:150px;padding:1rem;border-radius:18px;scroll-snap-align:start}.idea-card>span{font-size:1.4rem}.idea-card strong{font-size:1.05rem}.idea-card small{font-size:.88rem}
 .guided-search{display:block;padding:1rem;border-radius:20px;overflow:hidden}.guided-block+.guided-block{margin-top:1.35rem;padding-top:1.25rem;border-top:1px solid var(--bb-border)}.guided-search h2{font-size:1.5rem;margin:.2rem 0 .7rem}.chips{display:flex;flex-wrap:nowrap;overflow-x:auto;gap:.5rem;margin:0 -.2rem;padding:.15rem .2rem .55rem;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;scrollbar-width:none}.chips::-webkit-scrollbar{display:none}.chips button{flex:0 0 auto;scroll-snap-align:start;padding:.55rem .75rem;font-size:.85rem}
 .catalogue-heading{align-items:flex-start}.catalogue-heading>span{font-size:.82rem;white-space:nowrap;margin-top:.45rem}.filters{grid-template-columns:1fr;gap:.55rem}.filters input{grid-column:auto}.clear{width:100%}.state{padding:1.4rem 1rem}.product-grid{grid-template-columns:1fr}.product-footer{align-items:stretch;flex-direction:column}.product-footer .btn{width:100%;box-sizing:border-box}.steps{gap:.75rem}.steps article{padding:1rem}
}
</style>
