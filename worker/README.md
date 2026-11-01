# Link previews for bill links (Cloudflare Worker)

Shared bill links (`https://onlybills.app/split/?id=<table>`) show the venue in iMessage,
WhatsApp and Slack: **"Roti King Battersea · Tap what you had"** with the venue photo.

## What it changes (and what it doesn't)

- Runs only on `onlybills.app/split*`. Everything else (the privacy page, the App Clip's
  `.well-known/apple-app-site-association`) never touches it.
- For a bill link it reads two fields of the table from Firestore (`storeName`,
  `restaurantPhotoUrl`, public reads like the page itself) and rewrites **only** the preview
  tags in `<head>`: `<title>`, `og:title`, `og:description`, `og:image` (+ alt),
  `twitter:*`, and adds `og:url`. The page body, scripts and styles stream through unchanged, so splitting on
  the website works exactly as before.
- Fails open: no id, a `?demo=` link, an unknown table, Firestore slow (>1.5 s) or down, or
  any error → GitHub Pages' page, untouched. Lookups are cached for 5 minutes.
- Only photos from the app's own Firebase Storage bucket are used; no photo keeps the app
  icon. Venue names lose Google SEO tails (`Rajaji | Indian Restaurant In …` → `Rajaji`).

Checked locally (`npm run dev`, live onlybills.app behind it): the head is rewritten for a
real table with and without a photo; demo / unknown / no-id pages are byte-identical to
GitHub Pages; rewritten pages have identical bodies and bundles; the bill renders and works.

## og:url (for WhatsApp)

WhatsApp only builds a rich preview when the page has a non-empty `og:url` (Meta's link
preview docs; it also wants the image under 600 KB, at least 300 px wide, no wider than 4:1).
Whenever the worker rewrites a bill page's tags it adds

    <meta property="og:url" content="https://onlybills.app/split/?id=<id>" />

built by `canonicalUrl()` in `src/meta.js`: the table's own link with every other parameter
dropped and the id escaped. **Never put a fixed `og:url` in `split/index.html` or
`split-app/index.html`**: apps key their preview cache on it, so every table would share one
preview. A test fails if the page ever gains one. Pages the worker leaves alone (demo, unknown
table, Firestore slow) still have no `og:url`, so WhatsApp may show a plain link for those.

Because `og:url` drops extra parameters, the `&p=2` re-test trick below may not refresh a
WhatsApp preview; test WhatsApp with a table it hasn't seen.

### Deploying this change (the worker isn't deployed from git)

From `worker/` on the branch that has this change:

1. `npm test` (all pass).
2. `npx wrangler@4.20.0 whoami`; if it isn't your account, `npx wrangler@4.20.0 login`.
3. `npx wrangler@4.20.0 deploy` (same as `npm run deploy`). It replaces the live
   `onlybills-link-previews` worker on the route `onlybills.app/split*`.
4. Check a real table, with a throwaway parameter to skip any cache:
   `curl -s 'https://onlybills.app/split/?id=<real id>&x=1' | grep -o '<meta property="og:[a-z:]*" content="[^"]*"'`
   should show `og:url` = `https://onlybills.app/split/?id=<real id>` (no `&x=1`), plus the
   venue title. `curl -s 'https://onlybills.app/split/?demo=2' | grep -c og:url` should print 0.
5. Send a fresh table link in WhatsApp (and iMessage) and check the preview.

Roll back: `npx wrangler@4.20.0 rollback` (or Cloudflare dashboard → Workers →
`onlybills-link-previews` → Deployments → roll back to the previous version).

## Deploy (one-off, about 15 minutes)

1. **Cloudflare account** (free plan) → *Add a site* → `onlybills.app`.
2. **DNS**: recreate the GitHub Pages records exactly, all **Proxied** (orange cloud):
   - `A @ 185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME www → kylezinho.github.io` (if you use www)
   - plus anything else at the current DNS host (email MX/TXT, verification records).
3. **SSL/TLS** → mode **Full**. Keep "Enforce HTTPS" on in GitHub Pages settings.
4. At Porkbun (your registrar), switch the nameservers to the two Cloudflare gives you. Wait for
   Cloudflare to say the site is active. onlybills.app should look exactly the same.
5. From this folder: `npx wrangler@4.20.0 login`, then `npm run deploy`. The route
   `onlybills.app/split*` is in `wrangler.toml`.
6. Test: paste a real bill link into Messages. iMessage caches previews per URL, so add a
   throwaway parameter when re-testing (`…&p=2`).

Undo: Cloudflare dashboard → Workers → `onlybills-link-previews` → delete the route (or the
worker). The site keeps working from GitHub Pages either way.

Notes:
- **GitHub Pages certificate**: behind Cloudflare's proxy GitHub can't always renew its
  certificate. With SSL mode **Full** (not *Full (strict)*) that doesn't break the site.
- **Google Places photos**: many venue photos come from Places, whose terms restrict storing
  and re-serving them and expect attribution. Tables already store a copy; previews make it
  public. Options: use only the host's own photos, or a branded image with the venue name.

## Tests

`npm test` (Node 20): the preview rules in `src/meta.js` (which links, ids, trusted photos,
names, fallbacks, the og:url), and that `split/index.html` has no static `og:url`.
