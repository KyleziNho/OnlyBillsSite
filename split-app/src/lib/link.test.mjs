// Link-only requests: status "assigned" docs (a bill the host split in the app and sent as
// links) and per-person links (?id=<doc>&p=<gid>). Run: node --test src/lib/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLive, personFromLink, tablePhase } from './bill.js';

const HOUR = 36e5;
const doc = (extra) => ({
  schemaVersion: 2,
  storeName: 'Dishoom',
  status: 'assigned',
  locked: false,
  items: { itm_000: { order: 0, name: 'Naan', price: 9, qty: 3, claimedBy: { gst_host: true, gst_a1b2c3d4: 2 } } },
  guests: {
    gst_host: { name: 'Kyle', joinedAt: 1 },
    gst_a1b2c3d4: { name: 'Sam', joinedAt: 2 },
    gst_e5f6a7b8: { name: 'Jo', joinedAt: 3 },
  },
  ...extra,
});

test('assigned: no claims or edits, paying open', () => {
  const bill = normalizeLive(doc());
  assert.equal(bill.assigned, true);
  assert.equal(bill.closed, false);
  assert.deepEqual(tablePhase(bill), { phase: 'assigned', canEdit: false, canPay: true });
});

test('assigned stays payable after expiresAt (checked before expiry)', () => {
  const bill = normalizeLive(doc({ expiresAt: new Date(Date.now() - HOUR) }));
  assert.deepEqual(tablePhase(bill), { phase: 'assigned', canEdit: false, canPay: true });
});

test('assigned then closed by the host reads as a normal close', () => {
  const closedAt = new Date(Date.now() - HOUR);
  const bill = normalizeLive(doc({ status: 'closed', locked: true, closedAt }));
  assert.equal(bill.assigned, false);
  assert.deepEqual(tablePhase(bill), { phase: 'closed', canEdit: false, canPay: true });
});

test('assigned but locked is not assigned (locked wins)', () => {
  const bill = normalizeLive(doc({ locked: true }));
  assert.equal(bill.assigned, false);
  assert.equal(tablePhase(bill).phase, 'closed');
});

test('a deleted assigned doc falls through to expired', () => {
  const bill = normalizeLive(doc());
  assert.equal(tablePhase(bill, { denied: true }).phase, 'expired');
});

test('open tables are unchanged', () => {
  const bill = normalizeLive(doc({ status: 'open', expiresAt: new Date(Date.now() + HOUR) }));
  assert.deepEqual(tablePhase(bill), { phase: 'open', canEdit: true, canPay: true });
});

test('personFromLink: the guest the link names', () => {
  const bill = normalizeLive(doc());
  assert.equal(personFromLink(bill, 'gst_a1b2c3d4')?.name, 'Sam');
  assert.equal(personFromLink(bill, 'gst_e5f6a7b8')?.name, 'Jo');
});

test('personFromLink: never the host, unknown or malformed ids', () => {
  const bill = normalizeLive(doc());
  assert.equal(personFromLink(bill, 'gst_host'), null);
  assert.equal(personFromLink(bill, 'gst_zzzz9999'), null);
  assert.equal(personFromLink(bill, 'GST_A1B2C3D4'), null);
  assert.equal(personFromLink(bill, 'gst_a1'), null);
  assert.equal(personFromLink(bill, 'gst_a1b2c3d4/../x'), null);
  assert.equal(personFromLink(bill, ''), null);
  assert.equal(personFromLink(bill, null), null);
  assert.equal(personFromLink(null, 'gst_a1b2c3d4'), null);
});
