// What a shared bill link should look like in iMessage / WhatsApp / Slack: the venue's
// name in the title and its photo as the image. Pure functions, no Cloudflare APIs, so
// they run under `node --test`.
//
// A per-person link (`&p=<gid>`) shows that person's share, worked out by the guest page's
// own money engine (split-app/src/lib, bundled by wrangler) so the preview and the page
// always agree to the penny.
import { liveTotals, normalizeLive, personFromLink, GUEST_ID_PATTERN } from '../../split-app/src/lib/bill.js';
import { formatMoney } from '../../split-app/src/lib/format.js';

/** Table ids the app makes (Firestore auto ids, live table ids). Anything else: no lookup. */
export const ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

/** The bill page lives at /split/ (and its index.html); nothing else is rewritten. */
export function isBillPage(url) {
  const path = url.pathname;
  return path === '/split/' || path === '/split' || path === '/split/index.html';
}

/** The table id from `?id=`, or null when it's missing, a demo, or doesn't look like one. */
export function tableId(url) {
  if (url.searchParams.has('demo')) return null;
  const id = url.searchParams.get('id');
  return id && ID_PATTERN.test(id) ? id : null;
}

/** The guest a per-person link names (`&p=gst_…`), or null when absent or malformed. */
export function personId(url) {
  const p = url.searchParams.get('p');
  return p && GUEST_ID_PATTERN.test(p) ? p : null;
}

/** The link's revision (`&r=<n>`, added by the app after edits to bust preview caches). */
export function revision(url) {
  const r = url.searchParams.get('r');
  return r && /^[0-9]{1,6}$/.test(r) ? r : null;
}

/**
 * The link's own address for og:url: https://onlybills.app/split/?id=<id>, plus `&p=` and
 * `&r=` when the link had them, with every other parameter dropped (WhatsApp needs og:url
 * for a rich preview, and a per-table, per-person URL means each gets its own cached
 * preview). Values are percent-encoded; callers escape it again for the HTML attribute.
 */
export function canonicalUrl(id, p = null, r = null) {
  let url = `https://onlybills.app/split/?id=${encodeURIComponent(id)}`;
  if (p) url += `&p=${encodeURIComponent(p)}`;
  if (r) url += `&r=${encodeURIComponent(r)}`;
  return url;
}

/** Fields every preview reads; a per-person preview also needs the bill to work out a share. */
const BASE_FIELDS = ['storeName', 'restaurantPhotoUrl', 'status', 'locked'];
const PERSON_FIELDS = ['currency', 'items', 'charges', 'guests'];

/** The Firestore REST URL for just the fields the preview needs. */
export function firestoreUrl(id, { projectId, apiKey, person = null }) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/sharedReceipts/${encodeURIComponent(id)}`;
  const params = new URLSearchParams();
  [...BASE_FIELDS, ...(person ? PERSON_FIELDS : [])].forEach((f) => params.append('mask.fieldPaths', f));
  params.append('key', apiKey);
  return `${base}?${params}`;
}

/** A Firestore REST value (`{ stringValue }`, `{ mapValue: { fields } }`, …) as plain JS. */
export function fromValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return fromRest(v.mapValue?.fields);
  if ('arrayValue' in v) return (v.arrayValue?.values || []).map(fromValue);
  return null;
}

/** A REST document's `fields` as a plain object, the shape the guest page reads. */
export function fromRest(fields) {
  const out = {};
  Object.entries(fields || {}).forEach(([k, v]) => { out[k] = fromValue(v); });
  return out;
}

/** Only photos the app uploaded to its own Firebase Storage bucket are used as images. */
export function trustedPhoto(raw) {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (url.hostname !== 'firebasestorage.googleapis.com' && !url.hostname.endsWith('.firebasestorage.app')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** A venue name fit for a title: trimmed, single-line, not too long, never the fallback. */
export function cleanVenue(raw) {
  if (typeof raw !== 'string') return null;
  // Google listing names often carry SEO tails: "Rajaji | Indian Restaurant In …".
  const name = raw.split('|')[0].replace(/\s+/g, ' ').trim();
  if (!name || name === 'Receipt' || name.toLowerCase() === 'receipt not found.') return null;
  return name.length > 60 ? `${name.slice(0, 59).trimEnd()}…` : name;
}

/** "<Venue> · <tail>", or just the tail without a venue. */
const titled = (venue, tail) => (venue ? `${venue} · ${tail}` : tail);

/** The person's share as the guest page shows it, or null when the link doesn't name a guest. */
function shareFor(data, p) {
  if (!p) return null;
  try {
    const bill = normalizeLive(data);
    const guest = personFromLink(bill, p);
    if (!guest) return null;
    const host = bill.guests.find((g) => g.isHost);
    const hostName = host && host.name !== 'Guest' ? host.name : null;
    return { amount: formatMoney(liveTotals(bill).totalFor(guest.id), bill.currency), hostName };
  } catch {
    return null;
  }
}

/**
 * The preview for a Firestore REST document (`{ fields: { storeName: { stringValue } … } }`),
 * for the person `p` names when it's a per-person link. Null means "leave the page's own
 * tags alone".
 *  - per person:          "<Venue> · Your share £4.38" ("Your share £4.38" without a venue)
 *  - assigned, no person: "<Venue> · Find your share"
 *  - live table:          "<Venue> · Tap what you had" (unchanged)
 */
export function previewFor(doc, p = null) {
  const data = fromRest(doc?.fields);
  const venue = cleanVenue(data.storeName);
  const photo = trustedPhoto(data.restaurantPhotoUrl);
  const image = { image: photo, imageAlt: venue || null };   // null keeps the page's own image (the app icon)

  const share = shareFor(data, p);
  if (share) {
    return {
      title: titled(venue, `Your share ${share.amount}`),
      description: `See what you had and pay ${share.hostName || 'your share'}. No app needed.`,
      ...image,
    };
  }

  if (!venue && !photo) return null;
  if (data.status === 'assigned' && data.locked !== true) {
    return {
      title: titled(venue, 'Find your share'),
      description: 'Find your name and pay your share. No app needed.',
      ...image,
    };
  }
  return {
    title: titled(venue, 'Tap what you had'),
    description: 'Tap what you had and pay your share. No app needed.',
    ...image,
  };
}
