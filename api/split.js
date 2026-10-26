// Per-table link previews for onlybills.app/split/?id=<table>.
//
// Messages, WhatsApp and Slack read a link's og: tags from the HTML the server returns
// (they never run JavaScript), so this function serves the split page with the table's
// own restaurant name and photo in its preview tags. Everything else about the page is
// the static build in split/shell.html; the page itself works exactly as before.
//
// The table is read the same way the guest page reads it (public Firestore REST, the
// same web API key), so this function holds no secrets. Any failure falls back to the
// generic OnlyBills card, never an error page.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT = 'onlybills-b8dac';
const API_KEY = process.env.FIREBASE_WEB_API_KEY;
const SHELL = readFileSync(join(process.cwd(), 'split', 'shell.html'), 'utf8');
const FALLBACK_IMAGE = 'https://onlybills.app/split/link-card.jpg';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// "RAJAJI" → "Rajaji"; leaves "Dishoom Shoreditch" alone (receipts often print in capitals).
export function venueName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!name || name.toLowerCase() === 'receipt') return '';
  if (name === name.toUpperCase() && /[A-Z]/.test(name)) {
    return name.toLowerCase().replace(/(^|[\s&-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
  }
  return name;
}

async function fetchTable(id) {
  if (!API_KEY) return null;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/sharedReceipts/${id}?key=${API_KEY}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return null;
    const f = (await res.json()).fields || {};
    return { storeName: f.storeName?.stringValue, photo: f.restaurantPhotoUrl?.stringValue };
  } catch {
    return null;
  }
}

export function render(shell, table) {
  const venue = venueName(table?.storeName);
  const title = venue ? `${venue} · Tap what you had` : 'Tap what you had';
  const photo = table?.photo && /^https:\/\//.test(table.photo) ? table.photo : null;
  const image = photo || FALLBACK_IMAGE;
  let html = shell;
  const set = (attr, key, value) => {
    const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`);
    html = re.test(html) ? html.replace(re, `$1${esc(value)}$2`) : html;
  };
  set('property', 'og:title', title);
  set('name', 'twitter:title', title);
  set('property', 'og:image', image);
  set('name', 'twitter:image', image);
  if (photo) {
    // A restaurant photo's size is unknown; let the reader measure it.
    html = html.replace(/\s*<meta property="og:image:(width|height)" content="[^"]*" \/>/g, '');
  }
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(venue ? `${venue} · OnlyBills` : 'Your share · OnlyBills')}</title>`);
  // The build links its assets relatively; pin them to /split/ so /split (no slash) works too.
  html = html.replace('<head>', '<head>\n    <base href="/split/" />');
  return html;
}

export default async function handler(req, res) {
  const id = String(req.query?.id || '');
  const table = /^[A-Za-z0-9_-]{6,64}$/.test(id) ? await fetchTable(id) : null;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Previews are fetched once per send; a short shared cache keeps Firestore reads low.
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.status(200).send(render(SHELL, table));
}
