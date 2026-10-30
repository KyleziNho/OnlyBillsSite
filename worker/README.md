# Link previews for bill links (Cloudflare Worker)

Shared bill links (`https://onlybills.app/split/?id=<table>`) show the venue in iMessage,
WhatsApp and Slack: **"Roti King Battersea · Tap what you had"** with the venue photo.

## What it changes (and what it doesn't)

- Runs only on `onlybills.app/split*`. Everything else (the privacy page, the App Clip's
  `.well-known/apple-app-site-association`) never touches it.
- For a bill link it reads two fields of the table from Firestore (`storeName`,
  `restaurantPhotoUrl`, public reads like the page itself) and rewrites **only** the preview
  tags in `<head>`: `<title>`, `og:title`, `og:description`, `og:image` (+ alt),
  `twitter:*`. The page body, scripts and styles stream through unchanged, so splitting on
  the website works exactly as before.
- Fails open: no id, a `?demo=` link, an unknown table, Firestore slow (>1.5 s) or down, or
  any error → GitHub Pages' page, untouched. Lookups are cached for 5 minutes.
- Only photos from the app's own Firebase Storage bucket are used; no photo keeps the app
  icon. Venue names lose Google SEO tails (`Rajaji | Indian Restaurant In …` → `Rajaji`).

Checked locally (`npm run dev`, live onlybills.app behind it): the head is rewritten for a
real table with and without a photo; demo / unknown / no-id pages are byte-identical to
GitHub Pages; rewritten pages have identical bodies and bundles; the bill renders and works.

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
names, fallbacks).
