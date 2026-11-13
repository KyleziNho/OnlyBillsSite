// How a guest pays the host, in every region. One registry of methods, one set of link
// builders, one reader for `payment` (the new `methods` list, or the legacy UK keys).
// Mirrors the Swift code (GuestCore) through the shared vectors in
// src/lib/__fixtures__/pay-vectors.json. Contract: SplitSwift/docs/REGIONAL_PAYOUTS_CONTRACT.md.
//
// Everything read from a document is hostile: it is cleaned and capped here, shown as
// plain text only, and never becomes a link except through `buildLink` and the allow-list.
import { RATE_SHAPE, convertMinor, linkAmountMinor, scale, toAmount, toMinor } from './money.js';
import { asciiUpper, clean, cut, enc, length, refOf } from './payText.js';
import { PIX_CITY_DEFAULT, PIX_NAME_DEFAULT, isStoredPixKey, pixCode, pixText } from './pix.js';

// ── Fixed wording (contract 1.2). {amount} and {payee} are filled in by the sheet. ──
export const TEXT = {
  filled: '{amount} filled in for you',
  enter: 'Enter {amount} when it opens',
  pasted: 'Opens {host}. Enter {amount} if it asks.',
  bank: 'Send {amount} from your banking app',
  pixNote: '{amount} already in the code.',
  pixKeyHint: 'Copy the key, then pay with Pix in your bank app.',
  unknownHint: 'Copy each line into your bank or payment app.',
  onlyTakes: '{label} only takes {currencies}.',
  cantTake: "{label} can't take this currency.",
  amountLabel: 'Amount',
  copyKey: 'Copy key',
  copyNumber: 'Copy number',
  again: '{pinned} again',
  pixAgain: 'Copy code again',
  useKey: 'Use the key instead',
};

/** "{amount} filled in for you" → "£11.00 filled in for you". */
export const fillText = (template, values) => (template == null ? template
  : template.replace(/\{(\w+)\}/g, (whole, name) => (values[name] != null ? values[name] : whole)));

export const CURRENCY_NAMES = {
  USD: 'US dollars', CAD: 'Canadian dollars', EUR: 'euros', GBP: 'pounds', SEK: 'Swedish kronor',
  NOK: 'Norwegian kroner', DKK: 'Danish kroner', CHF: 'Swiss francs', PLN: 'Polish zloty',
  BRL: 'reais', ARS: 'Argentine pesos', MXN: 'Mexican pesos', COP: 'Colombian pesos', PEN: 'Peruvian soles',
};

export const LIMITS = {
  methods: 8, fields: 6, label: 30, fieldValue: 80, url: 300, pixKey: 77, pixName: 25, pixCity: 15,
  handle: 64, id: 24, cur: 12, reference: 40,
};

// ── The method catalogue (contract 1.1 and 1.2) ───────────
const PAY = 'Pay {payee} {amount}';
const method = (id, label, kind, more = {}) => ({
  id, label, kind, cur: null, notCur: null, demotes: false, prefillVerified: null, payWith: label,
  capability: null, hint: null, hintEmail: null, pinned: null, pinnedEmail: null, amountRow: false,
  rowLabel: null, rowLabelEmail: null, legacyKey: null, ...more,
});
const link = (id, label, more) => method(id, label, 'link', { pinned: PAY, ...more });
// The identifier row says what the value is; the section above it already names the method.
const phone = (id, label, cur, hint) => method(id, label, 'copy', {
  cur, demotes: true, hint, pinned: 'Copy number', amountRow: true, rowLabel: 'Phone',
});
const phoneOrEmail = (id, label, cur, how) => method(id, label, 'copy', {
  cur, demotes: true, amountRow: true, rowLabel: 'Phone', rowLabelEmail: 'Email',
  hint: `Copy the number, then ${how}`, hintEmail: `Copy the email, then ${how}`,
  pinned: 'Copy number', pinnedEmail: 'Copy email',
});

/**
 * Every method id a guest client knows. `prefillVerified` false means the link carries the
 * amount but nobody has confirmed the provider fills it in, so the guest is told to enter
 * it and gets an Amount row. Raw ids are frozen.
 */
export const METHODS = Object.fromEntries([
  link('monzo', 'Monzo', {
    cur: ['GBP'], prefillVerified: true, payWith: 'Apple Pay, card or bank transfer',
    capability: 'Apple Pay, card or bank transfer. No Monzo account needed', legacyKey: 'monzoUsername',
  }),
  link('starling', 'Starling', {
    prefillVerified: false, payWith: 'Apple Pay or card',
    capability: 'Apple Pay or card. No Starling account needed', legacyKey: 'starlingUsername',
  }),
  link('revolut', 'Revolut', {
    prefillVerified: false, payWith: 'Apple Pay or card',
    capability: 'Apple Pay or card. No Revolut account needed', legacyKey: 'revolutUsername',
  }),
  link('paypal', 'PayPal', {
    // Not on PayPal's published currency list, or suspended there (RUB): contract 10.9.
    notCur: ['ARS', 'COP', 'CLP', 'PEN', 'RON', 'UYU', 'KZT', 'UAH', 'INR', 'RUB', 'BGN'], demotes: true, prefillVerified: true,
    capability: 'PayPal account may be needed', legacyKey: 'paypalUsername',
  }),
  method('bank', 'Bank transfer', 'copy', { cur: ['GBP'] }),
  link('venmo', 'Venmo', {
    cur: ['USD'], demotes: true, prefillVerified: false, capability: 'Venmo account needed',
    amountRow: true, legacyKey: 'venmoHandle',
  }),
  link('cashapp', 'Cash App', {
    cur: ['USD'], demotes: true, prefillVerified: false, capability: 'Cash App account needed', amountRow: true,
  }),
  link('swish', 'Swish', {
    cur: ['SEK'], demotes: true, prefillVerified: false, capability: 'Swish and BankID needed',
    amountRow: true, rowLabel: 'Phone',
  }),
  link('link', 'Payment link', { prefillVerified: false, amountRow: true }),
  phoneOrEmail('zelle', 'Zelle', ['USD'], 'send with Zelle in your bank app.'),
  phoneOrEmail('interac', 'Interac e-Transfer', ['CAD'], 'send an Interac e-Transfer from your bank app.'),
  phone('bizum', 'Bizum', ['EUR'], 'Copy the number, then send a Bizum from your bank app.'),
  phone('mbway', 'MB WAY', ['EUR'], 'Copy the number, then send with MB WAY.'),
  phone('vipps', 'Vipps', ['NOK'], 'Copy the number, then send with Vipps.'),
  phone('mobilepay', 'MobilePay', ['DKK', 'EUR'], 'Copy the number, then send with MobilePay.'),
  phone('twint', 'TWINT', ['CHF'], 'Copy the number, then send with TWINT.'),
  phone('blik', 'BLIK', ['PLN'], 'Copy the number, then send a BLIK transfer from your bank app.'),
  phone('wero', 'Wero', ['EUR'], 'Copy the number, then send with Wero in your bank app.'),
  phone('iris', 'IRIS', ['EUR'], 'Copy the number, then send with IRIS in your bank app.'),
  phone('yape', 'Yape o Plin', ['PEN'], 'Copy the number, then send with Yape or Plin.'),
  method('iban', 'IBAN', 'copy', {
    hint: 'Copy each line into a new transfer in your bank app.', pinned: 'Copy IBAN', amountRow: true, rowLabel: 'IBAN',
  }),
  method('pix', 'Pix', 'pix', {
    cur: ['BRL'], demotes: true, hint: 'Open your bank app, choose Pix Copia e Cola and paste.',
    pinned: 'Copiar código Pix', rowLabel: 'Chave Pix',
  }),
  method('alias', 'Alias', 'copy', {
    cur: ['ARS'], demotes: true, hint: 'Copy the alias, then paste it in your bank or wallet app.',
    pinned: 'Copy alias', amountRow: true, rowLabel: 'Alias',
  }),
  method('clabe', 'CLABE', 'copy', {
    cur: ['MXN'], demotes: true, hint: 'Copy the CLABE, then add it as a new recipient in your bank app.',
    pinned: 'Copy CLABE', amountRow: true, rowLabel: 'CLABE',
  }),
  method('breb', 'Bre-B', 'copy', {
    cur: ['COP'], demotes: true, hint: 'Copy the key, then send with Bre-B in your bank or wallet app.',
    pinned: 'Copy key', amountRow: true, rowLabel: 'Llave Bre-B',
  }),
  method('details', 'Bank details', 'copy', {
    hint: 'Copy each line into a new transfer in your bank app.', amountRow: true,
  }),
].map((m) => [m.id, m]));

const HANDLE_LINKS = ['monzo', 'starling', 'revolut', 'paypal', 'venmo', 'cashapp'];
const LEGACY_LINK_ORDER = ['monzo', 'starling', 'revolut', 'paypal', 'venmo'];
const specOf = (id) => (Object.prototype.hasOwnProperty.call(METHODS, id) ? METHODS[id] : null);
const upper = (currency) => asciiUpper(String(currency || 'GBP'));

/** Can this method take a bill in `currency`? */
export const accepts = (id, currency) => {
  const spec = specOf(id);
  if (!spec) return true;
  const cur = upper(currency);
  if (spec.cur && !spec.cur.includes(cur)) return false;
  return !(spec.notCur && spec.notCur.includes(cur));
};

/** "Venmo only takes US dollars." / "PayPal can't take this currency." */
const reasonFor = (label, cur) => (cur?.length
  ? TEXT.onlyTakes.replace('{label}', label).replace('{currencies}', cur.map((c) => CURRENCY_NAMES[c] || c).join(' or '))
  : TEXT.cantTake.replace('{label}', label));

// ── Pasted links: a compiled-in allow-list (contract 5) ───
/** Hosts a pasted link may open. Adding one is a web deploy and an app release, on purpose. */
export const ALLOW_LIST = [
  { host: 'tikkie.me', label: 'Tikkie', pathPrefix: '/' },
  { host: 'bunq.me', label: 'bunq', pathPrefix: '/' },
  { host: 'cash.app', label: 'Cash App', pathPrefix: '/' },
  { host: 'venmo.com', label: 'Venmo', pathPrefix: '/' },
  { host: 'paypal.me', label: 'PayPal', pathPrefix: '/' },
  { host: 'paypal.com', label: 'PayPal', pathPrefix: '/paypalme/' },
  { host: 'revolut.me', label: 'Revolut', pathPrefix: '/' },
  { host: 'app.swish.nu', label: 'Swish', pathPrefix: '/' },
  { host: 'send.monobank.ua', label: 'Monobank', pathPrefix: '/jar/' },
];

// A string check, never URL parsing (the platforms' parsers differ): https only, a
// lower-case host with a dot, no userinfo, port, fragment, space or non-ASCII, a path.
const PCHAR = "(?:[A-Za-z0-9\\-._~!$&'()*+,;=:@/]|%[0-9A-Fa-f]{2})";
const LINK_SHAPE = new RegExp(`^https://([a-z0-9-]+(?:\\.[a-z0-9-]+)+)(/${PCHAR}*)(\\?(?:${PCHAR}|\\?)*)?$`);

/** The allow-list entry a pasted link matches, or null. Runs on every guest read. */
export const checkLink = (url) => {
  if (typeof url !== 'string' || length(url) > LIMITS.url) return null;
  const m = LINK_SHAPE.exec(url);
  if (!m) return null;
  const host = m[1].replace(/^www\./, '');
  const path = m[2];
  return ALLOW_LIST.find((a) => a.host === host && path.startsWith(a.pathPrefix) && path.length > a.pathPrefix.length) || null;
};

// ── Link builders (contract 2): the only ones ─────────────
/** A handle as it goes into a link: cleaned, one leading @ ($ for Cash App) removed. */
export const linkHandle = (id, raw) => {
  let h = clean(raw);
  if (h == null) return null;
  if (h.startsWith(id === 'cashapp' ? '$' : '@')) h = h.slice(1).replace(/^ +| +$/g, '');
  return !h || length(h) > LIMITS.handle ? null : h;
};

const SWISH_NUMBER = /^(\+46[1-9][0-9]{6,9}|123[0-9]{7})$/;
/** PayPal takes no decimals in these: a whole share goes in with none, an uneven one not at all. */
export const PAYPAL_WHOLE_ONLY = ['HUF', 'JPY', 'TWD'];
const paypalAmount = (amountMinor, cur, amt) => {
  if (!PAYPAL_WHOLE_ONLY.includes(cur)) return amt;
  const s = scale(cur);
  const minor = Math.max(0, Math.round(amountMinor));
  return minor % s === 0 ? String(minor / s) : null;
};
const NO_LINK = { url: null, amountInUrl: false };

const linkParts = (id, value, amountMinor, cur, reference, ok) => {
  if (id === 'link') return { url: checkLink(value) ? value : null, amountInUrl: false };
  const amt = linkAmountMinor(amountMinor, cur);
  const ref = enc(refOf(reference));
  if (id === 'swish') {
    const n = clean(value);
    if (n == null || !SWISH_NUMBER.test(n) || !ok) return NO_LINK;
    const sw = n.startsWith('+46') ? `0${n.slice(3)}` : n;
    return { url: `https://app.swish.nu/1/p/sw/?sw=${sw}&amt=${amt}&cur=SEK&msg=${ref}&src=qr`, amountInUrl: true };
  }
  const handle = linkHandle(id, value);
  if (handle == null) return NO_LINK;
  const h = enc(handle);
  const withAmount = (full, profile) => (ok ? { url: full, amountInUrl: true } : { url: profile, amountInUrl: false });
  switch (id) {
    case 'monzo': return withAmount(`https://monzo.me/${h}/${amt}?d=${ref}`, `https://monzo.me/${h}?d=${ref}`);
    case 'starling': return { url: `https://settleup.starlingbank.com/${h}`, amountInUrl: false };
    case 'revolut': return { url: `https://revolut.me/${h}`, amountInUrl: false };
    case 'paypal': {
      const whole = paypalAmount(amountMinor, cur, amt);
      return whole == null ? { url: `https://paypal.me/${h}`, amountInUrl: false }
        : withAmount(`https://paypal.me/${h}/${whole}${cur}`, `https://paypal.me/${h}`);
    }
    case 'venmo': return withAmount(`https://venmo.com/u/${h}?txn=pay&amount=${amt}&note=${ref}`, `https://venmo.com/u/${h}?txn=pay&note=${ref}`);
    case 'cashapp': return withAmount(`https://cash.app/$${h}/${amt}`, `https://cash.app/$${h}`);
    default: return NO_LINK;
  }
};

/**
 * The https link for a link method. `value` is the handle (the stored number for Swish,
 * the URL for a pasted link). → { url | null, amountInUrl, prefilled, accepted }.
 * `prefilled` is only true when the amount is in the link AND the pre-fill is verified.
 */
export const buildLink = (id, value, { amountMinor = 0, currency, reference } = {}) => {
  const spec = specOf(id);
  if (!spec || spec.kind !== 'link') return { ...NO_LINK, prefilled: false, accepted: false };
  const accepted = accepts(id, currency);
  const parts = linkParts(id, value, amountMinor, upper(currency), reference, accepted);
  return { ...parts, prefilled: parts.amountInUrl && spec.prefillVerified === true, accepted };
};

// ── Sanitising `payment.methods` (contract 4.3) ───────────
const ID_SHAPE = /^[a-z0-9_]{1,24}$/;
const isObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

const cleanFields = (raw) => {
  const out = [];
  if (!Array.isArray(raw)) return out;
  for (const f of raw) {
    if (out.length === LIMITS.fields) break;
    if (!isObject(f)) continue;
    const label = clean(f.label);
    const value = clean(f.value);
    if (!label || !value || length(value) > LIMITS.fieldValue) continue;
    out.push({ label: cut(label, LIMITS.label), value });
  }
  return out;
};

const cleanCur = (raw) => {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const c of raw) {
    if (out.length === LIMITS.cur) break;
    const code = clean(c);
    if (code == null) continue;
    const up = asciiUpper(code);
    if (/^[A-Z]{3}$/.test(up) && !out.includes(up)) out.push(up);
  }
  return out.length ? out : null;
};

const entry = (id, kind, known, label, more) => ({
  id, kind, known, label, handle: null, url: null, host: null, key: null, name: null, city: null,
  fields: [], cur: null, ...more,
});

const sanitiseEntry = (id, e) => {
  const spec = specOf(id);
  if (!spec) {
    const label = clean(e.label);
    const fields = cleanFields(e.fields);
    if (!label || !fields.length) return null;
    return entry(id, 'copy', false, cut(label, LIMITS.label), { fields, cur: cleanCur(e.cur) });
  }
  if (HANDLE_LINKS.includes(id)) {
    const handle = linkHandle(id, e.handle);
    return handle == null ? null : entry(id, 'link', true, spec.label, { handle });
  }
  if (id === 'swish') {
    const handle = clean(e.handle);
    return handle == null || !SWISH_NUMBER.test(handle) ? null : entry(id, 'link', true, spec.label, { handle });
  }
  if (id === 'link') {
    const allowed = checkLink(e.url);
    return allowed ? entry(id, 'link', true, allowed.label, { url: e.url, host: allowed.host }) : null;
  }
  if (id === 'pix') {
    const key = clean(e.key);
    if (key == null || length(key) > LIMITS.pixKey || !isStoredPixKey(key)) return null;
    return entry(id, 'pix', true, spec.label, {
      key,
      name: pixText(e.name, LIMITS.pixName) || PIX_NAME_DEFAULT,
      city: pixText(e.city, LIMITS.pixCity) || PIX_CITY_DEFAULT,
    });
  }
  const fields = cleanFields(e.fields);
  return fields.length ? entry(id, 'copy', true, spec.label, { fields }) : null;
};

/**
 * `payment.methods` as trusted, normalised entries: at most 8, one per id, anything
 * malformed dropped. Known ids keep only their own data; an unknown id keeps its label,
 * rows and currency list.
 */
export const sanitiseMethods = (raw) => {
  const out = [];
  if (!Array.isArray(raw)) return out;
  for (const e of raw) {
    if (out.length === LIMITS.methods) break;
    if (!isObject(e)) continue;
    const { id } = e;
    if (typeof id !== 'string' || !ID_SHAPE.test(id) || out.some((x) => x.id === id)) continue;
    const kept = sanitiseEntry(id, e);
    if (kept) out.push(kept);
  }
  return out;
};

// ── Rendering: the model the pay sheet binds to (contract 6, 7) ──
const option = (id, kind, label, more) => ({
  id, kind, label, payWith: label, capability: null, url: null, prefilled: false, demoted: false,
  note: null, hint: null, rows: [], amountCopy: null, pinned: null, pinnedCopy: null, pixCode: null, ...more,
});
const row = (label, value, display = value) => ({ label, display, copy: value });
/** IBANs are shown in groups of four and copied without spaces. */
const groupsOfFour = (s) => s.replace(/(.{4})(?=.)/g, '$1 ');

const renderEntry = (en, { amountMinor, currency, reference }) => {
  const cur = upper(currency);
  const amt = linkAmountMinor(amountMinor, cur);
  const rowsOf = (fields) => fields.map((f) => row(f.label, f.value));

  if (!en.known) {
    const demoted = en.cur != null && !en.cur.includes(cur);
    return option(en.id, 'copy', en.label, {
      demoted, rows: rowsOf(en.fields),
      note: demoted ? reasonFor(en.label, null) : null,
      hint: demoted ? null : TEXT.unknownHint,
      amountCopy: demoted ? null : amt,
    });
  }

  const spec = METHODS[en.id];
  const ok = accepts(en.id, cur);
  const demoted = spec.demotes && !ok;
  const reason = reasonFor(spec.label, spec.cur);
  const numberRow = (value) => [row(spec.rowLabel, value)];
  const rowLabelFor = (value) => (spec.rowLabelEmail && value.includes('@') ? spec.rowLabelEmail : spec.rowLabel);

  if (en.id === 'link') {
    return option(en.id, 'link', en.label, {
      url: en.url, note: TEXT.pasted.replace('{host}', en.host), amountCopy: amt, pinned: spec.pinned,
    });
  }
  if (en.id === 'swish' && !ok) {
    return option(en.id, 'copy', spec.label, {
      demoted: true, note: reason, rows: numberRow(en.handle), pinned: TEXT.copyNumber, pinnedCopy: en.handle,
    });
  }
  if (spec.kind === 'link') {
    const built = buildLink(en.id, en.handle, { amountMinor, currency: cur, reference });
    // PayPal on an uneven forint / yen / Taiwan dollar share opens without the amount: give it the Amount row.
    const amountRow = spec.amountRow || (en.id === 'paypal' && ok && !built.amountInUrl);
    return option(en.id, 'link', spec.label, {
      payWith: spec.payWith, capability: spec.capability, url: built.url, prefilled: built.prefilled, demoted,
      note: demoted ? reason : built.prefilled ? TEXT.filled : TEXT.enter,
      amountCopy: amountRow && !demoted ? amt : null, pinned: spec.pinned,
    });
  }
  if (en.id === 'pix') {
    const rows = numberRow(en.key);
    if (!ok) return option(en.id, 'copy', spec.label, { demoted: true, note: reason, rows, pinned: TEXT.copyKey, pinnedCopy: en.key });
    const code = pixCode(en.key, en.name, en.city, amountMinor);
    if (code == null) {
      return option(en.id, 'copy', spec.label, { hint: TEXT.pixKeyHint, rows, amountCopy: amt, pinned: TEXT.copyKey, pinnedCopy: en.key });
    }
    return option(en.id, 'pix', spec.label, { note: TEXT.pixNote, hint: spec.hint, rows, pinned: spec.pinned, pinnedCopy: code, pixCode: code });
  }

  // Copy methods: rows from the document, the identifier row named by the client.
  const rows = rowsOf(en.fields);
  if (spec.rowLabel) rows[0].label = rowLabelFor(rows[0].copy);
  if (en.id === 'iban') rows[0].display = groupsOfFour(rows[0].copy);
  if (en.id === 'bank') return option(en.id, 'copy', spec.label, { note: TEXT.bank, rows });
  const email = spec.hintEmail != null && rows[0].copy.includes('@');
  const pinned = email ? spec.pinnedEmail : spec.pinned;
  return option(en.id, 'copy', spec.label, {
    demoted, rows,
    note: demoted ? reason : null,
    hint: demoted ? null : email ? spec.hintEmail : spec.hint,
    amountCopy: spec.amountRow && !demoted ? amt : null,
    pinned, pinnedCopy: pinned ? rows[0].copy : null,
  });
};

// ── The legacy path: documents without `methods` (contract 4.2) ──
const legacyText = (p, key) => (typeof p[key] === 'string' ? p[key].trim() : '');

/** UK bank details as copy rows: the account name, then each complete line. */
export const legacyBankRows = (payment) => {
  const p = isObject(payment) ? payment : {};
  const rows = [];
  const name = legacyText(p, 'bankAccountName');
  if (name) rows.push(row('Name', name));
  (Array.isArray(p.bankDetails) ? p.bankDetails : []).forEach((f) => {
    if (isObject(f) && typeof f.label === 'string' && f.label && typeof f.value === 'string' && f.value) {
      rows.push(row(f.label, f.value));
    }
  });
  return rows;
};

const readLegacy = (p, bill) => {
  const cur = upper(bill.currency);
  const links = [];
  LEGACY_LINK_ORDER.forEach((id) => {
    const spec = METHODS[id];
    const handle = linkHandle(id, legacyText(p, spec.legacyKey));
    if (handle == null) return;
    const o = renderEntry(entry(id, 'link', true, spec.label, { handle }), bill);
    // Nothing is ever demoted here: a link that cannot carry the currency just drops the amount.
    if (o.demoted) {
      o.demoted = false;
      o.note = TEXT.enter;
      o.amountCopy = spec.amountRow ? linkAmountMinor(bill.amountMinor, cur) : null;
    }
    links.push(o);
  });
  const rows = legacyBankRows(p);
  const bank = rows.length ? option('bank', 'copy', METHODS.bank.label, { note: TEXT.bank, rows }) : null;
  const wanted = legacyText(p, 'defaultMethod').toLowerCase();
  if (wanted === 'bank' && bank) return [bank, ...links];
  const chosen = links.find((o) => o.id === wanted) || links[0];
  return [...(chosen ? [chosen] : []), ...links.filter((o) => o !== chosen), ...(bank ? [bank] : [])];
};

/**
 * Everything the pay sheet shows for one guest's amount.
 *  - `methods` present and something survives sanitising → render from it only, in the
 *    host's order, with anything that cannot take the bill's currency moved below the rest.
 *  - otherwise the legacy path: the host's default (or the first link) leads, the other
 *    links follow in fixed order, bank details last.
 * → { path: 'methods' | 'legacy', primary: id | null, options } — options[0] is the primary
 * way to pay, the rest are "Other ways to pay". Texts keep {amount} / {payee} (see fillText).
 */
export const readPayment = (payment, { amountMinor = 0, currency, reference } = {}) => {
  const p = isObject(payment) ? payment : {};
  const bill = { amountMinor, currency: upper(currency), reference };
  const entries = sanitiseMethods(p.methods);
  if (entries.length) {
    const rendered = entries.map((en) => renderEntry(en, bill));
    const options = [...rendered.filter((o) => !o.demoted), ...rendered.filter((o) => o.demoted)];
    return { path: 'methods', primary: options[0].id, options };
  }
  const options = readLegacy(p, bill);
  return { path: 'legacy', primary: options[0]?.id ?? null, options };
};

// ── Settle currency: `payment.settle` (contract section 11) ──
const DATE_SHAPE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const realDate = (s) => {
  if (typeof s !== 'string' || !DATE_SHAPE.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? s : null;
};
const isoCode = (v) => {
  const c = clean(v);
  return c == null ? null : asciiUpper(c);
};

/**
 * The host's frozen settle choice, or null when there is none or it can't be trusted:
 * → { cur, base, rate, manual, date }. `billCurrency` is the document's `currency`.
 * Guests never fetch rates; this is the only rate they ever use.
 */
export const readSettle = (payment, billCurrency) => {
  const s = isObject(payment) ? payment.settle : null;
  if (!isObject(s)) return null;
  const bill = upper(billCurrency);
  const cur = isoCode(s.cur);
  if (cur == null || !/^[A-Z]{3}$/.test(cur) || cur === bill) return null;
  const base = isoCode(s.base);
  if (base !== cur && base !== bill) return null;
  const { rate } = s;
  if (typeof rate !== 'string' || length(rate) > 24 || !RATE_SHAPE.test(rate)) return null;
  if (!/[1-9]/.test(rate)) return null;
  return { cur, base, rate, manual: s.src === 'manual', date: realDate(s.date) };
};

/**
 * "£1 = ฿43.80": which currency is worth 1 and the other side's value, padded to at least
 * 2 decimals under 1000 ("43.8" → "43.80", "34180" stays). Formatting is the page's.
 */
export const rateParts = (rate, base, other) => {
  const [whole, frac = ''] = rate.split('.');
  const digits = Math.max(frac.length, Number(whole) < 1000 ? 2 : 0);
  return { one: base, other, value: digits ? `${whole}.${frac.padEnd(digits, '0')}` : whole };
};

/** This guest's share in the settle currency, or null (no settle, or it can't convert). */
export const settleAmount = (settle, amountMinor, billCurrency) => {
  if (!settle) return null;
  const minor = convertMinor(amountMinor, upper(billCurrency), settle.cur, settle.base, settle.rate);
  return minor == null ? null : { minor, cur: settle.cur };
};

/**
 * readPayment for a guest's bill-currency share, in the settle currency when the host set
 * one: every link, Amount row, Pix code and demotion then follows the settle currency.
 * → readPayment's result plus `settle: { minor, cur } | null`.
 */
export const readSettledPayment = (payment, { amountMinor = 0, currency, reference } = {}) => {
  const settled = settleAmount(readSettle(payment, currency), amountMinor, currency);
  const plan = settled
    ? readPayment(payment, { amountMinor: settled.minor, currency: settled.cur, reference })
    : readPayment(payment, { amountMinor, currency, reference });
  return { settle: settled, ...plan };
};

/**
 * Zelle's trademark notice for an unlicensed, plain-text reference (no logo): the owner, then
 * the non-endorsement disclaimer in the capitals and words of Fair Use item 10 of
 * zelle.com/zelle-trademark-guidelines (checked 13 Nov 2026). Shown, as a footnote, on any
 * sheet that offers Zelle. Same text as PayoutText.zelleNotice.
 */
export const ZELLE_NOTICE = 'Zelle® is a registered trademark of Early Warning Services, LLC. ONLYBILLS IS NOT AUTHORIZED, ENDORSED, OR SPONSORED BY EARLY WARNING SERVICES, LLC, OWNER OF ZELLE®.';

// ── Settle currency: the host's frozen rate (contract section 11) ──
/**
 * What this guest pays for a bill-currency amount: the settle currency when the host set
 * one and it converts, else the bill's own. → { amount, currency, settle, minor } where
 * `settle` is the read rate (or null). Guests never fetch rates.
 */
export const settledShare = (payment, billCurrency, billAmount) => {
  const cur = String(billCurrency || 'GBP').toUpperCase();
  const settle = readSettle(payment, cur);
  const conv = settleAmount(settle, toMinor(billAmount || 0, cur), cur);
  return conv
    ? { amount: toAmount(conv.minor, conv.cur), currency: conv.cur, minor: conv.minor, settle }
    : { amount: billAmount, currency: cur, minor: toMinor(billAmount || 0, cur), settle: null };
};

// ── Icons ─────────────────────────────────────────────────
// Guests see a card for the card-friendly links (what they pay WITH, not whose bank), the
// brand's own logo for every other brand we know, and the bank glyph for bank-style details,
// unknown ids and anything without a logo. Never a letter tile. Zelle has no logo on purpose:
// its logos "may only be used under a license grant" (zelle.com/zelle-trademark-guidelines,
// Fair Use items 2 and 4) and OnlyBills has none, so it is the bank glyph with its name as text.
const CARD_IDS = ['monzo', 'starling', 'revolut'];
const logo = (name) => ({ type: 'logo', src: `logo-${name}.png` });
const LOGO_IDS = [
  'paypal', 'venmo', 'cashapp', 'swish', 'interac', 'bizum', 'mbway', 'vipps', 'mobilepay',
  'twint', 'blik', 'wero', 'iris', 'yape', 'pix', 'breb',
];
/** A pasted link is drawn by its allow-listed host, never by anything the document says. */
const HOST_LOGOS = {
  'tikkie.me': 'tikkie', 'bunq.me': 'bunq', 'send.monobank.ua': 'monobank', 'cash.app': 'cashapp',
  'venmo.com': 'venmo', 'paypal.me': 'paypal', 'paypal.com': 'paypal', 'revolut.me': 'revolut',
  'app.swish.nu': 'swish',
};

/** → { type: 'card' } | { type: 'logo', src } | { type: 'bank' } */
export const iconFor = (opt) => {
  if (CARD_IDS.includes(opt.id)) return { type: 'card' };
  if (opt.id === 'link') {
    const allowed = checkLink(opt.url);
    return allowed && Object.prototype.hasOwnProperty.call(HOST_LOGOS, allowed.host) ? logo(HOST_LOGOS[allowed.host]) : { type: 'bank' };
  }
  return LOGO_IDS.includes(opt.id) ? logo(opt.id) : { type: 'bank' };
};
