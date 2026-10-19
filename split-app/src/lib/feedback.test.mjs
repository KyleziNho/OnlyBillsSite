import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedbackDoc, MAX_CONTACT, MAX_MESSAGE } from './feedback.js';

const allowed = new Set(['message', 'source', 'screen', 'platform', 'appVersion', 'os', 'device', 'createdAt', 'contact', 'mood']);

test('note has only the keys the rules allow, trimmed', () => {
  const doc = feedbackDoc({ message: '  Lovely page \n', contact: ' sam@example.com ', screen: 'live:open' }, 'NOW');
  assert.ok(Object.keys(doc).every((k) => allowed.has(k)));
  assert.equal(doc.message, 'Lovely page');
  assert.equal(doc.contact, 'sam@example.com');
  assert.equal(doc.source, 'web');
  assert.equal(doc.platform, 'web');
  assert.equal(doc.createdAt, 'NOW');
});

test('no reply way: no contact key', () => {
  assert.equal('contact' in feedbackDoc({ message: 'Hi', screen: 'static' }, 'NOW'), false);
});

test('long text is capped to the rule limits', () => {
  const doc = feedbackDoc({ message: 'a'.repeat(5000), contact: 'b'.repeat(500), screen: 'c'.repeat(100) }, 'NOW');
  assert.equal(doc.message.length, MAX_MESSAGE);
  assert.equal(doc.contact.length, MAX_CONTACT);
  assert.equal(doc.screen.length, 60);
});
