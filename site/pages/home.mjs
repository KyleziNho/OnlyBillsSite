import { SITE, esc, shot, face, facesFor, storeButton, appLd, noticeBlock } from '../lib.mjs';

export const FAQ = [
  ['Do my friends need to download OnlyBills?', 'No. When you share a live table, friends scan the QR code or open the link and claim their items in their browser (or as an App Clip on iPhone). They can pay you from there too. Only the person hosting the bill needs the app.'],
  ['How much does OnlyBills cost?', 'It’s free. There’s no sign-up, no ads and no trial to cancel, and friends who join your table never pay anything. Receipt scanning has a fair-use limit of 30 scans in 30 days, and manual entry is always unlimited. OnlyBills Pro, optional, gives higher scan limits and supports the app. Nothing is locked behind it.'],
  ['How do people pay me back?', 'You add how you’d like to be paid, and OnlyBills suggests the usual ways in your country. In the UK that’s a Monzo, Starling or Revolut link, PayPal or your bank details: a Monzo link takes card, Apple Pay or bank transfer with no Monzo account needed. Elsewhere it might be Venmo, Bizum, Pix, Swish or an IBAN. Each friend sees their exact share next to every option.'],
  ['Does OnlyBills take a cut of the money?', 'No. Payments go straight from your friends to you through their bank or payment app. OnlyBills never holds your money.'],
  ['What about service charge, tips and discounts?', 'They’re spread across everyone in proportion to what they had, and shared dishes split between the people who shared them. Every share is exact to the penny and they add up to the bill.'],
  ['Can friends with Android phones join?', 'Yes. The live table opens in any modern phone browser, so friends on Android can claim their items and pay. The OnlyBills app itself is for iPhone and iPad.'],
  ['How is OnlyBills different from Splitwise?', 'Both can split a receipt by item. OnlyBills adds pay links and copy-ready details with each friend’s exact share (Monzo in the UK, Venmo in the US, Bizum in Spain, Pix in Brazil), an App Clip on iPhone and automatic receipt translation. It needs no sign-up at all, and it’s free, where Splitwise Pro is £39.99 a year.'],
  ['What if the receipt is read wrong?', 'You check every receipt before you share it. OnlyBills shows whether the items add up to the total, and you can edit any line, price or quantity.'],
];

// Questions shown on the page (structured data must match what is visible).
const HOME_FAQ = [0, 1, 2, 3, 5, 6];

/** The same questions for /us/: dollars, US ways to pay, no UK-only prices. */
const FAQ_US = [
  ['Do my friends need to download OnlyBills?', 'No. When you share a live table, friends scan the QR code or open the link and claim their items in their browser (or as an App Clip on iPhone). They can pay you from there too. Only the person hosting the check needs the app.'],
  FAQ[1],
  ['How do people pay me back?', 'You add how you like to get paid: Venmo, Cash App, Zelle, PayPal or your bank details. Each friend sees their exact share, tax and tip included. Venmo and Cash App open your profile and ask them to enter the amount (they need an account); for Zelle they copy your number and the amount into their own bank app.'],
  ['Does OnlyBills take a cut of the money?', 'No. Payments go straight from your friends to you through Venmo, Cash App, Zelle or their bank. OnlyBills never holds your money.'],
  ['Can friends with Android phones join?', 'Yes. The live table opens in any modern phone browser, so friends on Android can claim their items and pay. The OnlyBills app itself is for iPhone and iPad.'],
  ['How is OnlyBills different from Splitwise?', 'Both can split a receipt by item. OnlyBills shows each friend their exact share next to your Venmo, Cash App or Zelle, works without the app through an App Clip or the browser, and translates receipts. It needs no sign-up at all, and it’s free, where Splitwise Pro is a paid upgrade.'],
];

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
const PAID = [['Priya', '16.40'], ['Sam', '19.01'], ['Alex', '22.22']];

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

/**
 * The two English home pages: `/` (en-GB, pounds, the App Store film) and `/us/` (en-US,
 * dollars, Venmo / Cash App / Zelle as text). Third-party names are text only, never logos.
 */
const PAY_ROWS_UK = [
  ['In the UK', 'Monzo, Starling, Revolut, PayPal or bank transfer'],
  ['In the US', 'Venmo, Cash App or PayPal'],
  ['In Europe', 'Bizum, MB WAY, Swish, Tikkie, IBAN and more'],
  ['In Brazil', 'Pix, with the amount already in the code'],
];
export const HOME_LOCALES = [
  {
    path: '/', lang: 'en-GB', currency: 'GBP', demo: '/split/?demo=2&amp;state=claiming', twin: '/us/', faq: FAQ.filter((_, i) => HOME_FAQ.includes(i)), notices: [],
    title: 'OnlyBills: split the bill by what everyone had',
    description: 'Scan the receipt, friends tap what they had on their own phone (no app needed) and pay you back by Monzo, Venmo, Bizum, Pix and more. Free, no sign-up.',
    h1: 'Everyone pays for what they had.',
    lede: 'Scan the receipt and share one QR code. Friends tap their items on their own phone and pay you back, exact to the penny.',
    stat: '<p class="awk-stat"><b class="num">38%</b><span>of Brits feel they lose money when the bill is split equally. <a href="/blog/splitting-the-bill-equally-cost/">OpenTable, 2016</a></span></p>',
    awkLede: 'Who had what, who didn’t drink, who’s covering the service. Send one link instead, and everyone pays their own share before the coats are on.',
    paid: PAID, money: (x) => '£' + x,
    steps: [
      ['host-02-camera-framing', 'The camera finding a receipt on the table', 'Snap the receipt', 'OnlyBills reads every line and the service charge, and translates it if it isn’t in English. Check it, fix anything, done.'],
      ['host-05-live-table', 'A live table with a QR code for friends to scan', 'Share one QR code', 'Choose “Everyone taps their own”. Friends scan it and tick what they had, in their browser or the App Clip.'],
      ['appclip-journey-6-ive-paid', 'A friend’s screen after paying their £22.22 share: Marked as paid, Leo will see it', 'Get paid back', 'Everyone pays their exact share straight to you, the way they already pay friends: Monzo or bank transfer in the UK, Venmo in the US, Bizum in Spain, Pix in Brazil and more.'],
    ],
    guestShot: ['guest-01-join', 'Joining a table: Who are you?'],
    bill: [['Lamb Raan Bun', '13.20'], ['Garlic Naan', '1.60', true], ['Mango Lassi', '4.95'], ['Service, in proportion', '2.47', false, true]],
    billLabel: 'Example: Alex’s share is £22.22, including a third of a shared garlic naan', total: '22.22',
    fairText: 'Shared dishes split between whoever shared them. Service follows what you ordered.',
    paidText: 'Each friend sees their exact amount next to the way you get paid. The money goes straight to you, never through us.',
    payRows: PAY_ROWS_UK,
    owedTile: ['Know who still owes you.', 'Every bill you host lands in one place, and you can add an IOU for anything else. See who’s paid and nudge who hasn’t.', '/how-to/track-who-owes-you/', 'How Owed works', 'host-07-owed', 'The Owed page: friends’ faces float around £68.13 you’re owed'],
    langTile: ['On holiday? It speaks the menu.', 'Turn on Translate to English in Settings, and items on a receipt in another language come out in English. Friends can pay you back in pounds, at a rate fixed when you share the table.'],
    settle: ['THB 888.75', '£20.29'],
    vs: 'Splitwise Pro is <span class="money">£39.99</span> a year. OnlyBills is free, with no sign-up.',
    blogHead: 'Money, manners and maths.',
    postFilter: (p) => p.lang !== 'en-US',
  },
  {
    path: '/us/', lang: 'en-US', currency: 'USD', demo: '/split/?demo=2&amp;state=pay-us', twin: '/', faq: FAQ_US, notices: ['payments', 'zelle'],
    title: 'OnlyBills: split the check by what everyone had',
    description: 'Scan the receipt, friends tap what they had on their own phone (no app needed) and pay you back on Venmo, Cash App or Zelle. Free, no sign-up.',
    h1: 'Everyone pays for what they had.',
    lede: 'Scan the check and share one QR code. Friends tap their items on their own phone, tax and tip included, and pay you back to the cent.',
    stat: '',
    awkLede: 'Who had what, who didn’t drink, who’s covering the tip. Send one link instead, and everyone pays their own share before the coats are on.',
    paid: [['Priya', '16.40'], ['Sam', '19.01'], ['Alex', '25.30']], money: (x) => '$' + x,
    still: ['guest-pay-us-venmo-zelle', 'An OnlyBills pay sheet: Venmo first with the exact amount, Zelle below with the number to copy.', 'Your share, and how to pay it'],
    steps: [
      ['host-review-us-check', 'OnlyBills reading a US check', 'Snap the check', 'OnlyBills reads every line, the tax and the tip, and checks they add up to the total. Fix anything, done.'],
      ['host-live-table-us', 'Share one QR and everyone taps what they had.', 'Share one QR code', 'Choose “Everyone taps their own”. Friends scan it and tick what they had, in their browser or the App Clip.'],
      ['guest-pay-us-venmo-zelle', 'An OnlyBills pay sheet: Venmo first with the exact amount, Zelle below with the number to copy.', 'Get paid back', 'Each friend sees their exact share next to your Venmo, Cash App or Zelle, and pays you from their own app or bank.'],
    ],
    guestShot: ['guest-claiming-us', 'Friends tick what they had on their own phone and see their share in dollars.'],
    bill: [['Lamb Keema Bun', '13.20'], ['Garlic Naan', '1.60', true], ['Mango Lassi', '4.95'], ['Tax, in proportion', '1.67', false, true], ['Tip, in proportion', '3.88', false, true]],
    billLabel: 'Example: Alex’s share is $25.30, including a third of a shared garlic naan and their part of the tax and tip', total: '25.30',
    fairText: 'Shared dishes split between whoever shared them. Tax and tip follow what you ordered.',
    paidText: 'Each friend sees their exact amount next to the way you get paid. The money goes straight to you, never through us.',
    payRows: [
      ['Venmo', 'Opens your Venmo. They enter the amount shown'],
      ['Cash App', 'Opens your $cashtag. They enter the amount shown'],
      ['Zelle', 'They copy your number and the amount into their bank app'],
      ['PayPal or bank details', 'For anyone who uses neither'],
    ],
    owedTile: ['Set it up once.', 'Add your Venmo, Cash App or Zelle, and friends see them every time you split. Venmo and Cash App need an account; Zelle works from any bank app that has it.', '/how-to/get-paid-back-outside-the-uk/', 'How getting paid works', 'host-payout-pick-us', 'Choosing how friends pay you in the US: Venmo, Cash App or Zelle.'],
    langTile: ['Traveling? It speaks the menu.', 'Turn on Translate to English in Settings, and items on a receipt in another language come out in English. Friends can pay you back in dollars, at a rate fixed when you share the table.'],
    settle: null,
    vs: 'Splitwise Pro is a paid upgrade. OnlyBills is free, with no sign-up.',
    blogHead: 'Money, manners and math.',
    postFilter: (p) => p.lang === 'en-US',
  },
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

export function homePage({ posts, assetsV, write, layout }, L = HOME_LOCALES[0]) {
  const uk = L.lang === 'en-GB';
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
      <h1 class="display">${esc(L.h1)}</h1>
      <p class="lede">${esc(L.lede)}</p>
      <div class="btn-row">${storeButton('Download on the', 'hero')}<a class="text-link" href="${L.demo}">Try a demo table</a></div>
      <p class="hero2-note"><span class="faces" style="--size:26px">${['Sam', 'Priya', 'Alex'].map((n) => face(n, 26, '', pf[n])).join('')}</span><span>Free on iPhone. No sign-up, and no app for your friends.</span></p>
    </div>
    ${L.still ? `<figure class="stage stage-still">
      <p class="stage-still-cap">${esc(L.still[2])}</p>
      ${shot(L.still[0], L.still[1], 0, true)}
    </figure>` : `<figure class="stage" data-film>
      <ol class="stage-caps" aria-hidden="true">${film}</ol>
      <div class="stage-video">
        <video muted playsinline loop preload="metadata" poster="/assets/video/preview-phone-poster.webp" aria-label="OnlyBills in action: snap the receipt, share one QR code, friends tap what they had, get paid back, see who owes you">
          <source src="/assets/video/preview-phone.webm" type="video/webm">
          <source src="/assets/video/preview-phone.mp4" type="video/mp4">
        </video>
      </div>
      <div class="stage-dots" role="group" aria-label="Jump to a part of the film">${FILM.map(([cap], i) => `<button type="button" aria-label="${esc(cap)}"${i === 0 ? ' aria-current="true"' : ''}><i></i></button>`).join('')}</div>
      <button class="stage-pause" type="button" aria-label="Pause the film" data-pause><span></span></button>
    </figure>`}
  </div>
</section>

<section class="section awk" id="why">
  <div class="wrap awk-grid">
    <div class="awk-copy reveal">
      <span class="eyebrow">Sound familiar?</span>
      <h2 class="h2">The bill lands. The group chat starts.</h2>
      <p class="lede">${esc(L.awkLede)}</p>
      ${L.stat}
    </div>
    <div class="chat-card" data-chat role="group" aria-label="Example group chat after dinner">
      <p class="visually-hidden">Sam, Priya, Jon and Alex argue about how to split the bill. You share an OnlyBills link, “Saffron House, tap what you had”, and Priya, Sam and Alex pay you their exact shares.</p>
      <div class="chat-head" aria-hidden="true"><span class="faces" style="--size:30px">${['Sam', 'Priya', 'Jon', 'Alex'].map((n) => face(n, 30, '', pf[n])).join('')}</span><b>Saturday dinner</b><small>Sam, Priya, Jon, Alex and you</small></div>
      <div class="chat-notifs" aria-hidden="true">${L.paid.map(([n, amt]) => `<div class="notif2" data-notif>${face(n, 34, '', pf[n])}<span><b>${n} paid you <span class="money">${L.money(amt)}</span></b><small>Saffron House</small></span></div>`).join('')}</div>
      <div class="chat-body" aria-hidden="true">${bubbles(L.lang === 'en-US' ? AWKWARD.map((m) => (m.text === 'tap what you had, it does the maths' ? { ...m, text: 'tap what you had, it does the math' } : m)) : AWKWARD, pf)}<div class="msg recv typing" data-typing-row hidden><span class="msg-row"><span class="msg-gap"></span><p class="bub dots"><i></i><i></i><i></i></p></span></div></div>
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
      ${L.steps.map(([img, alt, h, text], i) => `<li class="step2 reveal"><div class="step2-shot">${shot(img, alt, 0)}</div><div class="step2-text"><span class="step2-n">${i + 1}</span><h3>${esc(h)}</h3><p>${esc(text)}</p></div></li>`).join('\n      ')}
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
          <a class="text-link" href="${L.demo}">Try a demo table</a>
        </div>
        <div class="tile-shot">${shot(L.guestShot[0], L.guestShot[1], 0)}</div>
      </article>
      <article class="tile tile-fair reveal">
        <div class="tile-text">
          <h3>Fair to the penny.</h3>
          <p>${esc(L.fairText)}</p>
        </div>
        <div class="mini-bill" aria-label="${esc(L.billLabel)}">
          ${L.bill.map(([name, amt, shared, quiet]) => `<div class="mini-row${quiet ? ' quiet' : ''}"><span>${esc(name)}${shared ? ` <span class="faces" style="--size:18px">${['Kyle', 'Sam', 'Alex'].map((n) => face(n, 18, '', pf[n])).join('')}</span>` : ''}</span><span class="money">${L.money(amt)}</span></div>`).join('\n          ')}
          <div class="mini-total"><span>Alex’s share</span><b class="money">${L.money(L.total)}</b></div>
        </div>
      </article>
      <article class="tile tile-paid reveal">
        <div class="tile-text">
          <h3>Paid back tonight.</h3>
          <p>${esc(L.paidText)}</p>
        </div>
        <ul class="pay-list" aria-label="Ways friends can pay you">
          ${L.payRows.map(([b, small]) => `<li><span><b>${esc(b)}</b><small>${esc(small)}</small></span></li>`).join('\n          ')}
        </ul>
      </article>
      <article class="tile tile-wide tile-owed reveal">
        <div class="tile-text">
          <h3>${esc(L.owedTile[0])}</h3>
          <p>${esc(L.owedTile[1])}</p>
          <a class="text-link" href="${L.owedTile[2]}">${esc(L.owedTile[3])}</a>
        </div>
        <div class="tile-shot">${shot(L.owedTile[4], L.owedTile[5], 0)}</div>
      </article>
      <article class="tile tile-full tile-lang reveal">
        <div class="tile-text">
          <h3>${esc(L.langTile[0])}</h3>
          <p>${esc(L.langTile[1])}</p>
        </div>
        <div class="xlate" aria-label="Example: Pollo alla griglia becomes Grilled chicken, Acqua frizzante becomes Sparkling water${L.settle ? `. On a bill in baht, a share of ${L.settle[0]} is paid back as ${L.settle[1]}` : ''}">
          <div class="xl-row"><s>Pollo alla griglia</s><span>Grilled chicken</span><span class="money">€16.00</span></div>
          <div class="xl-row"><s>Acqua frizzante</s><span>Sparkling water</span><span class="money">€3.50</span></div>
          <div class="xl-row"><s>Coperto ×4</s><span>Cover charge ×4</span><span class="money">€8.00</span></div>${L.settle ? `
          <div class="xl-row xl-settle"><s>Your share ${esc(L.settle[0])}</s><span>You pay</span><span class="money">${esc(L.settle[1])}</span></div>` : ''}
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
    <div class="quote-thread" data-chat data-chat-speed="0.75" role="group" aria-label="Messages from OnlyBills users">
      <div class="chat-body" aria-hidden="true">${bubbles(quoteLines, qf)}<div class="msg sent run tail" data-msg data-typing="0"><p class="bub">ok I’m in. next dinner we’re using this</p></div></div>
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
      <a class="vs-strip" href="/vs/splitwise/"><span><b>Coming from Splitwise?</b><small>${L.vs}</small></span><span class="chev" aria-hidden="true">›</span></a>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head reveal"><h2 class="h2">Questions</h2></div>
    <div class="faq reveal">${L.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="answer"><p>${esc(a)}</p></div></details>`).join('')}</div>
  </div>
</section>

${posts.length ? `<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">From the blog</span><h2 class="h2">${esc(L.blogHead)}</h2></div>
    <div class="post-list reveal">${posts.filter(L.postFilter).slice(0, 4).map((p) => `<a class="post-line" href="${p.path}"><span class="post-line-cat">${esc(p.category || 'Article')}</span><b>${esc(p.title)}</b><span class="chev" aria-hidden="true">›</span></a>`).join('')}</div>
    <p style="text-align:center;margin-top:28px"><a class="text-link" href="/blog/">All articles</a></p>
  </div>
</section>` : ''}

<section class="closer2">
  <div class="closer2-media" aria-hidden="true">
    <video muted playsinline loop preload="none" data-lazy-loop poster="/assets/video/orbit-wide-poster.webp" data-src-wide="/assets/video/orbit-wide" data-src-narrow="/assets/video/orbit-square"></video>
  </div>
  <div class="wrap closer2-copy">
    <h2 class="h2">Next dinner, try it.</h2>
    <p class="lede">Scan, share one QR code, get paid back. Free, with no sign-up.</p>
    ${storeButton('Download on the', 'closer')}
  </div>
</section>${L.notices.length ? `
<section class="section notice-sec"><div class="wrap">${noticeBlock(L.notices)}</div></section>` : ''}`;

  const schema = [
    appLd({ currency: L.currency, lang: L.lang }), // structure lives in lib.mjs (one free offer, shared with /vs/)
    { '@type': 'FAQPage', mainEntity: L.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  write(L.path, layout({
    path: L.path,
    title: L.title,
    description: L.description,
    body, schema, current: '/', assetsV, lang: L.lang,
    alternates: [[HOME_LOCALES.find((x) => x.path === L.twin).lang, L.twin]], xDefault: '/',
    extraHead: uk ? '<link rel="preload" as="image" href="/assets/video/preview-phone-poster.webp">' : '',
  }), { priority: uk ? 1.0 : 0.9 });
}
