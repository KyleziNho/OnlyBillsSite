// Faces — the same assignment the iOS app makes (SplitSwift/Design/Faces.swift).
// 24 characters, three per colour family, in PersonColor order. A person's face is a pure
// function of their identity, so a guest gets the same face here, on the host's phone and
// on every later bill:
//
//   key  = "name:" + normalised full name   (else "contact:<id>", else "id:<id>")
//   hash = FNV-1a 32-bit over the key's UTF-8 bytes
//   face = FACES[hash % 24]; on a table, a taken face falls to its siblings, then on
//          around the families (host first, then guests by id).
//
// Parity is enforced by shared vectors: src/lib/__fixtures__/face-vectors.json is the
// same file SplitSwiftTests/Fixtures/Faces/face-vectors.json asserts on iOS.

export const FAMILIES = ['blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'teal'];
export const FACES = FAMILIES.flatMap((f) => [1, 2, 3].map((v) => `${f}-${v}`));

const encoder = new TextEncoder();

/** FNV-1a, 32-bit, over UTF-8 bytes. Returns an unsigned 32-bit integer. */
export function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (const byte of encoder.encode(str)) {
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Per code point lowercase → NFKD → drop nonspacing marks → collapse White_Space. */
export function normalizedName(name) {
  let lowered = '';
  for (const ch of String(name ?? '')) lowered += ch.toLowerCase();
  return lowered
    .normalize('NFKD')
    .replace(/\p{Mn}/gu, '')
    .split(/\p{White_Space}+/u)
    .filter(Boolean)
    .join(' ');
}

/** The identity a face hangs off: the name, else a contact id, else an id. */
export function faceKey({ name, contactId, id } = {}) {
  const n = normalizedName(name);
  if (n) return `name:${n}`;
  if (contactId) return `contact:${contactId}`;
  if (id) return `id:${String(id).toLowerCase()}`;
  return null;
}

export const preferredFace = (key) => FACES[fnv1a32(key) % FACES.length];

/** The hashed face, its two siblings, then the next families round (same variant first). */
export function candidates(key) {
  const start = fnv1a32(key) % FACES.length;
  const family = Math.floor(start / 3);
  const variant = start % 3;
  const out = [];
  for (let f = 0; f < FAMILIES.length; f += 1) {
    for (let v = 0; v < 3; v += 1) {
      out.push(FACES[((family + f) % FAMILIES.length) * 3 + ((variant + v) % 3)]);
    }
  }
  return out;
}

/**
 * One face per member, distinct where possible, in member order.
 * members: [{ key, chosen?, hasPhoto? }] → [faceId | null]
 */
export function assignFaces(members) {
  const used = new Set(members.filter((m) => !m.hasPhoto && m.chosen).map((m) => m.chosen));
  return members.map((m) => {
    if (m.hasPhoto) return null;
    if (m.chosen) return m.chosen;
    if (!m.key) return null;
    const pick = candidates(m.key).find((f) => !used.has(f)) ?? preferredFace(m.key);
    used.add(pick);
    return pick;
  });
}

/** A live table: host first, then guests by id. guests: [{ id, name, isHost? }] → { [id]: faceId } */
export function tableFaces(guests, hostId = 'gst_host') {
  const ordered = [...guests].sort((a, b) => {
    const ha = a.isHost || a.id === hostId;
    const hb = b.isHost || b.id === hostId;
    if (ha !== hb) return ha ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const faces = assignFaces(ordered.map((g) => ({ key: faceKey({ name: g.name, id: g.id }) })));
  return Object.fromEntries(ordered.map((g, i) => [g.id, faces[i]]));
}

/** The public URL of a face's image (Vite serves public/ at the base). */
export const faceUrl = (face) => `${import.meta.env?.BASE_URL ?? './'}faces/${face}.webp`;
