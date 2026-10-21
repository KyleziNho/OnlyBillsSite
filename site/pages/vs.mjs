// OnlyBills vs Splitwise at /vs/splitwise/. Built on decision psychology: show the high
// price first (anchor), say the saving as one number (85%), make the effort visible
// (what you have to think about in each app), remove risk (free first split, no account).
// Every ✗ against Splitwise must stay true. Checked Oct 2026: splitwise.com/pro,
// kb.splitwise.com, UK App Store (Pro £3.99/month, £39.99/year).
import { SITE, esc, art, shot, abs, crumbs, crumbsLd, storeButton } from '../lib.mjs';

const OB_ICON = (s) => `<picture><source srcset="/assets/img/app-icon-dark-128.png" media="(prefers-color-scheme: dark)"><img class="vs-icon" src="/assets/img/app-icon-128.png" width="${s}" height="${s}" alt="OnlyBills"></picture>`;
const SW_ICON = (s) => `<img class="vs-icon" src="/assets/img/splitwise-icon.png" width="${s}" height="${s}" alt="Splitwise">`;
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

// What's on your mind at the table. Each Splitwise line is a real step or limit.
const THEIR_THOUGHTS = [
  'Has everyone got an account?',
  'Which group does this go in?',
  'Have I used today’s 4 free expenses?',
  'How is Sam actually paying me?',
  'Do I need Pro for this?',
];

export const VS_FAQ = [
  ['Doesn’t Splitwise do this now?', 'Splitwise added receipt splitting in October 2026. But you still need a Splitwise account, UK friends settle through Pay by Bank or cash, there’s no receipt translation, and Pro costs £39.99 a year. OnlyBills needs no account, gets you paid straight to your bank tonight and costs £5.99 a year.'],
  ['How much cheaper is OnlyBills?', '85% cheaper over a year. OnlyBills is £5.99 a year (or £0.99 a month). Splitwise Pro is £39.99 a year (or £3.99 a month) on the UK App Store. Your first split is free.'],
  ['Do my friends need an account or the app?', 'No. They scan your QR code, type their name and tick what they had, in their browser or as an App Clip on iPhone. You don’t make an account either.'],
  ['How do friends pay me?', 'With a Monzo, Starling, Revolut or PayPal link that already has their exact share in it, or by bank transfer. Monzo links take card, Apple Pay or bank transfer, no Monzo account needed. The money goes straight to you.'],
  ['Can I use both?', 'Plenty of people do. Splitwise for the flat’s rent and bills, OnlyBills for dinners and nights out, where everyone had something different.'],
];

export const vsAnchor = () => `
    <div class="card vs-anchor" aria-label="Price per year: Splitwise Pro £39.99, OnlyBills £5.99. Save 85%.">
      <div class="vs-anchor-side them">
        <div class="vs-anchor-name">${SW_ICON(36)}Splitwise Pro</div>
        <div class="vs-anchor-price"><s>£39.99</s></div>
        <span class="quiet">a year</span>
      </div>
      <div class="vs-anchor-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>
      <div class="vs-anchor-side us">
        <div class="vs-anchor-name">${OB_ICON(36)}OnlyBills</div>
        <div class="vs-anchor-price">£5.99</div>
        <span class="quiet">a year</span>
      </div>
      <div class="vs-save-badge">Save 85%</div>
    </div>
`;
export const vsMinds = () => `
    <div class="vs-minds">
      <div class="card vs-mind them reveal">
        <div class="vs-mind-head">${SW_ICON(32)}<b>With Splitwise</b></div>
        <ul class="vs-bubbles">${THEIR_THOUGHTS.map((t, i) => `<li style="--i:${i}">${esc(t)}</li>`).join('')}</ul>
      </div>
      <div class="card vs-mind us reveal">
        <div class="vs-mind-head">${OB_ICON(32)}<b>With OnlyBills</b></div>
        <ul class="vs-bubbles"><li class="one">Who had what?</li></ul>
        <p class="vs-thats-it">That’s it. Everyone taps their own, and pays you.</p>
      </div>
    </div>`;
export const vsTable = (rows) => `
    <div class="card vs-table reveal" role="table" aria-label="OnlyBills compared with Splitwise">
      <div class="vs-row vs-headrow" role="row"><span role="columnheader"><span class="visually-hidden">Feature</span></span><span role="columnheader" class="vs-col-us">${OB_ICON(28)}OnlyBills</span><span role="columnheader" class="vs-col-them">${SW_ICON(28)}Splitwise</span></div>
      ${rows.map(([f, a, b]) => `<div class="vs-row" role="row"><span role="rowheader">${esc(f)}</span><span role="cell" class="vs-col-us">${a}</span><span role="cell">${b}</span></div>`).join('')}
    </div>`;
export { ROWS as VS_ROWS };

export function vsPage({ write, layout, assetsV, ogFor }) {
  const path = '/vs/splitwise/';
  const trail = [['Home', '/'], ['OnlyBills vs Splitwise', path]];
  const reassure = '<ul class="vs-reassure"><li>First split free</li><li>No account</li><li>Nothing to cancel</li></ul>';
  const body = `
<section class="vs-top">
  <div class="wrap">
    <div class="vs-hero">
      <div class="vs-lockup" aria-hidden="true">${OB_ICON(72)}<span>vs</span>${SW_ICON(72)}</div>
      <h1 class="display vs-h1">Same dinner.<br>85% less.</h1>
      <p class="lede">Everything you need to split the bill. None of the sign-ups, ads or £39.99 a year.</p>
      <div class="btn-row" style="justify-content:center">${storeButton('Download on the', 'vs-hero')}</div>
      ${reassure}
    </div>

    ${vsAnchor()}
    <p class="vs-anchor-note">That’s £34 back every year. Roughly six pints, or the next round.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head reveal">
      <h2 class="h2">Less to think about.</h2>
      <p class="lede">At the end of a good dinner, the bill should be one thought, not five.</p>
    </div>
    ${vsMinds()}
  </div>
</section>

<section class="section" id="compare" style="padding-top:0">
  <div class="wrap" style="max-width:calc(900px + 2 * var(--gutter))">
    <div class="section-head reveal"><h2 class="h2">Side by side.</h2></div>
    ${vsTable(ROWS)}
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="vs-shows">
      <figure class="vs-show reveal">${shot('guest-03-pay-sheet', 'A friend paying their exact share with Monzo', 250)}<figcaption><b>Paid tonight.</b> Their exact share, straight to your bank.</figcaption></figure>
      <figure class="vs-show reveal">${shot('guest-01-join', 'Joining a table: add your name and tap what you had', 250)}<figcaption><b>Nobody signs up.</b> Scan, type a name, tap what you had.</figcaption></figure>
      <figure class="vs-show reveal">${shot('host-07-owed', 'The Owed page with friends’ faces around £68.13 owed', 250)}<figcaption><b>Still keeps the tab.</b> Every bill and IOU, in one place.</figcaption></figure>
    </div>
  </div>
</section>

<section class="section-tight">
  <div class="wrap">
    <div class="card vs-try reveal">
      <div>
        <h2 class="h2" style="font-size:clamp(28px,4vw,40px)">Try it on your next dinner.</h2>
        <p class="lede">If it doesn’t make the end of the night easier, you’ve lost nothing.</p>
        ${reassure}
      </div>
      ${storeButton('Download on the', 'vs-try')}
    </div>
    <p class="vs-lane reveal">Keep Splitwise for the flat’s rent and bills. Use OnlyBills for the nights out.</p>
  </div>
</section>

<section class="section" style="padding-top:24px">
  <div class="wrap">
    <div class="section-head reveal"><h2 class="h2">Questions</h2></div>
    <div class="faq reveal">${VS_FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="answer"><p>${esc(a)}</p></div></details>`).join('')}</div>
    <p class="foot" style="text-align:center;margin-top:24px">Splitwise features from splitwise.com and its help centre; prices from the UK App Store, October 2026. Splitwise is a trademark of Splitwise, Inc., shown for comparison only. Comparing more apps? See <a href="/blog/splitwise-alternatives/">the best Splitwise alternatives</a>.</p>
  </div>
</section>

<section class="section-tight">
  <div class="wrap">
    <div class="card closer reveal">
      ${art('paid', 160)}
      <h2 class="h2">Take the maths out of special moments.</h2>
      <p class="lede">Dinners should end with great conversations, not 15 minutes working out the bill.</p>
      ${storeButton('Download on the', 'vs-closer')}
    </div>
  </div>
</section>`;
  write(path, layout({
    path, assetsV, current: '/vs/splitwise/',
    title: 'OnlyBills vs Splitwise: same dinner, 85% less',
    description: 'OnlyBills vs Splitwise: no sign-up, Monzo, Starling and Revolut pay links, automatic receipt translation, and 85% cheaper than Splitwise Pro at £5.99 a year.',
    ogImage: ogFor('vs-splitwise'),
    body,
    schema: [crumbsLd(trail), { '@type': 'WebPage', name: 'OnlyBills vs Splitwise', url: abs(path), inLanguage: 'en-GB', dateModified: '2026-10-21' },
      { '@type': 'FAQPage', mainEntity: VS_FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }],
  }), { priority: 0.9, lastmod: '2026-10-21' });
}
