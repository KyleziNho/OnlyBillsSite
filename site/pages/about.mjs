import { SITE, crumbs, crumbsLd, abs, appCta, PERSON_ID } from '../lib.mjs';

export function aboutPage({ write, layout, assetsV }) {
  const trail = [['Home', '/'], ['About', '/about/']];
  const body = `
<section class="section-tight">
  <div class="wrap wrap-prose">
    <header class="article-head">
      ${crumbs(trail)}
      <img class="about-photo" src="/assets/img/maker-avatar.jpg" width="96" height="96" alt="Kyle, who made OnlyBills">
      <h1 class="h1">Hi, I’m Kyle.</h1>
      <p class="lede">I study computer science at the University of Bath, and I make OnlyBills on my own.</p>
    </header>
    <div class="prose">
      <p>I kept ending up at dinners where one person paid and someone worked out the split on their phone afterwards. Splitting it evenly was quicker, but it never felt quite right when people had ordered very different things.</p>
      <p>OnlyBills is my answer to that. You scan the receipt, friends tick what they had on their own phones, and everyone pays back what they owe, including their share of shared dishes and service.</p>
      <h2>What I care about</h2>
      <ul class="values">
        <li><strong>Your friends shouldn’t need an app.</strong> Only the person who paid needs OnlyBills. Everyone else joins from a link or QR code.</li>
        <li><strong>Exact money.</strong> Every share is worked out to the penny, so the total always matches the receipt.</li>
        <li><strong>Your money goes straight to you.</strong> Friends pay you with your own payment app or bank. OnlyBills never holds it.</li>
        <li><strong>Privacy.</strong> Your receipt history stays on your phone. The details are in the <a href="/privacy/">privacy policy</a>.</li>
      </ul>
      <h2>Say hello</h2>
      <p>I read every message. If something’s broken, confusing, or you have an idea, email me at <a href="mailto:${SITE.email}">${SITE.email}</a> or find me on <a href="${SITE.linkedin}" rel="noopener">LinkedIn</a>.</p>
    </div>
    ${appCta('Next dinner, try it', 'Scan the receipt, share one QR code, get paid back. Free, with no sign-up.', 'about')}
  </div>
</section>`;
  write('/about/', layout({
    path: '/about/', title: 'About OnlyBills and Kyle, who made it', assetsV,
    description: 'OnlyBills is made in the UK by Kyle, a computer science student at the University of Bath, so groups can split the bill fairly without anyone needing an app.',
    body,
    schema: [crumbsLd(trail), { '@type': 'AboutPage', url: abs('/about/'), mainEntity: { '@id': PERSON_ID } }],
  }), { priority: 0.4 });
}
