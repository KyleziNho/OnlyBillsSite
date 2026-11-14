// Shared bits for every page: constants, escaping, faces, icons and the page layout.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { preferredFace, assignFaces, faceKey } from '../split-app/src/lib/faces.js';

export const SITE = {
  url: 'https://onlybills.app',
  name: 'OnlyBills',
  appStore: 'https://apps.apple.com/app/onlybills/id6754412082',
  appId: '6754412082',
  author: 'Kyle',
  authorName: 'Kyle O\'Sullivan', // full name for structured data; the visible byline stays "Kyle"
  authorBio: 'Kyle is a computer science student at the University of Bath who built OnlyBills on his own, after one too many dinners spent doing sums on a napkin.',
  linkedin: 'https://www.linkedin.com/in/kos33/',
  github: 'https://github.com/KyleziNho',
  email: 'osullivan7791@gmail.com',
};

export const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const abs = (path) => SITE.url + path;

export const fmtDate = (iso, lang = 'en-GB') => new Date(iso + 'T12:00:00Z')
  .toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * Page languages. en-GB is the default and the site's voice; en-US pages use US spelling,
 * dollars and "check". es-ES, es-419 and pt-BR pages are built but stay noindexed until a
 * native speaker has read them (see CONTENT_GUIDE.md). `og` is the Open Graph locale.
 */
export const LANGS = {
  'en-GB': { og: 'en_GB' },
  'en-US': { og: 'en_US' },
  'es-ES': { og: 'es_ES' },
  'es-419': { og: 'es_LA' },
  'pt-BR': { og: 'pt_BR' },
};
export const langOf = (lang) => (LANGS[lang] ? lang : 'en-GB');
const EN = {
  home: 'Home', articles: 'Articles', tutorials: 'How it works', updated: 'Updated', minRead: 'min read',
  byline: 'founder of OnlyBills', faq: 'Questions people ask', sources: 'Sources', keepReading: 'Keep reading',
  share: 'Share', copyLink: 'Copy link', onThisPage: 'On this page', sections: 'sections',
  ctaSub: 'OnlyBills is free on iPhone, and your friends don’t need the app.',
  endHeading: 'Split it fairly in a minute',
  endSub: 'Scan the receipt. Friends tap what they had on their own phone. Free, with no sign-up.',
  download: 'Download on the', tutorial: 'Tutorial', article: 'Article',
};
const ES = {
  home: 'Inicio', articles: 'Artículos', tutorials: 'Cómo funciona', updated: 'Actualizado', minRead: 'min de lectura',
  byline: 'fundador de OnlyBills', faq: 'Preguntas frecuentes', sources: 'Fuentes', keepReading: 'Sigue leyendo',
  share: 'Compartir', copyLink: 'Copiar enlace', onThisPage: 'En esta página', sections: 'secciones',
  ctaSub: 'OnlyBills es gratis en iPhone, y tus amigos no necesitan la app. La app está en inglés por ahora.',
  endHeading: 'Divide la cuenta en un minuto',
  endSub: 'Escanea el ticket. Cada amigo marca lo suyo en su propio móvil. Gratis y sin registro.',
  download: 'Descárgala en', tutorial: 'Tutorial', article: 'Artículo',
};
/** Template strings per language (article chrome, the CTA card). Nav and footer stay English. */
export const STRINGS = {
  'en-GB': EN,
  'en-US': EN,
  'es-ES': ES,
  'es-419': ES,
  'pt-BR': {
    home: 'Início', articles: 'Artigos', tutorials: 'Como funciona', updated: 'Atualizado', minRead: 'min de leitura',
    byline: 'fundador do OnlyBills', faq: 'Perguntas frequentes', sources: 'Fontes', keepReading: 'Continue lendo',
    share: 'Compartilhar', copyLink: 'Copiar link', onThisPage: 'Nesta página', sections: 'seções',
    ctaSub: 'O OnlyBills é grátis no iPhone, e seus amigos não precisam do app. O app está em inglês por enquanto.',
    endHeading: 'Divida a conta em um minuto',
    endSub: 'Escaneie a nota. Cada amigo marca o que pediu no próprio celular. Grátis e sem cadastro.',
    download: 'Baixe na', tutorial: 'Tutorial', article: 'Artigo',
  },
};
export const t = (lang) => STRINGS[langOf(lang)];

/**
 * Trademark lines. `payments` is the non-affiliation line every page naming payment brands
 * carries; `zelle` is the notice the app shows (PayoutText.zelleNotice), required on any page
 * that names Zelle. Legal wording: keep these in English on every page.
 */
export const NOTICES = {
  payments: 'OnlyBills is not affiliated with, endorsed or sponsored by any payment provider named here. All trademarks belong to their owners.',
  zelle: 'Zelle® is a registered trademark of Early Warning Services, LLC. ONLYBILLS IS NOT AUTHORIZED, ENDORSED, OR SPONSORED BY EARLY WARNING SERVICES, LLC, OWNER OF ZELLE®.',
};
export const noticeBlock = (keys = []) => {
  const lines = ['payments', 'zelle'].filter((k) => keys.includes(k));
  return lines.length ? `<div class="tm-notice">${lines.map((k) => `<p>${esc(NOTICES[k])}</p>`).join('')}</div>` : '';
};

/** A person's 3D face, the same one the app and guest page would give that name. */
export const faceOf = (name) => preferredFace(faceKey({ name }));
/** Distinct faces for a group, the way a bill assigns them. */
export const facesFor = (names) => assignFaces(names.map((name) => ({ key: faceKey({ name }) })));
export const face = (name, size = 40, alt = '', id = faceOf(name)) =>
  `<img class="face" style="--size:${size}px" src="/assets/faces/${id}.webp" width="${size}" height="${size}" alt="${esc(alt)}" loading="lazy" decoding="async">`;

/** Size of a WebP file from its header (VP8, VP8L or VP8X), or null. */
function webpSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (chunk === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
  if (chunk === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  return null;
}
/**
 * Screens in static/shots: `<name>-light.webp`, plus `<name>-dark.webp` when there is a dark
 * capture. Light-only shots (most 2.3 marketing captures) show the light screen in both modes.
 */
const SHOTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'static/shots');
export const SHOT_META = {};
for (const f of fs.readdirSync(SHOTS_DIR)) {
  const m = f.match(/^(.+)-(light|dark)\.webp$/);
  if (!m) continue;
  const e = (SHOT_META[m[1]] ||= { dark: false, size: null });
  if (m[2] === 'dark') e.dark = true; else e.size = webpSize(path.join(SHOTS_DIR, f));
}

/** A screenshot in a phone frame, light/dark picked by the system. */
export const shot = (base, alt, width = 300, eager = false) => {
  const meta = SHOT_META[base] || { dark: true, size: null };
  // The original 640×1392 set has always printed 1391; other sizes print their real size.
  const [w, h] = meta.size && !(meta.size[0] === 640 && meta.size[1] === 1392) ? meta.size : [640, 1391];
  return `<div class="phone"${width ? ` style="--w:${width}px"` : ''}><picture>${meta.dark ? `<source srcset="/assets/shots/${base}-dark.webp" media="(prefers-color-scheme: dark)">` : ''}<img src="/assets/shots/${base}-light.webp" width="${w}" height="${h}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture></div>`;
};

/**
 * A real screen recording of the app in a phone frame. site.js picks the light or dark
 * file, loads it only when it scrolls into view, and plays it once (tap to replay).
 */
export const video = (name, alt, width = 300, attrs = '') => `<div class="phone vid"${width ? ` style="--w:${width}px"` : ''}><video muted playsinline preload="none" poster="/assets/video/${name}-light-poster.webp" data-video="${name}" aria-label="${esc(alt)}" ${attrs}></video><button class="vid-replay" type="button" hidden aria-label="Play again"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button></div>`;

/**
 * A stylised sent message with a rich link preview (the `:::imessage` block): a right-aligned
 * bubble with a made-up illustration on top (the receipts art on a soft table wash, never a real
 * venue photo), a bar with the bold title and grey domain, and a small "Delivered" label. No
 * Apple logos or Messages chrome. One role="img" with a label that reads out what it shows.
 */
export const imessage = (title, domain, art = 'receipts') => {
  const label = `Example message: a link preview reading ${title.replace(/\s*·\s*/g, ', ')}, ${domain}`;
  return `<div class="imsg" role="img" aria-label="${esc(label)}"><div class="imsg-bubble"><div class="imsg-media"><picture><source srcset="/assets/art/${art}-dark.webp" media="(prefers-color-scheme: dark)"><img src="/assets/art/${art}.webp" width="480" height="480" alt="" loading="lazy" decoding="async"></picture></div><div class="imsg-bar"><b>${esc(title)}</b><span>${esc(domain)}</span></div></div><span class="imsg-status">Delivered</span></div>`;
};

export const icons = {
  apple: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.77-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.27-1.6 2.78-.41 6.9 1.15 9.15.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.39-.92-2.4-3.67zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.09 1.76-.95 2.79 1.01.08 2.04-.51 2.67-1.27z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
};

export const storeButton = (label = 'Download on the', where = 'hero') =>
  `<a class="store" href="${SITE.appStore}" data-cta="${esc(where)}" rel="noopener">${icons.apple}<span><small>${esc(label)}</small><b>App Store</b></span></a>`;

/**
 * The end-of-page app card: a small version of the home page's luminous blue closer, with a
 * real screen rising from the bottom edge and one App Store button. One per page.
 */
export const appCta = (heading = EN.endHeading, sub = EN.endSub, where = 'article', screen = ['guest-05-live', 'A live table: your share of £22.22 adds up as you tap what you had'], download = EN.download) => `
<aside class="end-cta" aria-label="Get OnlyBills">
  <div class="end-cta-copy">
    <h2 class="end-cta-h">${esc(heading)}</h2>
    <p>${esc(sub)}</p>
    ${storeButton(download, where)}
  </div>
  <div class="end-cta-shot">${shot(screen[0], screen[1], 0)}</div>
</aside>`;

/**
 * The `:::cta` block inside an article: one quiet text row between hairlines, so the body
 * reads as advice, not an advert. The page's end card is the one real call to action.
 */
export const ctaLine = (heading = 'Split the bill by what everyone had', where = 'article-inline', sub = EN.ctaSub) => `
<aside class="cta-line" aria-label="Get OnlyBills"><a data-cta="${esc(where)}" href="${SITE.appStore}" rel="noopener">${esc(heading)}</a><span>${esc(sub)}</span></aside>`;

const NAV = [
  ['/#how', 'How it works'],
  ['/how-to/', 'Guides'],
  ['/blog/', 'Articles'],
  ['/about/', 'About'],
];

const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

/** Kyle, as one schema.org entity every page and article points at. */
export const PERSON_ID = SITE.url + '/about/#kyle';
export const PERSON = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: SITE.authorName,
  alternateName: SITE.author,
  url: SITE.url + '/about/',
  image: SITE.url + '/assets/img/maker-avatar.jpg',
  jobTitle: 'Founder',
  worksFor: { '@id': SITE.url + '/#org' },
  sameAs: [SITE.linkedin, SITE.github],
};
/** Inline author for Article nodes (Google reads name + url even without resolving @id). */
export const AUTHOR = { '@type': 'Person', '@id': PERSON_ID, name: SITE.authorName, url: SITE.url + '/about/' };

export const ORG = {
  '@type': 'Organization',
  '@id': SITE.url + '/#org',
  name: 'OnlyBills',
  url: SITE.url + '/',
  logo: { '@type': 'ImageObject', url: SITE.url + '/assets/img/app-icon.png', width: 512, height: 512 },
  email: SITE.email,
  founder: { '@id': PERSON_ID },
  sameAs: [SITE.appStore, SITE.linkedin],
};
const WEBSITE = { '@type': 'WebSite', '@id': SITE.url + '/#site', url: SITE.url + '/', name: 'OnlyBills', publisher: { '@id': SITE.url + '/#org' }, inLanguage: 'en-GB' };

/**
 * The iPhone app as a schema.org MobileApplication, used on the home page and /vs/ pages.
 * One free offer: the app is free to download and use. No ratings or reviews here: only add
 * aggregateRating if it mirrors real App Store ratings shown on the page.
 */
export const APP_ID = SITE.url + '/#app';
// Not tied to one country: the app works with bills in any currency and suggests the usual
// ways to get paid in the UK, the US, Canada, most of Europe and Latin America. Free to
// download and use; OnlyBills Pro is an optional in-app purchase (no price on the site).
export const appLd = ({ currency = 'GBP', lang = 'en-GB', ...extra } = {}) => ({
  '@type': 'MobileApplication',
  '@id': APP_ID,
  name: 'OnlyBills',
  operatingSystem: 'iOS, iPadOS',
  applicationCategory: 'FinanceApplication',
  description: 'Split restaurant bills by what everyone had, in any currency. Scan the receipt, friends claim their items on their own phone, and everyone pays you back their exact share the way they already pay friends. Free, with optional in-app purchases.',
  url: SITE.url + '/',
  downloadUrl: SITE.appStore,
  installUrl: SITE.appStore,
  sameAs: SITE.appStore,
  image: SITE.url + '/assets/img/app-icon.png',
  screenshot: [
    SITE.url + '/assets/shots/guest-01-join-light.webp',
    SITE.url + '/assets/shots/guest-pay-us-venmo-zelle-light.webp',
    SITE.url + '/assets/shots/guest-share-th-settle-gbp-light.webp',
  ],
  inLanguage: lang,
  author: { '@id': SITE.url + '/#org' },
  publisher: { '@id': SITE.url + '/#org' },
  offers: { '@type': 'Offer', price: '0', priceCurrency: currency, url: SITE.appStore, availability: 'https://schema.org/InStock' },
  ...extra,
});

/**
 * The page shell. `path` is the canonical path ("/blog/x/"). `schema` is an array of
 * JSON-LD nodes for this page; Organization + WebSite are always included.
 */
export function layout({ path, title, description, body, schema = [], ogImage, ogImageAlt, ogType = 'website', current, assetsV, extraHead = '', noindex = false, lang = 'en-GB', alternates = [], xDefault }) {
  lang = langOf(lang);
  // Brand suffix only when the title still fits in a search result (~60 characters).
  const fullTitle = title.includes('OnlyBills') || title.length > 48 ? title : `${title} · OnlyBills`;
  const img = ogImage || abs('/assets/img/og-card.jpg');
  const imgAlt = ogImageAlt || (ogImage ? title : 'OnlyBills: split the bill by what everyone had');
  const graph = { '@context': 'https://schema.org', '@graph': [ORG, WEBSITE, PERSON, ...schema] };
  // Noindex pages (404, redirects) get no canonical: a 404 served at any URL must not claim one.
  // hreflang: this page, its indexable twins (`alternates`: [[lang, path]]) and x-default,
  // which is always the English page of the set.
  const hreflangs = [[lang, path], ...alternates, ['x-default', xDefault || path]];
  const canonical = noindex ? '' : `<link rel="canonical" href="${abs(path)}">
${hreflangs.map(([hl, p]) => `<link rel="alternate" hreflang="${hl}" href="${abs(p)}">`).join('\n')}`;
  const ogAlt = alternates.map(([hl]) => LANGS[hl]?.og).filter((x) => x && x !== LANGS[lang].og);
  const nav = NAV.map(([href, label]) => `<a href="${href}"${current === href ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `<!doctype html>
<html lang="${lang}" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${canonical}
${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">'}
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#f2f2f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta name="apple-itunes-app" content="app-id=${SITE.appId}">
<meta name="format-detection" content="telephone=no">
<link rel="icon" type="image/png" sizes="64x64" href="/assets/img/favicon.png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="OnlyBills articles" href="/blog/feed.xml">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="OnlyBills">
<meta property="og:locale" content="${LANGS[lang].og}">
${ogAlt.map((l) => `<meta property="og:locale:alternate" content="${l}">\n`).join('')}${noindex ? '' : `<meta property="og:url" content="${abs(path)}">
`}<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="${ogImage ? 630 : 800}">
<meta property="og:image:alt" content="${esc(imgAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${img}">
<meta name="twitter:image:alt" content="${esc(imgAlt)}">
<link rel="stylesheet" href="/assets/css/tokens.css?v=${assetsV}">
<link rel="stylesheet" href="/assets/css/site.css?v=${assetsV}">
<script>document.documentElement.className='js'</script>
${extraHead}
${jsonLd(graph)}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="bar">
  <div class="bar-inner">
    <a class="brand" href="/" aria-label="OnlyBills home"><picture><source srcset="/assets/img/app-icon-dark-64.png 1x, /assets/img/app-icon-dark-128.png 2x" media="(prefers-color-scheme: dark)"><img src="/assets/img/app-icon-64.png" srcset="/assets/img/app-icon-64.png 1x, /assets/img/app-icon-128.png 2x" width="32" height="32" alt=""></picture><span>OnlyBills</span></a>
    <nav class="nav" aria-label="Main">${nav}</nav>
    <a class="get" href="${SITE.appStore}" data-cta="nav" rel="noopener">${icons.apple}<span>Get the app</span></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Menu">${icons.menu}</button>
  </div>
  <nav class="mobile-nav" id="mobile-nav" aria-label="Main">${nav}</nav>
</header>
<main id="main" tabindex="-1">
${body}
</main>
${footer()}
<script src="/assets/js/site.js?v=${assetsV}" defer></script>
</body>
</html>
`;
}

function footer() {
  return `<footer class="footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="brand" href="/" aria-label="OnlyBills home"><picture><source srcset="/assets/img/app-icon-dark-64.png" media="(prefers-color-scheme: dark)"><img src="/assets/img/app-icon-64.png" width="32" height="32" alt=""></picture><span>OnlyBills</span></a>
        <p class="foot" style="max-width:30ch">Split the bill by what everyone had. Made in the UK for iPhone and iPad.</p>
        <a class="maker" href="/about/"><img src="/assets/img/maker-avatar.jpg" width="32" height="32" alt="" loading="lazy">Made by Kyle</a>
      </div>
      <div><h4>App</h4><ul>
        <li><a href="/#how">How it works</a></li>
        <li><a href="/how-to/">Guides</a></li>
        <li><a href="/#pricing">Pricing</a></li>
        <li><a href="${SITE.appStore}" rel="noopener">App Store</a></li>
        <li><a href="/split/?demo=2&amp;state=claiming">Try a demo table</a></li>
      </ul></div>
      <div><h4>Read</h4><ul>
        <li><a href="/blog/">All articles</a></li>
        <li><a href="/blog/topic/split-the-bill/">How to split the bill</a></li>
        <li><a href="/blog/topic/tipping/">Tipping and service charge</a></li>
        <li><a href="/blog/topic/paying-friends-back/">Paying friends back</a></li>
        <li><a href="/blog/topic/abroad-and-currencies/">Abroad and currencies</a></li>
        <li><a href="/blog/bill-splitting-etiquette/">Bill splitting etiquette</a></li>
        <li><a href="/vs/splitwise/">OnlyBills vs Splitwise</a></li>
        <li><a href="/blog/splitwise-alternatives/">Splitwise alternatives</a></li>
      </ul></div>
      <div><h4>OnlyBills</h4><ul>
        <li><a href="/about/">About</a></li>
        <li><a href="/privacy/">Privacy policy</a></li>
        <li><a href="mailto:${SITE.email}">Contact</a></li>
      </ul></div>
    </div>
    <div class="legal"><span>© ${new Date().getFullYear()} OnlyBills</span><span>Apple, iPhone and App Store are trademarks of Apple Inc. Other payment names are trademarks of their owners, and OnlyBills is not affiliated with any of them.</span></div>
  </div>
</footer>`;
}

export const crumbsLd = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
});

export const crumbs = (items) => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([name, path], i) =>
  (i < items.length - 1 ? `<a href="${path}">${esc(name)}</a><span aria-hidden="true">›</span>` : `<span aria-current="page">${esc(name)}</span>`)).join('')}</nav>`;
