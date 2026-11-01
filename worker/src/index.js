// onlybills.app link previews. Sits in front of GitHub Pages on the route onlybills.app/split*.
//
// For a bill link (`/split/?id=<table>`) it looks the table up in Firestore and rewrites
// ONLY the preview tags in <head> (og:title, og:image, og:url, twitter:*, <title>) so iMessage shows
// "Saffron House · Tap what you had" with the venue photo. The page itself (scripts, body,
// assets) passes through byte for byte, so splitting on the website works exactly as before.
//
// Fails open: anything other than a clean, quick answer (no id, a demo, not HTML, Firestore
// slow or down, unknown table, any exception) returns GitHub Pages' response untouched.

import { isBillPage, tableId, firestoreUrl, previewFor, canonicalUrl } from './meta.js';

const LOOKUP_TIMEOUT_MS = 1500;
const CACHE_SECONDS = 300;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const upstream = await fetchOrigin(request, url, env);

    if (request.method !== 'GET' || !isBillPage(url)) return upstream;
    const id = tableId(url);
    if (!id || !upstream.ok) return upstream;
    if (!(upstream.headers.get('content-type') || '').includes('text/html')) return upstream;

    let preview = null;
    try {
      preview = await withTimeout(lookup(id, env, ctx), LOOKUP_TIMEOUT_MS);
    } catch {
      return upstream;
    }
    if (!preview) return upstream;

    try {
      return rewrite(upstream, preview, canonicalUrl(id));
    } catch {
      return upstream;
    }
  },
};

/** GitHub Pages (via the route, or `ORIGIN` when testing locally with `wrangler dev`). */
function fetchOrigin(request, url, env) {
  if (!env.ORIGIN) return fetch(request);
  const target = new URL(url.pathname + url.search, env.ORIGIN);
  return fetch(new Request(target, request));
}

async function lookup(id, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(`https://link-preview.onlybills.internal/v1/${id}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();

  const response = await fetch(firestoreUrl(id, { projectId: env.FIREBASE_PROJECT_ID, apiKey: env.FIREBASE_API_KEY }), {
    cf: { cacheTtl: 0 },
  });
  // 404: unknown table. 403/429/5xx: leave the page alone (and don't cache a failure).
  if (response.status === 404) {
    ctx.waitUntil(cache.put(cacheKey, cached(null)));
    return null;
  }
  if (!response.ok) return null;
  const preview = previewFor(await response.json());
  ctx.waitUntil(cache.put(cacheKey, cached(preview)));
  return preview;
}

function cached(value) {
  return new Response(JSON.stringify(value), {
    headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${CACHE_SECONDS}` },
  });
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/** Swap the preview tags and add og:url; everything else streams through unchanged. */
function rewrite(upstream, preview, pageUrl) {
  const set = (value) => ({ element(el) { el.setAttribute('content', value); } });
  const remove = { element(el) { el.remove(); } };

  let rewriter = new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(`${preview.title} · OnlyBills`); } })
    .on('meta[property="og:title"]', set(preview.title))
    .on('meta[name="twitter:title"]', set(preview.title))
    .on('meta[property="og:description"]', set(preview.description))
    .on('meta[name="twitter:description"]', set(preview.description))
    // WhatsApp needs og:url for a rich preview. It's per table (never a fixed URL in the page
    // itself, or every table would share one cached preview), so it's added here.
    .on('meta[property="og:url"]', remove)
    .on('head', { element(el) { el.append(`<meta property="og:url" content="${escapeAttr(pageUrl)}" />`, { html: true }); } });

  if (preview.image) {
    rewriter = rewriter
      .on('meta[property="og:image"]', {
        element(el) {
          el.setAttribute('content', preview.image);
          if (preview.imageAlt) el.after(`<meta property="og:image:alt" content="${escapeAttr(preview.imageAlt)}" />`, { html: true });
        },
      })
      .on('meta[name="twitter:image"]', set(preview.image))
      // The photo's size isn't known: drop the app icon's 512×512 so apps measure it.
      .on('meta[property="og:image:width"]', remove)
      .on('meta[property="og:image:height"]', remove)
      .on('meta[name="twitter:card"]', set('summary_large_image'));
  }

  const response = rewriter.transform(upstream);
  const headers = new Headers(response.headers);
  // Previews differ per table: never let a shared cache serve one table's head for another.
  headers.set('cache-control', 'no-cache');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
