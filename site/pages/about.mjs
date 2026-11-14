import { SITE, crumbs, crumbsLd, abs, appCta, PERSON_ID } from '../lib.mjs';

export function aboutPage({ write, layout, assetsV }) {
  const trail = [['Home', '/'], ['About', '/about/']];
  const body = `
<section class="section-tight">
  <div class="wrap wrap-prose">
    <header class="article-head">
      ${crumbs(trail)}
      <img class="about-photo" src="/assets/img/maker-avatar.jpg" width="96" height="96" alt="Kyle, who made OnlyBills">
      <h1 class="h1">Hey, I’m Kyle.</h1>
      <p class="lede">I’ve just finished an MSc in Computer Science at the University of Bath and I’m wrapping up a software engineering placement at SharkNinja. I build apps in my spare time to fix problems I keep running into.</p>
    </header>
    <div class="prose">
      <p>I kept ending up at dinners where working out who owed what took ages, and it was always a bit awkward.</p>
      <p>OnlyBills is my attempt to make that part of a group dinner quick and painless. You scan the receipt, friends tick what they had on their own phones (or you tap in who had what yourself), and everyone pays you back in a couple of taps, often with Apple Pay, using whichever way of getting paid is easiest for you.</p>
      <p>I’ve tested it at a lot of real dinners, and since launch, with no marketing, it’s grown to around 1,000 people using it every day.</p>
      <h2>Keeping it free</h2>
      <p>OnlyBills costs me money to run: every receipt scan is read by an AI model that I pay for. I’ve tried to keep the app free and give away as many scans as I can. If you’d like to support it, OnlyBills Pro is £0.99 a month or £5.99 a year (about half the price), and it gives you more scans too.</p>
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
    description: 'OnlyBills is made by Kyle, a University of Bath computer science graduate, so groups can split the bill fairly and get paid back without anyone needing an app.',
    body,
    schema: [crumbsLd(trail), { '@type': 'AboutPage', url: abs('/about/'), mainEntity: { '@id': PERSON_ID } }],
  }), { priority: 0.4 });
}
