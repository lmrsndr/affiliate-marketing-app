<template>
  <div class="partners-page">
    <section class="partner-hero">
      <div>
        <p class="eyebrow">For makers, studios and specialist shops</p>
        <h1>Your products deserve more than another catalogue tile.</h1>
        <p class="lead">BundleBee builds small editorial shop windows around the character of a partner: what they make, why it matters and the moments their work can become part of.</p>
        <a class="button primary" href="#example">See the approach</a>
      </div>
      <div class="window-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
    </section>

    <section class="principles">
      <article><b>01</b><h2>Story before stock</h2><p>We introduce the point of view, craft and human reason to care before presenting a small edit.</p></article>
      <article><b>02</b><h2>Intent before category</h2><p>Customers begin with a person, feeling or occasion—not a wall of near-identical products.</p></article>
      <article><b>03</b><h2>A clear handover</h2><p>The customer buys from the partner. BundleBee uses approved tracked links and makes the affiliate relationship clear.</p></article>
    </section>

    <section id="example" class="demo">
      <header><p class="eyebrow">A generic concept window</p><h2>Imagine a studio making objects for slow Sunday mornings</h2><p>This example uses no partner assets. It shows the structure we prepare privately before a programme approves BundleBee.</p></header>
      <div class="demo-layout">
        <div class="mood-board" aria-label="Abstract concept artwork"><div>quiet colour</div><div>made by hand</div><div>daily ritual</div></div>
        <div class="demo-copy">
          <p class="kicker">Beautifully useful · Small batch</p>
          <h3>A calmer start to the day</h3>
          <p>A concise original introduction would set the scene, followed by three thoughtful routes into the partner’s collection.</p>
          <ul><li><strong>The everyday favourite</strong><span>Recognisable signatures and useful pieces.</span></li><li><strong>The making story</strong><span>Materials, process and the hands behind the work.</span></li><li><strong>A gift that settles in</strong><span>Objects chosen for a new home or a quiet thank you.</span></li></ul>
          <button type="button" disabled>Partner link added after approval</button>
        </div>
      </div>
    </section>

    <section class="process">
      <header><p class="eyebrow">How a partnership begins</p><h2>Prepared with care. Published only with permission.</h2></header>
      <ol><li><span>1</span><div><h3>We review the fit</h3><p>Distinctiveness, giftability, presentation, customer experience and programme terms all matter.</p></div></li><li><span>2</span><div><h3>We prepare a private concept</h3><p>An unlisted, no-index preview demonstrates the proposed story without using unapproved assets or live sales links.</p></div></li><li><span>3</span><div><h3>The partner approves BundleBee</h3><p>Only then do we use supplied or authorised imagery and generate working tracked links.</p></div></li><li><span>4</span><div><h3>We publish a focused window</h3><p>Every page remains curated, fact-checked and clearly disclosed.</p></div></li></ol>
    </section>

    <section class="fit-note"><div><p class="eyebrow">What we do—and do not do</p><h2>Editorial discovery, not discount traffic.</h2></div><p>BundleBee does not bid on partner brand terms, publish unofficial voucher codes, copy a retailer catalogue or disguise affiliate links. We favour original, factual writing and a smaller number of relevant recommendations.</p><router-link to="/editorial-standards">Read our editorial standards</router-link></section>
  </div>
</template>

<style scoped>
.partners-page{display:grid;gap:clamp(3rem,7vw,6rem);padding:1rem 1rem 5rem}.partner-hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr);gap:2rem;align-items:center;padding:clamp(2rem,6vw,5rem);border:1px solid var(--bb-border);border-radius:28px;background:linear-gradient(135deg,var(--bb-surface),color-mix(in srgb,var(--bb-primary-light) 13%,var(--bb-surface)))}h1{max-width:830px;margin:.45rem 0 1rem;font-size:clamp(2.6rem,6.8vw,5.6rem);line-height:.96;letter-spacing:-.055em}.lead{max-width:720px;color:var(--bb-muted);font-size:1.12rem;line-height:1.7}.eyebrow{margin:0;color:var(--bb-primary-dark);font-size:.76rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.button{display:inline-flex;min-height:46px;align-items:center;margin-top:1rem;padding:.75rem 1rem;border-radius:999px;text-decoration:none;font-weight:800}.primary{background:var(--bb-primary-dark);color:#fff}.window-mark{display:grid;grid-template-columns:1.3fr .7fr;grid-template-rows:1fr 1fr;gap:.45rem;aspect-ratio:1;transform:rotate(2deg)}.window-mark span{display:block;border:1px solid color-mix(in srgb,var(--bb-primary-dark) 35%,var(--bb-border));border-radius:22px;background:linear-gradient(145deg,color-mix(in srgb,var(--bb-primary-dark) 65%,#15311d),color-mix(in srgb,var(--bb-primary-light) 25%,var(--bb-bg)))}.window-mark span:first-child{grid-row:1/-1}.window-mark span:nth-child(2){background:linear-gradient(145deg,#f4cf69,#b37739)}.window-mark span:nth-child(3){background:linear-gradient(145deg,#e8ddd0,#966f5a)}.window-mark span:nth-child(4){display:none}.principles{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}.principles article{padding:1.5rem;border-top:2px solid var(--bb-primary-dark)}.principles b{color:var(--bb-primary-dark)}.principles h2{margin:.8rem 0 .4rem}.principles p,.demo header>p,.process p,.fit-note>p{color:var(--bb-muted);line-height:1.65}.demo{padding:clamp(1.2rem,4vw,3rem);border:1px solid var(--bb-border);border-radius:26px}.demo>header{max-width:730px}.demo h2,.process h2,.fit-note h2{margin:.35rem 0;font-size:clamp(2rem,4vw,3.3rem);line-height:1.05}.demo-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);margin-top:2rem;overflow:hidden;border:1px solid var(--bb-border);border-radius:22px}.mood-board{display:grid;grid-template-columns:1.2fr .8fr;grid-template-rows:1fr 1fr;gap:3px;min-height:480px;background:var(--bb-border)}.mood-board div{display:flex;align-items:flex-end;padding:1rem;background:linear-gradient(145deg,#213f2c,#8ec99a);color:white;font-size:.78rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.mood-board div:first-child{grid-row:1/-1;background:linear-gradient(160deg,#d7b07b,#805a3d)}.mood-board div:last-child{background:linear-gradient(160deg,#efe4cf,#849a87);color:#172019}.demo-copy{display:flex;flex-direction:column;justify-content:center;padding:clamp(1.3rem,3vw,2.6rem)}.kicker{color:var(--bb-primary-dark);font-size:.75rem;font-weight:900;text-transform:uppercase}.demo-copy h3{margin:.25rem 0;font-size:2.2rem}.demo-copy>p{color:var(--bb-muted);line-height:1.6}.demo-copy ul{display:grid;gap:.7rem;padding:0;list-style:none}.demo-copy li{display:grid;gap:.2rem;padding:.65rem 0;border-bottom:1px solid var(--bb-border)}.demo-copy li span{color:var(--bb-muted);font-size:.9rem}.demo-copy button{min-height:46px;margin-top:.8rem;border:1px solid var(--bb-border);border-radius:999px;background:var(--bb-bg);color:var(--bb-muted);font-weight:800}.process>header{max-width:760px}.process ol{display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:0;list-style:none}.process li{display:flex;gap:1rem;padding:1.2rem;border:1px solid var(--bb-border);border-radius:18px}.process li>span{display:grid;place-items:center;flex:0 0 2.2rem;height:2.2rem;border-radius:50%;background:var(--bb-primary-dark);color:#fff;font-weight:900}.process h3{margin:.2rem 0}.process li p{margin:.4rem 0}.fit-note{display:grid;grid-template-columns:1fr 1.2fr auto;gap:1.5rem;align-items:center;padding:1.5rem;border-radius:20px;background:color-mix(in srgb,var(--bb-accent) 19%,var(--bb-surface));border:1px solid color-mix(in srgb,var(--bb-accent) 55%,var(--bb-border))}.fit-note h2{font-size:1.8rem}.fit-note a{color:var(--bb-primary-dark);font-weight:800;white-space:nowrap}
@media(max-width:850px){.partner-hero,.demo-layout,.fit-note{grid-template-columns:1fr}.window-mark{max-width:360px}.principles{grid-template-columns:1fr}.mood-board{min-height:340px}.process ol{grid-template-columns:1fr}}
@media(max-width:600px){.partners-page{padding:.25rem 0 3rem;gap:2.7rem}.partner-hero{padding:1.2rem;border-radius:20px}h1{font-size:2.65rem}.lead{font-size:1rem}.demo{padding:1rem;border-radius:20px}.demo-layout{margin-top:1.2rem}.mood-board{min-height:280px}.demo-copy{padding:1.1rem}.demo-copy h3{font-size:1.8rem}.process li{padding:1rem}.fit-note{padding:1.1rem}}
</style>

