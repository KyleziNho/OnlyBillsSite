import { SITE, art, crumbs, crumbsLd, abs, storeButton, PERSON_ID } from '../lib.mjs';

export function aboutPage({ write, layout, assetsV }) {
  const trail = [['Home', '/'], ['About', '/about/']];
  const body = `
<section class="section-tight">
  <div class="wrap wrap-prose">
    <header class="article-head">
      ${crumbs(trail)}
      <img src="/assets/img/maker-avatar.jpg" width="96" height="96" alt="Kyle, who made OnlyBills" style="width:96px;height:96px;border-radius:50%;object-fit:cover">
      <h1 class="h1">Hi, I’m Kyle.</h1>
      <p class="lede">I’m a computer science student at the University of Bath, and I built OnlyBills on my own.</p>
    </header>
    <div class="prose">
      <p>It started the way it does for most people: a long table, one receipt, and someone doing sums on their phone while everyone else puts their coats on. The people who’d had a salad and a lemonade paid the same as the people who’d had three cocktails, and nobody wanted to be the one to say anything.</p>
      <p>So I made the thing I wanted at the end of those dinners. You scan the receipt, your friends tick what they had on their own phones, and everyone pays you back the right amount. Shared dishes and service charge are handled properly, and the pennies add up.</p>
      <h2>What I care about</h2>
      <ul>
        <li><strong>Your friends shouldn’t need an app.</strong> Only the person who paid needs OnlyBills. Everyone else joins from a link or QR code.</li>
        <li><strong>Exact money.</strong> Every share is worked out to the penny, so the total always matches the receipt.</li>
        <li><strong>Your money goes straight to you.</strong> Friends pay you through your own bank or PayPal. OnlyBills never holds it.</li>
        <li><strong>Privacy.</strong> Your receipt history stays on your phone. The details are in the <a href="/privacy/">privacy policy</a>.</li>
      </ul>
      <h2>Say hello</h2>
      <p>I read every message. If something’s broken, confusing, or you have an idea, email me at <a href="mailto:${SITE.email}">${SITE.email}</a> or find me on <a href="${SITE.linkedin}" rel="noopener">LinkedIn</a>.</p>
      <div style="margin-top:32px">${storeButton('Download on the', 'about')}</div>
    </div>
  </div>
</section>`;
  write('/about/', layout({
    path: '/about/', title: 'About OnlyBills and Kyle, who made it', assetsV,
    description: 'OnlyBills is made in the UK by Kyle, a computer science student at the University of Bath, so groups can split the bill fairly without anyone needing an app.',
    body,
    schema: [crumbsLd(trail), { '@type': 'AboutPage', url: abs('/about/'), mainEntity: { '@id': PERSON_ID } }],
  }), { priority: 0.4 });
}
