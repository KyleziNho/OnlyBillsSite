// OnlyBills vs Splitwise: a designed, sales-led comparison page at /vs/splitwise/.
// Every ✗ against Splitwise must stay true. Facts checked Oct 2026: scratchpad research +
// splitwise.com/pro, kb.splitwise.com, UK App Store (Pro £3.99/month, £39.99/year).
import { SITE, esc, art, shot, abs, crumbs, crumbsLd, storeButton, icons, face, facesFor } from '../lib.mjs';

const YES = '<span class="vs-mark yes"><span aria-hidden="true">✓</span><span class="visually-hidden">Yes</span></span>';
const NO = '<span class="vs-mark no"><span aria-hidden="true">✗</span><span class="visually-hidden">No</span></span>';
const txt = (t) => `<span class="vs-txt">${t}</span>`;

const ROWS = [
  ['No sign-up for anyone, host included', YES, NO],
  ['Friends claim their items from a QR code, no app needed', YES, YES],
  ['Pay links for Monzo, Starling and Revolut, exact amount filled in', YES, NO],
  ['Friends can pay you by card or Apple Pay', YES, NO],
  ['PayPal for UK friends', YES, txt('US only')],
  ['Automatically translates receipts into English', YES, NO],
  ['Built for UK service charge', YES, txt('Tax and tip')],
  ['Running balances and IOUs across bills', YES, YES],
  ['Shares exact to the penny', YES, YES],
  ['No ads', YES, txt('Pro only')],
  ['Price', txt('<b>£5.99 a year</b><br>or £0.99 a month'), txt('Pro: <b>£39.99 a year</b><br>or £3.99 a month')],
];

const SWITCH = [
  ['You need an account. So does everyone you split with.', 'Nobody signs up. Not you, not your friends. Open the app and scan.'],
  ['UK friends settle up later through Pay by Bank, or in cash.', 'Friends tap one button and pay you tonight, straight to your Monzo, Starling or Revolut. Card and Apple Pay work too.'],
  ['Ads and upgrade prompts on the free plan.', 'No ads. Ever.'],
  ['Pro costs £39.99 a year.', '£5.99 a year. That’s £34 back in your pocket, or about six more pints.'],
];

const EXTRAS = [
  ['Live table', 'Everyone ticks their items at once and you watch it fill up. “Sam joined the table.”'],
  ['Split what’s left evenly', 'Nobody owning up to the poppadoms? One tap shares whatever’s left.'],
  ['Friends without phones', 'Add them by name and tick their items for them.'],
  ['Smart receipt reading', 'Knows VAT included from VAT added, and handles vouchers, happy hour and cover charges.'],
  ['Works abroad', 'Reads around 50 currencies and translates the receipt for you.'],
  ['The restaurant, automatically', 'Venue name and photo are added for you, so your history looks like a memory, not a spreadsheet.'],
  ['New phone? No problem', 'Friends tap their name to pick up exactly where they left off.'],
  ['Payments stay open', 'Friends can still pay you for 7 days after the table closes. Then OnlyBills reminds you who hasn’t.'],
];

export const VS_FAQ = [
  ['Doesn’t Splitwise do this now?', 'Splitwise added receipt splitting in October 2026, and it’s a good step. But you still need a Splitwise account, UK friends settle through Pay by Bank or cash, there’s no receipt translation, and Pro costs £39.99 a year. OnlyBills needs no account, gets you paid straight to your bank tonight and costs £5.99 a year.'],
  ['Is OnlyBills cheaper than Splitwise Pro?', 'Yes, nearly 7 times cheaper. OnlyBills is £5.99 a year or £0.99 a month. Splitwise Pro is £39.99 a year or £3.99 a month on the UK App Store, so a whole year of OnlyBills costs less than two months of Pro. Your first split is free.'],
  ['Do my friends need an account or the app?', 'No. Friends scan your QR code or open your link, type their name and tick what they had, in their browser or as an App Clip on iPhone. Only the person who paid needs OnlyBills, and even they don’t make an account.'],
  ['Can I use OnlyBills and Splitwise together?', 'Plenty of people do. Splitwise for the flat’s rent and bills, OnlyBills for dinners and nights out, where everyone had something different.'],
  ['How do friends pay me?', 'With a Monzo, Starling, Revolut or PayPal link that already has their exact share in it, or by bank transfer. Monzo links take card, Apple Pay or bank transfer with no Monzo account needed. The money goes straight to you.'],
];

export function vsPage({ write, layout, assetsV, ogFor }) {
  const path = '/vs/splitwise/';
  const trail = [['Home', '/'], ['OnlyBills vs Splitwise', path]];
  const [sam, priya, jon] = facesFor(['Sam', 'Priya', 'Jon']);
  const body = `
<section class="hero vs-hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      ${crumbs(trail)}
      <span class="chip chip-accent">OnlyBills vs Splitwise</span>
      <h1 class="display" style="font-size:clamp(40px,6.4vw,68px)">Splitwise is for flatmates. OnlyBills is for tonight.</h1>
      <p class="lede">Scan the bill, show the QR, and get paid before the dessert menu arrives. No sign-up, no ads, and nearly 7x cheaper than Splitwise Pro.</p>
      <div class="btn-row">${storeButton('Download on the', 'vs-hero')}<a class="btn btn-secondary" href="#compare">See the comparison</a></div>
    </div>
    <div class="vs-price" aria-label="Price per year: OnlyBills £5.99, Splitwise Pro £39.99">
      <div class="card vs-price-card us">
        <div class="vs-price-head"><picture><source srcset="/assets/img/app-icon-dark-128.png" media="(prefers-color-scheme: dark)"><img src="/assets/img/app-icon-128.png" width="44" height="44" alt=""></picture><b>OnlyBills</b><span class="chip chip-live" style="height:24px">Best value</span></div>
        <div class="vs-big">£5.99</div><span class="quiet">a year, about 50p a month</span>
        <div class="vs-bar"><i style="width:15%"></i></div>
      </div>
      <div class="card vs-price-card them">
        <div class="vs-price-head"><span class="vs-logo">S</span><b>Splitwise Pro</b></div>
        <div class="vs-big">£39.99</div><span class="quiet">a year</span>
        <div class="vs-bar"><i style="width:100%"></i></div>
      </div>
      <p class="vs-save"><b>Save £34 a year.</b> A whole year of OnlyBills costs less than two months of Splitwise Pro.</p>
    </div>
  </div>
</section>

<section class="section-tight">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">Why people switch</span><h2 class="h2">Less admin. More dinner.</h2></div>
    <div class="vs-switch">
      ${SWITCH.map(([pain, fix]) => `<div class="card vs-pair reveal"><p class="vs-pain">${esc(pain)}</p><p class="vs-fix">${esc(fix)}</p></div>`).join('')}
    </div>
  </div>
</section>

<section class="section" id="compare">
  <div class="wrap" style="max-width:calc(900px + 2 * var(--gutter))">
    <div class="section-head reveal"><span class="eyebrow">Side by side</span><h2 class="h2">Built for the bill in front of you.</h2></div>
    <div class="card vs-table reveal" role="table" aria-label="OnlyBills compared with Splitwise">
      <div class="vs-row vs-headrow" role="row"><span role="columnheader"><span class="visually-hidden">Feature</span></span><span role="columnheader" class="vs-col-us"><picture><source srcset="/assets/img/app-icon-dark-64.png" media="(prefers-color-scheme: dark)"><img src="/assets/img/app-icon-64.png" width="28" height="28" alt=""></picture>OnlyBills</span><span role="columnheader">Splitwise</span></div>
      ${ROWS.map(([f, a, b]) => `<div class="vs-row" role="row"><span role="rowheader">${esc(f)}</span><span role="cell" class="vs-col-us">${a}</span><span role="cell">${b}</span></div>`).join('')}
    </div>
    <p class="foot" style="text-align:center;margin-top:14px">Splitwise features from splitwise.com and its help centre; prices from the UK App Store. Checked October 2026.</p>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="feature reveal">
      <div class="feature-copy">
        <span class="eyebrow">Get paid tonight</span>
        <h2 class="h2">Not tracked. Paid.</h2>
        <p class="lede">Splitwise keeps a note of who owes you. OnlyBills gets the money moving: every friend gets a pay link with their exact share already filled in.</p>
        <ul class="ticks"><li>Monzo, Starling, Revolut, PayPal or bank transfer</li><li>Friends pay by card or Apple Pay, no bank app needed</li><li>The money goes straight to you, never through us</li></ul>
      </div>
      <div class="feature-visual">${shot('guest-03-pay-sheet', 'A friend paying their exact share with Monzo', 290)}</div>
    </div>
    <div class="feature flip reveal">
      <div class="feature-copy">
        <span class="eyebrow">No sign-up</span>
        <h2 class="h2">Nobody makes an account. Nobody.</h2>
        <p class="lede">Not you, not your friends. They scan the QR, type their name and tick what they had. On iPhone it opens as an App Clip, on any other phone in the browser.</p>
        <p class="hero-note"><span class="faces" style="--size:28px">${face('Sam', 28, '', sam)}${face('Priya', 28, '', priya)}${face('Jon', 28, '', jon)}</span><span>Everyone joins from the same QR code.</span></p>
      </div>
      <div class="feature-visual">${shot('guest-01-join', 'Joining a table: add your name and tap what you had', 290)}</div>
    </div>
    <div class="feature reveal">
      <div class="feature-copy">
        <span class="eyebrow">Owed</span>
        <h2 class="h2">Still keeps the tab running.</h2>
        <p class="lede">Every bill you host, plus IOUs for anything else, in one place. Your friends float round what you’re owed until you mark them settled.</p>
      </div>
      <div class="feature-visual">${shot('host-07-owed', 'The Owed page with friends’ faces around £68.13 owed', 290)}</div>
    </div>
  </div>
</section>

<section class="section-tight">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">And the little things</span><h2 class="h2">Made for real nights out.</h2></div>
    <div class="vs-extras">${EXTRAS.map(([t, d]) => `<div class="card vs-extra reveal"><h3>${esc(t)}</h3><p class="quiet">${esc(d)}</p></div>`).join('')}</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">Switch in 30 seconds</span><h2 class="h2">Your next dinner is the test.</h2></div>
    <div class="steps">
      <div class="card step reveal">${art('camera', 130)}<span class="step-n">1</span><h3 class="h3">Download OnlyBills</h3><p class="quiet">No account, no forms. Your first split is free.</p></div>
      <div class="card step reveal">${art('scan', 130)}<span class="step-n">2</span><h3 class="h3">Scan tonight’s bill</h3><p class="quiet">Every dish and the service charge, read for you and checked to the penny.</p></div>
      <div class="card step reveal">${art('pass', 130)}<span class="step-n">3</span><h3 class="h3">Show the QR</h3><p class="quiet">Friends tick what they had and pay you before the coats are on.</p></div>
    </div>
    <div class="card vs-lane reveal"><b>Keep Splitwise for the flat.</b> Rent, broadband and the weekly shop are what it’s built for. For dinners, drinks and nights out, where everyone had something different, use OnlyBills.</div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head reveal"><h2 class="h2">Questions</h2></div>
    <div class="faq reveal">${VS_FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="answer"><p>${esc(a)}</p></div></details>`).join('')}</div>
    <p style="text-align:center;margin-top:24px" class="foot">Comparing more apps? See <a href="/blog/splitwise-alternatives/">the best Splitwise alternatives</a>.</p>
  </div>
</section>

<section class="section-tight">
  <div class="wrap">
    <div class="card closer reveal">
      ${art('paid', 170)}
      <h2 class="h2">Take the maths out of special moments.</h2>
      <p class="lede">Dinners should end with great conversations, not 15 minutes working out the bill.</p>
      ${storeButton('Download on the', 'vs-closer')}
    </div>
  </div>
</section>`;
  write(path, layout({
    path, assetsV, current: '/vs/splitwise/',
    title: 'OnlyBills vs Splitwise: the Splitwise alternative for dinners',
    description: 'OnlyBills vs Splitwise: no sign-up, Monzo, Starling and Revolut pay links, automatic receipt translation, and nearly 7x cheaper than Splitwise Pro at £5.99 a year.',
    ogImage: ogFor('vs-splitwise'),
    body,
    schema: [crumbsLd(trail), { '@type': 'WebPage', name: 'OnlyBills vs Splitwise', url: abs(path), inLanguage: 'en-GB', dateModified: '2026-10-21' },
      { '@type': 'FAQPage', mainEntity: VS_FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }],
  }), { priority: 0.9, lastmod: '2026-10-21' });
}
