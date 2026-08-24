<template>
  <div class="about-page">
    <section class="about-hero">
      <p class="eyebrow">A specialist gift shop</p>
      <h1>For people who want to give something less obvious.</h1>
      <p class="lead">BundleBee brings together thoughtful, distinctive and beautifully made things from makers, artists and specialist shops—then helps you find the one that feels right.</p>
      <a class="button" href="/#discover">Start with a feeling</a>
    </section>

    <section class="beliefs">
      <article><span>01</span><h2>Thoughtful, not endless</h2><p>We would rather show you a small number of memorable choices than make you search through thousands of ordinary ones.</p></article>
      <article><span>02</span><h2>People and stories matter</h2><p>The hands, ideas and places behind an object can be part of what makes it a wonderful gift.</p></article>
      <article><span>03</span><h2>Begin with how it should feel</h2><p>Elegant, playful, meaningful or unexpected: the feeling often points to a better gift than the product category.</p></article>
    </section>

    <section class="shop-note">
      <div class="abstract-shelves" aria-hidden="true"><span></span><span></span><span></span></div>
      <div><p class="eyebrow">The BundleBee difference</p><h2>Every shop should feel worth stepping into.</h2><p>We introduce the character of a maker or specialist shop before showing a small selection of pieces. You can understand what makes their work special, browse our edit, and then buy directly from them.</p><p>Some of those visits may earn BundleBee a commission at no extra cost to you. That helps us keep looking for things worth finding.</p><router-link to="/editorial-standards">Read our promise to customers</router-link></div>
    </section>

    <section class="closing"><p class="eyebrow">The question we keep asking</p><blockquote>Would someone be pleased to have discovered this here?</blockquote><a class="button secondary" href="/#discover">Explore BundleBee</a></section>
  </div>
</template>

<style scoped>
.about-page{display:grid;gap:clamp(3rem,7vw,6rem);padding:clamp(1rem,5vw,4rem) 1rem 5rem}.about-hero{max-width:940px}.eyebrow{margin:0;color:var(--bb-primary-dark);font-size:.76rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}h1{margin:.45rem 0 1rem;font-size:clamp(2.8rem,7vw,6rem);line-height:.94;letter-spacing:-.06em}.lead{max-width:760px;color:var(--bb-muted);font-size:1.15rem;line-height:1.7}.button{display:inline-flex;align-items:center;justify-content:center;min-height:46px;margin-top:1rem;padding:.75rem 1rem;border-radius:999px;background:var(--bb-primary-dark);color:#fff;font-weight:800;text-decoration:none}.secondary{background:var(--bb-surface);color:var(--bb-text);border:1px solid var(--bb-border)}.beliefs{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}.beliefs article{padding:1.5rem;border-top:2px solid var(--bb-primary-dark)}.beliefs span{color:var(--bb-primary-dark);font-size:.78rem;font-weight:900}.beliefs h2{margin:.8rem 0 .4rem}.beliefs p,.shop-note p{color:var(--bb-muted);line-height:1.65}.shop-note{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(1.5rem,5vw,4rem);align-items:center;padding:clamp(1.2rem,4vw,3rem);border:1px solid var(--bb-border);border-radius:26px}.shop-note h2{margin:.35rem 0;font-size:clamp(2rem,4.5vw,3.5rem);line-height:1.05}.shop-note a{color:var(--bb-primary-dark);font-weight:800}.abstract-shelves{display:grid;grid-template-columns:1.2fr .8fr;grid-template-rows:1fr 1fr;gap:4px;min-height:420px}.abstract-shelves span{border-radius:18px;background:linear-gradient(150deg,#30523a,#a3cfaa)}.abstract-shelves span:first-child{grid-row:1/-1;background:linear-gradient(155deg,#d9b47e,#75533d)}.abstract-shelves span:last-child{background:linear-gradient(155deg,#eadfcd,#879681)}.closing{max-width:850px;margin:auto;text-align:center}.closing blockquote{margin:1rem 0;font-size:clamp(2rem,5vw,4rem);line-height:1.15;letter-spacing:-.035em}
@media(max-width:800px){.beliefs,.shop-note{grid-template-columns:1fr}.abstract-shelves{min-height:320px}}
@media(max-width:600px){.about-page{padding:.5rem 0 3rem;gap:3rem}h1{font-size:2.8rem}.shop-note{padding:1rem;border-radius:20px}.abstract-shelves{min-height:260px}}
</style>
