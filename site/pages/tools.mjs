import { esc, art, abs, crumbs, crumbsLd, appCta, SITE } from '../lib.mjs';
import { marked } from 'marked';

const faqBlock = (faq) => `<h2 id="faq">Questions people ask</h2><div class="faq">${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="answer">${marked.parse(a)}</div></details>`).join('')}</div>`;
const faqLd = (faq) => ({ '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_]/g, '') } })) });
const appLd = (name, path, description) => ({
  '@type': 'WebApplication', name, url: abs(path), description, applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any', browserRequirements: 'Requires JavaScript', inLanguage: 'en-GB',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' }, publisher: { '@id': SITE.url + '/#org' },
});

const TOOLS = [
  {
    slug: 'split-bill-calculator',
    art: 'claim',
    name: 'Split the bill calculator',
    title: 'Split the bill calculator: by item or equally, with service charge',
    h1: 'Split the bill calculator',
    lede: 'Add who had what. Shared dishes, service charge and tips split fairly, and every share adds up to the bill to the penny.',
    description: 'Free split the bill calculator. Split by what each person ordered or equally, share starters and wine, add service charge or a tip, and copy the totals to WhatsApp.',
    card: 'By item or equally. Service, tips and shared dishes included.',
    app: `<div class="tool two" data-tool="split">
  <div style="display:grid;gap:18px">
    <div class="seg" role="group" aria-label="How to split"><button type="button" data-mode="items" aria-pressed="true">By what people had</button><button type="button" data-mode="equal" aria-pressed="false">Equally</button></div>
    <div data-pane="items" style="display:grid;gap:18px">
      <div class="field"><span class="label" id="people-l">People</span><div class="group" data-people aria-labelledby="people-l"></div></div>
      <div class="field"><span class="label" id="items-l">What was ordered</span><div class="group" data-items aria-labelledby="items-l"></div><p class="foot" style="padding:0 4px">Tap the people who had each item. Pick more than one and it splits between them.</p></div>
    </div>
    <div data-pane="equal" hidden style="display:grid;gap:18px">
      <div class="card card-pad" style="display:grid;gap:16px">
        <div class="field"><label for="eq-total">Bill total before service</label><input class="input money-in" id="eq-total" inputmode="decimal" placeholder="£0.00" value="128.40"></div>
        <div class="field"><label for="eq-people">Number of people</label><input class="input money-in" id="eq-people" inputmode="numeric" value="5"></div>
      </div>
    </div>
    <div class="card card-pad" style="display:grid;gap:16px">
      <div class="field"><span class="label">Service charge</span><div class="seg" role="group" aria-label="Service charge" data-service><button type="button" data-v="0" aria-pressed="false">None</button><button type="button" data-v="10" aria-pressed="false">10%</button><button type="button" data-v="12.5" aria-pressed="true">12.5%</button><button type="button" data-v="15" aria-pressed="false">15%</button></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="field"><label for="x-tip">Extra tip (£)</label><input class="input money-in" id="x-tip" inputmode="decimal" placeholder="0.00"></div>
        <div class="field"><label for="x-disc">Discount (£)</label><input class="input money-in" id="x-disc" inputmode="decimal" placeholder="0.00"></div>
      </div>
    </div>
  </div>
  <div class="result-col"><div class="card result" data-result aria-live="polite"></div></div>
</div>`,
    body: `
## How this calculator splits a bill

1. **Each item goes to the people who had it.** One person, one price. Tap three people on a bottle of wine and each pays a third.
2. **Service, tips and discounts follow what you ordered.** A 12.5% service charge on a £60 bill is £7.50. If you had £30 of it, you pay half the service, £3.75. The person who had a £9 salad pays service on £9.
3. **The pennies come out right.** £10 split three ways is £3.34, £3.33 and £3.33, not three lots of £3.33 that leave a penny on the table. It uses the same money engine as the OnlyBills app.

## A worked example

Four friends at an Indian restaurant. The bill is £71.20 of food and drink plus 12.5% service (£8.90), so £80.10 in total.

| Person | Had | Food and drink | Share of service | Pays |
|---|---|---|---|---|
| Sam | Chicken ruby, lassi | £18.40 | £2.30 | £20.70 |
| Priya | Paneer tikka, a third of the naan and rice | £16.60 | £2.08 | £18.68 |
| Jon | Lamb biryani, two beers, a third of the naan and rice | £25.80 | £3.22 | £29.02 |
| Maya | Salad, a third of the naan and rice | £10.40 | £1.30 | £11.70 |
| **Total** | | **£71.20** | **£8.90** | **£80.10** |

Split equally, everyone would pay £20.03. Maya would hand over £8.33 more than she ate. Jon would pay £8.99 less. That gap is why [38% of people say they lose out](/blog/splitting-the-bill-equally-cost/) when a bill is split evenly.

## When splitting equally is fine

If everyone ordered roughly the same, splitting equally is quick and nobody minds. As a rule of thumb, if the most and least anyone spent are within about £5 of each other, just split it. If someone didn't drink, or one person had the tasting menu, split by item. There's more on this in [is splitting the bill equally fair?](/blog/is-splitting-the-bill-equally-fair/)

:::cta Let your friends tick their own items
`,
    faq: [
      ['How do you split a bill with service charge?', 'Add up what each person had, then give each person the same percentage on top. With 12.5% service, someone who had £20 of food pays £22.50. That way service follows what you ordered.'],
      ['How do you split a shared starter or bottle of wine?', 'Divide it between only the people who shared it. A £24 bottle shared by three people is £8 each, and the people who didn\'t drink pay nothing towards it.'],
      ['Why don\'t the shares divide exactly?', 'Some amounts can\'t be split into equal pennies. £10 three ways is £3.33 and a third. The calculator gives the spare penny to one person so the shares add up to the bill exactly.'],
      ['Is service charge compulsory in the UK?', 'No. A discretionary service charge is optional, even when it\'s already printed on the bill. You can ask for it to be removed if the service was poor. Read more in [is service charge mandatory in the UK?](/blog/is-service-charge-mandatory-uk/)'],
      ['Can my friends enter their own items?', 'Not in this calculator, but they can in the OnlyBills app. You scan the receipt, share a QR code, and everyone ticks what they had on their own phone. No app download needed for them.'],
    ],
    related: ['is-splitting-the-bill-equally-fair', 'split-service-charge-fairly', 'split-bill-when-some-dont-drink'],
  },
  {
    slug: 'overpay-calculator',
    art: 'receipts',
    name: 'Splitting equally calculator',
    title: 'How much does splitting the bill equally cost you? Calculator',
    h1: 'How much does splitting equally cost you?',
    lede: 'Five quick questions. We\'ll estimate how much you overpay a year when the bill is split evenly.',
    description: 'Answer five quick questions to estimate how much you overpay each year when restaurant bills are split equally. Free, takes 20 seconds, with the research behind it.',
    card: 'Five taps for your estimated yearly overpay.',
    app: `<div class="tool" data-tool="overpay" style="max-width:760px;margin:0 auto">
  <div class="card card-pad" data-quiz>
    <div class="progress" aria-hidden="true"><i data-progress></i></div>
    <div style="margin-top:24px">
      <div class="quiz-q" data-q="meals"><h3>How often do you eat or drink out with a group?</h3><div class="choices" role="group" aria-label="Group meals a month"><button type="button" data-v="1" aria-pressed="false">Once a month</button><button type="button" data-v="2.5" aria-pressed="false">2 to 3 times</button><button type="button" data-v="5" aria-pressed="false">4 or more</button></div></div>
      <div class="quiz-q" data-q="spend"><h3>What does a typical meal come to per head?</h3><div class="choices" role="group" aria-label="Spend per head"><button type="button" data-v="15" aria-pressed="false">About £15</button><button type="button" data-v="25" aria-pressed="false">About £25</button><button type="button" data-v="40" aria-pressed="false">About £40</button><button type="button" data-v="60" aria-pressed="false">£60 or more</button></div></div>
      <div class="quiz-q" data-q="gap"><h3>Compared to the rest of the table, you usually order…</h3><div class="choices" role="group" aria-label="What you order"><button type="button" data-v="0.30" aria-pressed="false">Much less</button><button type="button" data-v="0.15" aria-pressed="false">A bit less</button><button type="button" data-v="0" aria-pressed="false">About the same</button><button type="button" data-v="-0.15" aria-pressed="false">More</button></div></div>
      <div class="quiz-q" data-q="drink"><h3>Do you drink as much as everyone else?</h3><div class="choices" role="group" aria-label="Drinking"><button type="button" data-v="0.15" aria-pressed="false">I don’t drink</button><button type="button" data-v="0.05" aria-pressed="false">A bit less</button><button type="button" data-v="0" aria-pressed="false">The same</button></div></div>
      <div class="quiz-q" data-q="freq"><h3>How often does your group split it equally?</h3><div class="choices" role="group" aria-label="How often split equally"><button type="button" data-v="1" aria-pressed="false">Always</button><button type="button" data-v="0.75" aria-pressed="false">Usually</button><button type="button" data-v="0.4" aria-pressed="false">Sometimes</button></div></div>
    </div>
  </div>
  <div class="card result" data-result aria-live="polite" hidden></div>
</div>`,
    body: `
## How we work out your number

Your estimated overpay is:

**meals a year × spend per head × how much less you order × how often it's split equally**

If you eat out with friends 3 times a month at £30 a head, order about 15% less than the table, and the bill is split equally 3 times out of 4, that's 36 × £30 × 15% × 75% = **about £122 a year**. Not drinking adds to the gap, because drinks are where a table's spending varies most.

The percentages are our assumptions, not research figures, which is why we call it your *estimated* overpay. If you usually order more than everyone else, splitting equally probably saves you money, and your friends are the ones paying for it.

## What the research says

:::stats
- 38% | of Brits feel they lose money when a bill is split equally | OpenTable UK survey, 2016
- £8.73 | the average amount they estimate they lose per meal | OpenTable UK survey, 2016
- 80% | of diners in a restaurant study said they'd rather each pay for their own | Gneezy, Haruvy and Yafe, 2004
:::

In the restaurant study, groups ordered noticeably more when they knew the bill would be split evenly than when everyone paid their own way. Each person bears only a fraction of the cost of anything extra they order, so everyone orders a bit more. Economists call it the diner's dilemma. [Here's the full story](/blog/why-groups-order-more-when-splitting/).

:::tool split
`,
    faq: [
      ['Do you lose money splitting the bill equally?', 'If you usually order less than the people you eat with, yes. In a 2016 OpenTable survey, 38% of Brits felt they lose money when the bill is split equally, by about £8.73 a meal on their own estimate.'],
      ['Why do people order more when the bill is split?', 'Because each person only pays a fraction of anything extra they order. In a study by Gneezy, Haruvy and Yafe (2004), diners who split the bill ordered noticeably more than diners who paid individually.'],
      ['How can I avoid overpaying without being awkward?', 'Suggest splitting by item before the bill comes, or use an app where everyone ticks their own items so nobody has to argue over the receipt. See our [bill splitting etiquette guide](/blog/bill-splitting-etiquette/).'],
      ['How accurate is this calculator?', 'It\'s an estimate. The gap percentages are our assumptions and your real number depends on what your friends order. Use it as a rough guide, not a precise figure.'],
    ],
    related: ['splitting-the-bill-equally-cost', 'why-groups-order-more-when-splitting', 'split-bill-when-some-dont-drink'],
  },
  {
    slug: 'tip-calculator',
    art: 'paid',
    name: 'Tip and service charge calculator',
    title: 'Tip calculator UK: service charge and split per person',
    h1: 'Tip and service charge calculator',
    lede: 'Work out 10, 12.5 or 15% on any bill and what each person pays. Exact to the penny.',
    description: 'Free UK tip calculator. Work out 10%, 12.5% or 15% service on a restaurant bill, split it between any number of people, and check whether service is already included.',
    card: '10, 12.5 or 15% and the split per person.',
    app: `<div class="tool two" data-tool="tip">
  <div class="card card-pad" style="display:grid;gap:18px">
    <div class="field"><label for="t-bill">Bill amount</label><input class="input money-in" id="t-bill" inputmode="decimal" placeholder="£0.00" value="86.50"></div>
    <div class="field"><span class="label">Tip or service</span><div class="seg" role="group" aria-label="Tip percentage" data-pct><button type="button" data-v="0" aria-pressed="false">0%</button><button type="button" data-v="10" aria-pressed="false">10%</button><button type="button" data-v="12.5" aria-pressed="true">12.5%</button><button type="button" data-v="15" aria-pressed="false">15%</button><button type="button" data-v="20" aria-pressed="false">20%</button></div></div>
    <div class="field"><label for="t-people">Split between</label><input class="input money-in" id="t-people" inputmode="numeric" value="4"></div>
    <label style="display:flex;gap:12px;align-items:center;font-size:17px;cursor:pointer"><input type="checkbox" id="t-included" style="width:22px;height:22px;accent-color:var(--accent-fill)"> Service charge is already on the bill</label>
  </div>
  <div class="result-col"><div class="card result" data-result aria-live="polite"></div></div>
</div>`,
    body: `
## How much should you tip in the UK?

In UK restaurants, **10 to 12.5%** is normal for table service, and many restaurants add a 12.5% "discretionary" service charge to the bill. If it's already there, you don't need to tip again. In pubs and for counter service, tipping isn't expected. For a full guide by situation, see [how much to tip in the UK](/blog/how-much-to-tip-uk/).

| Bill | 10% | 12.5% | 15% |
|---|---|---|---|
| £20 | £2.00 | £2.50 | £3.00 |
| £50 | £5.00 | £6.25 | £7.50 |
| £80 | £8.00 | £10.00 | £12.00 |
| £120 | £12.00 | £15.00 | £18.00 |
| £200 | £20.00 | £25.00 | £30.00 |

## Do staff get the service charge?

Since 1 October 2024, the Employment (Allocation of Tips) Act 2023 means employers in England, Scotland and Wales must pass all tips and service charges to workers, fairly and without deductions. More in [is service charge mandatory in the UK?](/blog/is-service-charge-mandatory-uk/)

## Splitting the tip when people ordered different amounts

If one person had a £12 pasta and another had £45 of steak and wine, giving the tip in equal parts isn't quite fair. Each person adding the same percentage to what they had is. The [split the bill calculator](/tools/split-bill-calculator/) does this for you.
`,
    faq: [
      ['Is 12.5% service charge normal in the UK?', 'Yes. 12.5% is the most common service charge in UK restaurants, especially in cities. It\'s discretionary, which means optional.'],
      ['Should I tip if service charge is included?', 'No need. The service charge is the tip. Only add more if the service was exceptional and you want to.'],
      ['Do you tip on the total including drinks?', 'Usually, yes. A service charge is normally worked out on the whole bill, food and drink.'],
      ['How do I split a tip between friends?', 'The fairest way is for everyone to add the same percentage to what they had. Splitting the tip equally is fine when everyone spent about the same.'],
    ],
    related: ['how-much-to-tip-uk', 'is-service-charge-mandatory-uk', 'split-service-charge-fairly'],
  },
];

export function toolPages({ posts, write, layout, assetsV, postCard, warn }) {
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  for (const t of TOOLS) {
    const p = `/tools/${t.slug}/`;
    const trail = [['Home', '/'], ['Free tools', '/tools/'], [t.name, p]];
    const prose = marked.parse(renderInline(t.body));
    const rel = t.related.map((s) => bySlug.get(s)).filter(Boolean);
    if (rel.length < t.related.length) warn.push(`${p}: some related articles missing`);
    const body = `
<section class="section-tight" style="padding-bottom:24px">
  <div class="wrap">
    <div class="section-head">
      ${crumbs(trail)}
      ${art(t.art, 120, true)}
      <h1 class="h1">${esc(t.h1)}</h1>
      <p class="lede">${esc(t.lede)}</p>
    </div>
    <noscript><p class="card card-pad">This calculator needs JavaScript. The worked examples below show how the maths works.</p></noscript>
    ${t.app}
  </div>
</section>
<div class="wrap wrap-prose"><div class="prose">
${prose}
${faqBlock(t.faq)}
</div></div>
${rel.length ? `<section class="section-tight"><div class="wrap"><div class="section-head left"><h2 class="h3">Read next</h2></div><div class="cards">${rel.map((r) => postCard(r)).join('')}</div></div></section>` : ''}
<script type="module" src="/assets/js/tools.js?v=${assetsV}"></script>`;
    write(p, layout({ path: p, title: t.title, description: t.description, body, current: '/tools/', assetsV,
      schema: [crumbsLd(trail), appLd(t.name, p, t.description), faqLd(t.faq)] }), { priority: 0.9 });
  }
  const trail = [['Home', '/'], ['Free tools', '/tools/']];
  write('/tools/', layout({ path: '/tools/', title: 'Free bill splitting tools and calculators', description: 'Free calculators for splitting a restaurant bill by item or equally, working out UK tips and service charge, and seeing how much splitting equally costs you.', current: '/tools/', assetsV,
    schema: [crumbsLd(trail)],
    body: `
<section class="section-tight">
  <div class="wrap">
    <div class="section-head">${art('scan', 130, true)}<h1 class="h1">Free tools</h1><p class="lede">Quick calculators for the end of the meal. No sign-up, nothing to install.</p></div>
    <div class="tool-grid">${TOOLS.map((t) => `<a class="card tool-card" href="/tools/${t.slug}/">${art(t.art, 130)}<h2 class="h3">${esc(t.name)}</h2><p class="quiet">${esc(t.card)}</p><span class="text-link">Open</span></a>`).join('')}</div>
    <div style="max-width:720px;margin:48px auto 0">${appCta('Want friends to tick their own items?', 'OnlyBills scans the receipt and shares a live table. Everyone taps what they had and pays you back.', 'tools-index')}</div>
  </div>
</section>` }), { priority: 0.9 });
}

// Tool pages use the same ::: blocks as articles, rendered by a tiny local pass.
import { appCta as cta } from '../lib.mjs';
const TOOL_LINKS = {
  split: ['/tools/split-bill-calculator/', 'Split the bill calculator', 'Add who had what. Service and shared dishes split to the penny.'],
  overpay: ['/tools/overpay-calculator/', 'Does splitting equally cost you?', 'Five quick taps for your estimated yearly overpay.'],
  tip: ['/tools/tip-calculator/', 'Tip and service charge calculator', 'Work out 10, 12.5 or 15% and each person’s share.'],
};
function renderInline(md) {
  const lines = md.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i];
    let m;
    if (/^:::stats/.test(l)) {
      const cards = [];
      for (i += 1; i < lines.length && !/^:::\s*$/.test(lines[i]); i += 1) {
        const [num, label, src] = lines[i].replace(/^\s*-\s*/, '').split('|').map((x) => x.trim());
        if (num) cards.push(`<div class="card stat-card"><span class="num">${esc(num)}</span><p>${marked.parseInline(label)}</p><cite>${esc(src || '')}</cite></div>`);
      }
      out.push('', `<div class="stat-strip">${cards.join('')}</div>`, '');
    } else if ((m = l.match(/^:::tool\s+(\w+)/))) {
      const t = TOOL_LINKS[m[1]];
      out.push('', `<a class="card tool-link" href="${t[0]}"><span class="tool-icon">£</span><span><b>${esc(t[1])}</b><span>${esc(t[2])}</span></span><span class="chev" aria-hidden="true">›</span></a>`, '');
    } else if ((m = l.match(/^:::cta\s*(.*)$/))) {
      out.push('', cta(m[1] || undefined, undefined, 'tool'), '');
    } else out.push(l);
  }
  return out.join('\n');
}
