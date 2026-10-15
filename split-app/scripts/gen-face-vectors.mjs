// Writes the shared iOS/web face vectors from src/lib/faces.js, into BOTH repos:
//   src/lib/__fixtures__/face-vectors.json
//   <SplitSwift>/SplitSwiftTests/Fixtures/Faces/face-vectors.json
//   node scripts/gen-face-vectors.mjs [path/to/SplitSwift]
// The iOS suite (FaceTests.swift) asserts Swift reproduces every value, so a change on
// either side that breaks parity fails a test. FNV vectors are the published ones.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fnv1a32, normalizedName, faceKey, preferredFace, candidates, assignFaces, tableFaces, FACES } from '../src/lib/faces.js';

const here = dirname(fileURLToPath(import.meta.url));
const iosRepo = process.argv[2] || join(homedir(), 'Desktop/Projects/Apps/OnlyBills/SplitSwift');

const fnv = ['', 'a', 'foobar', 'name:sam', 'Ünïcödé ✓'].map((s) => ({ input: s, hash: fnv1a32(s) }));

const people = [
  { name: 'Sam' }, { name: 'sam ' }, { name: '  SAM  ' }, { name: 'Sam Jones' }, { name: 'Priya' },
  { name: 'Priya Shah' }, { name: 'Jordan' }, { name: 'Mo' }, { name: 'Ellie' }, { name: 'Tom' },
  { name: 'Alex Tester' }, { name: 'José García' }, { name: 'JOSE GARCIA' }, { name: 'Zoë' },
  { name: 'Łukasz' }, { name: 'Søren' }, { name: 'İlker' }, { name: 'ΣΩΚΡΑΤΗΣ' }, { name: 'Ｓａｍ' },
  { name: 'Anne-Marie' }, { name: "O'Brien" }, { name: '王小明' }, { name: '🍕 Pizza Club' },
  { name: 'Sam Jones' }, { name: 'Nadia\tRossi\n' }, { name: 'élodie' },
  { name: '', contactId: 'ABC-123:ABPerson' }, { name: '   ', id: 'gst_k3j2h1' },
  { name: '', id: '6F9619FF-8B86-D011-B42D-00C04FC964FF' }, { name: '' },
];
const names = people.map((p) => {
  const key = faceKey(p);
  return {
    name: p.name, contactId: p.contactId ?? null, id: p.id ?? null,
    normalized: normalizedName(p.name), key,
    hash: key ? fnv1a32(key) : null,
    face: key ? preferredFace(key) : null,
    candidates: key ? candidates(key).slice(0, 6) : [],
  };
});

const m = (name, extra = {}) => ({ key: faceKey({ name }), ...extra });
const groups = [
  { label: 'owed seed', members: ['Alex Tester', 'Sam', 'Priya', 'Jordan', 'Sam Jones', 'Ellie', 'Tom', 'Mo'].map((n) => m(n)) },
  { label: 'same name twice → distinct', members: [m('Sam'), m('sam'), m('SAM')] },
  { label: 'chosen faces reserved first', members: [m('Sam'), m('Priya', { chosen: preferredFace(faceKey({ name: 'Sam' })) }), m('Jordan')] },
  { label: 'photos use no face', members: [m('Sam', { hasPhoto: true }), m('sam'), m('Jordan', { hasPhoto: true, chosen: 'red-2' })] },
  { label: 'no identity → initials', members: [{ key: null }, m('Mo')] },
  { label: '26 people (faces repeat past 24)', members: Array.from({ length: 26 }, (_, i) => m(`Guest ${i + 1}`)) },
].map((g) => ({ ...g, faces: assignFaces(g.members) }));

const tables = [
  { label: 'host + guests (unsorted input)', guests: [
    { id: 'gst_zz9', name: 'Priya' }, { id: 'gst_host', name: 'Alex Tester' },
    { id: 'gst_a01', name: 'Sam' }, { id: 'gst_B02', name: 'sam' }, { id: 'gst_m55', name: 'Jordan' },
  ] },
].map((t) => ({ ...t, faces: tableFaces(t.guests) }));

const out = JSON.stringify({ version: 1, faces: FACES, fnv, names, groups, tables }, null, 2) + '\n';
const web = join(here, '../src/lib/__fixtures__/face-vectors.json');
writeFileSync(web, out);
console.log(`wrote ${web}`);
if (existsSync(iosRepo)) {
  const dir = join(iosRepo, 'SplitSwiftTests/Fixtures/Faces');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'face-vectors.json'), out);
  console.log(`wrote ${join(dir, 'face-vectors.json')}`);
}
