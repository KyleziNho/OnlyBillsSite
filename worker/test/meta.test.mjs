import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isBillPage, tableId, firestoreUrl, trustedPhoto, cleanVenue, previewFor, canonicalUrl } from '../src/meta.js';

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

test('firestore lookup asks for two fields only', () => {
  const s = firestoreUrl('Ab3_x-9QrT', { projectId: 'p', apiKey: 'k' });
  assert.match(s, /\/projects\/p\/databases\/\(default\)\/documents\/sharedReceipts\/Ab3_x-9QrT\?/);
  assert.match(s, /mask\.fieldPaths=storeName/);
  assert.match(s, /mask\.fieldPaths=restaurantPhotoUrl/);
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
  const url = u('/split/index.html?id=Ab3_x-9QrT&p=2&utm_source=x');
  assert.equal(canonicalUrl(tableId(url)), 'https://onlybills.app/split/?id=Ab3_x-9QrT');
  // Defence in depth: anything odd that ever got past ID_PATTERN is percent-encoded.
  assert.equal(canonicalUrl('a"b<c>&d'), 'https://onlybills.app/split/?id=a%22b%3Cc%3E%26d');
});

test('the bill page has no static og:url (the worker adds a per-table one)', () => {
  const html = fs.readFileSync(new URL('../../split/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /property=["']og:url["']/);
});
