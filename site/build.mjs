// Builds the marketing site into the repo root (GitHub Pages serves it as-is).
// Run: cd site && npm install && node build.mjs
// Writes ONLY: index.html, 404.html, about/, blog/, how-to/, tools/ (redirects), vs/, assets/,
// sitemap.xml, robots.txt. Never touches split/, privacy/, .well-known/, CNAME or split.html.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { SITE, esc, abs, fmtDate, art, shot, video, imessage, layout, appCta, crumbs, crumbsLd, icons, face, ORG, AUTHOR } from './lib.mjs';
import { resolveTopics } from './topics.mjs';
import { homePage } from './pages/home.mjs';
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
const assetsV = crypto.createHash('sha1')
  .update(fs.readFileSync(path.join(ROOT, 'assets/css/site.css')))
  .update(fs.readFileSync(path.join(ROOT, 'assets/js/site.js')))
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
    if ((m = line.match(/^:::imessage\s+(.+)$/))) {
      const [title, domain, cap = ''] = m[1].split('|').map((x) => x.trim());
      if (!title || !domain) { errors.push(`${file}: :::imessage needs "title | domain | caption"`); continue; }
      out.push('', `<figure class="figure imsg-figure">${imessage(title, domain)}${cap ? `<figcaption>${inline(cap)}</figcaption>` : ''}</figure>`, '');
      continue;
    }
    if (/^:::note\s*$/.test(line)) {
      const inner = [];
      for (i += 1; i < lines.length && !/^:::\s*$/.test(lines[i]); i += 1) inner.push(lines[i]);
      out.push('', `<div class="note"><div>${marked.parse(inner.join('\n'))}</div></div>`, '');
      continue;
    }
    if ((m = line.match(/^:::cta\s*(.*)$/))) { out.push('', appCta(m[1] || undefined, undefined, 'article-inline'), ''); continue; }
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
// `h` is the card's heading level: 3 under a section h2, 2 straight under the page h1.
const postCard = (p, eager = false, h = 3) => `<a class="card post-card" href="${p.path}" data-cat="${esc(p.category || '')}">
  <div class="thumb">${art(p.art || 'receipts', 120, eager)}</div>
  <div class="body"><span class="meta">${esc(p.category || (p.kind === 'how-to' ? 'Tutorial' : 'Article'))}</span><h${h}>${esc(p.title)}</h${h}><p>${esc(p.description)}</p></div>
</a>`;

// Topic hubs (topics.mjs): category pages plus cross-category clusters such as tipping.
const topics = resolveTopics(posts);
const hubOf = (p) => topics.find((t) => t.category && t.category === p.category);

function articlePage(p) {
  const isTut = p.kind === 'how-to';
  const section = isTut ? ['How it works', '/how-to/'] : ['Articles', '/blog/'];
  const hub = isTut ? null : hubOf(p);
  const trail = [['Home', '/'], section, ...(hub ? [[hub.name, hub.path]] : []), [p.title, p.path]];
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

  const ogImg = ogFor(p.slug);
  const ld = [crumbsLd(trail), {
    '@type': isTut ? 'TechArticle' : 'BlogPosting',
    '@id': abs(p.path) + '#article',
    headline: p.title,
    description: p.description,
    datePublished: p.date,
    dateModified: p.updated || p.date,
    inLanguage: 'en-GB',
    mainEntityOfPage: { '@type': 'WebPage', '@id': abs(p.path) },
    image: ogImg ? { '@type': 'ImageObject', url: ogImg, width: 1200, height: 630 } : { '@type': 'ImageObject', url: abs('/assets/img/og-card.jpg'), width: 1200, height: 800 },
    author: AUTHOR,
    publisher: { '@id': SITE.url + '/#org' },
    isPartOf: { '@type': isTut ? 'CollectionPage' : 'Blog', '@id': abs(section[1]) + '#' + (isTut ? 'tutorials' : 'blog'), name: isTut ? 'OnlyBills tutorials' : 'OnlyBills articles', url: abs(section[1]) },
    wordCount: p.words,
    ...(isTut ? { about: { '@id': SITE.url + '/#app' } } : {}),
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
      ${hub ? `<a class="eyebrow" href="${hub.path}">${esc(p.category)}</a>` : `<span class="eyebrow">${esc(isTut ? 'Tutorial' : p.category || 'Article')}</span>`}
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
    extraHead: `<meta property="article:published_time" content="${p.date}">
<meta property="article:modified_time" content="${p.updated || p.date}">
<meta property="article:author" content="${abs('/about/')}">${p.category ? `
<meta property="article:section" content="${esc(p.category)}">` : ''}` }),
  { lastmod: p.updated || p.date, priority: isTut ? 0.7 : 0.6 });
}
[...posts, ...tuts].forEach(articlePage);

// ── Index pages ─────────────────────────────────────────
const newest = (list) => list.map((p) => p.updated || p.date).filter(Boolean).sort().pop();
const topicLink = (t) => `<a class="card tool-link" href="${t.path}"><span class="tool-icon">${art(t.art || 'receipts', 40)}</span><span><b>${esc(t.name)}</b><span>${t.posts.length} articles</span></span><span class="chev" aria-hidden="true">›</span></a>`;
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
    <div class="cards" data-filterable>${posts.map((p, i) => postCard(p, i < 3, 2)).join('')}</div>
    ${topics.length ? `<div class="section-head" style="margin-top:56px"><h2 class="h3">Browse by topic</h2></div>
    <div class="topic-links">${topics.map(topicLink).join('')}</div>` : ''}
  </div>
</section>`;
  write('/blog/', layout({ path: '/blog/', title: 'Articles on splitting the bill and tipping in the UK', description: 'Fair ways to split a bill, UK tipping and service charge rules, research on why groups overspend, and scripts for asking friends to pay you back.', body, current: '/blog/', assetsV,
    schema: [crumbsLd(trail), { '@type': ['CollectionPage', 'Blog'], '@id': abs('/blog/') + '#blog', name: 'OnlyBills articles', url: abs('/blog/'), inLanguage: 'en-GB', publisher: { '@id': SITE.url + '/#org' },
      blogPost: posts.map((p) => ({ '@type': 'BlogPosting', '@id': abs(p.path) + '#article', headline: p.title, url: abs(p.path), datePublished: p.date })) }] }),
  { priority: 0.8, lastmod: newest(posts) });
}
// Topic hub pages: /blog/topic/<slug>/
for (const t of topics) {
  const trail = [['Home', '/'], ['Articles', '/blog/'], [t.name, t.path]];
  const others = topics.filter((x) => x !== t);
  const body = `
<section class="section-tight">
  <div class="wrap">
    <div class="section-head">
      ${crumbs(trail)}
      ${art(t.art || 'receipts', 140, true)}
      <h1 class="h1">${esc(t.name)}</h1>
      <p class="lede">${esc(t.lede)}</p>
    </div>
    <div class="cards">${t.posts.map((p, i) => postCard(p, i < 3, 2)).join('')}</div>
    <div class="section-head" style="margin-top:56px"><h2 class="h3">More topics</h2></div>
    <div class="topic-links">${others.map(topicLink).join('')}<a class="card tool-link" href="/blog/"><span class="tool-icon">${icons.link}</span><span><b>All articles</b><span>Everything we have written, newest first.</span></span><span class="chev" aria-hidden="true">›</span></a></div>
  </div>
</section>`;
  write(t.path, layout({ path: t.path, title: t.title, description: t.description, body, current: '/blog/', assetsV, ogImage: ogFor('topic-' + t.slug),
    schema: [crumbsLd(trail), { '@type': 'CollectionPage', '@id': abs(t.path), name: t.name, url: abs(t.path), description: t.description, inLanguage: 'en-GB', isPartOf: { '@id': abs('/blog/') + '#blog' },
      mainEntity: { '@type': 'ItemList', numberOfItems: t.posts.length, itemListElement: t.posts.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(p.path), name: p.title })) } }] }),
  { priority: 0.7, lastmod: newest(t.posts) });
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
    schema: [crumbsLd(trail), { '@type': 'CollectionPage', '@id': abs('/how-to/') + '#tutorials', name: 'OnlyBills tutorials', url: abs('/how-to/'), inLanguage: 'en-GB', about: { '@id': SITE.url + '/#app' },
      mainEntity: { '@type': 'ItemList', itemListElement: tuts.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(t.path), name: t.title })) } }] }),
  { priority: 0.8, lastmod: newest(tuts) });
}

// ── Home, about, 404 ────────────────────────────────────
const ctx = { ogFor, posts, tuts, topics, postCard, assetsV, write, layout, warn, errors };
homePage(ctx);
aboutPage(ctx);
vsPage(ctx);
// Old URLs that moved: a tiny page that forwards (GitHub Pages has no server redirects).
// The free calculators under /tools/ were retired; each forwards to the closest article.
const REDIRECTS = [
  ['/blog/onlybills-vs-splitwise/', '/vs/splitwise/'],
  ['/tools/', '/blog/how-to-split-a-bill-fairly/'],
  ['/tools/split-bill-calculator/', '/how-to/split-a-bill-with-onlybills/'],
  ['/tools/overpay-calculator/', '/blog/splitting-the-bill-equally-cost/'],
  ['/tools/tip-calculator/', '/blog/how-much-to-tip-uk/'],
  ['/tools/service-charge-calculator/', '/blog/split-service-charge-fairly/'],
  ['/tools/settle-up-calculator/', '/how-to/track-who-owes-you/'],
];
for (const [from, to] of REDIRECTS) {
  if (!fs.existsSync(path.join(ROOT, to, 'index.html'))) errors.push(`redirect ${from} points at missing page ${to}`);
  write(from, `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Moved</title><link rel="canonical" href="${abs(to)}"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${to}"><script>location.replace('${to}' + location.hash)</script></head><body><a href="${to}">This page has moved</a></body></html>`, { skipSitemap: true });
}
write('/404.html', layout({ path: '/404.html', title: 'Page not found', description: 'That page has wandered off.', noindex: true, assetsV, body: `
<section class="section"><div class="wrap"><div class="section-head">${art('allclear', 160, true)}<h1 class="h1">This page has left the table</h1><p class="lede">It may have moved. Try the home page or one of these.</p><div class="btn-row" style="justify-content:center"><a class="btn btn-primary" href="/">Go home</a><a class="btn btn-secondary" href="/blog/">Read articles</a></div></div></div></section>` }), { skipSitemap: true });

// ── Feeds, sitemap, robots ──────────────────────────────
const today = new Date().toISOString().slice(0, 10);
// lastmod must only move when a page really changes, or search engines learn to ignore it.
// Articles use `updated`/`date`; index and hub pages their newest article; template pages
// (home, about) the last commit of their source, or today if it has uncommitted edits.
const gitDate = (...files) => {
  try {
    const rel = files.map((f) => path.relative(ROOT, path.join(HERE, f)));
    if (execFileSync('git', ['status', '--porcelain', '--', ...rel], { cwd: ROOT, encoding: 'utf8' }).trim()) return today;
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...rel], { cwd: ROOT, encoding: 'utf8' }).trim() || today;
  } catch { return today; }
};
const TEMPLATE_DATES = { '/': ['pages/home.mjs'], '/about/': ['pages/about.mjs'] };
for (const u of pages) {
  if (u.lastmod) continue;
  const src = TEMPLATE_DATES[u.path];
  u.lastmod = src ? gitDate(...src) : today;
}
const extraUrls = [{ path: '/privacy/', priority: 0.3, lastmod: gitDate('../privacy/index.html') }];
const urls = [...pages, ...extraUrls].sort((a, b) => a.path.localeCompare(b.path));
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${abs(u.path)}</loc><lastmod>${u.lastmod || today}</lastmod><priority>${u.priority.toFixed(1)}</priority></url>`).join('\n')}
</urlset>
`);
// /split/ (per-table guest bills) and /split.html carry <meta name="robots" content="noindex">.
// They are deliberately NOT disallowed here: a robots.txt block would stop Google reading that
// noindex, and blocked URLs can still be indexed from links ("Indexed, though blocked").
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *
Allow: /

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
// Every page's built HTML is linted for dashes too (templates).
for (const pg of pages) {
  const f = pg.path.endsWith('/') ? path.join(ROOT, pg.path, 'index.html') : path.join(ROOT, pg.path);
  const visible = fs.readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  if (/[—–]/.test(visible)) errors.push(`${pg.path}: em/en dash in built page`);
  // Every <div> must close: a stray </div> silently pushes later sections out of their container.
  const opens = (visible.match(/<div[\s>]/g) || []).length, closes = (visible.match(/<\/div>/g) || []).length;
  if (opens !== closes) errors.push(`${pg.path}: ${opens} <div> but ${closes} </div>`);
  // Internal links must resolve.
  for (const [, href] of visible.matchAll(/href="(\/[^"#?]*)/g)) {
    if (href.startsWith('/split') || href.startsWith('/assets/') || href === '/privacy/' || href.endsWith('.xml') || href.endsWith('.html')) continue;
    if (!fs.existsSync(path.join(ROOT, href, 'index.html'))) warn.push(`${pg.path}: broken link ${href}`);
  }
}
// SEO checks across every built page, so new articles and templates get them too.
{
  const seen = { title: new Map(), description: new Map() };
  for (const pg of pages) {
    const f = pg.path.endsWith('/') ? path.join(ROOT, pg.path, 'index.html') : path.join(ROOT, pg.path);
    const h = fs.readFileSync(f, 'utf8');
    const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    const plain = (x) => x.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    if (plain(title).length > 60) warn.push(`SEO ${pg.path}: title is ${plain(title).length} chars (aim for 60 or fewer): ${plain(title)}`);
    if (plain(desc).length < 110 || plain(desc).length > 160) warn.push(`SEO ${pg.path}: description is ${plain(desc).length} chars (aim for 110 to 160)`);
    for (const [k, v] of [['title', title], ['description', desc]]) {
      if (seen[k].has(v)) warn.push(`SEO ${pg.path}: same ${k} as ${seen[k].get(v)}`); else seen[k].set(v, pg.path);
    }
    const h1s = (h.match(/<h1[\s>]/g) || []).length;
    if (h1s !== 1) errors.push(`${pg.path}: ${h1s} <h1> (want exactly 1)`);
    if (!/rel="canonical"/.test(h)) errors.push(`${pg.path}: no canonical`);
    for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(m[1]); } catch (e) { errors.push(`${pg.path}: bad JSON-LD (${e.message})`); }
    }
    for (const img of h.match(/<img\b[^>]*>/g) || []) {
      if (!/\balt=/.test(img)) errors.push(`${pg.path}: <img> without alt: ${img.slice(0, 80)}`);
      if (!/\bwidth=/.test(img) || !/\bheight=/.test(img)) warn.push(`${pg.path}: <img> without width/height: ${img.slice(0, 80)}`);
    }
  }
}
const uniq = (xs) => [...new Set(xs)];
console.log(`Built ${pages.length} pages (${posts.length} articles, ${tuts.length} tutorials). Assets v${assetsV}.`);
if (warn.length) console.log('Warnings:\n  ' + uniq(warn).join('\n  '));
if (errors.length) { console.error('Errors:\n  ' + uniq(errors).join('\n  ')); process.exitCode = 1; }
