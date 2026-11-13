// String primitives for regional payouts (contract section 0). Shared with the iOS code
// through src/lib/__fixtures__/pay-vectors.json; every length is in code points.
// Contract: SplitSwift/docs/REGIONAL_PAYOUTS_CONTRACT.md. Run: node --test src/lib/
import { decimalMark } from './locale.js';
import { linkAmountMinor } from './money.js';

// Character classes are built from code points so no invisible character ever sits in this file.
const charClass = (ranges) => new RegExp(`[${ranges
  .map(([from, to = from]) => `\\u{${from.toString(16)}}-\\u{${to.toString(16)}}`).join('')}]`, 'gu');
const WHITESPACE = charClass([[0x09, 0x0D], [0x20], [0x85], [0xA0], [0x1680], [0x2000, 0x200A], [0x2028],
  [0x2029], [0x202F], [0x205F], [0x3000]]);
const REMOVED = charClass([[0x00, 0x1F], [0x7F, 0x9F], [0xAD], [0x200B, 0x200F], [0x202A, 0x202E],
  [0x2060, 0x2064], [0x2066, 0x2069], [0xFEFF]]);
const LONE_SURROGATE = /\p{Cs}/u;

/**
 * Text from a document, made safe to show and copy: whitespace of every kind becomes one
 * space, control and invisible direction characters go, the ends are trimmed. Anything
 * that is not a well-formed string → null (the caller drops the entry).
 */
export const clean = (s) => {
  if (typeof s !== 'string' || LONE_SURROGATE.test(s)) return null;
  return s.replace(WHITESPACE, ' ').replace(REMOVED, '').replace(/ +/g, ' ').replace(/^ | $/g, '');
};

/** Code-point length (never UTF-16 units). */
export const length = (s) => Array.from(s).length;

/** The first `n` code points, without trailing spaces. Only labels are cut. */
export const cut = (s, n) => Array.from(s).slice(0, n).join('').replace(/ +$/, '');

/** Percent-encodes everything except A–Z a–z 0–9 - . _ ~ (what the Swift builder does). */
export const enc = (s) => encodeURIComponent(s)
  .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** The payment reference: cleaned, 40 code points, "Split" when there is nothing. */
export const refOf = (reference) => cut(clean(reference) || 'Split', 40);

/**
 * The bare number for an amount field: the currency's precision, no symbol, no grouping.
 * `sep` is the guest's decimal mark; only a comma changes the output.
 */
export const plainAmount = (minor, currency, sep) => {
  const dot = linkAmountMinor(minor, currency);
  return sep === ',' ? dot.replace('.', ',') : dot;
};

/** The guest's locale decimal mark, for the Amount row: the same locale the amount is shown in. */
export const localeDecimal = () => decimalMark();

/** ASCII-only case mapping, so "İ" and friends never change length or meaning. */
export const asciiLower = (s) => s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
export const asciiUpper = (s) => s.replace(/[a-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 32));
