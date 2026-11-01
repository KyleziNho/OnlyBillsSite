import { SITE, esc, shot, face, facesFor, storeButton, appLd } from '../lib.mjs';

export const FAQ = [
  ['Do my friends need to download OnlyBills?', 'No. When you share a live table, friends scan the QR code or open the link and claim their items in their browser (or as an App Clip on iPhone). They can pay you from there too. Only the person hosting the bill needs the app.'],
  ['How much does OnlyBills cost?', 'It’s free. There’s no sign-up, no ads and no trial to cancel, and friends who join your table never pay anything. Receipt scanning has a fair-use limit of 30 scans in 30 days, and manual entry is always unlimited. OnlyBills Pro, optional, gives higher scan limits and supports the app. Nothing is locked behind it.'],
  ['How do people pay me back?', 'You add how you’d like to be paid: a Monzo, Starling or Revolut payment link, PayPal, or your bank details. Friends tap to pay their exact share. Monzo links take card, Apple Pay or bank transfer with no Monzo account needed; Starling and Revolut take card or Apple Pay; bank transfer works from any banking app.'],
  ['Does OnlyBills take a cut of the money?', 'No. Payments go straight from your friends to you through your bank or PayPal. OnlyBills never holds your money.'],
  ['What about service charge, tips and discounts?', 'They’re spread across everyone in proportion to what they had, and shared dishes split between the people who shared them. Every share is exact to the penny and they add up to the bill.'],
  ['Can friends with Android phones join?', 'Yes. The live table opens in any modern phone browser, so friends on Android can claim their items and pay. The OnlyBills app itself is for iPhone and iPad.'],
  ['How is OnlyBills different from Splitwise?', 'Both can split a receipt by item. OnlyBills adds Monzo, Starling and Revolut pay links with each friend’s exact share, an App Clip on iPhone and automatic receipt translation. It needs no sign-up at all, and it’s free, where Splitwise Pro is £39.99 a year.'],
  ['What if the receipt is read wrong?', 'You check every receipt before you share it. OnlyBills shows whether the items add up to the total, and you can edit any line, price or quantity.'],
];

// Questions shown on the page (structured data must match what is visible).
const HOME_FAQ = [0, 1, 2, 3, 5, 6];

/* The hero film: the App Store preview with its captions cropped off. The captions are HTML
   here, timed to the film (seconds), so they're readable, translatable and selectable. */
const FILM = [
  ['Snap the receipt', 0, 3.9],
  ['Share one QR. No app needed.', 3.9, 6.633],
  ['Everyone taps what they had', 6.633, 12.133],
  ['Get paid straight back', 12.133, 16.833],
  ['See who owes you', 16.833, 20],
];

/* After dinner, before OnlyBills: an illustrative group chat (not testimonials). The host
   ("you") drops the table link, and the chat goes quiet while people pay. */
const AWKWARD = [
  { who: 'Sam', text: 'right what do we all owe' },
  { who: 'Priya', text: 'I only had the daal and a lassi btw' },
  { who: 'Jon', text: 'just split it 5 ways?' },
  { who: 'Priya', text: 'I’m not paying for Jon’s three beers 😭' },
  { who: 'Alex', text: 'who’s got the receipt' },
  { sent: true, link: ['Saffron House · Tap what you had', 'onlybills.app'] },
  { sent: true, text: 'tap what you had, it does the maths' },
  { who: 'Jon', text: 'oh that’s actually clever' },
];
const PAID = [['Priya', '£16.40'], ['Sam', '£19.01'], ['Alex', '£22.22']];

/* Real feedback from people who use OnlyBills, the same lines (and names) as the app's
   welcome chat (SplitSwift PaywallMessages.welcomeChat, confirmed real by the founder,
   lightly paraphrased). Never add made-up quotes here. */
const QUOTES = [
  ['Priya', ['finally got paid back for dinner', 'without asking twice 🙏']],
  ['Dan', ['avoided the awkward convo of how we were splitting the bill']],
  ['Sophie', ['the QR thing is so good', 'nobody needed the app']],
  ['Ella', ['SO EASY..', 'you can use apple pay instead of having to type in bank details 😍']],
  ['Nina', ['now i always offer to pay so i can collect those amex points🤑🤑']],
  ['Josh', ['used it at our christmas dinner with 9 of us and it worked great']],
  ['Leah', ['best app I’ve downloaded this year honestly ❤️']],
];

/** One received or sent bubble run, iMessage style. */
function bubbles(list, faces, { animated = true } = {}) {
  let out = '';
  list.forEach((m, i) => {
    const prev = list[i - 1];
    const next = list[i + 1];
    const startsRun = !prev || prev.who !== m.who || prev.sent !== m.sent;
    const endsRun = !next || next.who !== m.who || next.sent !== m.sent;
    const typing = m.sent ? 0 : Math.min(1300, 450 + (m.text || '').length * 18);
    const attrs = animated ? ` data-msg data-typing="${typing}"` : '';
    if (m.sent) {
      const body = m.link
        ? `<div class="bub-link"><div class="bub-link-art" aria-hidden="true"><img src="/assets/art/claim.webp" width="480" height="480" alt="" loading="lazy" decoding="async"></div><div class="bub-link-bar"><b>${esc(m.link[0])}</b><span>${esc(m.link[1])}</span></div></div>`
        : `<p class="bub">${esc(m.text)}</p>`;
      out += `<div class="msg sent${startsRun ? ' run' : ''}${endsRun ? ' tail' : ''}"${attrs}>${body}</div>`;
    } else {
      out += `<div class="msg recv${startsRun ? ' run' : ''}${endsRun ? ' tail' : ''}"${attrs}${animated ? ` data-who="${esc(m.who)}"` : ''}>${startsRun ? `<span class="msg-name">${esc(m.who)}</span>` : ''}<span class="msg-row">${endsRun ? face(m.who, 28, '', faces[m.who]) : '<span class="msg-gap"></span>'}<p class="bub">${esc(m.text)}</p></span></div>`;
    }
  });
  return out;
}

export function homePage({ posts, assetsV, write, layout }) {
  const people = ['Kyle', 'Sam', 'Alex', 'Priya', 'Jon'];
  const pf = Object.fromEntries(people.map((n, i) => [n, facesFor(people)[i]]));
  const quoteNames = QUOTES.map((q) => q[0]);
  const qf = Object.fromEntries(quoteNames.map((n, i) => [n, facesFor(quoteNames)[i]]));
  const quoteLines = QUOTES.flatMap(([who, lines]) => lines.map((text) => ({ who, text })));

  const film = FILM.map(([cap, a, b], i) => `<li data-start="${a}" data-end="${b}"${i === 0 ? ' class="on"' : ''}>${esc(cap)}</li>`).join('');

  const body = `
<section class="hero2">
  <div class="wrap hero2-grid">
    <div class="hero2-copy">
      <h1 class="display">Everyone pays for what they had.</h1>
      <p class="lede">Scan the receipt and share one QR code. Friends tap their items on their own phone and pay you back, exact to the penny.</p>
      <div class="btn-row">${storeButton('Download on the', 'hero')}<a class="text-link" href="/split/?demo=2&amp;state=claiming">Try a demo table</a></div>
      <p class="hero2-note"><span class="faces" style="--size:26px">${['Sam', 'Priya', 'Alex'].map((n) => face(n, 26, '', pf[n])).join('')}</span><span>Free on iPhone. No sign-up, and no app for your friends.</span></p>
    </div>
    <figure class="stage" data-film>
      <ol class="stage-caps" aria-hidden="true">${film}</ol>
      <div class="stage-video">
        <video muted playsinline loop preload="metadata" poster="/assets/video/preview-phone-poster.jpg" aria-label="OnlyBills in action: snap the receipt, share one QR code, friends tap what they had, get paid back, see who owes you">
          <source src="/assets/video/preview-phone.webm" type="video/webm">
          <source src="/assets/video/preview-phone.mp4" type="video/mp4">
        </video>
      </div>
      <div class="stage-dots" role="group" aria-label="Jump to a part of the film">${FILM.map(([cap], i) => `<button type="button" aria-label="${esc(cap)}"${i === 0 ? ' aria-current="true"' : ''}><i></i></button>`).join('')}</div>
      <button class="stage-pause" type="button" aria-label="Pause the film" data-pause><span></span></button>
    </figure>
  </div>
</section>

<section class="section awk" id="why">
  <div class="wrap awk-grid">
    <div class="awk-copy reveal">
      <span class="eyebrow">Sound familiar?</span>
      <h2 class="h2">The bill lands. The group chat starts.</h2>
      <p class="lede">Who had what, who didn’t drink, who’s covering the service. Send one link instead, and everyone pays their own share before the coats are on.</p>
      <p class="awk-stat"><b class="num">38%</b><span>of Brits feel they lose money when the bill is split equally. <a href="/blog/splitting-the-bill-equally-cost/">OpenTable, 2016</a></span></p>
    </div>
    <div class="chat-card" data-chat aria-label="An example group chat after dinner. Friends argue about splitting the bill until the host shares an OnlyBills link, and then everyone pays.">
      <div class="chat-head" aria-hidden="true"><span class="faces" style="--size:30px">${['Sam', 'Priya', 'Jon', 'Alex'].map((n) => face(n, 30, '', pf[n])).join('')}</span><b>Saturday dinner</b><small>Sam, Priya, Jon, Alex and you</small></div>
      <div class="chat-notifs" aria-hidden="true">${PAID.map(([n, amt]) => `<div class="notif2" data-notif>${face(n, 34, '', pf[n])}<span><b>${n} paid you <span class="money">${amt}</span></b><small>Saffron House</small></span></div>`).join('')}</div>
      <div class="chat-body" aria-hidden="true">${bubbles(AWKWARD, pf)}<div class="msg recv typing" data-typing-row hidden><span class="msg-row"><span class="msg-gap"></span><p class="bub dots"><i></i><i></i><i></i></p></span></div></div>
      <button class="chat-replay" type="button" hidden aria-label="Play the chat again"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button>
    </div>
  </div>
</section>

<section class="section steps2" id="how">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="eyebrow">How it works</span>
      <h2 class="h2">Three steps. About a minute.</h2>
    </div>
    <ol class="steps2-grid">
      <li class="step2 reveal"><div class="step2-shot">${shot('host-02-camera-framing', 'The camera finding a receipt on the table', 0)}</div><div class="step2-text"><span class="step2-n">1</span><h3>Snap the receipt</h3><p>OnlyBills reads every line and the service charge, and translates it if it isn’t in English. Check it, fix anything, done.</p></div></li>
      <li class="step2 reveal"><div class="step2-shot">${shot('host-05-live-table', 'A live table with a QR code for friends to scan', 0)}</div><div class="step2-text"><span class="step2-n">2</span><h3>Share one QR code</h3><p>Choose “Everyone taps their own”. Friends scan it and tick what they had, in their browser or the App Clip.</p></div></li>
      <li class="step2 reveal"><div class="step2-shot">${shot('guest-04-paid', 'A friend’s screen after paying their £22.22 share', 0)}</div><div class="step2-text"><span class="step2-n">3</span><h3>Get paid back</h3><p>Everyone pays their exact share straight to you, by Monzo, Starling, Revolut, PayPal or bank transfer.</p></div></li>
    </ol>
  </div>
</section>

<section class="section bento-sec">
  <div class="wrap">
    <div class="section-head reveal"><h2 class="h2">Made for the end of the meal.</h2></div>
    <div class="bento">
      <article class="tile tile-wide tile-guest reveal">
        <div class="tile-text">
          <h3>Your friends don’t need the app.</h3>
          <p>They open the table in their browser or the App Clip, add their name and tap what they had. iPhone or Android, no account.</p>
          <a class="text-link" href="/split/?demo=2&amp;state=claiming">Try a demo table</a>
        </div>
        <div class="tile-shot">${shot('guest-01-join', 'Joining a table: Who are you?', 0)}</div>
      </article>
      <article class="tile tile-fair reveal">
        <div class="tile-text">
          <h3>Fair to the penny.</h3>
          <p>Shared dishes split between whoever shared them. Service follows what you ordered.</p>
        </div>
        <div class="mini-bill" aria-label="Example: Alex’s share is £22.22, including a third of a shared garlic naan">
          <div class="mini-row"><span>Lamb Raan Bun</span><span class="money">£13.20</span></div>
          <div class="mini-row"><span>Garlic Naan <span class="faces" style="--size:18px">${['Kyle', 'Sam', 'Alex'].map((n) => face(n, 18, '', pf[n])).join('')}</span></span><span class="money">£1.60</span></div>
          <div class="mini-row"><span>Mango Lassi</span><span class="money">£4.95</span></div>
          <div class="mini-row quiet"><span>Service, in proportion</span><span class="money">£2.47</span></div>
          <div class="mini-total"><span>Alex’s share</span><b class="money">£22.22</b></div>
        </div>
      </article>
      <article class="tile tile-paid reveal">
        <div class="tile-text">
          <h3>Paid back tonight.</h3>
          <p>Their exact amount is filled in. The money goes straight to you, never through us.</p>
        </div>
        <ul class="pay-list" aria-label="Ways friends can pay you">
          <li><img src="/assets/img/logo-monzo.jpg" width="36" height="36" alt="" loading="lazy"><span><b>Monzo</b><small>Card, Apple Pay or bank transfer</small></span></li>
          <li><img src="/assets/img/logo-starling.png" width="36" height="36" alt="" loading="lazy"><span><b>Starling</b><small>Card or Apple Pay</small></span></li>
          <li><img src="/assets/img/logo-revolut.png" width="36" height="36" alt="" loading="lazy"><span><b>Revolut</b><small>Card or Apple Pay</small></span></li>
          <li><img src="/assets/img/logo-paypal.png" width="36" height="36" alt="" loading="lazy"><span><b>PayPal or bank transfer</b><small>From any banking app</small></span></li>
        </ul>
      </article>
      <article class="tile tile-wide tile-owed reveal">
        <div class="tile-text">
          <h3>Know who still owes you.</h3>
          <p>Every bill you host lands in one place, and you can add an IOU for anything else. See who’s paid and nudge who hasn’t.</p>
          <a class="text-link" href="/how-to/track-who-owes-you/">How Owed works</a>
        </div>
        <div class="tile-shot">${shot('host-07-owed', 'The Owed page: friends’ faces float around £68.13 you’re owed', 0)}</div>
      </article>
      <article class="tile tile-full tile-lang reveal">
        <div class="tile-text">
          <h3>On holiday? It speaks the menu.</h3>
          <p>Turn on Translate to English in Settings, and items on a receipt in another language come out in English.</p>
        </div>
        <div class="xlate" aria-label="Example: Pollo alla griglia becomes Grilled chicken, Acqua frizzante becomes Sparkling water">
          <div class="xl-row"><s>Pollo alla griglia</s><span>Grilled chicken</span><span class="money">€16.00</span></div>
          <div class="xl-row"><s>Acqua frizzante</s><span>Sparkling water</span><span class="money">€3.50</span></div>
          <div class="xl-row"><s>Coperto ×4</s><span>Cover charge ×4</span><span class="money">€8.00</span></div>
        </div>
      </article>
    </div>
  </div>
</section>

<section class="section quotes-sec">
  <div class="wrap quotes-grid">
    <div class="quotes-copy reveal">
      <span class="eyebrow">From the group chat</span>
      <h2 class="h2">What people say after dinner.</h2>
      <p class="lede">Real messages from people who split with OnlyBills.</p>
    </div>
    <div class="quote-thread" data-chat data-chat-speed="0.75" aria-label="Messages from OnlyBills users">
      <div class="chat-body">${bubbles(quoteLines, qf)}<div class="msg sent run tail" data-msg data-typing="0"><p class="bub">ok I’m in. next dinner we’re using this</p></div></div>
      <ul class="visually-hidden">${QUOTES.map(([who, lines]) => `<li>${esc(who)}: ${esc(lines.join(' '))}</li>`).join('')}</ul>
    </div>
  </div>
</section>

<section class="section free-sec" id="pricing">
  <div class="wrap free-grid">
    <div class="free-copy reveal">
      <span class="eyebrow">Pricing</span>
      <h2 class="h2">Free. For you and your friends.</h2>
      <p class="lede">No sign-up, no ads and no trial to cancel. Friends never pay a thing.</p>
    </div>
    <div class="free-side reveal">
      <div class="group free-list">
        <div class="row"><span class="row-body"><span class="row-title">Live tables, pay links and Owed</span></span><span class="row-end"><b>Free</b></span></div>
        <div class="row"><span class="row-body"><span class="row-title">Manual entry</span><span class="row-sub">Type a bill in yourself</span></span><span class="row-end"><b>Unlimited</b></span></div>
        <div class="row"><span class="row-body"><span class="row-title">Receipt scans</span><span class="row-sub">A fair-use limit</span></span><span class="row-end"><b><span class="money">30</span> in <span class="money">30</span> days</b></span></div>
        <div class="row"><span class="row-body"><span class="row-title">OnlyBills Pro</span><span class="row-sub">Optional, monthly or yearly</span></span><span class="row-end"><b>Higher scan limits</b></span></div>
      </div>
      <p class="foot">Pro supports the app and locks nothing. The app shows the price, and that it renews until you cancel, before you pay. <a href="/how-to/first-run-and-pricing/">How pricing works</a></p>
      <a class="vs-strip" href="/vs/splitwise/"><span><b>Coming from Splitwise?</b><small>Splitwise Pro is <span class="money">£39.99</span> a year. OnlyBills is free, with no sign-up.</small></span><span class="chev" aria-hidden="true">›</span></a>
    </div>
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
    <div class="post-list reveal">${posts.slice(0, 4).map((p) => `<a class="post-line" href="${p.path}"><span class="post-line-cat">${esc(p.category || 'Article')}</span><b>${esc(p.title)}</b><span class="chev" aria-hidden="true">›</span></a>`).join('')}</div>
    <p style="text-align:center;margin-top:28px"><a class="text-link" href="/blog/">All articles</a></p>
  </div>
</section>` : ''}

<section class="closer2">
  <div class="closer2-media" aria-hidden="true">
    <video muted playsinline loop preload="none" data-lazy-loop poster="/assets/video/orbit-wide-poster.jpg" data-src-wide="/assets/video/orbit-wide" data-src-narrow="/assets/video/orbit-square"></video>
  </div>
  <div class="wrap closer2-copy">
    <h2 class="h2">Next dinner, try it.</h2>
    <p class="lede">Scan, share one QR code, get paid back. Free, with no sign-up.</p>
    ${storeButton('Download on the', 'closer')}
  </div>
</section>`;

  const schema = [
    appLd(), // structure lives in lib.mjs (one free offer, shared with /vs/)
    { '@type': 'FAQPage', mainEntity: FAQ.filter((_, i) => HOME_FAQ.includes(i)).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  write('/', layout({
    path: '/',
    title: 'OnlyBills: split the bill by what everyone had',
    description: 'Scan the receipt, friends tap what they had on their own phone (no app needed) and pay you back by Monzo, Starling, Revolut or PayPal. Free, no sign-up.',
    body, schema, current: '/', assetsV,
    extraHead: '<link rel="preload" as="image" href="/assets/video/preview-phone-poster.jpg">',
  }), { priority: 1.0 });
}
