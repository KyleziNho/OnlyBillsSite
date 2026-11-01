// What a shared bill link should look like in iMessage / WhatsApp / Slack: the venue's
// name in the title and its photo as the image. Pure functions, no Cloudflare APIs, so
// they run under `node --test`.

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

/**
 * The link's own address for og:url: always https://onlybills.app/split/?id=<id>, with every
 * other parameter dropped (WhatsApp needs og:url for a rich preview, and a per-table URL means
 * each table gets its own cached preview). The id is percent-encoded; callers escape it again
 * for the HTML attribute.
 */
export function canonicalUrl(id) {
  return `https://onlybills.app/split/?id=${encodeURIComponent(id)}`;
}

/** The Firestore REST URL for just the two fields the preview needs. */
export function firestoreUrl(id, { projectId, apiKey }) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/sharedReceipts/${encodeURIComponent(id)}`;
  const params = new URLSearchParams();
  params.append('mask.fieldPaths', 'storeName');
  params.append('mask.fieldPaths', 'restaurantPhotoUrl');
  params.append('key', apiKey);
  return `${base}?${params}`;
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

/**
 * The preview for a Firestore REST document (`{ fields: { storeName: { stringValue } … } }`).
 * Null means "leave the page's own tags alone".
 */
export function previewFor(doc) {
  const fields = doc?.fields ?? {};
  const venue = cleanVenue(fields.storeName?.stringValue);
  const photo = trustedPhoto(fields.restaurantPhotoUrl?.stringValue);
  if (!venue && !photo) return null;
  return {
    title: venue ? `${venue} · Tap what you had` : 'Tap what you had',
    description: 'Tap what you had and pay your share. No app needed.',
    image: photo,                 // null keeps the page's own image (the app icon)
    imageAlt: venue ? `${venue}` : null,
  };
}
