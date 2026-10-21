# onlybills.app marketing site

Static site generated into the repo root. GitHub Pages serves the repo as-is, so the built
HTML is committed.

```sh
cd site
npm install                                   # once (marked)
node build.mjs                                # builds everything; fails on em/en dashes, unknown blocks
node --experimental-websocket og.mjs          # share images for new pages (needs Chrome; --force redoes all)
node build.mjs                                # again, so pages pick up their share images
cd .. && python3 -m http.server 8765          # preview at http://127.0.0.1:8765
```

## What lives where

| Path | What |
|---|---|
| `content/blog/*.md` | Articles → `/blog/<slug>/`. Format and voice rules: `CONTENT_GUIDE.md` |
| `content/how-to/*.md` | Tutorials → `/how-to/<slug>/` (ordered by `order`) |
| `pages/home.mjs` | Home page (`/`) and its FAQ |
| `pages/tools.mjs` | Calculator pages (`/tools/…`), their copy and FAQ |
| `static/js/tools.js` | Calculator logic. Money goes through `money.js` (copied from `split-app/src/lib` at build) |
| `static/css/site.css` | Site styles on top of `tokens.css` (copied from `split-app/src/design` at build) |
| `static/shots/` | App screenshots, `<name>-light.webp` + `<name>-dark.webp` (640px wide) |
| `static/og/` | Generated share images (`og.mjs`) |
| `lib.mjs` | Layout, nav, footer, structured data helpers, faces, art |

The build writes only `index.html`, `404.html`, `about/`, `blog/`, `how-to/`, `tools/`, `assets/`,
`sitemap.xml` and `robots.txt`. It never touches `split/`, `privacy/`, `.well-known/`, `CNAME`
or `split.html`.

## Adding an article

1. Write `content/blog/<slug>.md` following `CONTENT_GUIDE.md`.
2. `node build.mjs`, fix any errors or warnings (broken links, missing related slugs).
3. `node --experimental-websocket og.mjs <slug>` for its share image, then build again.
4. Commit the source and the built output together.

## Adding screenshots

Convert PNGs with `cwebp -q 82 -resize 640 0 in.png -o static/shots/<name>-light.webp` (and `-dark`).
Then use `:::shot <name> | caption` in Markdown.
