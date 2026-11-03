import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  isBillPage, tableId, personId, revision, firestoreUrl, fromRest, trustedPhoto, cleanVenue, previewFor, canonicalUrl,
} from '../src/meta.js';

const u = (s) => new URL(s, 'https://onlybills.app');
const doc = (storeName, restaurantPhotoUrl) => ({ fields: {
  ...(storeName !== undefined ? { storeName: { stringValue: storeName } } : {}),
  ...(restaurantPhotoUrl !== undefined ? { restaurantPhotoUrl: { stringValue: restaurantPhotoUrl } } : {}),
} });
const photo = 'https://firebasestorage.googleapis.com/v0/b/onlybills-b8dac.firebasestorage.app/o/receipts%2Fabc%2Frestaurant.jpg?alt=media&token=x';

test('only the bill page is touched', () => {
  assert.ok(isBillPage(u('/split/?id=abc123')));
  assert.ok(isBillPage(u('/split?id=abc123')));
  assert.ok(isBillPage(u('/split/index.html?id=abc123')));
  assert.ok(!isBillPage(u('/split/assets/index.js')));
  assert.ok(!isBillPage(u('/')));
  assert.ok(!isBillPage(u('/split.html?id=abc123')));
});

test('table ids: real ones only, never demos', () => {
  assert.equal(tableId(u('/split/?id=Ab3_x-9QrT')), 'Ab3_x-9QrT');
  assert.equal(tableId(u('/split/?demo=2&state=claiming')), null);
  assert.equal(tableId(u('/split/?id=abc123&demo=1')), null);
  assert.equal(tableId(u('/split/')), null);
  assert.equal(tableId(u('/split/?id=../../x')), null);
  assert.equal(tableId(u('/split/?id=abc')), null);
});

const masked = (s) => new URL(s).searchParams.getAll('mask.fieldPaths');

test('firestore lookup asks for the preview fields only', () => {
  const s = firestoreUrl('Ab3_x-9QrT', { projectId: 'p', apiKey: 'k' });
  assert.match(s, /\/projects\/p\/databases\/\(default\)\/documents\/sharedReceipts\/Ab3_x-9QrT\?/);
  assert.deepEqual(masked(s), ['storeName', 'restaurantPhotoUrl', 'status', 'locked']);
});

test('firestore lookup for a per-person link adds what the share needs', () => {
  const s = firestoreUrl('Ab3_x-9QrT', { projectId: 'p', apiKey: 'k', person: 'gst_a1b2c3d4' });
  assert.deepEqual(masked(s), ['storeName', 'restaurantPhotoUrl', 'status', 'locked', 'currency', 'items', 'charges', 'guests']);
});

test('photos: only our own Firebase Storage', () => {
  assert.equal(trustedPhoto(photo), photo);
  assert.equal(trustedPhoto('http://firebasestorage.googleapis.com/x'), null);
  assert.equal(trustedPhoto('https://evil.example/x.jpg'), null);
  assert.equal(trustedPhoto(42), null);
});

test('venue names are tidied', () => {
  assert.equal(cleanVenue('  Saffron\n House '), 'Saffron House');
  assert.equal(cleanVenue('Rajaji Curry House | Indian Restaurant In Washington DC | Indian Curry'), 'Rajaji Curry House');
  assert.equal(cleanVenue('Receipt'), null);
  assert.equal(cleanVenue(''), null);
  assert.equal(cleanVenue('x'.repeat(80)).length, 60);
});

test('preview: venue + photo', () => {
  assert.deepEqual(previewFor(doc('Saffron House', photo)), {
    title: 'Saffron House · Tap what you had',
    description: 'Tap what you had and pay your share. No app needed.',
    image: photo, imageAlt: 'Saffron House',
  });
});

test('preview: venue, no photo keeps the page image', () => {
  const p = previewFor(doc('Dishoom'));
  assert.equal(p.title, 'Dishoom · Tap what you had');
  assert.equal(p.image, null);
});

test('preview: nothing useful leaves the page alone', () => {
  assert.equal(previewFor(doc('Receipt')), null);
  assert.equal(previewFor({}), null);
  assert.equal(previewFor(null), null);
});

test('og:url is the table link with only the id kept', () => {
  const url = u('/split/index.html?id=Ab3_x-9QrT&p=2&x=1&utm_source=x');
  assert.equal(canonicalUrl(tableId(url), personId(url), revision(url)), 'https://onlybills.app/split/?id=Ab3_x-9QrT');
  // Defence in depth: anything odd that ever got past ID_PATTERN is percent-encoded.
  assert.equal(canonicalUrl('a"b<c>&d'), 'https://onlybills.app/split/?id=a%22b%3Cc%3E%26d');
});

test('the bill page has no static og:url (the worker adds a per-table one)', () => {
  const html = fs.readFileSync(new URL('../../split/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /property=["']og:url["']/);
});

// ── Per-person links (&p=) ────────────────────────────────
const str = (v) => ({ stringValue: v });
const map = (o) => ({ mapValue: { fields: o } });
// A REST document shaped like the app's "assigned" request doc: Sam had 2 of 3 naans and
// half the daal; Jo had the rest. Service 12.5% follows the items.
const restDoc = ({ storeName = 'Dishoom', status = 'assigned', locked = false, photo: ph = photo } = {}) => ({ fields: {
  ...(storeName != null ? { storeName: str(storeName) } : {}),
  ...(ph ? { restaurantPhotoUrl: str(ph) } : {}),
  status: str(status),
  locked: { booleanValue: locked },
  currency: str('GBP'),
  items: map({
    itm_000: map({ order: { integerValue: '0' }, name: str('Garlic Naan'), price: { doubleValue: 10.5 }, qty: { integerValue: '3' },
      claimedBy: map({ gst_a1b2c3d4: { integerValue: '2' }, gst_e5f6a7b8: { booleanValue: true } }) }),
    itm_001: map({ order: { integerValue: '1' }, name: str('Black Daal'), price: { doubleValue: 7.9 }, qty: { integerValue: '1' },
      claimedBy: map({ gst_a1b2c3d4: { booleanValue: true }, gst_host: { booleanValue: true } }) }),
  }),
  charges: map({ chg_000: map({ name: str('Service (12.5%)'), amount: { doubleValue: 2.3 }, percent: { doubleValue: 12.5 } }) }),
  guests: map({
    gst_host: map({ name: str('Kyle'), joinedAt: { timestampValue: '2026-11-03T19:00:00Z' } }),
    gst_a1b2c3d4: map({ name: str('Sam'), joinedAt: { timestampValue: '2026-11-03T19:00:01Z' } }),
    gst_e5f6a7b8: map({ name: str('Jo'), joinedAt: { timestampValue: '2026-11-03T19:00:02Z' } }),
  }),
} });

test('personId and revision: only well-formed values', () => {
  assert.equal(personId(u('/split/?id=abc123&p=gst_a1b2c3d4')), 'gst_a1b2c3d4');
  assert.equal(personId(u('/split/?id=abc123&p=2')), null);
  assert.equal(personId(u('/split/?id=abc123&p=gst_A1B2')), null);
  assert.equal(personId(u('/split/?id=abc123')), null);
  assert.equal(revision(u('/split/?id=abc123&r=3')), '3');
  assert.equal(revision(u('/split/?id=abc123&r=x')), null);
});

test('fromRest: REST values as plain JS', () => {
  assert.deepEqual(fromRest({
    a: str('x'), b: { integerValue: '3' }, c: { doubleValue: 1.5 }, d: { booleanValue: false },
    e: { nullValue: null }, f: map({ g: str('y') }), h: { arrayValue: { values: [str('z'), { integerValue: '1' }] } },
    t: { timestampValue: '2026-11-03T19:00:00Z' },
  }), { a: 'x', b: 3, c: 1.5, d: false, e: null, f: { g: 'y' }, h: ['z', 1], t: '2026-11-03T19:00:00Z' });
  assert.deepEqual(fromRest(undefined), {});
});

test('preview with p: the person\'s share, the same maths as the page', () => {
  // Sam: 2/3 of £10.50 = £7.00, half of £7.90 = £3.95 → £10.95 + 12.5% service share.
  const p = previewFor(restDoc(), 'gst_a1b2c3d4');
  assert.equal(p.title, 'Dishoom · Your share £12.32');
  assert.equal(p.description, 'See what you had and pay Kyle. No app needed.');
  assert.equal(p.image, photo);
  assert.equal(p.imageAlt, 'Dishoom');
  assert.equal(previewFor(restDoc(), 'gst_e5f6a7b8').title, 'Dishoom · Your share £3.94');
});

test('preview with p and no venue: "Your share £x"', () => {
  const p = previewFor(restDoc({ storeName: null, photo: null }), 'gst_a1b2c3d4');
  assert.equal(p.title, 'Your share £12.32');
  assert.equal(p.image, null);
});

test('preview with an unknown p (or the host) falls back to the table', () => {
  assert.equal(previewFor(restDoc(), 'gst_zzzz9999').title, 'Dishoom · Find your share');
  assert.equal(previewFor(restDoc(), 'gst_host').title, 'Dishoom · Find your share');
  assert.equal(previewFor(restDoc({ status: 'open' }), 'gst_zzzz9999').title, 'Dishoom · Tap what you had');
});

test('assigned without p: "Find your share"; locked or live tables unchanged', () => {
  const a = previewFor(restDoc());
  assert.equal(a.title, 'Dishoom · Find your share');
  assert.equal(a.description, 'Find your name and pay your share. No app needed.');
  assert.equal(previewFor(restDoc({ status: 'closed', locked: true })).title, 'Dishoom · Tap what you had');
  assert.equal(previewFor(restDoc({ status: 'open' })).title, 'Dishoom · Tap what you had');
});

test('og:url keeps p and r for per-person links', () => {
  const url = u('/split/?id=Ab3_x-9QrT&p=gst_a1b2c3d4&r=2&utm_source=x');
  assert.equal(canonicalUrl(tableId(url), personId(url), revision(url)),
    'https://onlybills.app/split/?id=Ab3_x-9QrT&p=gst_a1b2c3d4&r=2');
  assert.equal(canonicalUrl('Ab3_x-9QrT', 'gst_a1b2c3d4'), 'https://onlybills.app/split/?id=Ab3_x-9QrT&p=gst_a1b2c3d4');
});

test('demo links stay untouched, with or without p', () => {
  assert.equal(tableId(u('/split/?demo=2&state=assigned&p=gst_a3f9c2e1')), null);
  assert.equal(tableId(u('/split/?id=abc123&demo=2&p=gst_a3f9c2e1')), null);
});
