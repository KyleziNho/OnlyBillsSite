// The OnlyBills money engine — a line-for-line port of the iOS engine
// (SplitSwift/SplitSwift/Money/MoneyCore.swift + BillEngine.swift). Every amount that is
// added up, split or compared is an INTEGER of the currency's minor unit (pence; whole
// yen). Both ports are checked against the same fixtures (src/lib/__fixtures__/
// money-cases.json, synced from the app repo), so iOS and web give identical pennies.
// Change one → change the other → run `node --test src/lib/` and the Swift suite.
//
// ORDER OF OPERATIONS
//   1. item discounts      a line's own discount comes off that line only (never below 0;
//                          any excess becomes a bill-level discount)
//   2. targeted discounts  a discount linked to lines (meal deal, "% off food") is spread
//                          over exactly those lines in proportion to their net totals
//   3. net items N         Σ net lines (negative lines count)
//   4. bill-level discounts fixed, or % of N (+ overflow from 1–2)
//   5. discounted subtotal D = N + bill-level discounts
//   6. service / tax / tip / other: fixed, or % of D. Informational lines add nothing.
//   total = max(0, D + Σ step-6 lines)

export const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'IDR', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG',
  'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);
export const THREE_DECIMAL = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

const code = (currency) => String(currency || 'GBP').trim().toUpperCase();

export const exponent = (currency) => {
  const c = code(currency);
  if (ZERO_DECIMAL.has(c)) return 0;
  if (THREE_DECIMAL.has(c)) return 3;
  return 2;
};
export const scale = (currency) => [1, 10, 100, 1000][exponent(currency)];

/** Round half away from zero, nudged so binary noise can't flip a .5. Same as Swift. */
export const roundHalfAway = (x) => {
  if (!Number.isFinite(x)) return 0;
  const m = Math.floor(Math.abs(x) + 0.5 + 1e-7);
  if (m >= 9e15) return 0;
  return x < 0 ? (m === 0 ? 0 : -m) : m;
};

export const toMinor = (amount, currency) => roundHalfAway((Number(amount) || 0) * scale(currency));
export const toAmount = (minor, currency) => minor / scale(currency);

/** The plain decimal a payment link wants: "24.60", "333" (JPY). Never negative. */
export const linkAmountMinor = (minor, currency) => {
  const e = exponent(currency);
  const m = Math.max(0, Math.round(minor) || 0);
  if (e === 0) return String(m);
  const s = scale(currency);
  const frac = String(m % s).padStart(e, '0');
  return `${Math.floor(m / s)}.${frac}`;
};

// ── Parsing ──────────────────────────────────────────────
/**
 * "12.50", "12,50", "1,234.50", "1.234,50", "¥1,200", "£ 7", "1 234,50" → number | null.
 * Both separators: the LAST is the decimal mark. One kind: thousands when repeated, when
 * the currency has no minor unit, or "1,234" (3 digits after a 1–3 digit non-zero group,
 * for currencies with fewer than 3 decimals);
 * otherwise decimal. Identical to Money.parse in the app.
 */
export const parseAmount = (text, currency = 'GBP') => {
  let negative = false;
  const chars = [];
  for (const ch of String(text ?? '')) {
    if (ch >= '0' && ch <= '9') chars.push(ch);
    else if (ch === '.' || ch === ',') chars.push(ch);
    else if ((ch === '-' || ch === '−') && chars.length === 0) negative = true;
  }
  if (!chars.some((c) => c >= '0' && c <= '9')) return null;
  const dots = chars.filter((c) => c === '.').length;
  const commas = chars.filter((c) => c === ',').length;
  let mark = null;
  if (dots > 0 && commas > 0) {
    mark = chars.lastIndexOf('.') > chars.lastIndexOf(',') ? '.' : ',';
  } else if (dots + commas === 1) {
    const sep = dots === 1 ? '.' : ',';
    const idx = chars.indexOf(sep);
    const before = chars.slice(0, idx);
    const after = chars.slice(idx + 1);
    const thousands = exponent(currency) < 3 && after.length === 3 && before.length >= 1 && before.length <= 3 && before[0] !== '0';
    mark = exponent(currency) === 0 || thousands ? null : sep;
  }
  let s = '';
  for (const ch of chars) {
    if (ch >= '0' && ch <= '9') s += ch;
    else if (ch === mark) s += '.';
  }
  if (s.endsWith('.')) s = s.slice(0, -1);
  if (s.startsWith('.')) s = '0' + s;
  const v = Number(s === '' ? '0' : s);
  if (!Number.isFinite(v)) return null;
  return negative ? -v : v;
};

// ── Charge kinds ─────────────────────────────────────────
const TAX = new Set(['tax', 'taxes', 'vat', 'gst', 'cgst', 'sgst', 'igst', 'hst', 'pst', 'mwst', 'tva', 'iva', 'ust']);
const TIP = new Set(['tip', 'tips', 'gratuity', 'gratuities']);
const SERVICE = new Set(['service', 'cover', 'coperto', 'servizio']);
const DISCOUNT = new Set(['discount', 'discounts', 'voucher', 'promo', 'coupon', 'off', 'offer']);
const ROUNDING = new Set(['rounding', 'round', 'roundoff']);

const words = (name) => new Set(String(name || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
const meets = (set, w) => [...w].some((x) => set.has(x));

export const inferKind = (name, amount) => {
  const w = words(name);
  if (meets(TAX, w)) return 'tax';
  if (meets(TIP, w)) return 'tip';
  if (meets(SERVICE, w)) return 'service';
  if (meets(ROUNDING, w)) return 'rounding';
  if (meets(DISCOUNT, w)) return 'discount';
  return amount < 0 ? 'discount' : 'other';
};

/**
 * Same table as ChargeKind.resolve in the app. An explicit kind always wins — including
 * 'other' (the host picked "Other" for "Service 12.5%"; it stays Other). Only a missing,
 * empty or unrecognised kind is inferred from the name, then the sign. Writers that used
 * 'other' as a default (the AI's "none of the above", pre-engine saved receipts) clear it
 * to null in the app before it reaches a live doc; web never writes a kind.
 */
export const chargeKind = (raw, name, amount) => {
  switch (String(raw ?? '').trim().toLowerCase()) {
    case 'tax': case 'vat': case 'gst': case 'cgst': case 'sgst': case 'igst': case 'hst': case 'pst':
    case 'sales tax': case 'mwst':
      return 'tax';
    case 'service': case 'service charge': case 'service_charge': case 'cover': case 'cover charge':
    case 'fee': case 'fees': case 'surcharge':
      return 'service';
    case 'tip': case 'tips': case 'gratuity':
      return 'tip';
    case 'discount': case 'voucher': case 'promo': case 'coupon':
      return 'discount';
    case 'rounding': case 'round off': case 'round-off': case 'roundoff':
      return 'rounding';
    case 'other':
      return 'other';
    default:
      return inferKind(name, amount);
  }
};

export const bucketOf = (kind) => (kind === 'rounding' || kind === 'other' ? 'other' : kind);

// ── Bill ─────────────────────────────────────────────────
// Bill: { currency, lines: [{id, name, quantity, amount (gross minor), discount (minor ≥ 0)}],
//         charges: [{id?, name, kind, amount (signed minor), percent?, included?, targets?}],
//         printed? }

export const safeQuantity = (q) => (typeof q === 'number' && Number.isFinite(q) && q > 0.0001 ? q : 1);

export const isDeduction = (c) =>
  c.kind === 'discount' || (c.kind !== 'tax' && c.kind !== 'service' && c.kind !== 'tip' && c.amount < 0);
const isBillDiscount = (c) => isDeduction(c) && !(c.targets && c.targets.length);

export const resolvedCharge = (c, basis) => {
  if (c.percent == null || !Number.isFinite(c.percent)) return c.amount;
  const mag = Math.abs(roundHalfAway(basis * Math.abs(c.percent) / 100));
  return isDeduction(c) ? -mag : mag;
};

const sum = (xs) => xs.reduce((s, x) => s + x, 0);

/** Exact integer (a*b) floor-divided by c, with a non-negative remainder (c > 0). */
const mulDivMod = (a, b, c) => {
  const p = a * b;
  if (Number.isSafeInteger(p)) {
    let q = Math.trunc(p / c);
    let r = p - q * c;
    if (r < 0) { q -= 1; r += c; }
    return [q, r];
  }
  const P = BigInt(a) * BigInt(b);
  const C = BigInt(c);
  let q = P / C;
  let r = P - q * C;
  if (r < 0n) { q -= 1n; r += C; }
  return [Number(q), Number(r)];
};

const byRemDesc = (rems) => (i, j) => (rems[i] !== rems[j] ? rems[j] - rems[i] : i - j);
const byRemAsc = (rems) => (i, j) => (rems[i] !== rems[j] ? rems[i] - rems[j] : i - j);
const indices = (n) => Array.from({ length: n }, (_, i) => i);

/** Cuts `amount` minor units in proportion to float weights. Ties → lower index. */
export const largestRemainder = (amount, weights) => {
  const total = sum(weights);
  if (!(total > 0) || amount === 0) return weights.map(() => 0);
  const sign = amount < 0 ? -1 : 1;
  const a = Math.abs(amount);
  const floors = [];
  const rems = [];
  for (const w of weights) {
    const exact = a * w / total;
    const f = Math.floor(exact);
    floors.push(f);
    rems.push(exact - f);
  }
  let left = a - sum(floors);
  const order = indices(weights.length).sort(byRemDesc(rems));
  let k = 0;
  while (left > 0 && order.length) { floors[order[k % order.length]] += 1; left -= 1; k += 1; }
  while (left < 0) {
    const j = [...order].reverse().find((x) => floors[x] > 0);
    if (j === undefined) break;
    floors[j] -= 1; left += 1;
  }
  return floors.map((f) => (f === 0 ? 0 : f * sign));
};

/** Cuts `amount` (≥ 0) in proportion to integer weights, exactly. Ties → lower index. */
export const largestRemainderInt = (amount, weights) => {
  const total = sum(weights);
  if (total <= 0 || amount <= 0) return weights.map(() => 0);
  const floors = [];
  const rems = [];
  for (const w of weights) {
    const [q, r] = mulDivMod(amount, w, total);
    floors.push(q); rems.push(r);
  }
  let left = amount - sum(floors);
  const order = indices(weights.length).sort(byRemDesc(rems));
  let k = 0;
  while (left > 0 && order.length) { floors[order[k % order.length]] += 1; left -= 1; k += 1; }
  return floors;
};

/** Everything the bill's arithmetic produces, in the documented order. */
export const billMath = (bill) => {
  const lines = bill.lines || [];
  const charges = bill.charges || [];
  const net = [];
  const applied = [];
  let overflow = 0;
  for (const ln of lines) {
    const d = Math.max(0, ln.discount || 0);
    if (ln.amount > 0) {
      const a = Math.min(d, ln.amount);
      net.push(ln.amount - a); applied.push(a); overflow -= d - a;
    } else {
      net.push(ln.amount); applied.push(0); overflow -= d;
    }
  }
  const chargeMinor = charges.map(() => 0);
  const itemLevel = charges.map(() => 0);
  const index = new Map();
  lines.forEach((ln, i) => { if (!index.has(ln.id)) index.set(ln.id, i); });
  charges.forEach((c, k) => {
    if (c.included || !isDeduction(c) || !(c.targets && c.targets.length)) return;
    const idx = c.targets.filter((t) => index.has(t)).map((t) => index.get(t)).filter((i) => net[i] > 0);
    const basis = sum(idx.map((i) => net[i]));
    const magnitude = Math.abs(resolvedCharge(c, basis));
    const absorbed = Math.min(magnitude, basis);
    const parts = largestRemainderInt(absorbed, idx.map((i) => net[i]));
    idx.forEach((i, j) => { net[i] -= parts[j]; applied[i] += parts[j]; });
    itemLevel[k] = absorbed === 0 ? 0 : -absorbed;
    chargeMinor[k] = magnitude - absorbed === 0 ? 0 : -(magnitude - absorbed);
  });
  const netItems = sum(net);
  charges.forEach((c, k) => {
    if (!c.included && isBillDiscount(c)) chargeMinor[k] = resolvedCharge(c, netItems);
  });
  const discounted = netItems + overflow + sum(chargeMinor);
  charges.forEach((c, k) => {
    if (!c.included && !isDeduction(c)) chargeMinor[k] = resolvedCharge(c, discounted);
  });
  const total = Math.max(0, netItems + overflow + sum(chargeMinor));
  return {
    lineNet: net, lineDiscount: applied, chargeMinor, chargeItemLevel: itemLevel,
    overflow, netItems, discounted, total,
  };
};

const breakdown = (chargeTotal, slots, weight, weightSum) => {
  if (!slots.length) return [];
  const base = [];
  const rems = [];
  for (const s of slots) {
    if (weightSum > 0) {
      const exact = s * weight / weightSum;
      const f = Math.floor(exact);
      base.push(f); rems.push(exact - f);
    } else {
      base.push(0); rems.push(0);
    }
  }
  let residual = chargeTotal - sum(base);
  if (residual > 0) {
    const order = indices(slots.length).sort(byRemDesc(rems));
    let k = 0;
    while (residual > 0) { base[order[k % order.length]] += 1; residual -= 1; k += 1; }
  } else if (residual < 0) {
    const order = indices(slots.length).sort(byRemAsc(rems));
    let k = 0;
    while (residual < 0) { base[order[k % order.length]] -= 1; residual += 1; k += 1; }
  }
  return base.map((b) => (b === 0 ? 0 : b));
};

/**
 * Splits a bill between `partyCount` parties. `allocations[i]` maps party index → units
 * of line i (same unit as its quantity); the rest of the quantity is unassigned.
 * Returns { parties: [share], unassigned: share, total, spread, slots } where a share is
 * { lines, savings, subtotal, charges, total } in minor units and Σ totals + unassigned
 * == total exactly.
 */
export const splitBill = (bill, partyCount, allocations) => {
  const m = billMath(bill);
  const lines = bill.lines || [];
  const charges = bill.charges || [];
  const n = Math.max(0, partyCount);
  const u = n;
  const shares = indices(n + 1).map(() => lines.map(() => 0));
  const dShares = indices(n + 1).map(() => lines.map(() => 0));
  const exactWeights = indices(n + 1).map(() => 0);
  const spread = [];

  lines.forEach((ln, i) => {
    const alloc = allocations[i] || {};
    const weights = indices(n).map((p) => {
      const w = alloc[p] ?? 0;
      return Number.isFinite(w) && w > 0 ? w : 0;
    });
    const assigned = sum(weights);
    const netLine = m.lineNet[i];
    if (netLine < 0 && assigned <= 0) { spread.push(i); return; }
    const q = safeQuantity(ln.quantity);
    let rest = q - assigned;
    if (rest <= q * 1e-6) rest = 0;
    weights.push(rest);
    if (sum(weights) <= 0) weights[u] = 1;
    const gross = largestRemainder(netLine + m.lineDiscount[i], weights);
    const sh = largestRemainder(netLine, weights);
    const wt = sum(weights);
    for (let p = 0; p <= n; p += 1) {
      shares[p][i] = sh[p];
      dShares[p][i] = gross[p] - sh[p];
      exactWeights[p] += netLine * weights[p] / wt;
    }
  });

  const slots = charges.map((c, k) => ({ name: c.name, kind: c.kind, amount: m.chargeMinor[k], index: k }));
  if (m.overflow !== 0) slots.push({ name: 'Item discounts', kind: 'discount', amount: m.overflow, index: -1 });
  spread.forEach((i) => slots.push({ name: lines[i].name, kind: 'discount', amount: m.lineNet[i], index: -1, line: i }));

  const subtotals = shares.map((row) => sum(row));
  const total = m.total;
  let weights = exactWeights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  if (sum(weights) <= 0) { weights = indices(n + 1).map(() => 0); weights[u] = 1; }
  const totals = largestRemainder(total, weights);
  const weightSum = sum(weights);
  const chargeTotals = indices(n + 1).map((p) => totals[p] - subtotals[p]);
  if (!slots.length && chargeTotals.some((c) => c !== 0)) {
    slots.push({ name: 'Adjustment', kind: 'other', amount: 0, index: -1 });
  }
  const slotAmounts = slots.map((s) => s.amount);
  const parties = indices(n + 1).map((p) => ({
    lines: shares[p], savings: dShares[p], subtotal: subtotals[p],
    charges: breakdown(chargeTotals[p], slotAmounts, weights[p], weightSum), total: totals[p],
  }));
  const unassigned = parties.pop();
  return { parties, unassigned, total, spread, slots, math: m };
};
