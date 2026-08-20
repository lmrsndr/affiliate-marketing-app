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
        <h2>Meet makers, not a wall of products</h2>
        <p>Step inside a small selection of shops chosen for their point of view, craft and genuinely memorable work.</p>
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
        <div class="chips" role="list" aria-label="Gift recipients"><button v-for="item in recipientOptions" :key="item" type="button" role="listitem" :class="{active:recipient===item}" @click="recipient=recipient===item?'':item">{{ item }}</button></div>
      </div>
      <div class="guided-block">
        <p class="eyebrow">What is the moment?</p>
        <h2>Choose an occasion</h2>
        <div class="chips" role="list" aria-label="Gift occasions"><button v-for="item in occasionOptions" :key="item" type="button" role="listitem" :class="{active:occasion===item}" @click="occasion=occasion===item?'':item">{{ item }}</button></div>
      </div>
      <div class="guided-action">
        <button class="btn primary" type="button" @click="showResults">View {{ filteredProducts.length }} matching find{{ filteredProducts.length===1?'':'s' }}</button>
        <small>Your choices stay editable below.</small>
      </div>
    </section>

    <section id="catalogue" class="catalogue">
      <header class="catalogue-heading">
        <div><p class="eyebrow">Curated shop windows</p><h2>{{ activeHeading }}</h2></div>
        <span v-if="!loading">{{ makerGroups.length }} maker{{ makerGroups.length===1?'':'s' }} · {{ filteredProducts.length }} find{{ filteredProducts.length===1?'':'s' }}</span>
      </header>
      <p v-if="makerGroups.length" class="catalogue-intro">Explore the character of each maker first, then open the pieces that catch your eye.</p>
      <div v-if="products.length" class="filters">
        <input v-model.trim="search" type="search" placeholder="Search product, maker or keyword" aria-label="Search products" />
        <select v-model="quality" aria-label="Quality"><option value="">Any quality</option><option v-for="item in qualityOptions" :key="item" :value="item">{{ item }}</option></select>
        <select v-model="priceBand" aria-label="Price"><option value="">Any price</option><option value="under-25">Under £25</option><option value="25-50">£25–£50</option><option value="50-100">£50–£100</option><option value="over-100">Over £100</option></select>
        <button class="clear" type="button" @click="clearFilters">Clear</button>
      </div>
      <div v-if="loading" class="state">Loading thoughtful finds…</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <div v-else-if="!products.length" class="state"><h3>The first shop windows are being curated</h3><p>Makers will appear here after their profile and tracked shop links have been reviewed.</p></div>
      <div v-else-if="!filteredProducts.length" class="state"><h3>No exact match yet</h3><p>Try removing one filter. A smaller catalogue is part of the point—we would rather show fewer good choices.</p></div>
      <div v-else class="maker-list">
        <article v-for="group in visibleMakerGroups" :key="group.maker.id" class="maker-window">
          <div class="maker-gallery" :class="{'single-image':group.products.length===1,'two-images':group.products.length===2}">
            <img v-for="product in group.products.slice(0,3)" :key="product.id" :src="product.imageUrl||placeholderImage" :alt="product.name" loading="lazy" @error="usePlaceholder" />
            <span class="match-count">{{ group.products.length }} matching piece{{ group.products.length===1?'':'s' }}</span>
          </div>
          <div class="maker-copy">
            <div class="maker-identity">
              <img v-if="group.maker.logoUrl" :src="group.maker.logoUrl" :alt="`${group.maker.name} logo`" @error="hideBrokenImage" />
              <div><p class="eyebrow">{{ makerLabel(group.maker) }}</p><h3>{{ group.maker.name }}</h3></div>
            </div>
            <p class="maker-tagline">{{ group.maker.tagline || group.maker.description || group.products[0].shortDescription }}</p>
            <blockquote v-if="group.maker.curatorNote"><strong>Why BundleBee stopped here</strong>{{ group.maker.curatorNote }}</blockquote>
            <div class="tag-row"><span v-for="tag in group.tags" :key="tag">{{ tag }}</span></div>
            <div class="piece-preview">
              <div v-for="product in group.products.slice(0,3)" :key="product.id"><span>{{ product.name }}</span><strong v-if="product.price!==null">{{ formatPrice(product.price,product.currency) }}</strong></div>
            </div>
            <div class="maker-actions">
              <router-link class="btn primary" :to="`/makers/${group.maker.slug}`">Explore our selection</router-link>
              <button class="btn secondary" type="button" @click="openMakerShop(group.maker)">Visit maker shop ↗</button>
            </div>
          </div>
        </article>
      </div>
      <div v-if="hasMoreMakers" class="load-more"><button class="btn secondary" type="button" @click="shown+=pageSize">Show more makers</button></div>
    </section>

    <section id="how-it-works" class="how-it-works">
      <header class="section-heading"><p class="eyebrow">A smaller, better catalogue</p><h2>How BundleBee works</h2></header>
      <div class="steps">
        <article><span>1</span><h3>We look beyond the obvious</h3><p>Independent makers, artists and specialist shops are reviewed for products with a genuine reason to stand out.</p></article>
        <article><span>2</span><h3>You browse by intent</h3><p>Start with a feeling, a person or an occasion, then get to know makers whose work fits the moment.</p></article>
        <article><span>3</span><h3>You buy from the maker</h3><p>The maker handles payment and delivery. Some links earn BundleBee a commission at no extra cost to you.</p></article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed,onMounted,ref,watch } from 'vue';
import API from '../api.js';

const loading=ref(true),error=ref(''),products=ref([]),search=ref(''),mood=ref(''),recipient=ref(''),occasion=ref(''),quality=ref(''),priceBand=ref(''),shown=ref(6);
const pageSize=6,placeholderImage='/icon-512x512.png';
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
const titleCase=value=>String(value||'').replace(/\b\w/g,char=>char.toUpperCase());

function normaliseProduct(item){
 const brand=typeof item?.brand==='object'?item.brand:{};
 const price=item?.price===null||item?.price===undefined||item?.price===''?null:Number(item.price);
 const moods=normaliseList(item?.moods),recipients=normaliseList(item?.recipients),occasions=normaliseList(item?.occasions),qualities=normaliseList(item?.qualities);
 const maker={id:brand?._id||brand?.id||`maker-${item?._id}`,name:brand?.name||'Independent maker',slug:brand?.slug||'',website:brand?.website||'',logoUrl:brand?.logoUrl||'',description:brand?.description||'',tagline:brand?.tagline||'',curatorNote:brand?.curatorNote||'',heroImageUrl:brand?.heroImageUrl||'',affiliateUrl:brand?.affiliateUrl||'',country:brand?.country||'',independent:Boolean(brand?.independent),smallBusiness:Boolean(brand?.smallBusiness),qualities:normaliseList(brand?.qualities)};
 return{id:item?._id||item?.id,name:item?.name||'Untitled product',maker,shortDescription:item?.shortDescription||item?.description||'',curatorNote:item?.curatorNote||'',price:Number.isFinite(price)?price:null,currency:item?.currency||'GBP',affiliateUrl:item?.affiliateUrl||'',productUrl:item?.productUrl||'',imageUrl:item?.imageUrl||'',moods,recipients,occasions,qualities,searchText:[item?.name,brand?.name,brand?.tagline,item?.shortDescription,item?.description,item?.tags,moods,recipients,occasions,qualities].flat().filter(Boolean).join(' ').toLowerCase()};
}

async function load(){loading.value=true;error.value='';try{const {data}=await API.get('/products',{params:{limit:100}});products.value=(data?.items||[]).map(normaliseProduct);}catch(e){console.error(e);error.value='The catalogue could not be loaded just now.';}finally{loading.value=false;}}

const filteredProducts=computed(()=>products.value.filter(p=>{
 const q=search.value.toLowerCase();
 const priceOk=!priceBand.value||(p.price!==null&&((priceBand.value==='under-25'&&p.price<25)||(priceBand.value==='25-50'&&p.price>=25&&p.price<=50)||(priceBand.value==='50-100'&&p.price>50&&p.price<=100)||(priceBand.value==='over-100'&&p.price>100)));
 return(!q||p.searchText.includes(q))&&(!mood.value||p.moods.includes(mood.value.toLowerCase()))&&(!recipient.value||p.recipients.includes(recipient.value.toLowerCase()))&&(!occasion.value||p.occasions.includes(occasion.value.toLowerCase()))&&(!quality.value||p.qualities.includes(quality.value.toLowerCase()))&&priceOk;
}));

const makerGroups=computed(()=>{
 const groups=new Map();
 filteredProducts.value.forEach(product=>{
  const key=product.maker.id;
  if(!groups.has(key))groups.set(key,{maker:product.maker,products:[],tags:[]});
  groups.get(key).products.push(product);
 });
 return [...groups.values()].map(group=>({...group,tags:[...new Set([...group.maker.qualities,...group.products.flatMap(product=>product.qualities)])].slice(0,4)}));
});
const visibleMakerGroups=computed(()=>makerGroups.value.slice(0,shown.value));
const hasMoreMakers=computed(()=>visibleMakerGroups.value.length<makerGroups.value.length);
const activeHeading=computed(()=>{
 const selectedMood=mood.value?(moodIdeas.find(item=>item.value===mood.value)?.label||titleCase(mood.value)):'';
 const lead=[selectedMood,occasion.value].filter(Boolean).join(' ');
 const headingLead=lead?`${lead.charAt(0).toUpperCase()}${lead.slice(1)}`:'';
 if(recipient.value)return `${headingLead||'Distinctive'} finds for ${recipient.value==='someone who has everything'?'someone who has everything':`a ${recipient.value}`}`;
 return `${headingLead||'Distinctive'} finds`;
});

watch([search,mood,recipient,occasion,quality,priceBand],()=>shown.value=pageSize);
function chooseMood(value){mood.value=mood.value===value?'':value;}
function showResults(){document.querySelector('#catalogue')?.scrollIntoView({behavior:'smooth',block:'start'});}
function clearFilters(){search.value='';mood.value='';recipient.value='';occasion.value='';quality.value='';priceBand.value='';}
function makerLabel(maker){if(maker.independent&&maker.smallBusiness)return 'Independent small maker';if(maker.independent)return 'Independent maker';if(maker.smallBusiness)return 'Small business';return maker.country||'Selected maker';}
function formatPrice(value,currency='GBP'){return new Intl.NumberFormat('en-GB',{style:'currency',currency}).format(value);}
function usePlaceholder(event){event.target.src=placeholderImage;}
function hideBrokenImage(event){event.target.style.display='none';}
async function openMakerShop(maker){let url=maker.affiliateUrl||maker.website;try{const {data}=await API.post(`/brands/${maker.id}/click`);url=data?.url||url;}catch(e){console.warn('Maker click tracking failed',e);}if(url)window.open(url,'_blank','noopener,noreferrer');}
onMounted(load);
</script>

<style scoped>
.shop-home{display:block;width:100%;max-width:100%;min-width:0;margin:0 auto;padding:1.5rem 1rem 4rem;color:var(--bb-text);overflow-x:clip}.shop-home>*{width:100%;max-width:100%;min-width:0}
.hero{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,.75fr);gap:2rem;padding:clamp(2rem,5vw,4.5rem);border:1px solid var(--bb-border);border-radius:28px;background:linear-gradient(135deg,var(--bb-surface),color-mix(in srgb,var(--bb-primary-light) 12%,var(--bb-surface)));overflow:hidden}.hero-copy,.promise{min-width:0}
h1{font-size:clamp(2.5rem,6vw,5.2rem);line-height:.98;letter-spacing:-.055em;max-width:820px;margin:.45rem 0 1rem;overflow-wrap:anywhere}.hero-text{font-size:1.15rem;line-height:1.65;max-width:650px;color:var(--bb-muted)}
.eyebrow{margin:0;font-size:.76rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:var(--bb-primary-dark)}.hero-actions,.maker-actions{display:flex;gap:.7rem;flex-wrap:wrap;margin-top:1.5rem}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;border:1px solid var(--bb-border);border-radius:999px;padding:.75rem 1rem;font-weight:800;cursor:pointer;text-decoration:none}.primary{background:var(--bb-primary-dark);color:white}.secondary{background:var(--bb-surface);color:var(--bb-text)}
.promise{align-self:center;padding:1.4rem;border:1px solid var(--bb-border);border-radius:20px;background:var(--bb-bg)}.promise>span{font-size:2rem}.promise h2{margin:.6rem 0}.promise p,.section-heading>p,.catalogue-intro{color:var(--bb-muted);line-height:1.6}
.discovery-section,.guided-search,.catalogue,.how-it-works{margin-top:4rem}.section-heading h2,.catalogue-heading h2{font-size:clamp(2rem,4vw,3.1rem);margin:.3rem 0}.carousel-hint{display:none}
.idea-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;margin-top:1.5rem}.idea-card{display:grid;gap:.5rem;text-align:left;min-width:0;min-height:165px;padding:1.3rem;border:1px solid var(--bb-border);border-radius:20px;background:var(--bb-surface);color:var(--bb-text);cursor:pointer}.idea-card>span{font-size:1.6rem}.idea-card strong{font-size:1.15rem}.idea-card small{color:var(--bb-muted);font-size:.92rem;line-height:1.45}.idea-card.active,.chips button.active{outline:3px solid color-mix(in srgb,var(--bb-primary-dark) 28%,transparent);border-color:var(--bb-primary-dark)}
.guided-search{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2rem;padding:1.5rem;border:1px solid var(--bb-border);border-radius:24px;background:var(--bb-surface)}.guided-search h2{margin:.25rem 0 1rem}.guided-block{min-width:0}.guided-action{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:.8rem;padding-top:1rem;border-top:1px solid var(--bb-border)}.guided-action small{color:var(--bb-muted)}.chips{display:flex;flex-wrap:wrap;gap:.55rem}.chips button,.clear{min-height:42px;padding:.6rem .8rem;border:1px solid var(--bb-border);border-radius:999px;background:var(--bb-bg);color:var(--bb-text);cursor:pointer;white-space:nowrap}
.catalogue-heading{display:flex;justify-content:space-between;align-items:end;gap:1rem}.catalogue-heading>span{color:var(--bb-muted);white-space:nowrap}.catalogue-intro{margin:.25rem 0 1.25rem}.filters{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) auto;gap:.7rem;margin:1rem 0 1.5rem}.filters input,.filters select{min-width:0;padding:.75rem;border:1px solid var(--bb-border);border-radius:12px;background:var(--bb-surface);color:var(--bb-text)}
.state{padding:2rem;border:1px solid var(--bb-border);border-radius:18px;background:var(--bb-surface);text-align:center}.error{color:#b33}.maker-list{display:grid;gap:1.5rem}.maker-window{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(320px,.88fr);min-height:460px;overflow:hidden;border:1px solid var(--bb-border);border-radius:26px;background:var(--bb-surface);box-shadow:var(--bb-shadow-sm)}
.maker-gallery{position:relative;display:grid;grid-template-columns:1.45fr 1fr;grid-template-rows:1fr 1fr;gap:3px;min-height:460px;background:var(--bb-bg)}.maker-gallery img{width:100%;height:100%;min-height:0;object-fit:cover}.maker-gallery img:first-child{grid-row:1/-1}.maker-gallery.two-images img:nth-child(2){grid-row:1/-1}.maker-gallery.single-image{display:block}.maker-gallery.single-image img{height:100%;min-height:460px}.match-count{position:absolute;left:1rem;bottom:1rem;padding:.5rem .7rem;border-radius:999px;background:color-mix(in srgb,var(--bb-surface) 92%,transparent);font-size:.82rem;font-weight:800}
.maker-copy{display:flex;flex-direction:column;justify-content:center;min-width:0;padding:clamp(1.4rem,3vw,2.5rem)}.maker-identity{display:flex;align-items:center;gap:.9rem}.maker-identity img{width:54px;height:54px;object-fit:contain;border:1px solid var(--bb-border);border-radius:14px;background:white}.maker-identity h3{margin:.22rem 0 0;font-size:clamp(1.8rem,3.5vw,2.7rem);line-height:1}.maker-tagline{font-size:1.06rem;line-height:1.65;color:var(--bb-muted)}blockquote{display:grid;gap:.35rem;margin:.6rem 0;padding:1rem;border-left:3px solid var(--bb-primary-dark);background:var(--bb-bg);color:var(--bb-muted);line-height:1.5}blockquote strong{color:var(--bb-text)}.tag-row{display:flex;gap:.4rem;flex-wrap:wrap}.tag-row span{padding:.35rem .5rem;border:1px solid var(--bb-border);border-radius:999px;font-size:.78rem;text-transform:capitalize}.piece-preview{display:grid;gap:.4rem;margin-top:1rem}.piece-preview>div{display:flex;justify-content:space-between;gap:1rem;padding:.35rem 0;border-bottom:1px solid var(--bb-border);font-size:.9rem}.piece-preview span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.maker-actions{margin-top:1.2rem}.load-more{text-align:center;margin-top:1.5rem}
.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.steps article{min-width:0;padding:1.25rem;border:1px solid var(--bb-border);border-radius:18px;background:var(--bb-surface)}.steps article>span{display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:var(--bb-primary-dark);color:white;font-weight:900}.steps h3{margin:.8rem 0 .4rem}.steps p{margin:0;color:var(--bb-muted);line-height:1.55}
@media(max-width:900px){.hero{grid-template-columns:1fr}.maker-window{grid-template-columns:1fr;min-height:0}.maker-gallery{min-height:380px}.steps{grid-template-columns:1fr}.filters{grid-template-columns:1fr 1fr}.filters input{grid-column:1/-1}.guided-search{grid-template-columns:1fr}.guided-action{grid-column:auto}}
@media(max-width:640px){
 .shop-home{padding:.45rem 0 3rem}.hero{gap:1rem;padding:1.2rem;border-radius:20px}h1{font-size:clamp(2.1rem,11vw,3rem);line-height:1;margin:.35rem 0 .8rem}.hero-text{font-size:1rem;line-height:1.5}.hero-actions{display:grid;grid-template-columns:1fr;gap:.55rem;margin-top:1rem}.hero-actions .btn{width:100%}.promise{padding:1rem;border-radius:16px}.promise>span{font-size:1.5rem}.promise h2{font-size:1.15rem;margin:.35rem 0}.promise p{font-size:.9rem;line-height:1.45}
 .discovery-section,.guided-search,.catalogue,.how-it-works{margin-top:2.5rem}.section-heading h2,.catalogue-heading h2{font-size:1.85rem;line-height:1.08}.section-heading>p{font-size:.92rem;line-height:1.45}.carousel-hint{display:flex;justify-content:flex-end;gap:.35rem;margin:.7rem .15rem -.2rem;color:var(--bb-muted);font-size:.78rem}.idea-grid{display:flex;overflow-x:auto;gap:.75rem;margin:1rem 0 0;padding:0 .15rem .75rem;scroll-snap-type:x mandatory;scrollbar-width:none}.idea-grid::-webkit-scrollbar{display:none}.idea-card{flex:0 0 calc(100% - 2.2rem);max-width:300px;min-height:150px;padding:1rem;scroll-snap-align:start}
 .guided-search{display:block;padding:1rem;border-radius:20px;overflow:hidden}.guided-block+.guided-block{margin-top:1.35rem;padding-top:1.25rem;border-top:1px solid var(--bb-border)}.guided-search h2{font-size:1.5rem;margin:.2rem 0 .7rem}.chips{flex-wrap:nowrap;overflow-x:auto;padding:.15rem 0 .55rem;scrollbar-width:none}.chips::-webkit-scrollbar{display:none}.chips button{flex:0 0 auto}.guided-action{display:grid;text-align:center}.guided-action .btn{width:100%}
 .catalogue-heading{display:block}.catalogue-heading>span{display:block;margin-top:.5rem}.filters{grid-template-columns:1fr;gap:.55rem}.filters input{grid-column:auto}.clear{width:100%}.maker-window{border-radius:20px}.maker-gallery{min-height:280px}.maker-gallery.single-image img{min-height:280px}.maker-copy{padding:1.2rem}.maker-identity h3{font-size:1.8rem}.maker-actions{display:grid}.maker-actions .btn{width:100%}.steps{gap:.75rem}.steps article{padding:1rem}
}
</style>
