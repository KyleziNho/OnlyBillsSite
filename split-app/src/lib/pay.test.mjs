// Getting paid: option ordering, the host's default, honest capability copy, Starling
// links and compatibility with docs written by older apps. Run: node --test src/lib/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPayOptions, payPlan, payeeOf, bankRows, hasAnyPayMethod, CAPABILITY } from './bill.js';

const BANK = { bankAccountName: 'Kyle O', bankDetails: [{ label: 'Sort code', value: '04-00-04' }, { label: 'Account number', value: '12345678' }] };
const ALL = { monzoUsername: 'kyle', starlingUsername: 'kylez', revolutUsername: 'kyler', paypalUsername: 'kylep', ...BANK };
const opts = { amount: 11, currency: 'GBP', reference: "Nando's" };

test('Starling Settle Up link: profile only, guest enters the amount', () => {
  const [o] = buildPayOptions({ starlingUsername: ' @kylez ' }, opts);
  assert.equal(o.key, 'starling');
  assert.equal(o.href, 'https://settleup.starlingbank.com/kylez');
  assert.equal(o.logo, 'logo-starling.png');
  assert.equal(o.prefilled, false);
  assert.equal(o.note, 'Enter £11.00 when it opens');
  assert.equal(o.capability, 'Card or Apple Pay. No Starling account needed');
  assert.equal(o.payWith, 'Card or Apple Pay');
});

test('what you pay with never names the host\'s bank', () => {
  const o = buildPayOptions(ALL, opts);
  for (const x of o.filter((x) => ['monzo', 'starling', 'revolut'].includes(x.key))) {
    assert.doesNotMatch(x.payWith, /Monzo|Starling|Revolut/);
  }
  assert.equal(o[0].payWith, 'Card, Apple Pay or bank transfer');
  assert.equal(o[3].payWith, 'PayPal');
});

test('links keep their formats; best payer experience first', () => {
  const o = buildPayOptions(ALL, opts);
  assert.deepEqual(o.map((x) => x.key), ['monzo', 'starling', 'revolut', 'paypal']);
  assert.equal(o[0].href, "https://monzo.me/kyle/11.00?d=Nando's");
  assert.equal(o[2].href, 'https://revolut.me/kyler');
  assert.equal(o[3].href, 'https://paypal.me/kylep/11.00GBP');
  assert.equal(o[0].note, '£11.00 filled in for you');
});

test('capability copy is accurate and never implies the host app is needed', () => {
  assert.equal(CAPABILITY.monzo, 'Card, Apple Pay or bank transfer. No Monzo account needed');
  assert.equal(CAPABILITY.revolut, 'Card or Apple Pay. No Revolut account needed');
  assert.equal(CAPABILITY.paypal, 'PayPal account may be needed');
  assert.equal(CAPABILITY.bank, 'From any banking app');
});

test('defaultMethod leads; the rest + bank are other ways', () => {
  const p = payPlan({ ...ALL, defaultMethod: 'starling' }, opts);
  assert.equal(p.primary.kind, 'link');
  assert.equal(p.primary.opt.key, 'starling');
  assert.deepEqual(p.others.map((x) => x.key), ['monzo', 'revolut', 'paypal']);
  assert.equal(p.bank, true);
});

test('1.1 docs (no defaultMethod) keep the old lead: first link, bank always shown', () => {
  const p = payPlan({ monzoUsername: 'kyle', revolutUsername: 'kyler', paypalUsername: 'kylep', ...BANK }, opts);
  assert.equal(p.primary.opt.key, 'monzo');
  assert.deepEqual(p.others.map((x) => x.key), ['revolut', 'paypal']);
  assert.equal(p.bank, true);
});

test('stale or unknown default falls back to the first link', () => {
  assert.equal(payPlan({ monzoUsername: 'k', defaultMethod: 'revolut' }, opts).primary.opt.key, 'monzo');
  assert.equal(payPlan({ paypalUsername: 'k', defaultMethod: 'nonsense' }, opts).primary.opt.key, 'paypal');
  // "bank" without bank details → first link.
  assert.equal(payPlan({ paypalUsername: 'k', defaultMethod: 'bank' }, opts).primary.opt.key, 'paypal');
});

test('bank default and bank-only', () => {
  const chosen = payPlan({ monzoUsername: 'k', ...BANK, defaultMethod: 'bank' }, opts);
  assert.deepEqual(chosen.primary, { kind: 'bank' });
  assert.deepEqual(chosen.others.map((x) => x.key), ['monzo']);
  assert.equal(chosen.bank, false, 'bank is the primary, not repeated below');
  const only = payPlan(BANK, opts);
  assert.deepEqual(only.primary, { kind: 'bank' });
  assert.equal(only.others.length, 0);
});

test('PayPal-only: primary with the honest line, nothing else', () => {
  const p = payPlan({ paypalUsername: 'kylep', defaultMethod: 'paypal' }, opts);
  assert.equal(p.primary.opt.capability, 'PayPal account may be needed');
  assert.equal(p.others.length, 0);
  assert.equal(p.bank, false);
});

test('nothing set up → no primary', () => {
  assert.equal(payPlan(null, opts).primary, null);
  assert.equal(hasAnyPayMethod(null), false);
  assert.equal(hasAnyPayMethod({ starlingUsername: 'k' }), true);
});

test('payee name: live host name, else static payeeName', () => {
  assert.equal(payeeOf({ payeeName: 'Kyle' }, null), 'Kyle');
  assert.equal(payeeOf({ payeeName: 'Kyle' }, 'Sam'), 'Sam');
  assert.equal(payeeOf({}, 'the host'), '');
  assert.equal(payeeOf(null, null), '');
});

test('bank rows: name first, then each line', () => {
  assert.deepEqual(bankRows(BANK).map((r) => r.label), ['Name', 'Sort code', 'Account number']);
});
