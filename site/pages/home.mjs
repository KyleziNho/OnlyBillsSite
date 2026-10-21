import { SITE, esc, art, shot, video, face, facesFor, storeButton, abs, icons } from '../lib.mjs';
import { vsAnchor, vsTable, VS_ROWS } from './vs.mjs';

export const FAQ = [
  ['Do my friends need to download OnlyBills?', 'No. When you share a live table, friends scan the QR code or open the link and claim their items in their browser (or as an App Clip on iPhone). They can pay you from there too. Only the person hosting the bill needs the app.'],
  ['How much does OnlyBills cost?', 'Your first split is free. After that it’s £0.99 a month or £5.99 a year, with a free trial. You can cancel any time in your iPhone’s Settings.'],
  ['How do people pay me back?', 'You add how you’d like to be paid: a Monzo, Starling or Revolut payment link, PayPal, or your bank details. Friends tap to pay their exact share. Monzo links take card, Apple Pay or bank transfer with no Monzo account needed; Starling and Revolut take card or Apple Pay; bank transfer works from any banking app.'],
  ['Does OnlyBills take a cut of the money?', 'No. Payments go straight from your friends to you through your bank or PayPal. OnlyBills never holds your money.'],
  ['What about service charge, tips and discounts?', 'They’re spread across everyone in proportion to what they had, and shared dishes split between the people who shared them. Every share is exact to the penny and they add up to the bill.'],
  ['Can friends with Android phones join?', 'Yes. The live table opens in any modern phone browser, so friends on Android can claim their items and pay. The OnlyBills app itself is for iPhone and iPad.'],
  ['How is OnlyBills different from Splitwise?', 'Both can split a receipt by item. OnlyBills adds Monzo, Starling and Revolut pay links with each friend\u2019s exact share, an App Clip on iPhone and automatic receipt translation. It needs no sign-up at all, and a whole year costs £5.99 against £39.99 for Splitwise Pro.'],
  ['What if the receipt is read wrong?', 'You check every receipt before you share it. OnlyBills shows whether the items add up to the total, and you can edit any line, price or quantity.'],
];

// Questions shown on the page (structured data must match what is visible).
const HOME_FAQ = [0, 1, 2, 5, 6];

export function homePage({ posts, postCard, assetsV, write, layout }) {
  const demo = ['Kyle', 'Sam', 'Alex'];
  const [kyle, sam, alex, priya] = facesFor([...demo, 'Priya']);
  const owed = [['Priya', '£18.40', 'Dishoom, Sat'], ['Jon', '£12.75', 'The Ivy, Fri'], ['Maya', '£31.20', 'Hen do dinner']];
  const owedFaces = facesFor(owed.map((o) => o[0]));

  const body = `
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <a class="chip chip-accent vs-chip" href="/vs/splitwise/"><img src="/assets/img/splitwise-icon.png" width="18" height="18" alt="">85% less than Splitwise Pro ›</a>
      <h1 class="display">Everyone pays for what they had.</h1>
      <p class="lede">Scan the receipt. Friends tap their items on their own phone and pay you back, exact to the penny.</p>
      <div class="btn-row">${storeButton('Download on the', 'hero')}<a class="btn btn-secondary" href="/how-to/">See how it works</a></div>
      <p class="hero-note">${face('Sam', 24, '', sam)}<span>Your first split is free. No sign-up, not even for you.</span></p>
    </div>
    <div class="hero-stage" aria-hidden="true">
      <div class="hero-glow"><picture><source srcset="/assets/img/hero-dark.webp" media="(prefers-color-scheme: dark)"><img src="/assets/img/hero-light.webp" width="1400" height="933" alt="" fetchpriority="high"></picture></div>
      <div class="hero-phones">
        ${shot('guest-01-join', '', 0, true)}
        ${shot('guest-05-live', '', 0, true)}
      </div>
      <div class="notifs" aria-hidden="true">
        <div class="notif" style="--d:900ms"><span class="notif-av">${face('Sam', 38, '', sam)}<img class="notif-badge" src="/assets/img/app-icon-64.png" width="16" height="16" alt=""></span><span class="notif-body"><span class="notif-top"><b>Sam</b><small>now</small></span><span>Paid you <span class="money">£19.01</span> for Saffron House</span></span></div>
        <div class="notif" style="--d:2300ms"><span class="notif-av">${face('Priya', 38, '', priya)}<img class="notif-badge" src="/assets/img/app-icon-64.png" width="16" height="16" alt=""></span><span class="notif-body"><span class="notif-top"><b>Priya</b><small>now</small></span><span>Paid you <span class="money">£16.40</span> for Saffron House</span></span></div>
        <div class="notif" style="--d:3700ms"><span class="notif-av">${face('Alex', 38, '', alex)}<img class="notif-badge" src="/assets/img/app-icon-64.png" width="16" height="16" alt=""></span><span class="notif-body"><span class="notif-top"><b>Alex</b><small>now</small></span><span>Paid you <span class="money">£22.22</span> for Saffron House</span></span></div>
      </div>
      <div class="all-paid" aria-hidden="true" style="--d:5000ms"><span class="all-paid-tick">✓</span>Everyone\u2019s paid you back</div>
    </div>
  </div>
</section>

<section class="section-tight">
  <div class="wrap">
    <div class="stat-strip reveal">
      <div class="card stat-card"><span class="num">38%</span><p>of Brits feel they lose money when the bill is split equally.</p><cite>OpenTable UK survey, 2016</cite></div>
      <div class="card stat-card"><span class="num">80%</span><p>of diners asked in a restaurant study would rather each pay for their own.</p><cite>Gneezy, Haruvy and Yafe, 2004</cite></div>
      <div class="card stat-card"><span class="num">6m 45s</span><p>is how long the average group spends settling a bill.</p><cite>comparethemarket survey, 2021</cite></div>
    </div>
    <p class="foot" style="text-align:center;margin-top:14px"><a href="/tools/overpay-calculator/">How much does splitting equally cost you?</a> · <a href="/blog/splitting-the-bill-equally-cost/">Where these numbers come from</a></p>
  </div>
</section>

<section class="section home-vs" id="splitwise">
  <div class="wrap">
    <div class="section-head reveal">
      <div class="vs-lockup" aria-hidden="true"><picture><source srcset="/assets/img/app-icon-dark-128.png" media="(prefers-color-scheme: dark)"><img class="vs-icon" src="/assets/img/app-icon-128.png" width="56" height="56" alt=""></picture><span>vs</span><img class="vs-icon" src="/assets/img/splitwise-icon.png" width="56" height="56" alt=""></div>
      <h2 class="h2">Using Splitwise?<br>Same dinner, 85% less.</h2>
      <p class="lede">Everything you need for tonight\u2019s bill. None of the sign-ups, ads or £39.99 a year.</p>
    </div>
    <div class="reveal">${vsAnchor()}</div>
    <div class="reveal" style="max-width:900px;margin:40px auto 0">${vsTable([0, 2, 5, 9].map((i) => VS_ROWS[i]))}</div>
    <p style="text-align:center;margin-top:22px"><a class="text-link" href="/vs/splitwise/">See the full comparison</a></p>
  </div>
</section>

<section class="section" id="how">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="eyebrow">How it works</span>
      <h2 class="h2">Three steps. One minute.</h2>
      <p class="lede">Dinners should end with great conversations, not 15 minutes working out the bill.</p>
    </div>
    <div class="hiw reveal" data-hiw>
      <div class="hiw-steps"><button class="hiw-step on" type="button" data-step="scan" aria-pressed="true"><span class="step-n">1</span><span class="hiw-text"><b>Scan the receipt</b><span>OnlyBills reads every line and the service charge, and translates it if the menu isn\u2019t in English.</span></span><span class="hiw-bar"><i></i></span></button><button class="hiw-step" type="button" data-step="live-claims" aria-pressed="false"><span class="step-n">2</span><span class="hiw-text"><b>Friends tick what they had</b><span>They scan your QR code and claim their dishes on their own phone. Shared dishes split between whoever shared them.</span></span><span class="hiw-bar"><i></i></span></button><button class="hiw-step" type="button" data-step="live-paid" aria-pressed="false"><span class="step-n">3</span><span class="hiw-text"><b>Get paid back</b><span>Everyone pays their exact share with Monzo, Starling, Revolut, PayPal or a bank transfer, and you watch them tick off.</span></span><span class="hiw-bar"><i></i></span></button></div>
      <div class="hiw-phone">${video('scan', 'The OnlyBills app: scanning a receipt, friends claiming items, and getting paid', 0, 'data-hiw-video')}</div>
    </div>
    <p style="text-align:center;margin-top:28px"><a class="text-link" href="/how-to/split-a-bill-with-onlybills/">Read the full walkthrough</a></p>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="feature reveal">
      <div class="feature-copy">
        <span class="eyebrow">No app needed</span>
        <h2 class="h2">Your friends just scan and tap.</h2>
        <p class="lede">They open the table in their browser or as an App Clip, add their name and tick their items. Their share adds up as they go.</p>
        <ul class="ticks">
          <li>Works on iPhone and Android, nothing to install</li>
          <li>Everyone sees who’s claimed what, live</li>
          <li>On a new phone? Tap your name to pick up where you left off</li>
        </ul>
        <a class="text-link" href="/split/?demo=2&amp;state=claiming">Try a demo table in your browser</a>
      </div>
      <div class="feature-visual"><div class="phone live-demo" data-live role="img" aria-label="Animated example: friends tick what they had on the live table and Alex\u2019s share adds up to £22.22">
          <div class="ld-screen">
            <div class="ld-status"><b>09:41</b></div>
            <div class="ld-toast" data-at="2000">${face('Priya', 20, '', priya)}Priya joined the table</div>
            <div class="ld-toast" data-at="5800">${face('Sam', 20, '', sam)}Sam paid</div>
            <div class="ld-head"><span class="chip chip-live">Live</span><b>Saffron House</b><small>Hosted by Kyle · 4 at the table</small></div>
            <div class="ld-share"><span class="ld-me">${face('Alex', 30, '', alex)}<span><small>Your share</small><b>Alex</b></span></span><b class="ld-amt" data-amt>£0.00</b><small data-meta>Tap what you had</small></div>
            <div class="ld-list">
              <div class="ld-row" data-at="1400"><span class="tick"></span><span class="row-body"><span class="row-title">House Black Daal</span><span class="row-sub">${face('Kyle', 14, '', kyle)}Kyle</span></span><span class="row-end"><span class="money">£7.90</span></span></div>
              <div class="ld-row" data-at="2600"><span class="tick"></span><span class="row-body"><span class="row-title">Chicken Ruby</span><span class="row-sub">${face('Sam', 14, '', sam)}Sam</span></span><span class="row-end"><span class="money">£14.50</span></span></div>
              <div class="ld-row" data-at="800" data-share="£13.20"><span class="tick"></span><span class="row-body"><span class="row-title">Lamb Raan Bun</span><span class="row-sub">${face('Alex', 14, '', alex)}You</span></span><span class="row-end"><span class="money">£13.20</span></span></div>
              <div class="ld-row" data-at="3400" data-share="£14.80"><span class="tick"></span><span class="row-body"><span class="row-title">Garlic Naan <span class="qty">×2</span></span><span class="row-sub"><span class="faces" style="--size:14px">${face('Kyle', 14, '', kyle)}${face('Sam', 14, '', sam)}${face('Alex', 14, '', alex)}</span>Split 3 ways</span></span><span class="row-end"><span class="money">£4.80</span><span class="you">You £1.60</span></span></div>
              <div class="ld-row" data-at="4200" data-share="£19.75"><span class="tick"></span><span class="row-body"><span class="row-title">Mango Lassi</span><span class="row-sub">${face('Alex', 14, '', alex)}You</span></span><span class="row-end"><span class="money">£4.95</span></span></div>
            </div>
            <div class="ld-cta">Pay Kyle <span data-amt>£0.00</span></div>
          </div>
          <button class="ld-replay" type="button" hidden>Play again</button>
        </div></div>
    </div>

    <div class="feature flip reveal">
      <div class="feature-copy">
        <span class="eyebrow">Fair to the penny</span>
        <h2 class="h2">Shared dishes and service, sorted.</h2>
        <p class="lede">Three people shared the naan? It splits three ways. Service charge follows what you ordered, so the salad doesn’t pay for the steak.</p>
        <ul class="ticks">
          <li>Service, tips and discounts shared in proportion</li>
          <li>Every share adds up to the bill exactly</li>
          <li>Show a full breakdown, line by line</li>
        </ul>
        <a class="text-link" href="/tools/split-bill-calculator/">Try the free calculator</a>
      </div>
      <div class="feature-visual">${shot('host-06-summary', 'Who owes what: each person\u2019s exact share of the bill, with their percentage', 290)}</div>
      </div>
    </div>

    <div class="feature reveal">
      <div class="feature-copy">
        <span class="eyebrow">Get paid</span>
        <h2 class="h2">Paid back before the coats are on.</h2>
        <p class="lede">Friends tap one button to pay their exact share. The money goes straight to you, not through us.</p>
        <div class="group methods" style="width:100%;max-width:440px">
          <div class="row"><img class="method-logo" src="/assets/img/logo-monzo.jpg" width="40" height="40" alt="" loading="lazy"><span class="row-body"><span class="row-title">Monzo</span><span class="row-sub">Card, Apple Pay or bank transfer. No Monzo account needed</span></span></div>
          <div class="row"><img class="method-logo" src="/assets/img/logo-starling.png" width="40" height="40" alt="" loading="lazy"><span class="row-body"><span class="row-title">Starling</span><span class="row-sub">Card or Apple Pay. No Starling account needed</span></span></div>
          <div class="row"><img class="method-logo" src="/assets/img/logo-revolut.png" width="40" height="40" alt="" loading="lazy"><span class="row-body"><span class="row-title">Revolut</span><span class="row-sub">Card or Apple Pay. No Revolut account needed</span></span></div>
          <div class="row"><img class="method-logo" src="/assets/img/logo-paypal.png" width="40" height="40" alt="" loading="lazy"><span class="row-body"><span class="row-title">PayPal</span><span class="row-sub">PayPal account may be needed</span></span></div>
          <div class="row"><span class="method-logo bank">${icons.bank}</span><span class="row-body"><span class="row-title">Bank transfer</span><span class="row-sub">From any banking app</span></span></div>
        </div>
      </div>
      <div class="feature-visual">${shot('guest-03-pay-sheet', 'The pay sheet: pay Kyle £22.22 with Monzo or by bank transfer', 290)}</div>
    </div>

    <div class="feature flip reveal">
      <div class="feature-copy">
        <span class="eyebrow">Owed</span>
        <h2 class="h2">Know who still owes you.</h2>
        <p class="lede">Every bill you host lands in one place, and you can add an IOU for anything else. See who’s paid, chase who hasn’t, and mark it settled when the money arrives.</p>
        <a class="text-link" href="/how-to/track-who-owes-you/">How Owed works</a>
      </div>
      <div class="feature-visual">${video('owed', 'The Owed page: friends\u2019 faces float around what you\u2019re owed, £68.13 across 4 friends', 290)}</div>
      </div>
    </div>
  </div>
</section>

<section class="section" id="pricing">
  <div class="wrap">
    <div class="card pricing reveal">
      <div class="pricing-intro">
        ${art('allclear', 150)}
        <span class="eyebrow">Pricing</span>
        <h2 class="h2">Your first split is free.</h2>
        <p class="lede">After that, about 50p a month. Less than a single round, for a whole year of fair dinners.</p>
      </div>
      <div class="pricing-side">
        <div class="group plans">
          <div class="row plan best"><span class="row-body"><span class="row-title">Yearly <span class="chip chip-live">Best value</span></span><span class="row-sub">£5.99 a year</span></span><span class="plan-price"><b>50p</b><small>/month</small></span></div>
          <div class="row plan"><span class="row-body"><span class="row-title">Monthly</span><span class="row-sub">Billed monthly</span></span><span class="plan-price"><b>99p</b><small>/month</small></span></div>
        </div>
        <ul class="ticks pricing-ticks">
          <li>Split every dinner, drink and night out</li>
          <li>Friends join free, with no app or sign-up</li>
          <li>No ads, ever</li>
          <li>Cancel any time in Settings</li>
        </ul>
        ${storeButton('Download on the', 'pricing')}
      </div>
    </div>
    <p class="foot" style="text-align:center;margin-top:16px">Includes a free trial, then renews automatically until you cancel. <a href="/vs/splitwise/">85% less than Splitwise Pro</a>.</p>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head reveal"><h2 class="h2">Questions</h2></div>
    <div class="faq reveal">${FAQ.filter((_, i) => HOME_FAQ.includes(i)).map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="answer"><p>${esc(a)}</p></div></details>`).join('')}</div>
  </div>
</section>

${posts.length ? `<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">From the blog</span><h2 class="h2">Money, manners and maths.</h2></div>
    <div class="cards home-posts">${posts.slice(0, 3).map((p) => postCard(p)).join('')}</div>
    <p style="text-align:center;margin-top:28px"><a class="text-link" href="/blog/">All articles</a></p>
  </div>
</section>` : ''}

<section class="section-tight">
  <div class="wrap">
    <div class="card closer reveal">
      ${art('paid', 170)}
      <h2 class="h2">Take the maths out of special moments.</h2>
      <p class="lede">Scan, share, get paid. Your first split is on us.</p>
      ${storeButton('Download on the', 'closer')}
    </div>
  </div>
</section>`;

  const schema = [
    {
      '@type': 'MobileApplication',
      name: 'OnlyBills',
      operatingSystem: 'iOS, iPadOS',
      applicationCategory: 'FinanceApplication',
      description: 'Split restaurant bills by what everyone had. Scan the receipt, friends claim their items on their own phone, and everyone pays you back exact to the penny.',
      url: abs('/'),
      downloadUrl: SITE.appStore,
      image: abs('/assets/img/app-icon.png'),
      inLanguage: 'en-GB',
      author: { '@id': SITE.url + '/#org' },
      offers: [
        { '@type': 'Offer', name: 'First split', price: '0', priceCurrency: 'GBP' },
        { '@type': 'Offer', name: 'Monthly', price: '0.99', priceCurrency: 'GBP' },
        { '@type': 'Offer', name: 'Yearly', price: '5.99', priceCurrency: 'GBP' },
      ],
    },
    { '@type': 'FAQPage', mainEntity: FAQ.filter((_, i) => HOME_FAQ.includes(i)).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  write('/', layout({
    path: '/',
    title: 'OnlyBills: split the bill by what everyone had',
    description: 'Scan the receipt, friends tap what they had on their own phone (no app needed) and pay you back by Monzo, Starling, Revolut or PayPal. First split free.',
    body, schema, current: '/', assetsV,
    extraHead: '<link rel="preload" as="image" href="/assets/img/hero-light.webp" media="(prefers-color-scheme: light)">',
  }), { priority: 1.0 });
}
