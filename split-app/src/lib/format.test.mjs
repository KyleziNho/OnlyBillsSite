// Money as the guest reads it: the bill's currency, the guest's locale. Run: node --test src/lib/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currencyAffix, formatMoney, maxItemPrice } from './format.js';
import { decimalMark, guestLocale, setGuestLocale } from './locale.js';
import { localeDecimal, plainAmount } from './payText.js';
import { linkAmountMinor, toMinor } from './money.js';

// Intl puts a no-break space (U+00A0) or narrow no-break space (U+202F) where a space goes.
const plain = (s) => s.replace(/[  ]/g, ' ');
const fmt = (amount, currency, locale) => plain(formatMoney(amount, currency, locale));

test('each guest reads the bill in their own way of writing money', () => {
  const cases = [
    ['en-GB', 'GBP', 11, '£11.00'],
    ['en-US', 'USD', 11, '$11.00'],
    ['pt-BR', 'BRL', 11, 'R$ 11,00'],
    ['de-DE', 'EUR', 11, '11,00 €'],
    ['es-ES', 'EUR', 11, '11,00 €'],
    ['fr-FR', 'EUR', 1234.5, '1 234,50 €'],
    ['en-IE', 'EUR', 11, '€11.00'],
    ['en-CA', 'CAD', 11, '$11.00'],
    ['fr-CA', 'CAD', 11, '11,00 $'],
    ['sv-SE', 'SEK', 1234.5, '1 234,50 kr'],
    ['nb-NO', 'NOK', 250, '250,00 kr'],
    ['da-DK', 'DKK', 250, '250,00 kr.'],
    ['de-CH', 'CHF', 1234.5, 'CHF 1’234.50'],
    ['pl-PL', 'PLN', 48.5, '48,50 zł'],
    ['cs-CZ', 'CZK', 1234.5, '1 234,50 Kč'],
    ['ro-RO', 'RON', 48.5, '48,50 RON'],
    ['bg-BG', 'EUR', 48.5, '48,50 €'],
    ['es-AR', 'ARS', 12500, '$ 12.500,00'],
    ['es-MX', 'MXN', 1234.5, '$1,234.50'],
    ['es-PE', 'PEN', 48.5, 'S/ 48.50'],
    ['es-UY', 'UYU', 980, '$ 980,00'],
    ['ja-JP', 'JPY', 2460, '￥2,460'],
  ];
  for (const [locale, currency, amount, expect] of cases) {
    assert.equal(fmt(amount, currency, locale), expect, `${locale} ${currency}`);
  }
});

test('the currency stays the bill’s: someone else’s dollars and kronor are never mistaken for your own', () => {
  assert.equal(fmt(11, 'USD', 'en-GB'), 'US$11.00');
  assert.equal(fmt(11, 'MXN', 'en-US'), 'MX$11.00');
  assert.equal(fmt(11, 'CAD', 'en-US'), 'CA$11.00');
  assert.equal(fmt(11, 'SEK', 'en-GB'), 'SEK 11.00');
  assert.equal(fmt(11, 'GBP', 'pt-BR'), '£ 11,00');
  assert.equal(fmt(11, 'BRL', 'en-GB'), 'R$11.00');
});

test('zero-decimal currencies never show a minor unit', () => {
  assert.equal(fmt(12990, 'CLP', 'es-CL'), '$12.990');
  assert.equal(fmt(12990.4, 'CLP', 'es-CL'), '$12.990');
  assert.equal(fmt(12990.5, 'CLP', 'es-CL'), '$12.991');      // half away from zero, as the engine
  assert.equal(fmt(12990, 'CLP', 'en-US'), 'CLP 12,990');
  assert.equal(fmt(2460, 'JPY', 'en-GB'), 'JP¥2,460');
  assert.equal(fmt(2460, 'KRW', 'en-US'), '₩2,460');
});

test('pesos and forints drop the decimals they never use, but keep real ones', () => {
  assert.equal(fmt(45000, 'COP', 'es-CO'), '$ 45.000');
  assert.equal(fmt(4500, 'HUF', 'hu-HU'), '4500 Ft');
  assert.equal(fmt(33333.33, 'COP', 'es-CO'), '$ 33.333,33');
  assert.equal(fmt(1234.5, 'HUF', 'hu-HU'), '1234,50 Ft');
  assert.equal(fmt(0, 'COP', 'es-CO'), '$ 0');
});

test('three-decimal currencies show all three', () => {
  assert.equal(fmt(12.345, 'KWD', 'en-GB'), 'KWD 12.345');
});

test('shown amounts are rounded the way links and the Amount row are', () => {
  for (const [amount, currency, locale] of [[1.005, 'GBP', 'en-GB'], [2.675, 'EUR', 'de-DE'], [28.5, 'JPY', 'ja-JP'], [0.125, 'BRL', 'pt-BR']]) {
    const digits = linkAmountMinor(toMinor(amount, currency), currency);
    const shownDigits = fmt(amount, currency, locale).replace(/[^\d]/g, '');
    assert.equal(shownDigits, digits.replace('.', ''), `${amount} ${currency}`);
  }
});

test('negatives use a true minus and zero is never negative', () => {
  assert.equal(fmt(-1.5, 'GBP', 'en-GB'), '−£1.50');
  assert.equal(fmt(-1.5, 'EUR', 'de-DE'), '−1,50 €');
  assert.equal(fmt(-0.004, 'EUR', 'de-DE'), '0,00 €');
  assert.equal(fmt(NaN, 'USD', 'en-US'), '$0.00');
});

test('an unknown currency code or locale still renders', () => {
  assert.equal(fmt(11, 'KČ', 'cs-CZ'), 'KČ 11.00');
  assert.equal(fmt(11, 'GBP', 'not a locale!'), '£11.00');
});

test('the guest locale drives both the shown amount and the copied Amount', () => {
  try {
    setGuestLocale('pt-BR');
    assert.equal(guestLocale(), 'pt-BR');
    assert.equal(plain(formatMoney(11, 'BRL')), 'R$ 11,00');
    assert.equal(localeDecimal(), ',');
    assert.equal(plainAmount(1100, 'BRL', localeDecimal()), '11,00');
    setGuestLocale('en-US');
    assert.equal(formatMoney(11, 'USD'), '$11.00');
    assert.equal(plainAmount(1100, 'USD', localeDecimal()), '11.00');
    setGuestLocale('es-CL');
    assert.equal(plainAmount(12990, 'CLP', localeDecimal()), '12990');   // no decimals, no grouping
    setGuestLocale('de-DE');
    assert.equal(plainAmount(4550, 'EUR', localeDecimal()), '45,50');
  } finally {
    setGuestLocale('en-GB');
  }
});

test('the browser locale is read from navigator, first usable language wins', () => {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'navigator', { value: { languages: ['xx-invalid-!', 'de-DE', 'en-US'], language: 'de-DE' }, configurable: true });
    setGuestLocale(null);
    assert.equal(guestLocale(), 'de-DE');
    assert.equal(plain(formatMoney(11, 'EUR')), '11,00 €');
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
    setGuestLocale(null);
    assert.equal(guestLocale(), 'en-GB');
  } finally {
    if (had) Object.defineProperty(globalThis, 'navigator', had); else delete globalThis.navigator;
    setGuestLocale('en-GB');
  }
});

test('decimal marks by locale', () => {
  assert.equal(decimalMark('en-GB'), '.');
  assert.equal(decimalMark('pt-BR'), ',');
  assert.equal(decimalMark('de-CH'), '.');
  assert.equal(decimalMark('es-MX'), '.');
  assert.equal(decimalMark('es-CO'), ',');
});

test('input sign sits where the guest’s locale writes it', () => {
  assert.deepEqual(currencyAffix('GBP', 'en-GB'), { symbol: '£', after: false });
  assert.deepEqual(currencyAffix('EUR', 'de-DE'), { symbol: '€', after: true });
  assert.deepEqual(currencyAffix('BRL', 'pt-BR'), { symbol: 'R$', after: false });
  assert.deepEqual(currencyAffix('SEK', 'sv-SE'), { symbol: 'kr', after: true });
  assert.deepEqual(currencyAffix('USD', 'en-US'), { symbol: '$', after: false });
});

test('item prices in pesos and forints are not capped at pound-sized numbers', () => {
  assert.equal(maxItemPrice('GBP'), 1e5);
  assert.ok(150000 < maxItemPrice('CLP'));
  assert.ok(250000 < maxItemPrice('COP'));
  assert.ok(120000 < maxItemPrice('HUF'));
});
