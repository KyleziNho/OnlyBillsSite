// Builds the marketing site into the repo root (GitHub Pages serves it as-is).
// Run: cd site && npm install && node build.mjs
// Writes ONLY: index.html, 404.html, about/, blog/, how-to/, tools/, assets/, sitemap.xml,
// robots.txt. Never touches split/, privacy/, .well-known/, CNAME or split.html.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { SITE, esc, abs, fmtDate, art, shot, video, layout, appCta, crumbs, crumbsLd, icons, face, ORG } from './lib.mjs';
import { homePage } from './pages/home.mjs';
import { toolPages } from './pages/tools.mjs';
import { aboutPage } from './pages/about.mjs';
import { vsPage } from './pages/vs.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_DIRS = ['about', 'blog', 'how-to', 'tools', 'vs', 'assets'];
const errors = [];
const warn = [];

// ── Assets ──────────────────────────────────────────────
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}
for (const d of OUT_DIRS) fs.rmSync(path.join(ROOT, d), { recursive: true, force: true });
copyDir(path.join(HERE, 'static'), path.join(ROOT, 'assets'));
// Shared with the guest page so colours and pennies never drift.
fs.copyFileSync(path.join(ROOT, 'split-app/src/design/tokens.css'), path.join(ROOT, 'assets/css/tokens.css'));
fs.mkdirSync(path.join(ROOT, 'assets/js'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'split-app/src/lib/money.js'), path.join(ROOT, 'assets/js/money.js'));
fs.copyFileSync(path.join(ROOT, 'split-app/src/lib/faces.js'), path.join(ROOT, 'assets/js/faces.js'));
const assetsV = crypto.createHash('sha1')
  .update(fs.readFileSync(path.join(ROOT, 'assets/css/site.css')))
  .update(fs.readFileSync(path.join(ROOT, 'assets/js/site.js')))
  .update(fs.readFileSync(path.join(ROOT, 'assets/js/tools.js')))
  .update(fs.readFileSync(path.join(ROOT, 'assets/js/money.js')))
  .update(fs.readFileSync(path.join(ROOT, 'assets/css/tokens.css')))
  .digest('hex').slice(0, 8);
const ogFor = (key) => (fs.existsSync(path.join(HERE, 'static/og', key + '.jpg')) ? abs(`/assets/og/${key}.jpg`) : undefined);
const SHOTS = new Set(fs.readdirSync(path.join(HERE, 'static/shots')).map((f) => f.replace(/-(light|dark)\.webp$/, '')));

const pages = []; // { path, lastmod, priority }
function write(p, html, meta = {}) {
  const file = p.endsWith('/') ? path.join(ROOT, p, 'index.html') : path.join(ROOT, p);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (!meta.skipSitemap) pages.push({ path: p, lastmod: meta.lastmod, priority: meta.priority ?? 0.6 });
}

// ── Markdown with OnlyBills blocks ──────────────────────
function parseFront(src, file) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) { errors.push(`${file}: missing frontmatter`); return { data: {}, body: src }; }
  const data = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (mm) data[mm[1]] = mm[2].trim().replace(/^["']|["']$/g, '');
  }
  return { data, body: src.slice(m[0].length) };
}

const TOOLS = {
  split: ['/tools/split-bill-calculator/', 'Split the bill calculator', 'Add who had what. Service and shared dishes split to the penny.', icons.calc],
  overpay: ['/tools/overpay-calculator/', 'Does splitting equally cost you?', 'Five quick taps for your estimated yearly overpay.', icons.pound],
  tip: ['/tools/tip-calculator/', 'Tip and service charge calculator', 'Work out 10, 12.5 or 15% and each person’s share.', icons.heart],
  service: ['/tools/service-charge-calculator/', 'Service charge calculator', 'Add 12.5% to a bill, or find the service inside a total.', icons.calc],
  settle: ['/tools/settle-up-calculator/', 'Who owes who calculator', 'Who paid what, and the fewest payments to settle up.', icons.pound],
};
const toolCard = (key) => {
  const t = TOOLS[key];
  if (!t) { errors.push(`unknown tool "${key}"`); return ''; }
  return `<a class="card tool-link" href="${t[0]}"><span class="tool-icon">${t[3]}</span><span><b>${esc(t[1])}</b><span>${esc(t[2])}</span></span><span class="chev" aria-hidden="true">›</span></a>`;
};
const inline = (s) => marked.parseInline(s.trim());
const statCard = (parts, cls) => {
  const [num, label, source] = parts.split('|').map((x) => x.trim());
  if (!source) warn.push(`stat "${num}" has no source`);
  return `<div class="card ${cls}"><span class="num">${esc(num)}</span><p>${inline(label || '')}</p>${source ? `<cite>${inline(source)}</cite>` : ''}</div>`;
};

function renderBody(md, file) {
  const lines = md.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let m;
    if ((m = line.match(/^:::stat\s+(.+)$/))) { out.push('', statCard(m[1], 'stat-big'), ''); continue; }
    if (/^:::stats\s*$/.test(line)) {
      const cards = [];
      for (i += 1; i < lines.length && !/^:::\s*$/.test(lines[i]); i += 1) {
        const l = lines[i].replace(/^\s*-\s*/, '');
        if (l.trim()) cards.push(statCard(l, 'stat-card'));
      }
      out.push('', `<div class="stat-strip">${cards.join('')}</div>`, '');
      continue;
    }
    if ((m = line.match(/^:::shot\s+([\w-]+)\s*(?:\|\s*(.*))?$/))) {
      if (!SHOTS.has(m[1])) { errors.push(`${file}: unknown screenshot "${m[1]}"`); continue; }
      const cap = m[2] || '';
      out.push('', `<figure class="figure">${shot(m[1], cap.replace(/[*_`]/g, ''), 280)}${cap ? `<figcaption>${inline(cap)}</figcaption>` : ''}</figure>`, '');
      continue;
    }
    if ((m = line.match(/^:::video\s+([\w-]+)\s*(?:\|\s*(.*))?$/))) {
      if (!fs.existsSync(path.join(HERE, 'static/video', m[1] + '-light.mp4'))) { errors.push(`${file}: unknown video "${m[1]}"`); continue; }
      const cap = m[2] || '';
      out.push('', `<figure class="figure">${video(m[1], cap.replace(/[*_`]/g, ''), 280)}${cap ? `<figcaption>${inline(cap)}</figcaption>` : ''}</figure>`, '');
      continue;
    }
    if (/^:::note\s*$/.test(line)) {
      const inner = [];
      for (i += 1; i < lines.length && !/^:::\s*$/.test(lines[i]); i += 1) inner.push(lines[i]);
      out.push('', `<div class="note"><div>${marked.parse(inner.join('\n'))}</div></div>`, '');
      continue;
    }
    if ((m = line.match(/^:::cta\s*(.*)$/))) { out.push('', appCta(m[1] || undefined, undefined, 'article-inline'), ''); continue; }
    if ((m = line.match(/^:::tool\s+(\w+)\s*$/))) { out.push('', toolCard(m[1]), ''); continue; }
    if (/^:::/.test(line)) { errors.push(`${file}: unknown block "${line}"`); continue; }
    out.push(line);
  }
  return out.join('\n');
}

const slugify = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const stripTags = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

/** Splits off "## FAQ" and "## Sources", renders the rest, returns pieces for the template. */
function renderArticle(body, file) {
  const sections = { main: [], faq: [], sources: [] };
  let cur = 'main';
  for (const line of body.split('\n')) {
    if (/^##\s+(FAQ|Frequently asked questions)\s*$/i.test(line)) { cur = 'faq'; continue; }
    if (/^##\s+Sources\s*$/i.test(line)) { cur = 'sources'; continue; }
    if (/^##\s+/.test(line) && cur !== 'main') cur = 'main';
    sections[cur].push(line);
  }
  let html = marked.parse(renderBody(sections.main.join('\n'), file));
  const toc = [];
  html = html.replace(/<h2>(.*?)<\/h2>/g, (_, inner) => {
    const id = slugify(inner);
    toc.push([id, stripTags(inner)]);
    return `<h2 id="${id}">${inner}</h2>`;
  });
  html = html.replace(/<h3>(.*?)<\/h3>/g, (_, inner) => `<h3 id="${slugify(inner)}">${inner}</h3>`);
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
  // Comparison tables: ✓ / ✗ cells become styled marks with words for screen readers.
  html = html.replace(/<td([^>]*)>\s*✓\s*<\/td>/g, '<td$1 class="mark yes"><span aria-hidden="true">✓</span><span class="visually-hidden">Yes</span></td>')
    .replace(/<td([^>]*)>\s*✗\s*<\/td>/g, '<td$1 class="mark no"><span aria-hidden="true">✗</span><span class="visually-hidden">No</span></td>')
    .replace(/<div class="table-wrap"><table>(?=[\s\S]*?class="mark)/g, '<div class="table-wrap"><table class="compare">');
  html = html.replace(/<a href="(https?:\/\/(?!onlybills\.app)[^"]+)"/g, '<a href="$1" rel="noopener"');

  const faqs = [];
  let q = null;
  for (const line of sections.faq) {
    const m = line.match(/^###\s+(.+)$/);
    if (m) { q = { q: m[1].trim(), a: [] }; faqs.push(q); } else if (q) q.a.push(line);
  }
  faqs.forEach((f) => { f.html = marked.parse(renderBody(f.a.join('\n').trim(), file)); });
  const sourcesHtml = sections.sources.join('\n').trim()
    ? marked.parse(sections.sources.join('\n')).replace(/<a href="(https?:[^"]+)"/g, '<a href="$1" rel="noopener"') : '';
  const words = stripTags(html).split(/\s+/).length + faqs.reduce((n, f) => n + stripTags(f.html).split(/\s+/).length, 0);
  return { html, faqs, sourcesHtml, toc, words };
}

function lint(file, text) {
  text.split('\n').forEach((l, i) => {
    if (/[—–]/.test(l)) errors.push(`${file}:${i + 1}: em/en dash: ${l.trim().slice(0, 80)}`);
  });
  const banned = /\b(effortless(ly)?|seamless(ly)?|game[- ]changer|delightful|elevate|unlock|say goodbye to|in today's|let's dive|dive in)\b/gi;
  const hits = text.match(banned);
  if (hits) warn.push(`${file}: wording to avoid: ${[...new Set(hits.map((h) => h.toLowerCase()))].join(', ')}`);
}

function loadDir(dir, kind) {
  const full = path.join(HERE, 'content', dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter((f) => f.endsWith('.md')).map((f) => {
    const src = fs.readFileSync(path.join(full, f), 'utf8');
    const rel = `content/${dir}/${f}`;
    lint(rel, src);
    const { data, body } = parseFront(src, rel);
    for (const k of ['title', 'description', 'date']) if (!data[k]) errors.push(`${rel}: missing ${k}`);
    if (data.description && (data.description.length < 90 || data.description.length > 175)) warn.push(`${rel}: description is ${data.description.length} chars`);
    const slug = f.replace(/\.md$/, '');
    return { kind, slug, file: rel, ...data, path: `/${dir}/${slug}/`, ...renderArticle(body, rel) };
  });
}

const posts = loadDir('blog', 'blog').sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title));
const tuts = loadDir('how-to', 'how-to').sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
const all = new Map([...posts, ...tuts].map((p) => [p.slug, p]));

// ── Article / tutorial pages ────────────────────────────
const postCard = (p, eager = false) => `<a class="card post-card" href="${p.path}" data-cat="${esc(p.category || '')}">
  <div class="thumb">${art(p.art || 'receipts', 120, eager)}</div>
  <div class="body"><span class="meta">${esc(p.category || (p.kind === 'how-to' ? 'Tutorial' : 'Article'))}</span><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p></div>
</a>`;

function articlePage(p) {
  const isTut = p.kind === 'how-to';
  const section = isTut ? ['How it works', '/how-to/'] : ['Articles', '/blog/'];
  const trail = [['Home', '/'], section, [p.title, p.path]];
  const mins = Math.max(2, Math.round(p.words / 230));
  const related = (p.related || '').split(',').map((s) => s.trim()).filter(Boolean)
    .map((s) => { const r = all.get(s); if (!r) warn.push(`${p.file}: related "${s}" not found`); return r; })
    .filter(Boolean).slice(0, 3);
  if (related.length < 3) {
    const pool = (isTut ? tuts : posts).filter((x) => x !== p && !related.includes(x) && (isTut || x.category === p.category));
    const extra = [...pool, ...posts.filter((x) => x !== p && !related.includes(x))];
    for (const x of extra) { if (related.length >= 3) break; if (!related.includes(x)) related.push(x); }
  }
  const tutNav = isTut ? (() => {
    const i = tuts.indexOf(p); const next = tuts[i + 1];
    return next ? `<a class="card tool-link" href="${next.path}"><span class="tool-icon"><span class="num" style="font-weight:700">${i + 2}</span></span><span><span>Next tutorial</span><b>${esc(next.title)}</b></span><span class="chev" aria-hidden="true">›</span></a>` : '';
  })() : '';

  const ld = [crumbsLd(trail), {
    '@type': isTut ? 'TechArticle' : 'Article',
    headline: p.title,
    description: p.description,
    datePublished: p.date,
    dateModified: p.updated || p.date,
    inLanguage: 'en-GB',
    mainEntityOfPage: abs(p.path),
    image: ogFor(p.slug) || abs('/assets/img/og-card.jpg'),
    author: { '@type': 'Person', name: SITE.author, url: abs('/about/'), sameAs: [SITE.linkedin] },
    publisher: { '@id': SITE.url + '/#org' },
    wordCount: p.words,
    ...(p.category ? { articleSection: p.category } : {}),
  }];
  if (p.faqs.length) ld.push({ '@type': 'FAQPage', mainEntity: p.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: stripTags(f.html) } })) });

  const tocLabel = (t) => t.replace(/^\d+\.\s*/, '');
  const toc = !isTut && p.toc.length >= 4 ? `<details class="card toc"><summary><b>On this page</b><span class="quiet small">${p.toc.length + (p.faqs.length ? 1 : 0)} sections</span></summary><ul>${p.toc.map(([id, t]) => `<li><a href="#${id}">${esc(tocLabel(t))}</a></li>`).join('')}${p.faqs.length ? '<li><a href="#faq">Questions people ask</a></li>' : ''}</ul></details>` : '';

  const body = `
<article>
  <div class="wrap wrap-prose">
    <header class="article-head">
      ${crumbs(trail)}
      ${art(p.art || 'receipts', 140, true)}
      <span class="eyebrow">${esc(isTut ? 'Tutorial' : p.category || 'Article')}</span>
      <h1 class="h1">${esc(p.title)}</h1>
      <p class="lede">${esc(p.description)}</p>
      <div class="byline"><img src="/assets/img/maker-avatar.jpg" width="40" height="40" alt=""><span><b><a href="/about/" style="color:inherit">Kyle</a>, founder of OnlyBills</b>${p.updated ? 'Updated ' + fmtDate(p.updated) : fmtDate(p.date)} · ${mins} min read</span></div>
    </header>
    <div class="prose">
      ${toc}
      ${p.html}
      ${p.faqs.length ? `<h2 id="faq">Questions people ask</h2><div class="faq">${p.faqs.map((f) => `<details><summary>${esc(f.q)}</summary><div class="answer">${f.html}</div></details>`).join('')}</div>` : ''}
      ${tutNav}
      ${appCta(isTut ? 'Try it on your next bill' : undefined, undefined, isTut ? 'tutorial-end' : 'article-end')}
      ${p.sourcesHtml ? `<h2 id="sources">Sources</h2><div class="sources">${p.sourcesHtml}</div>` : ''}
      <div class="share-row"><span>Share</span><button type="button" data-share data-title="${esc(p.title)}">${icons.link}<span>Copy link</span></button><a href="https://wa.me/?text=${encodeURIComponent(p.title + ' ' + abs(p.path))}" rel="noopener">WhatsApp</a></div>
    </div>
  </div>
</article>
<section class="section-tight">
  <div class="wrap">
    <div class="section-head left"><h2 class="h3">Keep reading</h2></div>
    <div class="cards">${related.map((r) => postCard(r)).join('')}</div>
  </div>
</section>`;
  write(p.path, layout({ path: p.path, title: p.seoTitle || p.title, description: p.description, body, schema: ld, ogType: 'article', ogImage: ogFor(p.slug), current: section[1], assetsV,
    extraHead: `<meta property="article:published_time" content="${p.date}">${p.updated ? `<meta property="article:modified_time" content="${p.updated}">` : ''}` }),
  { lastmod: p.updated || p.date, priority: isTut ? 0.7 : 0.6 });
}
[...posts, ...tuts].forEach(articlePage);

// ── Index pages ─────────────────────────────────────────
{
  const cats = [...new Set(posts.map((p) => p.category).filter(Boolean))];
  const trail = [['Home', '/'], ['Articles', '/blog/']];
  const body = `
<section class="section-tight">
  <div class="wrap">
    <div class="section-head">
      ${art('receipts', 140, true)}
      <h1 class="h1">Articles</h1>
      <p class="lede">The maths, manners and research behind splitting the bill. Written for real dinners with real friends.</p>
    </div>
    ${cats.length > 1 ? `<div class="filters" role="group" aria-label="Filter by topic"><button type="button" aria-pressed="true" data-filter="">All</button>${cats.map((c) => `<button type="button" aria-pressed="false" data-filter="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    <div class="cards" data-filterable>${posts.map((p, i) => postCard(p, i < 3)).join('')}</div>
  </div>
</section>`;
  write('/blog/', layout({ path: '/blog/', title: 'Articles on splitting the bill, tipping and money with friends', description: 'Fair ways to split a bill, UK tipping and service charge rules, research on why groups overspend, and scripts for asking friends to pay you back.', body, current: '/blog/', assetsV,
    schema: [crumbsLd(trail), { '@type': 'CollectionPage', name: 'OnlyBills articles', url: abs('/blog/'), hasPart: posts.map((p) => ({ '@type': 'Article', headline: p.title, url: abs(p.path) })) }] }), { priority: 0.8 });
}
{
  const trail = [['Home', '/'], ['How it works', '/how-to/']];
  const body = `
<section class="section-tight">
  <div class="wrap wrap-prose">
    <div class="section-head">
      ${art('scan', 140, true)}
      <h1 class="h1">How OnlyBills works</h1>
      <p class="lede">Short tutorials with screenshots. Start with the first one and you'll be splitting your next bill properly.</p>
    </div>
    <div class="group tut-list">${tuts.map((t, i) => `<a class="row" href="${t.path}" style="--sep-inset:68px"><span class="tut-num">${i + 1}</span><span class="row-body"><span class="row-title">${esc(t.title)}</span><span class="row-sub">${esc(t.summary || t.description)}</span></span><span class="chev" aria-hidden="true">›</span></a>`).join('')}</div>
    <p class="foot" style="text-align:center;margin-top:20px">Friend sent you a link? You don't need the app: <a href="/how-to/claim-your-items-without-the-app/">here's how claiming works</a>.</p>
  </div>
</section>`;
  write('/how-to/', layout({ path: '/how-to/', title: 'How to use OnlyBills: tutorials', description: 'Step-by-step OnlyBills tutorials: scan a receipt, share a live table, split shared dishes and service, get paid back by Monzo, Starling, Revolut or PayPal.', body, current: '/how-to/', assetsV,
    schema: [crumbsLd(trail), { '@type': 'ItemList', itemListElement: tuts.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(t.path), name: t.title })) }] }), { priority: 0.8 });
}

// ── Home, tools, about, 404 ─────────────────────────────
const ctx = { ogFor, posts, tuts, postCard, assetsV, write, layout, warn, errors };
homePage(ctx);
toolPages(ctx);
aboutPage(ctx);
vsPage(ctx);
// Old URLs that moved: a tiny page that forwards (GitHub Pages has no server redirects).
for (const [from, to] of [['/blog/onlybills-vs-splitwise/', '/vs/splitwise/']]) {
  write(from, `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Moved</title><link rel="canonical" href="${abs(to)}"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${to}"><script>location.replace('${to}' + location.hash)</script></head><body><a href="${to}">This page has moved</a></body></html>`, { skipSitemap: true });
}
write('/404.html', layout({ path: '/404.html', title: 'Page not found', description: 'That page has wandered off.', noindex: true, assetsV, body: `
<section class="section"><div class="wrap"><div class="section-head">${art('allclear', 160, true)}<h1 class="h1">This page has left the table</h1><p class="lede">It may have moved. Try the home page or one of these.</p><div class="btn-row" style="justify-content:center"><a class="btn btn-primary" href="/">Go home</a><a class="btn btn-secondary" href="/blog/">Read articles</a></div></div></div></section>` }), { skipSitemap: true });

// ── Feeds, sitemap, robots ──────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const extraUrls = [{ path: '/privacy/', priority: 0.3 }];
const urls = [...pages, ...extraUrls].sort((a, b) => a.path.localeCompare(b.path));
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${abs(u.path)}</loc><lastmod>${u.lastmod || today}</lastmod><priority>${u.priority.toFixed(1)}</priority></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /split/
Disallow: /split.html

Sitemap: ${abs('/sitemap.xml')}
`);
fs.writeFileSync(path.join(ROOT, 'blog/feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>OnlyBills articles</title>
<link>${abs('/blog/')}</link>
<atom:link href="${abs('/blog/feed.xml')}" rel="self" type="application/rss+xml"/>
<description>Splitting the bill, tipping and money with friends.</description>
<language>en-gb</language>
${posts.slice(0, 30).map((p) => `<item><title>${esc(p.title)}</title><link>${abs(p.path)}</link><guid>${abs(p.path)}</guid><pubDate>${new Date(p.date + 'T09:00:00Z').toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('\n')}
</channel>
</rss>
`);

// ── Report ──────────────────────────────────────────────
// Every page's built HTML is linted for dashes too (templates, tools).
for (const pg of pages) {
  const f = pg.path.endsWith('/') ? path.join(ROOT, pg.path, 'index.html') : path.join(ROOT, pg.path);
  const visible = fs.readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  if (/[—–]/.test(visible)) errors.push(`${pg.path}: em/en dash in built page`);
  // Internal links must resolve.
  for (const [, href] of visible.matchAll(/href="(\/[^"#?]*)/g)) {
    if (href.startsWith('/split') || href.startsWith('/assets/') || href === '/privacy/' || href.endsWith('.xml') || href.endsWith('.html')) continue;
    if (!fs.existsSync(path.join(ROOT, href, 'index.html'))) warn.push(`${pg.path}: broken link ${href}`);
  }
}
const uniq = (xs) => [...new Set(xs)];
console.log(`Built ${pages.length} pages (${posts.length} articles, ${tuts.length} tutorials). Assets v${assetsV}.`);
if (warn.length) console.log('Warnings:\n  ' + uniq(warn).join('\n  '));
if (errors.length) { console.error('Errors:\n  ' + uniq(errors).join('\n  ')); process.exitCode = 1; }
