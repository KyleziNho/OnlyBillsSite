// The share card's "Show breakdown": one guest's lines and amounts, which must add up to
// exactly their total. Run: node --test src/lib/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveTotals, normalizeLive } from './bill.js';
import { toMinor } from './money.js';

// The production test bill (Lidl, sent as links): Sam owes £3.96.
const lidl = {
  schemaVersion: 2, storeName: 'Lidl', status: 'assigned', locked: false, currency: 'GBP',
  guests: {
    gst_host: { name: 'Kyle', joinedAt: 1 },
    gst_5a3c91d2: { name: 'Sam', joinedAt: 2, addedByHost: true },
    gst_7b2e40f8: { name: 'Jordan', joinedAt: 3, addedByHost: true },
    gst_9c1d6a3e: { name: 'Priya', joinedAt: 4, addedByHost: true },
  },
  items: {
    itm_000: { order: 0, name: 'Chicken Breast Fillets 300g', price: 2.29, qty: 1, claimedBy: { gst_5a3c91d2: true } },
    itm_001: { order: 1, name: 'Basmati Rice 1kg', price: 3.58, qty: 2, claimedBy: { gst_host: 1, gst_7b2e40f8: 1 } },
    itm_002: { order: 2, name: 'Smoked Tofu', price: 1.89, qty: 1, claimedBy: { gst_9c1d6a3e: true } },
    itm_003: { order: 3, name: 'Oatly Barista 1.5L', price: 2.79, qty: 1, claimedBy: { gst_host: true } },
    itm_004: { order: 4, name: 'Alpro Vanilla', price: 1.79, qty: 1, claimedBy: { gst_7b2e40f8: true } },
    itm_005: { order: 5, name: 'Mixed Peppers', price: 1.99, qty: 1, claimedBy: { gst_9c1d6a3e: true, gst_host: true, gst_5a3c91d2: true } },
    itm_006: { order: 6, name: 'Cool Mint Mouthwash', price: 0.89, qty: 1, claimedBy: { gst_5a3c91d2: true } },
    itm_007: { order: 7, name: 'Limes Loose', price: 0.23, qty: 1, claimedBy: { gst_5a3c91d2: true, gst_7b2e40f8: true } },
  },
  charges: {},
};

const sumsToTotal = (bill, totals, gid) => {
  const b = totals.breakdownFor(gid);
  const minor = [...b.items, ...b.charges].reduce((s, r) => s + toMinor(r.amount, bill.currency), 0);
  assert.equal(minor, totals.totalMinorFor(gid), `${gid} lines sum to their total`);
  assert.equal(b.total, totals.totalFor(gid));
  return b;
};

test('Sam on the Lidl bill: four lines, £3.96', () => {
  const bill = normalizeLive(lidl);
  const totals = liveTotals(bill);
  const b = sumsToTotal(bill, totals, 'gst_5a3c91d2');
  assert.equal(b.total, 3.96);
  assert.deepEqual(b.items.map((r) => [r.name, r.detail]), [
    ['Chicken Breast Fillets 300g', null],
    ['Mixed Peppers', 'Split 3 ways · £1.99'],
    ['Cool Mint Mouthwash', null],
    ['Limes Loose', 'Split 2 ways · £0.23'],
  ]);
  assert.equal(b.items[0].amount, 2.29);
  assert.equal(b.items[2].amount, 0.89);
  assert.equal(b.items[1].amount + b.items[3].amount, 0.78);
  assert.deepEqual(b.charges, []);
});

test('a unit claim reads "1 of 2"; every guest sums exactly', () => {
  const bill = normalizeLive(lidl);
  const totals = liveTotals(bill);
  const jordan = sumsToTotal(bill, totals, 'gst_7b2e40f8');
  // One each of a ×2 line with the host: "1 of 2", not "Split 2 ways".
  assert.equal(jordan.items.find((r) => r.name === 'Basmati Rice 1kg').detail, '1 of 2 · £3.58');
  bill.guests.forEach((g) => sumsToTotal(bill, totals, g.id));

  const solo = normalizeLive({ ...lidl, items: { ...lidl.items, itm_001: { ...lidl.items.itm_001, claimedBy: { gst_7b2e40f8: 1 } } } });
  const r = liveTotals(solo).breakdownFor('gst_7b2e40f8').items.find((x) => x.name === 'Basmati Rice 1kg');
  assert.equal(r.detail, '1 of 2 · £3.58');
  assert.equal(r.amount, 1.79);
  assert.equal(r.qty, 1);
});

test('over-claimed units are shared out, so they read "Split N ways"', () => {
  const bill = normalizeLive({ ...lidl, items: { ...lidl.items, itm_001: { ...lidl.items.itm_001, claimedBy: { gst_host: 1, gst_7b2e40f8: 1, gst_9c1d6a3e: 1 } } } });
  const totals = liveTotals(bill);
  const r = sumsToTotal(bill, totals, 'gst_7b2e40f8').items.find((x) => x.name === 'Basmati Rice 1kg');
  assert.equal(r.detail, 'Split 3 ways · £3.58');
});

test('a whole ×2 line keeps its quantity and no sub-label', () => {
  const bill = normalizeLive({ ...lidl, items: { ...lidl.items, itm_001: { ...lidl.items.itm_001, claimedBy: { gst_7b2e40f8: 2 } } } });
  const r = liveTotals(bill).breakdownFor('gst_7b2e40f8').items.find((x) => x.name === 'Basmati Rice 1kg');
  assert.equal(r.detail, null);
  assert.equal(r.qty, 2);
  assert.equal(r.amount, 3.58);
});

test('service and discounts appear as rows and still sum exactly', () => {
  const bill = normalizeLive({
    ...lidl,
    charges: {
      chg_svc: { order: 0, name: 'Service 12.5%', kind: 'service', amount: 1.93, percent: 12.5 },
      chg_off: { order: 1, name: 'Voucher', kind: 'discount', amount: -2 },
    },
  });
  const totals = liveTotals(bill);
  bill.guests.forEach((g) => {
    const b = sumsToTotal(bill, totals, g.id);
    assert.equal(b.charges.length, 2, `${g.name} has a service and a discount row`);
  });
  const sam = totals.breakdownFor('gst_5a3c91d2');
  const by = Object.fromEntries(sam.charges.map((c) => [c.kind, c.amount]));
  assert.ok(by.service > 0, 'service adds');
  assert.ok(by.discount < 0, 'a discount takes off');
});

test('someone with nothing claimed has an empty breakdown', () => {
  const bill = normalizeLive({ ...lidl, guests: { ...lidl.guests, gst_00000000: { name: 'Alex', joinedAt: 5 } } });
  const b = sumsToTotal(bill, liveTotals(bill), 'gst_00000000');
  assert.deepEqual(b.items, []);
  assert.equal(b.total, 0);
});
