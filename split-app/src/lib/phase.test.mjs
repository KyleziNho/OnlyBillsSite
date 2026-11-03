// Table phases from the guest's side, including "Kyle's splitting this one" (status
// "hostSplit", written by the app's "Split it myself instead"). Run: node --test src/lib/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLive, tablePhase } from './bill.js';

const doc = (extra) => ({ schemaVersion: 2, storeName: 'Rajaji', items: {}, guests: { gst_host: { name: 'Kyle' } }, ...extra });

test('hostSplit: closed, no claims, no paying here', () => {
  const bill = normalizeLive(doc({ locked: true, status: 'hostSplit' }));
  assert.equal(bill.closed, true);
  assert.equal(bill.hostSplit, true);
  assert.deepEqual(tablePhase(bill), { phase: 'closed', canEdit: false, canPay: false, hostSplit: true });
});

test('A normal Finish is unchanged: paying stays open', () => {
  const bill = normalizeLive(doc({ locked: true, status: 'closed', closedAt: null }));
  assert.equal(bill.hostSplit, false);
  assert.deepEqual(tablePhase(bill), { phase: 'closed', canEdit: false, canPay: true });
});
