// Regional payouts: the vectors shared with the iOS code (Swift twin: GuestCore pay tests).
// The canonical file lives in the iOS repo (SplitSwiftTests/Fixtures/Pay/pay-vectors.json);
// scripts/sync-money-fixtures.mjs copies it here. Never edit it by hand.
// Run: node --test src/lib/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ALLOW_LIST, CURRENCY_NAMES, LIMITS, METHODS, TEXT, accepts, buildLink, checkLink, rateParts, readPayment, readSettle,
  readSettledPayment, sanitiseMethods,
} from './payMethods.js';
import { convertMinor } from './money.js';
import { clean, cut, enc, plainAmount, refOf } from './payText.js';
import { PIX_CITY_DEFAULT, PIX_NAME_DEFAULT, classifyPixKey, crc16, pixCode, pixText } from './pix.js';

const cp = String.fromCodePoint;
const V = JSON.parse(readFileSync(new URL('./__fixtures__/pay-vectors.json', import.meta.url), 'utf8'));

test('catalogue: every id is mirrored, with the same strings and flags', () => {
  assert.deepEqual(Object.keys(METHODS), V.catalogue.map((m) => m.id));
  assert.equal(V.catalogue.length, 26);
  for (const want of V.catalogue) {
    const got = METHODS[want.id];
    // `input` and `linkPrefix` describe the host's setup screens; the guest side has no use for them.
    for (const key of Object.keys(got)) assert.deepEqual(got[key], want[key], `${want.id}.${key}`);
  }
});

test('constants: wording, currency names, limits, allow-list', () => {
  for (const [key, text] of Object.entries(TEXT)) assert.equal(text, V.text[key], `text.${key}`);
  assert.equal(PIX_NAME_DEFAULT, V.text.pixNameDefault);
  assert.equal(PIX_CITY_DEFAULT, V.text.pixCityDefault);
  assert.deepEqual(CURRENCY_NAMES, V.currencyNames);
  assert.deepEqual(LIMITS, V.limits);
  assert.deepEqual(ALLOW_LIST, V.allowList.map(({ host, label, pathPrefix }) => ({ host, label, pathPrefix })));
  for (const x of V.allowListExcluded) assert.equal(ALLOW_LIST.some((a) => a.host === x.host), false, x.host);
});

test('primitives: clean, cut, enc, ref', () => {
  assert.equal(clean(` a${cp(0xA0)}\n b${cp(0x200B)}${cp(0x202E)}c `), 'a bc');
  assert.equal(clean(7), null);
  assert.equal(clean(`lone ${String.fromCharCode(0xD83D)} surrogate`), null, 'not well-formed UTF-16');
  assert.equal(cut('🍕🍕🍕 pizza', 4), '🍕🍕🍕', 'code points, trailing space removed');
  assert.equal(enc("Nando's (Leeds)!*~"), 'Nando%27s%20%28Leeds%29%21%2A~');
  assert.equal(enc('på'), 'p%C3%A5');
  assert.equal(refOf('  '), 'Split');
  assert.equal(refOf(null), 'Split');
  assert.equal(Array.from(refOf('🍕'.repeat(50))).length, LIMITS.reference);
});

test(`plainAmount (${V.plainAmount.length} vectors)`, () => {
  for (const p of V.plainAmount) {
    assert.equal(plainAmount(p.minor, p.currency, p.separator), p.expect, JSON.stringify(p));
  }
});

test(`link builders (${V.links.length} vectors)`, () => {
  for (const l of V.links) {
    const got = buildLink(l.method, l.handle, { amountMinor: l.amountMinor, currency: l.currency, reference: l.reference });
    assert.deepEqual(got, l.expect, l.name);
    assert.equal(accepts(l.method, l.currency), l.expect.accepted, l.name);
    if (got.url) {
      const u = new URL(got.url);
      assert.equal(u.protocol, 'https:', l.name);
      assert.equal(u.username + u.password + u.port, '', l.name);
    }
  }
});

test('link builders: a handle can never change the host', () => {
  for (const handle of ['evil.com/x', '../../evil', '@evil.com', 'a?b#c', 'a@evil.com', '\\\\evil.com']) {
    for (const [id, host] of [['monzo', 'monzo.me'], ['paypal', 'paypal.me'], ['venmo', 'venmo.com'], ['cashapp', 'cash.app'], ['revolut', 'revolut.me']]) {
      const { url } = buildLink(id, handle, { amountMinor: 100, currency: 'USD', reference: 'x' });
      assert.equal(new URL(url).host, host, `${id} ${handle}`);
    }
  }
  assert.equal(buildLink('zelle', 'x', {}).url, null, 'copy methods never build a link');
  assert.equal(buildLink('nope', 'x', {}).url, null);
  assert.equal(buildLink('__proto__', 'x', {}).url, null);
});

test(`pasted-link allow-list (${V.validators.allowList.length} vectors)`, () => {
  for (const a of V.validators.allowList) {
    const hit = checkLink(a.url);
    assert.equal(!!hit, a.allowed, a.url);
    if (a.allowed) {
      assert.equal(hit.host, a.host, a.url);
      assert.equal(hit.label, a.label, a.url);
    }
  }
  assert.equal(checkLink(null), null);
  assert.equal(checkLink('https://tikkie.me/pay/x\n'), null, 'no trailing newline');
});

test(`pix: codes (${V.pix.valid.length} valid, ${V.pix.invalid.length} invalid)`, () => {
  for (const p of [...V.pix.valid, ...V.pix.invalid]) {
    assert.equal(pixCode(p.key, p.payeeName, p.city, p.amountMinor, p.currency, p.note), p.expect, p.name);
  }
  const bcb = V.pix.valid.find((p) => p.name.startsWith('Banco Central'));
  assert.match(pixCode(bcb.key, bcb.payeeName, bcb.city, null), /63041D3D$/);
  assert.equal(pixCode(bcb.key, 'KYLE O', 'BRASIL', 4500).slice(-8), '6304E053', 'the contract\'s worked example');
});

test(`pix: text folding (${V.pix.text.length}) and CRC (${V.pix.crc.length})`, () => {
  for (const t of V.pix.text) assert.equal(pixText(t.input, t.max), t.expect, JSON.stringify(t.input));
  for (const c of V.pix.crc) assert.equal(crc16(c.input), c.expect, c.input);
});

test(`pix: key classifier (${V.validators.pixKey.length} vectors)`, () => {
  for (const k of V.validators.pixKey) assert.deepEqual(classifyPixKey(k.input), k.expect, JSON.stringify(k.input));
});

test(`swish stored numbers (${V.validators.swishNumber.length} vectors)`, () => {
  for (const s of V.validators.swishNumber) {
    const { url } = buildLink('swish', s.input, { amountMinor: 100, currency: 'SEK', reference: 'x' });
    assert.equal(url != null, s.valid, s.input);
    if (s.valid) assert.equal(new URL(url).searchParams.get('sw'), s.sw, s.input);
  }
});

test(`IBAN display grouping (${V.validators.iban.filter((i) => i.display).length} vectors)`, () => {
  for (const i of V.validators.iban.filter((x) => x.display)) {
    const payment = { methods: [{ id: 'iban', fields: [{ label: 'IBAN', value: i.expect }] }] };
    const [o] = readPayment(payment, { amountMinor: 100, currency: 'EUR' }).options;
    assert.equal(o.rows[0].display, i.display, i.input);
    assert.equal(o.rows[0].copy, i.expect, i.input);
  }
});

test(`sanitise (${V.sanitise.length} vectors)`, () => {
  for (const s of V.sanitise) assert.deepEqual(sanitiseMethods(s.methods), s.expect, s.name);
});

test('sanitise: hostile shapes never throw', () => {
  const junk = [null, undefined, 1, 'x', [], {}, { id: null }, { id: '__proto__' }, { id: 'constructor', label: 'x', fields: [{ label: 'a', value: 'b' }] },
    { id: 'zelle', fields: 'x' }, { id: 'zelle', fields: [null, 1, [], { label: 1, value: 2 }] }, { id: 'pix', key: {} },
    { id: 'link', url: ['https://tikkie.me/x'] }, { id: 'venmo', handle: String.fromCharCode(0xD800) }, { id: 'upi', label: String.fromCharCode(0xDC00), fields: [{ label: 'a', value: 'b' }] }];
  const out = sanitiseMethods(junk);
  assert.deepEqual(out.map((e) => e.id), ['constructor'], 'an id that shadows Object.prototype is just an unknown id');
  assert.equal(out[0].known, false);
  for (const j of junk) assert.doesNotThrow(() => readPayment({ methods: j }, { amountMinor: 1, currency: 'GBP' }));
});

test(`read (${V.read.length} vectors): path, order and every rendered field`, () => {
  for (const r of V.read) {
    const got = readPayment(r.payment, { amountMinor: r.amountMinor, currency: r.currency, reference: r.reference });
    assert.deepEqual(got, r.expect, r.name);
  }
});

test('read: an unknown id is never a link, and no option links off the allow-list', () => {
  const known = new Set(['monzo.me', 'settleup.starlingbank.com', 'revolut.me', 'paypal.me', 'venmo.com', 'cash.app', 'app.swish.nu']);
  for (const r of V.read) {
    for (const o of r.expect.options) {
      if (!METHODS[o.id]) assert.equal(o.url, null, r.name);
      if (o.url) assert.ok(known.has(new URL(o.url).host) || checkLink(o.url), `${r.name}: ${o.url}`);
    }
  }
});

// ── Settle currency (contract section 11). `autoRate` and `defaultRule` are host-only. ──
test(`settle.convert (${V.settle.convert.length} vectors)`, () => {
  for (const c of V.settle.convert) assert.equal(convertMinor(c.minor, c.from, c.to, c.base, c.rate), c.expect, c.name);
});

test(`settle.sanitise (${V.settle.sanitise.length} vectors)`, () => {
  for (const c of V.settle.sanitise) assert.deepEqual(readSettle({ settle: c.settle }, c.billCurrency), c.expect, c.name);
  assert.equal(readSettle({ settle: { ...V.settle.sanitise[0].settle, rate: `4${String.fromCharCode(0xD800)}` } }, 'THB'), null);
  assert.equal(readSettle(null, 'THB'), null);
});

test(`settle.rateParts (${V.settle.rateParts.length} vectors)`, () => {
  for (const c of V.settle.rateParts) assert.deepEqual(rateParts(c.rate, c.base, c.other), c.expect, c.rate);
});

test(`settle.read (${V.settle.read.length} vectors)`, () => {
  for (const r of V.settle.read) {
    const got = readSettledPayment(r.payment, { amountMinor: r.amountMinor, currency: r.currency, reference: r.reference });
    assert.deepEqual(got, r.expect, r.name);
  }
  // A settle the reader can't trust gives exactly the bill-currency plan.
  const [bad, plain] = V.settle.read.slice(-2);
  const { settle: _a, ...badPlan } = bad.expect;
  const { settle: _b, ...plainPlan } = plain.expect;
  assert.deepEqual(badPlan, plainPlan);
});

test('settledShare: what the sheet and share card show', async () => {
  const { settledShare } = await import('./payMethods.js');
  const payment = V.settle.read[0].payment;
  assert.deepEqual(settledShare(payment, 'THB', 1200), { amount: 27.4, currency: 'GBP', minor: 2740, settle: readSettle(payment, 'THB') });
  // UK host, pound bill: nothing new.
  const uk = { monzoUsername: 'kylez', defaultMethod: 'monzo' };
  assert.deepEqual(settledShare(uk, 'GBP', 11), { amount: 11, currency: 'GBP', minor: 1100, settle: null });
});
