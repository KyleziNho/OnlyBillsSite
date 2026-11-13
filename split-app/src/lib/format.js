// Formatting helpers shared by every screen: money, dates, venue names, haptics.
import { displayDigits, exponent, linkAmountMinor, toMinor, toAmount } from './money.js';
import { guestLocale } from './locale.js';

const FALLBACK_SYMBOLS = {
  GBP: '£', USD: '$', EUR: '€', JPY: '¥', CAD: '$', AUD: '$',
  SGD: '$', MYR: 'RM', THB: '฿', INR: '₹', KRW: '₩', CNY: '¥', HKD: '$',
};

const formatters = new Map();
const formatterFor = (code, digits, locale) => {
  const key = `${locale}|${code}|${digits}`;
  if (!formatters.has(key)) {
    let f = null;
    try {
      // `symbol`, as the app's Money.format: a local reads their own sign ("R$", "kr", "zł"),
      // anyone else gets the unambiguous one ("US$", "MX$", "SEK") for a currency not theirs.
      f = new Intl.NumberFormat(locale, {
        style: 'currency', currency: code, currencyDisplay: 'symbol',
        minimumFractionDigits: digits, maximumFractionDigits: digits,
      });
    } catch { /* unknown ISO code or locale → fallback below */ }
    formatters.set(key, f);
  }
  return formatters.get(key);
};

/**
 * The bill's currency, written the way the guest's locale writes money:
 * "£24.60" (en-GB), "R$ 24,60" (pt-BR), "24,60 €" (de-DE), "$24.60" (en-US), "¥2,460".
 * Rounded to the currency's minor unit first, as the engine and the links are, so the
 * shown amount always matches what a link or the Amount row carries. "−" is a true minus.
 * Never "-£0.00".
 */
export const formatMoney = (amount, currency, locale = guestLocale()) => {
  const code = String(currency || 'GBP').trim().toUpperCase();
  const minor = toMinor(Number.isFinite(amount) ? amount : 0, code);
  const value = minor === 0 ? 0 : toAmount(minor, code);
  // COP and HUF drop ",00" on a whole amount, as the links and the copied Amount do
  // (money.js WHOLE_WHEN_EVEN, contract section 0).
  const digits = displayDigits(minor, code);
  const f = formatterFor(code, digits, locale);
  if (!f) {
    const text = (FALLBACK_SYMBOLS[code] || code + ' ') + Math.abs(value).toFixed(digits);
    return value < 0 ? '−' + text : text;
  }
  return f.format(value).replace('-', '−');
};

/**
 * The currency sign for an input, and which side of the number the guest's locale puts
 * it: { symbol: '£', after: false } (en-GB), { symbol: '€', after: true } (de-DE).
 */
export const currencyAffix = (currency, locale = guestLocale()) => {
  const code = String(currency || 'GBP').trim().toUpperCase();
  const f = formatterFor(code, exponent(code), locale);
  if (!f) return { symbol: FALLBACK_SYMBOLS[code] || code, after: false };
  const parts = f.formatToParts(0);
  const at = parts.findIndex((p) => p.type === 'currency');
  if (at < 0) return { symbol: code, after: false };
  return { symbol: parts[at].value, after: at > parts.findIndex((p) => p.type === 'integer') };
};

/** Amount as the plain decimal a payment link wants: "24.60", "333" for JPY. */
export const linkAmount = (amount, currency = 'GBP') => linkAmountMinor(toMinor(amount || 0, currency), currency);

/**
 * The most one item line can cost, as a typo guard: 100,000 in most currencies, 100,000,000
 * where a meal runs to tens of thousands (pesos in Chile or Colombia, forints, yen).
 */
const LARGE_UNIT = new Set(['ARS', 'CLP', 'COP', 'HUF', 'IDR', 'ISK', 'JPY', 'KRW', 'KZT', 'PYG', 'UGX', 'VND']);
export const maxItemPrice = (currency) => (LARGE_UNIT.has(String(currency || '').trim().toUpperCase()) ? 1e8 : 1e5);

/** Rounds to the currency's minor unit (pence; whole yen). */
export const roundMoney = (v, currency = 'GBP') => toAmount(toMinor(v || 0, currency), currency);

// ── Dates ──────────────────────────────────────────────────
/** Firestore Timestamp | {seconds} | Date | string | number → Date or null. */
export const toDate = (v) => {
  if (v == null || v === '') return null;
  let d;
  if (typeof v?.toDate === 'function') d = v.toDate();
  else if (typeof v === 'object' && v.seconds != null) d = new Date(v.seconds * 1000);
  else d = new Date(v);
  return Number.isNaN(d?.getTime?.()) ? null : d;
};

const DAY = 864e5;

/**
 * A friendly date for the header — or '' when the date can't be trusted.
 * Receipt OCR sometimes yields "26 Jun 2017" or next year; showing that looks
 * broken, so anything older than ~13 months or more than 2 days ahead is hidden.
 */
export const displayDate = (value, now = Date.now()) => {
  const d = toDate(value);
  if (!d) return '';
  const age = now - d.getTime();
  if (age > 400 * DAY || age < -2 * DAY) return '';
  const startOf = (t) => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const days = Math.round((startOf(now) - startOf(d.getTime())) / DAY);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const sameYear = new Date(now).getFullYear() === d.getFullYear();
  return d.toLocaleDateString('en-GB', {
    weekday: days > 0 && days < 7 ? 'long' : 'short',
    ...(days > 0 && days < 7 ? {} : { day: 'numeric', month: 'short' }),
    ...(sameYear ? {} : { year: 'numeric' }),
  }).replace(',', '');
};

// ── Venue names ────────────────────────────────────────────
/**
 * Google Places names arrive keyword-stuffed ("Rajaji Curry House Indian
 * Restaurant | Best Curry in Leeds"). Keep the first segment, tidy it, cap it.
 * A bare hyphen ("Peri-Peri") is part of a name — only a spaced " - " splits.
 */
export const cleanVenueName = (raw, fallback = 'Your bill') => {
  const full = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!full) return fallback;
  const first = full.split(/\s*[|–—:·•]\s*|\s+-\s+/)[0].trim() || full;
  if (first.length <= 40) return first;
  const cut = first.slice(0, 40);
  const space = cut.lastIndexOf(' ');
  return (space > 24 ? cut.slice(0, space) : cut).replace(/[\s,&-]+$/, '') + '…';
};

export const formatCount = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n));

export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/** "Kyle", "Kyle & Sam", "Kyle, Sam & Ana" */
export const listNames = (names) => {
  if (names.length <= 1) return names[0] || '';
  return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
};

// ── Haptics ────────────────────────────────────────────────
/** A tiny tick on Android (Vibration API); a silent no-op on iOS / desktop. */
export const haptic = (pattern = 8) => {
  try { navigator.vibrate?.(pattern); } catch { /* not allowed */ }
};
