// Formatting helpers shared by every screen: money, dates, venue names, haptics.
import { linkAmountMinor, toMinor, toAmount } from './money.js';

const FALLBACK_SYMBOLS = {
  GBP: '£', USD: '$', EUR: '€', JPY: '¥', CAD: '$', AUD: '$',
  SGD: '$', MYR: 'RM', THB: '฿', INR: '₹', KRW: '₩', CNY: '¥', HKD: '$',
};

const formatters = new Map();
const formatterFor = (currency) => {
  const code = (currency || 'GBP').toUpperCase();
  if (!formatters.has(code)) {
    let f = null;
    try {
      f = new Intl.NumberFormat('en-GB', {
        style: 'currency', currency: code, currencyDisplay: 'narrowSymbol',
      });
    } catch { /* unknown ISO code → fallback below */ }
    formatters.set(code, f);
  }
  return [code, formatters.get(code)];
};

/** "£24.60", "−£1.50" (true minus), "¥2,460". Never "-£0.00". */
export const formatMoney = (amount, currency) => {
  const v = Number.isFinite(amount) ? amount : 0;
  const rounded = Math.abs(v) < 0.005 ? 0 : v;
  const [code, f] = formatterFor(currency);
  const text = f
    ? f.format(rounded)
    : (FALLBACK_SYMBOLS[code] || code + ' ') + Math.abs(rounded).toFixed(2);
  if (!f && rounded < 0) return '−' + text;
  return text.replace('-', '−');
};

/** The currency's narrow symbol, for input prefixes. */
export const currencySymbol = (currency) => {
  const [code, f] = formatterFor(currency);
  if (!f) return FALLBACK_SYMBOLS[code] || code;
  return f.formatToParts(0).find((p) => p.type === 'currency')?.value || code;
};

/** Amount as the plain decimal a payment link wants: "24.60", "333" for JPY. */
export const linkAmount = (amount, currency = 'GBP') => linkAmountMinor(toMinor(amount || 0, currency), currency);

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
