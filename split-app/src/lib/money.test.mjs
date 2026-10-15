// Money parity + property tests. Run: node --test src/lib/
// The fixtures are the SAME file the iOS suite (SplitSwiftTests/Money/MoneyParityTests.swift)
// asserts — refresh with `node scripts/sync-money-fixtures.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  billMath, chargeKind, linkAmountMinor, parseAmount, splitBill, toMinor, scale,
} from './money.js';
import { liveTotals, normalizeLive, percentChargeRefresh } from './bill.js';
import { linkAmount } from './format.js';

const here = dirname(fileURLToPath(import.meta.url));
const F = JSON.parse(readFileSync(join(here, '__fixtures__/money-cases.json'), 'utf8'));
const z = (x) => (Object.is(x, -0) ? 0 : x);
const zs = (xs) => xs.map(z);

const engineBill = (c) => ({
  currency: c.currency,
  lines: c.lines.map((l) => ({ id: l.id, name: l.name, quantity: l.quantity, amount: l.amount, discount: l.discount || 0 })),
  charges: c.charges.map((ch) => ({ ...ch })),
});
const allocationsOf = (c) => c.allocations.map((row) => Object.fromEntries(row.map((a) => [a.party, a.units])));

test('catalogue: every archetype matches the exact-rational ground truth', () => {
  for (const c of F.catalogue) {
    const cur = c.currency;
    const lines = c.lines.map((l, i) => {
      const discount = toMinor(l.discount, cur);
      return { id: `l${i}`, name: l.name, quantity: l.quantity, amount: toMinor(l.net, cur) + discount, discount };
    });
    const charges = c.charges.map((ch) => ({ name: ch.name, kind: chargeKind(ch.kind, ch.name, ch.amount), amount: toMinor(ch.amount, cur) }));
    // units = fraction × quantity (same expression order as the Swift suite)
    const units = c.allocations.map((row, i) => Object.fromEntries(row.map((a) => [a.party, (a.num / a.den) * lines[i].quantity])));
    const res = splitBill({ currency: cur, lines, charges }, c.parties.length, units);
    assert.equal(res.total, toMinor(c.expect.total, cur), `${c.id} total`);
    c.parties.forEach((name, p) => {
      assert.equal(res.parties[p].total, toMinor(Number(c.expect.parties[name]), cur), `${c.id} ${name}`);
    });
    assert.equal(z(res.unassigned.total), 0, `${c.id} fully assigned`);
  }
});

test('engine cases: targets, percentages, included VAT, overflow, spread lines', () => {
  for (const c of F.engine) {
    const res = splitBill(engineBill(c), c.partyCount, allocationsOf(c));
    const m = billMath(engineBill(c));
    const e = c.expect;
    assert.equal(res.total, e.total, `${c.id} total`);
    assert.equal(m.netItems, e.netItems, `${c.id} net items`);
    assert.deepEqual(zs(m.lineNet), e.lineNet, `${c.id} line nets`);
    assert.deepEqual(zs(m.chargeMinor), e.charges, `${c.id} charges`);
    assert.equal(z(m.overflow), e.overflow, `${c.id} overflow`);
    assert.deepEqual(res.spread, e.spread, `${c.id} spread`);
    e.parties.forEach((ep, p) => {
      const got = res.parties[p];
      assert.equal(got.total, ep.total, `${c.id} p${p} total`);
      assert.equal(got.subtotal, ep.subtotal, `${c.id} p${p} subtotal`);
      assert.deepEqual(zs(got.lines), ep.lines, `${c.id} p${p} lines`);
      assert.deepEqual(zs(got.savings), ep.savings, `${c.id} p${p} savings`);
      assert.deepEqual(zs(got.charges), ep.charges, `${c.id} p${p} charges`);
    });
    assert.equal(res.unassigned.total, e.unassigned.total, `${c.id} unassigned`);
  }
});

test('random bills: identical to the reference engine', () => {
  for (const c of F.random) {
    const res = splitBill(engineBill(c), c.partyCount, allocationsOf(c));
    assert.equal(res.total, c.expect.total, `${c.id} total`);
    c.expect.parties.forEach((ep, p) => {
      assert.equal(res.parties[p].total, ep.total, `${c.id} p${p}`);
      assert.deepEqual(zs(res.parties[p].charges), ep.charges, `${c.id} p${p} charges`);
      assert.deepEqual(zs(res.parties[p].lines), ep.lines, `${c.id} p${p} lines`);
    });
    assert.equal(res.unassigned.total, c.expect.unassigned.total, `${c.id} unassigned`);
  }
});

test('live docs: liveTotals == LiveBill (shared expectations)', () => {
  for (const c of F.live) {
    const bill = normalizeLive(c.doc);
    const t = liveTotals(bill);
    const cur = bill.currency;
    const e = c.expect;
    assert.equal(toMinor(t.itemsSubtotal, cur), e.itemsSubtotal, `${c.id} items`);
    assert.equal(toMinor(t.chargesNet, cur), e.chargesNet, `${c.id} charges`);
    assert.equal(toMinor(t.grandTotal, cur), e.grandTotal, `${c.id} grand`);
    assert.equal(toMinor(t.unclaimedValue, cur), e.unclaimed, `${c.id} unclaimed`);
    for (const [gid, minor] of Object.entries(e.guests)) assert.equal(t.totalMinorFor(gid), minor, `${c.id} ${gid}`);
    assert.deepEqual(t.charges.map((ch) => toMinor(ch.amount, cur)), e.chargeAmounts, `${c.id} charge amounts`);
    const sumGuests = Object.values(e.guests).reduce((s, x) => s + x, 0);
    assert.equal(sumGuests + toMinor(t.unclaimedValue, cur), toMinor(t.grandTotal, cur), `${c.id} sums to the bill`);
  }
});

test('percent charges: stored amount refreshed for older readers (B6)', () => {
  const c = F.live.find((x) => x.id === 'L-percent-service-recomputes');
  const bill = normalizeLive(c.doc);
  assert.deepEqual(percentChargeRefresh(bill, bill.items), { 'charges.chg_000.amount': 3.63 });
  const fewer = bill.items.slice(0, 2);
  assert.deepEqual(percentChargeRefresh(bill, fewer), { 'charges.chg_000.amount': 2.94 });
});

test('parsing: thousands separators and comma decimals (B12)', () => {
  for (const [text, cur, want] of F.parse) assert.equal(parseAmount(text, cur), want, `${text} ${cur}`);
});

test('charge kinds resolve identically', () => {
  for (const [raw, name, amount, want] of F.kinds) assert.equal(chargeKind(raw, name, amount), want, `${raw}/${name}`);
});

test('payment link amounts use the currency precision (B17)', () => {
  for (const [minor, cur, want] of F.links) assert.equal(linkAmountMinor(minor, cur), want, `${minor} ${cur}`);
  assert.equal(linkAmount(333.34, 'JPY'), '333');
  assert.equal(linkAmount(24.6, 'GBP'), '24.60');
});

// ── Property tests (own PRNG; deterministic) ─────────────
const prng = (seed) => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

test('property: Σ shares == total, non-negative, deterministic, item savings only to sharers', () => {
  const rnd = prng(42);
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  for (let n = 0; n < 2000; n += 1) {
    const cur = ['GBP', 'JPY', 'KWD', 'EUR'][int(0, 3)];
    const lines = [];
    const nl = int(1, 15);
    for (let i = 0; i < nl; i += 1) {
      const amount = rnd() < 0.07 ? -int(1, 10 * scale(cur)) : int(0, 80 * scale(cur));
      const discount = amount > 0 && rnd() < 0.25 ? int(0, amount + (rnd() < 0.1 ? 500 : 0)) : 0;
      lines.push({ id: `l${i}`, name: `L${i}`, quantity: [1, 2, 3, 0, 0.5][int(0, 4)], amount, discount });
    }
    const kinds = ['tax', 'service', 'tip', 'discount', 'rounding', 'other'];
    const charges = [];
    for (let k = 0; k < int(0, 4); k += 1) {
      const kind = kinds[int(0, 5)];
      const c = { name: `C${k}`, kind, amount: (kind === 'discount' ? -1 : 1) * int(1, 20 * scale(cur)) };
      if (rnd() < 0.3) c.percent = [5, 10, 12.5, 20][int(0, 3)];
      if (kind === 'discount' && rnd() < 0.3) c.targets = [`l${int(0, nl - 1)}`];
      charges.push(c);
    }
    const parties = int(1, 7);
    const alloc = lines.map(() => {
      const row = {};
      const who = int(0, parties);
      for (let k = 0; k < who; k += 1) row[int(0, parties - 1)] = [1, 0.5, 1 / 3, 2][int(0, 3)];
      return row;
    });
    const bill = { currency: cur, lines, charges };
    const a = splitBill(bill, parties, alloc);
    const b = splitBill(bill, parties, alloc);
    assert.deepEqual(a, b, 'deterministic');
    const sumTotals = a.parties.reduce((s, p) => s + p.total, 0) + a.unassigned.total;
    assert.equal(sumTotals, a.total, 'Σ totals + unassigned == bill total');
    assert.ok(a.total >= 0);
    for (const p of [...a.parties, a.unassigned]) {
      assert.ok(p.total >= 0, 'non-negative total');
      assert.equal(p.subtotal + p.charges.reduce((s, x) => s + x, 0), p.total, 'breakdown adds up');
      p.savings.forEach((s, i) => {
        if (p.lines[i] === 0 && p.savings[i] !== 0) {
          // a party with no slice of a line can't get its saving
          const hasShare = Object.keys(alloc[i]).length > 0;
          assert.ok(hasShare || p === a.unassigned, 'saving without a share');
        }
        assert.ok(s >= -1, 'savings never meaningfully negative');
      });
    }
    // Parties who were never allocated a discounted line get no item savings.
    a.parties.forEach((p, idx) => {
      lines.forEach((ln, i) => {
        if (!(idx in alloc[i])) assert.equal(z(p.savings[i]), 0, 'no item saving for non-sharers');
      });
    });
  }
});
