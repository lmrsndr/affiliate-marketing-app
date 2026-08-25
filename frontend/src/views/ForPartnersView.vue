<template>
  <div class="partners-page">
    <section class="partner-hero">
      <div><p class="eyebrow">For makers, artists and specialist shops</p><h1>A thoughtful home for remarkable work.</h1><p class="lead">BundleBee helps people discover gifts with character—beautifully made things, original ideas and specialist collections that deserve more than a passing glance.</p></div>
    </section>

    <section class="welcome"><p class="eyebrow">Why BundleBee</p><div><h2>We make room for the story.</h2><p>Our visitors are looking for something thoughtful, distinctive or difficult to find elsewhere. We introduce the character behind a collection and present a small, considered edit in BundleBee’s own warm, restrained voice.</p></div></section>

    <section class="qualities">
      <article><span>01</span><h2>The right context</h2><p>Your work sits alongside other memorable finds, organised around people, feelings and occasions.</p></article>
      <article><span>02</span><h2>Careful representation</h2><p>We favour original writing, accurate details and a presentation that respects the character of each partner.</p></article>
      <article><span>03</span><h2>A direct relationship</h2><p>Customers complete their purchase with you, so you retain the service, fulfilment and brand experience.</p></article>
    </section>

    <section class="good-fit"><div><p class="eyebrow">A natural fit</p><h2>Work people are pleased to have found.</h2><p>BundleBee is especially interested in independent makers, artist-led collections, skilled craft, small-batch work, thoughtful personalisation, enduring design and specialist shops with a clear point of view.</p></div><ul><li>Beautifully made</li><li>Meaningful or personal</li><li>Unexpected</li><li>Useful with character</li><li>Worth telling someone about</li></ul></section>

    <section class="working-together"><header><p class="eyebrow">Working together</p><h2>Simple, considered and collaborative.</h2></header><div><article><b>1</b><h3>We get to know the work</h3><p>We look at the collection, its story and where it could belong within BundleBee.</p></article><article><b>2</b><h3>We agree the presentation</h3><p>You can review how your world is introduced before anything appears in the shop.</p></article><article><b>3</b><h3>We welcome customers in</h3><p>Once everything is ready, the window becomes part of the BundleBee experience.</p></article></div></section>

    <section class="closing"><p class="eyebrow">A final thought</p><blockquote>If your work has a story and makes a gift feel more personal, we would like to discover it.</blockquote></section>
  </div>
</template>

<style scoped>
.partners-page{display:grid;gap:clamp(3rem,7vw,6rem);padding:1rem 1rem 5rem}.partner-hero{padding:clamp(2rem,6vw,5rem);border:1px solid var(--bb-border);border-radius:28px;background:linear-gradient(135deg,var(--bb-surface),color-mix(in srgb,var(--bb-primary-light) 12%,var(--bb-surface)))}.eyebrow{margin:0;color:var(--bb-primary-dark);font-size:.76rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}h1{max-width:800px;margin:.45rem 0 1rem;font-size:clamp(2.8rem,7vw,5.8rem);line-height:.95;letter-spacing:-.06em}.lead{max-width:690px;color:var(--bb-muted);font-size:1.15rem;line-height:1.7}.welcome{display:grid;grid-template-columns:.55fr 1.45fr;gap:2rem;padding-top:1.5rem;border-top:1px solid var(--bb-border)}.welcome h2,.good-fit h2,.working-together h2{margin:.35rem 0;font-size:clamp(2rem,4.5vw,3.5rem);line-height:1.05}.welcome p,.qualities p,.good-fit p,.working-together p{color:var(--bb-muted);line-height:1.65}.welcome>div{max-width:760px}.qualities{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}.qualities article{padding:1.4rem;border-top:2px solid var(--bb-primary-dark)}.qualities span{color:var(--bb-primary-dark);font-size:.78rem;font-weight:900}.qualities h2{margin:.8rem 0 .4rem;font-size:1.4rem}.good-fit{display:grid;grid-template-columns:1.15fr .85fr;gap:2rem;align-items:center;padding:clamp(1.3rem,4vw,3rem);border:1px solid var(--bb-border);border-radius:24px}.good-fit ul{display:grid;gap:.6rem;margin:0;padding:0;list-style:none}.good-fit li{padding:.75rem 1rem;border:1px solid var(--bb-border);border-radius:999px;background:var(--bb-bg);font-weight:800}.working-together>div{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:1.5rem}.working-together article{padding:1.2rem;border:1px solid var(--bb-border);border-radius:18px}.working-together b{display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:var(--bb-primary-dark);color:#fff}.working-together h3{margin:.8rem 0 .4rem}.closing{max-width:850px;margin:auto;text-align:center}.closing blockquote{margin:1rem 0;font-size:clamp(1.8rem,4.5vw,3.5rem);line-height:1.25;letter-spacing:-.03em}
@media(max-width:820px){.welcome,.good-fit{grid-template-columns:1fr}.qualities,.working-together>div{grid-template-columns:1fr}}
@media(max-width:600px){.partners-page{padding:.25rem 0 3rem;gap:3rem}.partner-hero{padding:1.2rem;border-radius:20px}h1{font-size:2.8rem}.lead{font-size:1rem}.good-fit{padding:1rem;border-radius:20px}}
</style>
