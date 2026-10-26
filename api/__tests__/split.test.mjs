import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
process.chdir(new URL('../..', import.meta.url).pathname);
const { render, venueName } = await import('../split.js');
const shell = readFileSync('split/shell.html', 'utf8');

test('a table with a photo shows its venue and photo', () => {
  const html = render(shell, { storeName: 'RAJAJI', photo: 'https://firebasestorage.googleapis.com/x.jpg' });
  assert.match(html, /<meta property="og:title" content="Rajaji · Tap what you had"/);
  assert.match(html, /<meta property="og:image" content="https:\/\/firebasestorage.googleapis.com\/x.jpg"/);
  assert.doesNotMatch(html, /og:image:width/);
  assert.match(html, /<title>Rajaji · OnlyBills<\/title>/);
  assert.match(html, /<base href="\/split\/" \/>/);
  assert.match(html, /app-clip-bundle-id=guava.SplitSwift.Clip/);
});
test('no table, or no photo, falls back to the OnlyBills card', () => {
  const html = render(shell, null);
  assert.match(html, /og:title" content="Tap what you had"/);
  assert.match(html, /og:image" content="https:\/\/onlybills.app\/split\/link-card.jpg"/);
  const noPhoto = render(shell, { storeName: 'Dishoom Shoreditch' });
  assert.match(noPhoto, /Dishoom Shoreditch · Tap what you had/);
  assert.match(noPhoto, /link-card.jpg/);
});
test('names are escaped and cleaned', () => {
  assert.equal(venueName("NANDO'S & CO"), "Nando's & Co");
  assert.equal(venueName('Receipt'), '');
  const html = render(shell, { storeName: '<script>x</script>', photo: 'http://insecure/x.jpg' });
  assert.doesNotMatch(html, /<script>x/);
  assert.match(html, /link-card.jpg/);
});
