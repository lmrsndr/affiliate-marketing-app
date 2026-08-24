<template>
  <div class="concept-page">
    <div class="preview-banner"><strong>Concept preview—not currently published</strong><span>No live affiliate links or partner assets are used on this page.</span></div>

    <div v-if="loading" class="state">Preparing the concept window…</div>
    <div v-else-if="error" class="state error"><h1>This concept preview is unavailable.</h1><p>The link may have expired, the programme may no longer be under consideration, or the address may be incomplete.</p></div>

    <template v-else>
      <section class="concept-hero">
        <div class="concept-copy"><p class="eyebrow">A proposed BundleBee window for {{ programme.name }}</p><h1>{{ concept.headline }}</h1><p class="lead">{{ concept.introduction }}</p><div class="tags"><span v-for="mood in concept.moods" :key="mood">{{ mood }}</span></div></div>
        <div class="abstract-gallery" aria-label="Abstract mood board; no partner imagery"><div><small>mood</small><b>{{ concept.moods[0] }}</b></div><div><small>moment</small><b>{{ concept.occasions[0] }}</b></div><div><small>approach</small><b>curated</b></div></div>
      </section>

      <section class="partner-intro"><p class="eyebrow">The editorial idea</p><div><h2>{{ concept.eyebrow }}</h2><p v-if="programme.description">{{ programme.description }}</p><p>This preview demonstrates an original BundleBee presentation. Final factual copy would be verified with {{ programme.name }} before publication.</p></div></section>

      <section class="window-section"><header><p class="eyebrow">Three ways into the collection</p><h2>A shop window, not a stock list</h2></header><div class="window-grid"><article v-for="(window,index) in concept.windows" :key="window.title"><span>0{{ index + 1 }}</span><div class="sample-art" :class="`art-${index + 1}`" aria-hidden="true"></div><h3>{{ window.title }}</h3><p>{{ window.text }}</p><button type="button" disabled>Selection prepared after approval</button></article></div></section>

      <section class="occasion-strip"><div><p class="eyebrow">How customers could discover it</p><h2>Start with the feeling or the moment.</h2></div><div class="occasion-tags"><span v-for="occasion in concept.occasions" :key="occasion">{{ occasion }}</span></div></section>

      <section class="curator-note"><p class="eyebrow">Why BundleBee stopped here</p><blockquote>{{ concept.curatorNote }}</blockquote></section>

      <section class="approval-note"><div><span>✓</span><p><strong>Protected concept stage</strong>This page is unlisted and excluded from search engines.</p></div><div><span>—</span><p><strong>No premature publication</strong>No product, price, image or purchase link is live.</p></div><div><span>→</span><p><strong>After programme approval</strong>Authorised assets and tested tracking links complete the window.</p></div></section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import API from '@/api';
import { conceptForProgramme } from '@/data/partnerConcepts';

const route=useRoute(),loading=ref(true),error=ref(''),programme=ref(null);
const concept=computed(()=>conceptForProgramme(programme.value?.name));

onMounted(async()=>{
  try{programme.value=(await API.get(`/partner-previews/${route.params.token}`)).data;}
  catch(e){console.warn('Concept preview unavailable',e);error.value='unavailable';}
  finally{loading.value=false;}
});
</script>

<style scoped>
.concept-page{display:grid;gap:clamp(3rem,7vw,6rem);padding:.5rem 1rem 5rem}.preview-banner{display:flex;justify-content:space-between;gap:1rem;padding:.8rem 1rem;border:1px solid color-mix(in srgb,var(--bb-accent) 65%,var(--bb-border));border-radius:14px;background:color-mix(in srgb,var(--bb-accent) 20%,var(--bb-surface));font-size:.86rem}.preview-banner span{color:var(--bb-muted)}.state{padding:4rem 1rem;text-align:center}.state.error{max-width:700px;margin:auto}.concept-hero{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr);gap:2rem;align-items:center}.eyebrow{margin:0;color:var(--bb-primary-dark);font-size:.74rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}h1{margin:.45rem 0 1rem;font-size:clamp(2.7rem,7vw,5.8rem);line-height:.95;letter-spacing:-.06em}.lead{max-width:700px;color:var(--bb-muted);font-size:1.1rem;line-height:1.7}.tags,.occasion-tags{display:flex;flex-wrap:wrap;gap:.5rem}.tags span,.occasion-tags span{padding:.45rem .7rem;border:1px solid var(--bb-border);border-radius:999px;font-size:.8rem;font-weight:800;text-transform:capitalize}.abstract-gallery{display:grid;grid-template-columns:1.2fr .8fr;grid-template-rows:1fr 1fr;gap:4px;aspect-ratio:.9}.abstract-gallery div{display:flex;flex-direction:column;justify-content:flex-end;padding:1rem;border-radius:18px;background:linear-gradient(145deg,#24452e,#8eca98);color:#fff}.abstract-gallery div:first-child{grid-row:1/-1;background:linear-gradient(160deg,#d3a66d,#72503b)}.abstract-gallery div:nth-child(2){background:linear-gradient(145deg,#eee0cb,#9b7f69);color:#1b241d}.abstract-gallery small{text-transform:uppercase;letter-spacing:.1em}.abstract-gallery b{font-size:1.25rem;text-transform:capitalize}.partner-intro{display:grid;grid-template-columns:.55fr 1.45fr;gap:2rem;padding-top:2rem;border-top:1px solid var(--bb-border)}.partner-intro h2,.window-section h2,.occasion-strip h2{margin:.35rem 0;font-size:clamp(2rem,4.5vw,3.5rem);line-height:1.05}.partner-intro p{max-width:760px;color:var(--bb-muted);line-height:1.7}.window-section header{max-width:720px}.window-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:1.5rem}.window-grid article{display:flex;flex-direction:column;min-width:0;padding:1rem;border:1px solid var(--bb-border);border-radius:20px}.window-grid article>span{font-size:.75rem;font-weight:900;color:var(--bb-primary-dark)}.sample-art{height:220px;margin:.8rem 0;border-radius:14px;background:linear-gradient(150deg,#d9ba83,#5c4033)}.art-2{background:linear-gradient(150deg,#385f45,#b3d3b8)}.art-3{background:linear-gradient(150deg,#e4d9c7,#7e8b79)}.window-grid h3{margin:.25rem 0;font-size:1.35rem}.window-grid p{flex:1;color:var(--bb-muted);line-height:1.55}.window-grid button{min-height:44px;border:1px solid var(--bb-border);border-radius:999px;background:var(--bb-bg);color:var(--bb-muted);font-weight:750}.occasion-strip{display:grid;grid-template-columns:1fr 1fr;gap:1rem;align-items:center;padding:clamp(1.2rem,4vw,2.5rem);border:1px solid var(--bb-border);border-radius:22px;background:linear-gradient(135deg,var(--bb-surface),color-mix(in srgb,var(--bb-primary-light) 10%,var(--bb-surface)))}.occasion-tags{justify-content:flex-end}.occasion-tags span{padding:.7rem 1rem;background:var(--bb-surface)}.curator-note{max-width:820px;margin:auto;text-align:center}.curator-note blockquote{margin:1rem 0;font-size:clamp(1.6rem,4vw,2.8rem);line-height:1.3;letter-spacing:-.025em}.approval-note{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}.approval-note>div{display:flex;gap:.8rem;padding:1rem;border-top:2px solid var(--bb-primary-dark)}.approval-note span{display:grid;place-items:center;flex:0 0 2rem;height:2rem;border-radius:50%;background:var(--bb-primary-dark);color:#fff;font-weight:900}.approval-note p{display:grid;gap:.3rem;margin:0;color:var(--bb-muted);line-height:1.5}.approval-note strong{color:var(--bb-text)}
@media(max-width:850px){.concept-hero,.partner-intro,.occasion-strip{grid-template-columns:1fr}.abstract-gallery{max-width:480px}.window-grid,.approval-note{grid-template-columns:1fr}.occasion-tags{justify-content:flex-start}}
@media(max-width:600px){.concept-page{padding:.25rem 0 3rem;gap:2.8rem}.preview-banner{display:grid}.concept-hero{gap:1rem}h1{font-size:2.75rem}.abstract-gallery{aspect-ratio:1}.sample-art{height:180px}.curator-note blockquote{font-size:1.55rem}}
</style>

