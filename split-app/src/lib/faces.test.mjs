// Face assignment parity + properties. Run: node --test src/lib/
// The vectors are the SAME file the iOS suite (SplitSwiftTests/Owed/FaceTests.swift)
// asserts — regenerate both with `node scripts/gen-face-vectors.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FACES, fnv1a32, normalizedName, faceKey, preferredFace, candidates, assignFaces, tableFaces,
} from './faces.js';

const here = dirname(fileURLToPath(import.meta.url));
const V = JSON.parse(readFileSync(join(here, '__fixtures__/face-vectors.json'), 'utf8'));

test('24 faces, PersonColor order, matching the files in public/faces', () => {
  assert.equal(FACES.length, 24);
  assert.deepEqual(FACES, V.faces);
  assert.equal(FACES[0], 'blue-1');
  assert.equal(FACES[23], 'teal-3');
});

test('FNV-1a 32-bit: published vectors', () => {
  assert.equal(fnv1a32(''), 0x811c9dc5);
  assert.equal(fnv1a32('a'), 0xe40c292c);
  assert.equal(fnv1a32('foobar'), 0xbf9cf968);
  for (const v of V.fnv) assert.equal(fnv1a32(v.input), v.hash, v.input);
});

test('names: normalisation, key, hash, face and candidates match the shared vectors', () => {
  for (const v of V.names) {
    assert.equal(normalizedName(v.name), v.normalized, v.name);
    const key = faceKey({ name: v.name, contactId: v.contactId, id: v.id });
    assert.equal(key, v.key, v.name);
    if (key) {
      assert.equal(fnv1a32(key), v.hash);
      assert.equal(preferredFace(key), v.face);
      assert.deepEqual(candidates(key).slice(0, 6), v.candidates);
    }
  }
});

test('groups and live tables match the shared vectors', () => {
  for (const g of V.groups) assert.deepEqual(assignFaces(g.members), g.faces, g.label);
  for (const t of V.tables) assert.deepEqual(tableFaces(t.guests), t.faces, t.label);
});

test('the same person always gets the same face (case, spacing, accents)', () => {
  const face = (name) => preferredFace(faceKey({ name }));
  assert.equal(face('José García'), face('  jose   GARCIA '));
  assert.equal(face('Sam'), face('SAM\n'));
});

test('candidates: every face exactly once, own family first', () => {
  for (const name of ['Sam', 'Priya', 'Jordan', 'x']) {
    const c = candidates(faceKey({ name }));
    assert.equal(new Set(c).size, 24);
    const family = c[0].split('-')[0];
    assert.ok(c.slice(0, 3).every((f) => f.startsWith(`${family}-`)));
  }
});

test('a table never repeats a face below 25 people, and is order-independent of input', () => {
  const guests = Array.from({ length: 24 }, (_, i) => ({ id: `gst_${String(i).padStart(3, '0')}`, name: `Friend ${i}` }));
  const a = tableFaces(guests);
  assert.equal(new Set(Object.values(a)).size, 24);
  const b = tableFaces([...guests].reverse());
  assert.deepEqual(a, b);
});
