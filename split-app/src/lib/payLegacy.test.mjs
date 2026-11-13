// The UK guarantee, guest side: a document without `payment.methods` must give the pay
// sheet exactly what it got before regional payouts. The functions under "Before" are a
// frozen copy of bill.js as deployed on 3 Nov 2026 (dd906cc); every legacy map below goes
// through both and the result the sheet binds to must be equal, field for field.
// The only differences are the three parity faults the contract fixes on purpose, each
// pinned at the end of this file. Run: node --test src/lib/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { payPlan } from './bill.js';
import { fillText, iconFor } from './payMethods.js';
import { formatMoney, linkAmount } from './format.js';
import { setGuestLocale } from './locale.js';

// The guarantee is for a UK guest: pin the locale so the machine running the tests can't
// change the rendering (formatMoney follows the guest's locale since regional payouts).
setGuestLocale('en-GB');

// ── Before (frozen; do not edit) ──────────────────────────
// formatMoney as deployed on 3 Nov 2026 (dd906cc, src/lib/format.js): always en-GB.
const FALLBACK_SYMBOLS = {
  GBP: '£', USD: '$', EUR: '€', JPY: '¥', CAD: '$', AUD: '$',
  SGD: '$', MYR: 'RM', THB: '฿', INR: '₹', KRW: '₩', CNY: '¥', HKD: '$',
};
const oldFormatMoney = (amount, currency) => {
  const v = Number.isFinite(amount) ? amount : 0;
  const rounded = Math.abs(v) < 0.005 ? 0 : v;
  const code = (currency || 'GBP').toUpperCase();
  let f = null;
  try { f = new Intl.NumberFormat('en-GB', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }); } catch { /* fallback */ }
  const text = f ? f.format(rounded) : (FALLBACK_SYMBOLS[code] || code + ' ') + Math.abs(rounded).toFixed(2);
  if (!f && rounded < 0) return '−' + text;
  return text.replace('-', '−');
};
const PAY_WITH = {
  monzo: 'Apple Pay, card or bank transfer', starling: 'Apple Pay or card', revolut: 'Apple Pay or card',
  paypal: 'PayPal', venmo: 'Venmo', bank: 'Bank transfer',
};
const CAPABILITY = {
  monzo: 'Apple Pay, card or bank transfer. No Monzo account needed',
  starling: 'Apple Pay or card. No Starling account needed',
  revolut: 'Apple Pay or card. No Revolut account needed',
  paypal: 'PayPal account may be needed',
  venmo: 'Venmo account needed',
  bank: 'From any banking app',
};
const oldBuildPayOptions = (payment, { amount, currency, reference }) => {
  const p = payment || {};
  const amt = linkAmount(amount, currency);
  const cur = (currency || 'GBP').toUpperCase();
  const ref = encodeURIComponent((reference || 'Split').slice(0, 40));
  const shown = oldFormatMoney(amount, currency);
  const handle = (s) => encodeURIComponent(String(s).trim().replace(/^@/, ''));
  const filled = `${shown} filled in for you`;
  const enter = `Enter ${shown} when it opens`;
  const opts = [];
  if (p.monzoUsername) opts.push({
    key: 'monzo', label: 'Monzo', logo: 'logo-monzo.jpg',
    href: `https://monzo.me/${handle(p.monzoUsername)}/${amt}?d=${ref}`,
    note: filled, prefilled: true, capability: CAPABILITY.monzo, payWith: PAY_WITH.monzo,
  });
  if (p.starlingUsername) opts.push({
    key: 'starling', label: 'Starling', logo: 'logo-starling.png',
    href: `https://settleup.starlingbank.com/${handle(p.starlingUsername)}`,
    note: enter, prefilled: false, capability: CAPABILITY.starling, payWith: PAY_WITH.starling,
  });
  if (p.revolutUsername) opts.push({
    key: 'revolut', label: 'Revolut', logo: 'logo-revolut.png',
    href: `https://revolut.me/${handle(p.revolutUsername)}`,
    note: enter, prefilled: false, capability: CAPABILITY.revolut, payWith: PAY_WITH.revolut,
  });
  if (p.paypalUsername) opts.push({
    key: 'paypal', label: 'PayPal', logo: 'logo-paypal.png',
    href: `https://paypal.me/${handle(p.paypalUsername)}/${amt}${cur}`,
    note: filled, prefilled: true, capability: CAPABILITY.paypal, payWith: PAY_WITH.paypal,
  });
  if (p.venmoHandle) opts.push({
    key: 'venmo', label: 'Venmo', mark: 'V', tint: '#008cff',
    href: `https://venmo.com/${handle(p.venmoHandle)}?txn=pay&amount=${amt}&note=${ref}`,
    note: filled, prefilled: true, capability: CAPABILITY.venmo, payWith: PAY_WITH.venmo,
  });
  return opts;
};
const oldBankRows = (payment) => {
  const p = payment || {};
  const rows = [];
  if (p.bankAccountName) rows.push({ label: 'Name', value: String(p.bankAccountName) });
  (Array.isArray(p.bankDetails) ? p.bankDetails : [])
    .filter((f) => f && f.label && f.value)
    .forEach((f) => rows.push({ label: String(f.label), value: String(f.value) }));
  return rows;
};
const oldPayPlan = (payment, opts) => {
  const links = oldBuildPayOptions(payment, opts);
  const bank = oldBankRows(payment).length > 0;
  const wanted = String(payment?.defaultMethod || '').toLowerCase();
  let primary = null;
  if (wanted === 'bank' && bank) primary = { kind: 'bank' };
  else {
    const chosen = links.find((o) => o.key === wanted) || links[0];
    if (chosen) primary = { kind: 'link', opt: chosen };
    else if (bank) primary = { kind: 'bank' };
  }
  const others = primary?.kind === 'link' ? links.filter((o) => o !== primary.opt) : links;
  return { primary, others, bank: bank && primary?.kind !== 'bank' };
};

// ── What the sheet shows, from each side ──────────────────
// Card methods show the card glyph (their logo file was never drawn on the guest page).
const oldIcon = (o) => (['monzo', 'starling', 'revolut'].includes(o.key) ? { type: 'card' } : { type: 'logo', src: o.logo });
const oldLink = (o) => ({
  id: o.key, href: o.href, payWith: o.payWith, note: o.note, capability: o.capability, prefilled: o.prefilled, icon: oldIcon(o),
});
const before = (payment, opts) => {
  const plan = oldPayPlan(payment, opts);
  const rows = oldBankRows(payment);
  return {
    primary: plan.primary == null ? null : plan.primary.kind === 'bank' ? { id: 'bank', rows } : oldLink(plan.primary.opt),
    otherLinks: plan.others.map(oldLink),
    bankBelow: plan.bank ? rows : null,
  };
};

const after = (payment, opts) => {
  const plan = payPlan(payment, opts);
  const shown = { amount: formatMoney(opts.amount, opts.currency) };
  const view = (o) => (o.id === 'bank'
    ? { id: 'bank', rows: o.rows.map((r) => ({ label: r.label, value: r.copy })) }
    : { id: o.id, href: o.url, payWith: o.payWith, note: fillText(o.note, shown), capability: o.capability, prefilled: o.prefilled, icon: iconFor(o) });
  // The legacy sheet has no Amount rows, pinned copy buttons, hints or demotion.
  for (const o of [plan.primary, ...plan.others].filter(Boolean)) {
    assert.equal(o.amountCopy, null); assert.equal(o.hint, null); assert.equal(o.demoted, false);
    assert.equal(o.pinnedCopy, null); assert.equal(o.pixCode, null);
    assert.equal(o.kind, o.id === 'bank' ? 'copy' : 'link');
    if (o.id === 'bank') assert.deepEqual(o.rows.map((r) => r.display), o.rows.map((r) => r.copy));
  }
  const bank = plan.others.find((o) => o.id === 'bank');
  if (bank) assert.equal(plan.others.at(-1), bank, 'bank details are always last');
  return {
    primary: plan.primary ? view(plan.primary) : null,
    otherLinks: plan.others.filter((o) => o.id !== 'bank').map(view),
    bankBelow: bank ? view(bank).rows : null,
  };
};

// ── Every legacy shape a UK host can have written ─────────
const BANK = { bankAccountName: 'Kyle O’Sullivan', bankDetails: [{ label: 'Sort code', value: '04-00-04' }, { label: 'Account no', value: '12345678' }] };
const HANDLES = { monzoUsername: 'kylezinho', starlingUsername: 'kylez', revolutUsername: 'kyler', paypalUsername: 'kylep' };
const subsets = (keys) => keys.reduce((all, k) => all.flatMap((s) => [s, [...s, k]]), [[]]);

const MAPS = [];
for (const keys of subsets(Object.keys(HANDLES))) {
  const links = Object.fromEntries(keys.map((k) => [k, HANDLES[k]]));
  for (const bank of [{}, BANK]) {
    for (const def of [undefined, 'monzo', 'starling', 'revolut', 'paypal', 'bank', 'nonsense', 'PayPal']) {
      MAPS.push({ ...links, ...bank, ...(def ? { defaultMethod: def } : {}), payeeName: 'Kyle' });
    }
  }
}
MAPS.push(
  null, {}, { payeeName: 'Kyle' },
  { monzoUsername: ' @kylezinho ', paypalUsername: '@kylep' },          // handles as typed
  { monzoUsername: 'Kyle Z', revolutUsername: 'kyle/z?x=1#y' },         // encoded, never a path
  { bankAccountName: 'Kyle O', bankDetails: [] },                        // name only
  { bankDetails: [{ label: 'IBAN', value: 'GB82 WEST 1234 5698 7654 32' }, { label: '', value: 'x' }, { label: 'x' }, null] },
  { monzoUsername: 'kylezinho', bankDetails: 'nope', bankAccountName: '' },
  { monzoUsername: 'kylezinho', qrCodeUrl: 'https://example.com/qr.png', qrCodeDescription: 'My QR' },
  { monzoUsername: 'kylezinho', methods: [] },                           // an empty list is not the new path
  { monzoUsername: 'kylezinho', methods: 'x', v: 2 },
);

const BILLS = [
  { amount: 11, currency: 'GBP', reference: 'Nandos Peri-Peri' },
  { amount: 0.05, currency: 'GBP', reference: 'Dishoom Kensington' },
  { amount: 1234.5, currency: 'GBP', reference: '' },
  { amount: 22.22, currency: 'GBP', reference: 'Dinner & drinks at the very long named gastropub, table #4' },
  { amount: 17.6, currency: 'GBP', reference: 'Café Zoë 🍕' },
];

test(`legacy UK documents render as before (${MAPS.length} maps × ${BILLS.length} bills)`, () => {
  let compared = 0;
  for (const payment of MAPS) {
    for (const bill of BILLS) {
      assert.deepEqual(after(payment, bill), before(payment, bill), JSON.stringify({ payment, bill }));
      if (payment) assert.equal(payPlan(payment, bill).path, 'legacy');
      compared += 1;
    }
  }
  assert.equal(compared, MAPS.length * BILLS.length);
});

test('legacy path ignores the new keys entirely unless `methods` yields something', () => {
  const uk = { ...HANDLES, ...BANK, defaultMethod: 'starling' };
  const bill = BILLS[0];
  assert.deepEqual(after({ ...uk, v: 2, methods: [{ id: 'link', url: 'https://evil.example/pay' }] }, bill), before(uk, bill));
});

// ── The deliberate differences (contract section 2; plan section 6, items 3 to 5) ──
test('changed on purpose: apostrophes and ! ( ) * in the reference are percent-encoded, as the app does', () => {
  const p = { monzoUsername: 'kyle' };
  const bill = { amount: 11, currency: 'GBP', reference: "Nando's (Leeds)!" };
  assert.equal(before(p, bill).primary.href, "https://monzo.me/kyle/11.00?d=Nando's%20(Leeds)!");
  assert.equal(after(p, bill).primary.href, 'https://monzo.me/kyle/11.00?d=Nando%27s%20%28Leeds%29%21');
});

test('changed on purpose: Monzo only carries the amount on a pound bill', () => {
  const p = { monzoUsername: 'kyle' };
  const bill = { amount: 40, currency: 'EUR', reference: 'Tapas' };
  assert.equal(before(p, bill).primary.href, 'https://monzo.me/kyle/40.00?d=Tapas', 'a €40 share used to open as £40');
  const now = after(p, bill).primary;
  assert.equal(now.href, 'https://monzo.me/kyle?d=Tapas');
  assert.equal(now.note, 'Enter €40.00 when it opens');
  assert.equal(now.prefilled, false);
});

test('changed on purpose: Venmo uses /u/, pre-fills dollars only, and never claims an unverified pre-fill', () => {
  const p = { venmoHandle: '@kyle-z' };
  const usd = { amount: 22.5, currency: 'USD', reference: 'Tacos' };
  assert.equal(oldPayPlan(p, usd).primary.opt.href, 'https://venmo.com/kyle-z?txn=pay&amount=22.50&note=Tacos');
  const now = payPlan(p, usd).primary;
  assert.equal(now.url, 'https://venmo.com/u/kyle-z?txn=pay&amount=22.50&note=Tacos');
  assert.equal(now.note, 'Enter {amount} when it opens');
  assert.equal(now.amountCopy, '22.50', 'the guest gets an Amount row while the pre-fill is unverified');
  assert.equal(payPlan(p, { ...usd, currency: 'GBP' }).primary.url, 'https://venmo.com/u/kyle-z?txn=pay&note=Tacos');
  assert.deepEqual(iconFor(now), { type: 'logo', src: 'logo-venmo.png' });
});

test('changed on purpose: hardening at the edges of the legacy path', () => {
  const bill = BILLS[0];
  // A handle of only "@" used to make a link to the provider's home page.
  assert.equal(oldPayPlan({ monzoUsername: '@' }, bill).primary.opt.href, 'https://monzo.me//11.00?d=Nandos%20Peri-Peri');
  assert.equal(payPlan({ monzoUsername: '@' }, bill).primary, null);
  // Whitespace-only names no longer make an empty "Name" row; non-text values are skipped.
  assert.equal(oldBankRows({ bankAccountName: '  ' }).length, 1);
  assert.equal(payPlan({ bankAccountName: '  ' }, bill).primary, null);
  assert.equal(payPlan({ bankDetails: [{ label: 'Account', value: 12345678 }] }, bill).primary, null);
  // A reference cut at 40 loses a trailing space; it is cut by code points, so an emoji is never split.
  const spaced = { ...bill, reference: 'Dinner & drinks, table #4 – with a name longer than forty' };
  assert.match(oldPayPlan({ monzoUsername: 'k' }, spaced).primary.opt.href, /name%20$/);
  assert.match(payPlan({ monzoUsername: 'k' }, spaced).primary.url, /name$/);
  const emoji = { ...bill, reference: 'x'.repeat(39) + '🍕' };
  assert.throws(() => oldPayPlan({ monzoUsername: 'k' }, emoji), URIError);
  assert.match(payPlan({ monzoUsername: 'k' }, emoji).primary.url, /%F0%9F%8D%95$/);
});

test('an en-GB guest sees every pound amount exactly as before', () => {
  const amounts = [0, 0.004, 0.005, 0.01, 0.05, 0.1, 1, 9.99, 11, 17.6, 22.22, 99.995, 1234.5, 98765.43, -1.5, -0.004, NaN];
  for (const a of amounts) assert.equal(formatMoney(a, 'GBP'), oldFormatMoney(a, 'GBP'), String(a));
  assert.equal(formatMoney(11, 'GBP'), '£11.00');
});
