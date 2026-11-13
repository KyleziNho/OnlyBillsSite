// Pix "Copia e Cola" (contract section 3): the text code every Brazilian bank app accepts.
// Built on the guest's device at the tap from the host's key and the guest's share, so it
// always carries the current amount. The Swift twin is GuestCore/PixCode.swift; the shared
// vectors (pay-vectors.json → pix) prove both produce the same string.
import { linkAmountMinor } from './money.js';
import { asciiLower, clean, cut } from './payText.js';

export const PIX_NAME_DEFAULT = 'RECEBEDOR';
export const PIX_CITY_DEFAULT = 'BRASIL';
const PIX_KEY_MAX = 77;
const PIX_AMOUNT_MAX = 999999999999;

// U+0300–036F, the combining marks NFD splits off a letter.
const COMBINING = [String.fromCharCode(0x300), String.fromCharCode(0x36F)];
const FOLD = {
  'ß': 'ss', 'ẞ': 'SS', 'Æ': 'AE', 'æ': 'ae', 'Ø': 'O', 'ø': 'o', 'Œ': 'OE', 'œ': 'oe',
  'Đ': 'D', 'đ': 'd', 'Ð': 'D', 'ð': 'd', 'Ł': 'L', 'ł': 'l', 'Þ': 'TH', 'þ': 'th', 'ı': 'i',
};

/**
 * Text a Pix code can carry: accents folded away, everything outside A–Z a–z 0–9 turned
 * into a space, at most `max` characters. Never the platform's own folding (they differ).
 */
export const pixText = (s, max) => {
  if (typeof s !== 'string') return '';
  const folded = Array.from(s.normalize('NFD').replace(/\p{Mn}/gu, (m) => (m >= COMBINING[0] && m <= COMBINING[1] ? '' : m)))
    .map((ch) => FOLD[ch] ?? ch).join('');
  return cut(folded.replace(/[^A-Za-z0-9]/g, ' ').replace(/ +/g, ' ').replace(/^ | $/g, ''), max);
};

/** CRC-16/CCITT-FALSE over the ASCII bytes, as four upper-case hex digits. */
export const crc16 = (s) => {
  let crc = 0xFFFF;
  for (let i = 0; i < s.length; i += 1) {
    crc ^= s.charCodeAt(i) << 8;
    for (let k = 0; k < 8; k += 1) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

const digitsOf = (d) => Array.from(d, Number);
const allSame = (d) => /^(\d)\1*$/.test(d);

const cpfValid = (d) => {
  if (d.length !== 11 || allSame(d)) return false;
  const n = digitsOf(d);
  const check = (count) => (n.slice(0, count).reduce((s, x, i) => s + x * (count + 1 - i), 0) * 10) % 11 % 10;
  return check(9) === n[9] && check(10) === n[10];
};

const cnpjValid = (d) => {
  if (d.length !== 14 || allSame(d)) return false;
  const n = digitsOf(d);
  const check = (weights) => {
    const r = weights.reduce((s, w, i) => s + w * n[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return check([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === n[12]
    && check([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === n[13];
};

const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const RANDOM_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BR_PHONE = /^\+55[1-9][1-9][0-9]{8,9}$/;

/**
 * What kind of Pix key this is and its stored form → { type, key, ambiguous } | null.
 * `ambiguous`: 11 digits that are both a valid CPF and a mobile number.
 */
export const classifyPixKey = (raw) => {
  const s = clean(raw);
  if (!s) return null;
  const found = (type, key, ambiguous = false) => ({ type, key, ambiguous });
  if (s.includes('@')) {
    const k = asciiLower(s);
    return Array.from(k).length <= PIX_KEY_MAX && EMAIL.test(k) ? found('email', k) : null;
  }
  const lower = asciiLower(s);
  if (RANDOM_KEY.test(lower)) return found('evp', lower);
  const t = s.replace(/[ .\-()/]/g, '');
  if (t.startsWith('+')) return BR_PHONE.test(t) ? found('phone', t) : null;
  if (!/^[0-9]+$/.test(t)) return null;
  const mobile = /^[1-9][1-9]9[0-9]{8}$/.test(t);
  if (t.length === 14) return cnpjValid(t) ? found('cnpj', t) : null;
  if (t.length === 11) {
    if (cpfValid(t)) return found('cpf', t, mobile);
    return mobile ? found('phone', `+55${t}`) : null;
  }
  if (t.length === 10 && /^[1-9][1-9][0-9]{8}$/.test(t)) return found('phone', `+55${t}`);
  if ((t.length === 12 || t.length === 13) && t.startsWith('55') && BR_PHONE.test(`+${t}`)) return found('phone', `+${t}`);
  return null;
};

/** A key exactly as the host app stores it (the guest re-checks this on read). */
export const isStoredPixKey = (key) => typeof key === 'string' && classifyPixKey(key)?.key === key;

const tlv = (tag, value) => `${tag}${String(value.length).padStart(2, '0')}${value}`;

/**
 * The Copia e Cola string, or null when one cannot be built (not a reais bill, a key that
 * is not in stored form, an amount too long for the field). `amountMinor` null or ≤ 0
 * leaves the amount out. No product surface passes `note`.
 */
export const pixCode = (key, name, city, amountMinor, currency = 'BRL', note = null) => {
  if (String(currency).toUpperCase() !== 'BRL') return null;
  if (!isStoredPixKey(key) || key.length > PIX_KEY_MAX) return null;
  const hasAmount = typeof amountMinor === 'number' && amountMinor > 0;
  if (hasAmount && amountMinor > PIX_AMOUNT_MAX) return null;

  let account = tlv('00', 'br.gov.bcb.pix') + tlv('01', key);
  if (note != null) {
    const room = 99 - account.length - 4;
    const text = room >= 1 ? pixText(note, room) : '';
    if (text) account += tlv('02', text);
  }
  let s = `000201${tlv('26', account)}520400005303986`;
  if (hasAmount) s += tlv('54', linkAmountMinor(amountMinor, 'BRL'));
  s += `5802BR${tlv('59', pixText(name, 25) || PIX_NAME_DEFAULT)}${tlv('60', pixText(city, 15) || PIX_CITY_DEFAULT)}`;
  s += `${tlv('62', tlv('05', '***'))}6304`;
  return s + crc16(s);
};
