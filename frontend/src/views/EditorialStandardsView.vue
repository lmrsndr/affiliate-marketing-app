<template>
  <div class="promise-page">
    <header><p class="eyebrow">Our promise to customers</p><h1>Chosen with care, explained honestly.</h1><p>BundleBee exists to make good gifts easier to find—not to make an endless shop even bigger.</p></header>

    <section class="promise-grid">
      <article><span>What earns a place</span><h2>Something worth discovering</h2><p>We look for thoughtful design, skilled making, personal meaning, a compelling idea or usefulness with real character.</p></article>
      <article><span>How we write</span><h2>Warm, clear and factual</h2><p>We tell you why something caught our attention without exaggerating it. Important details and claims should be specific and supportable.</p></article>
      <article><span>How much we show</span><h2>A considered selection</h2><p>We choose a small edit that expresses the character of a maker or shop. Fewer good choices are more useful than an enormous list.</p></article>
      <article><span>Who decides</span><h2>BundleBee’s judgement</h2><p>A commercial relationship does not guarantee inclusion. A find still has to feel thoughtful, distinctive and right for the shop.</p></article>
    </section>

    <section class="disclosure" id="affiliate-disclosure"><div><p class="eyebrow">Affiliate disclosure</p><h2>How the shop is supported</h2></div><div><p>Some links on BundleBee are affiliate links. If you follow one and make a qualifying purchase, the retailer may pay BundleBee a commission. It does not increase the price you pay.</p><p>That support helps us keep looking for makers, stories and gifts worth discovering. It does not buy a positive opinion or a place in the shop.</p></div></section>

    <section class="closing"><p class="eyebrow">Our measure</p><blockquote>Would we still be pleased to introduce this if there were no commission attached?</blockquote><router-link to="/about">Read about BundleBee</router-link></section>
  </div>
</template>

<style scoped>
.promise-page{display:grid;gap:4rem;padding:clamp(1rem,5vw,4rem) 1rem 5rem}.promise-page>header{max-width:900px}.eyebrow{margin:0;color:var(--bb-primary-dark);font-size:.76rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}h1{margin:.45rem 0 1rem;font-size:clamp(2.8rem,7vw,5.8rem);line-height:.95;letter-spacing:-.06em}.promise-page>header>p,.promise-grid p,.disclosure p{color:var(--bb-muted);line-height:1.7;font-size:1.02rem}.promise-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--bb-border);border-radius:24px;overflow:hidden}.promise-grid article{padding:clamp(1.3rem,3vw,2.3rem);border-bottom:1px solid var(--bb-border)}.promise-grid article:nth-child(odd){border-right:1px solid var(--bb-border)}.promise-grid article:nth-last-child(-n+2){border-bottom:0}.promise-grid span{color:var(--bb-primary-dark);font-size:.75rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.promise-grid h2{margin:.5rem 0;font-size:1.65rem}.disclosure{display:grid;grid-template-columns:.8fr 1.2fr;gap:2rem;padding:clamp(1.4rem,4vw,3rem);border:1px solid color-mix(in srgb,var(--bb-accent) 55%,var(--bb-border));border-radius:24px;background:color-mix(in srgb,var(--bb-accent) 18%,var(--bb-surface))}.disclosure h2{margin:.4rem 0;font-size:clamp(2rem,4vw,3.2rem);line-height:1.05}.disclosure p:first-child{margin-top:0}.closing{max-width:850px;margin:auto;text-align:center}.closing blockquote{margin:1rem 0;font-size:clamp(1.8rem,4vw,3.2rem);line-height:1.3;letter-spacing:-.03em}.closing a{color:var(--bb-primary-dark);font-weight:800}
@media(max-width:700px){.promise-page{padding:.5rem 0 3rem;gap:3rem}h1{font-size:2.8rem}.promise-grid,.disclosure{grid-template-columns:1fr}.promise-grid article,.promise-grid article:nth-child(odd),.promise-grid article:nth-last-child(-n+2){border-right:0;border-bottom:1px solid var(--bb-border)}.promise-grid article:last-child{border-bottom:0}.disclosure{gap:.5rem;padding:1.2rem}}
</style>
