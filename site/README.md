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
| `static/css/site.css` | Site styles on top of `tokens.css` (copied from `split-app/src/design` at build) |
| `static/shots/` | App screenshots, `<name>-light.webp` + `<name>-dark.webp` (640px wide) |
| `static/og/` | Generated share images (`og.mjs`) |
| `lib.mjs` | Layout, nav, footer, head tags, structured data (Organization, Person, MobileApplication), faces, art |
| `topics.mjs` | Topic hubs at `/blog/topic/<slug>/`: one per category with 3+ articles, plus keyword clusters (tipping). New articles join automatically |

The build writes only `index.html`, `404.html`, `about/`, `blog/`, `how-to/`, `tools/`, `vs/`, `assets/`,
`sitemap.xml` and `robots.txt`. `tools/` holds only redirect pages: the free calculators were retired
and each old URL forwards to the closest article (`REDIRECTS` in `build.mjs`, which is also where
any other moved URL goes). It never touches `split/`, `privacy/`, `.well-known/`, `CNAME`
or `split.html`.

## Adding an article

1. Write `content/blog/<slug>.md` following `CONTENT_GUIDE.md`.
2. `node build.mjs`, fix any errors or warnings (broken links, missing related slugs).
3. `node --experimental-websocket og.mjs <slug>` for its share image, then build again.
4. Commit the source and the built output together.

## SEO the build handles for you

Every page gets a canonical URL, Open Graph and Twitter tags, the Apple Smart App Banner,
JSON-LD (Organization, WebSite and Person on every page; BlogPosting or TechArticle, FAQPage
and BreadcrumbList on articles), and a sitemap entry whose `lastmod` comes from `updated` or
`date`. The build warns about titles over 60 characters, descriptions outside 110 to 160,
duplicate titles or descriptions, and errors on missing alt text, broken JSON-LD or anything
other than one `<h1>`. When you change an article substantially, set `updated:`.
`/split/` is noindexed in its own HTML, so robots.txt deliberately doesn't block it.

## Adding screenshots

Convert PNGs with `cwebp -q 82 -resize 640 0 in.png -o static/shots/<name>-light.webp` (and `-dark`).
Then use `:::shot <name> | caption` in Markdown.

## The iMessage link preview figure

`:::imessage Title | domain | caption` draws a stylised sent message with a link preview (see
`CONTENT_GUIDE.md`). Markup: `imessage()` in `lib.mjs`; styles: the `.imsg` rules in
`static/css/site.css` (next to `.figure`, plus two dark-mode lines). It uses the receipts art from
`static/art/` on a token-coloured wash, so it follows light and dark mode, and it is one
`role="img"` with an `aria-label`. Never swap in a real venue photo or Google imagery.
