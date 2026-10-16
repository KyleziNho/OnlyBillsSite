// Bill models. All money maths goes through the engine in money.js — the port of the
// iOS engine (SplitSwift/SplitSwift/Money/). LiveBill in the app and liveTotals here
// build the same engine bill from the same Firestore doc, so every guest total is
// penny-identical on both (proven by the shared fixtures in money.test.mjs).
import { toDate, formatMoney, linkAmount } from './format.js';
import { chargeKind, splitBill, toAmount, toMinor } from './money.js';

export const HOST_ID = 'gst_host';

// PersonColor (Models/Person.swift) — the app's people palette, as hex for Firestore.
export const PERSON_COLORS = ['#4d80ff', '#9966ff', '#ff66b3', '#ff4d4d', '#ff9933', '#4dcc80', '#4db3cc', '#ffcc33'];

// Colours older web/app builds wrote, mapped onto the new palette so a table of faces
// reads as one family (the coral host colour especially).
const LEGACY_COLORS = {
  '#ff5a3c': '#ff9933', '#4dabf7': '#4d80ff', '#e8b84b': '#ffcc33', '#38d39f': '#4dcc80',
  '#b57bff': '#9966ff', '#ff8787': '#ff4d4d', '#f7a94d': '#ff9933', '#63d7e0': '#4db3cc',
  '#f783ac': '#ff66b3', '#ff6b6b': '#ff4d4d',
};
export const displayColor = (hex) => {
  const h = String(hex || '').trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(h)) return PERSON_COLORS[0];
  return LEGACY_COLORS[h] || h;
};

export const pickGuestColor = (taken, seed = 0) => {
  const used = new Set(taken.map((c) => displayColor(c)));
  const free = PERSON_COLORS.filter((c) => !used.has(c));
  const pool = free.length ? free : PERSON_COLORS;
  return pool[seed % pool.length];
};

/**
 * Any non-empty value in `paid.{gid}` means paid ("confirmed", legacy "pending",
 * or whatever a future build writes) — except values that clearly say otherwise.
 */
export const isPaidValue = (v) => {
  if (v === true) return true;
  if (typeof v === 'number') return v > 0;
  if (typeof v !== 'string') return false;
  const s = v.trim().toLowerCase();
  return s !== '' && !['owes', 'owing', 'unpaid', 'false', 'no', 'none'].includes(s);
};

/** A claim value: `true` today; spec allows a quantity number later. Count claimers. */
const isClaim = (v) => v === true || (typeof v === 'number' && v > 0);

const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

// ── Live (schemaVersion 2) ────────────────────────────────
export const normalizeLive = (data) => {
  const items = Object.entries(data.items || {})
    .filter(([, it]) => it && typeof it === 'object')
    .map(([id, it]) => ({
      id,
      order: num(it.order),
      name: String(it.name || 'Item'),
      price: num(it.price),
      // Item-level discount already taken off `price` (additive field; display + parity).
      discount: Math.max(0, num(it.discount)),
      qty: num(it.qty, 1) > 0 ? num(it.qty, 1) : 1,
      claimedBy: Object.entries(it.claimedBy || {}).filter(([, v]) => isClaim(v)).map(([k]) => k).sort(),
    }))
    .sort((a, b) => (a.order - b.order) || (a.id < b.id ? -1 : 1));

  const charges = Object.entries(data.charges || {})
    .filter(([, c]) => c && typeof c === 'object')
    .map(([id, c]) => {
      const percent = typeof c.percent === 'number' && Number.isFinite(c.percent) && c.percent > 0 ? c.percent : null;
      const name = String(c.name || 'Extra');
      return { id, name, amount: num(c.amount), percent, kind: chargeKind(c.kind, name, num(c.amount)) };
    })
    .filter((c) => Math.abs(c.amount) > 0.0001 || c.percent != null)
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const guests = Object.entries(data.guests || {})
    .filter(([, g]) => g && typeof g === 'object')
    .map(([id, g]) => ({
      id,
      name: String(g.name || 'Guest').trim() || 'Guest',
      color: displayColor(g.color),
      joinedAt: toDate(g.joinedAt)?.getTime() ?? 0,
      isHost: id === HOST_ID,
      addedByHost: !!g.addedByHost,
    }))
    .sort((a, b) => (a.isHost !== b.isHost ? (a.isHost ? -1 : 1) : (a.joinedAt - b.joinedAt) || (a.id < b.id ? -1 : 1)));

  const paid = {};
  Object.entries(data.paid || {}).forEach(([k, v]) => { if (isPaidValue(v)) paid[k] = v; });

  const paidAmount = {};
  Object.entries(data.paidAmount || {}).forEach(([k, v]) => {
    if (typeof v === 'number' && Number.isFinite(v)) paidAmount[k] = v;
  });

  const locked = data.locked === true;
  const status = typeof data.status === 'string' ? data.status : (locked ? 'closed' : 'open');

  return {
    storeName: data.storeName || '',
    currency: data.currency || 'GBP',
    date: data.date ?? null,
    rating: typeof data.rating === 'number' ? data.rating : null,
    ratingCount: num(data.ratingCount),
    placeType: data.placeType || '',
    restaurantPhotoUrl: data.restaurantPhotoUrl || '',
    receiptImageUrl: data.receiptImageUrl || '',
    payment: data.payment || null,
    locked,
    status,
    closed: locked || status === 'closed',
    closedAt: toDate(data.closedAt)?.getTime() ?? null,
    expiresAt: toDate(data.expiresAt)?.getTime() ?? null,
    items, charges, guests, paid, paidAmount,
  };
};

/** The engine bill for a normalised live doc (lines in item order, guests in table order). */
export const liveEngineBill = (bill) => {
  const cur = bill.currency;
  const items = bill.items || [];
  const guests = bill.guests || [];
  return {
    engine: {
      currency: cur,
      lines: items.map((it) => {
        const discount = toMinor(it.discount || 0, cur);
        return { id: it.id, name: it.name, quantity: it.qty, amount: toMinor(it.price, cur) + discount, discount };
      }),
      charges: (bill.charges || []).map((c) => ({
        id: c.id, name: c.name, kind: c.kind, amount: toMinor(c.amount, cur), percent: c.percent ?? null,
      })),
    },
    allocations: items.map((it) => {
      const row = {};
      guests.forEach((g, p) => { if (it.claimedBy.includes(g.id)) row[p] = 1; });
      return row;
    }),
  };
};

export const liveTotals = (bill) => {
  const cur = bill.currency;
  const items = bill.items || [];
  const guests = bill.guests || [];
  const { engine, allocations } = liveEngineBill(bill);
  const split = splitBill(engine, guests.length, allocations);
  const m = split.math;
  const amt = (minor) => toAmount(minor, cur);
  const indexOf = new Map(guests.map((g, i) => [g.id, i]));
  const shareOf = (gid) => split.parties[indexOf.get(gid)] ?? null;

  const itemsSubtotal = amt(m.netItems);
  const chargesNet = amt(m.chargeMinor.reduce((s, x) => s + x, 0) + m.overflow);
  const grandTotal = amt(split.total);

  const subtotalFor = (gid) => amt(shareOf(gid)?.subtotal ?? 0);
  const totalMinorFor = (gid) => shareOf(gid)?.total ?? 0;
  const totalFor = (gid) => amt(totalMinorFor(gid));
  /** Each charge's resolved amount (percentages follow the items). */
  const charges = (bill.charges || []).map((c, k) => ({ ...c, amount: amt(m.chargeMinor[k]) }));
  /** One guest's slice of every bill-level line — sums exactly with their items to their total. */
  const chargesFor = (gid) => {
    const share = shareOf(gid);
    return split.slots.map((slot, k) => ({
      id: slot.index >= 0 ? bill.charges[slot.index].id : `slot_${k}`,
      name: slot.name, kind: slot.kind, amount: amt(slot.amount), share: amt(share ? share.charges[k] : 0),
    }));
  };
  /** One guest's penny-exact slice of an item line. */
  const itemShareFor = (item, gid) => {
    const share = shareOf(gid);
    const i = items.findIndex((it) => it.id === item.id);
    return share && i >= 0 ? amt(share.lines[i]) : 0;
  };

  const unclaimed = items.filter((it) => it.claimedBy.length === 0 && it.price > 0);
  const unclaimedValue = amt(split.unassigned.total);

  return {
    itemsSubtotal, chargesNet, grandTotal, charges, subtotalFor, totalFor, totalMinorFor, chargesFor,
    itemShareFor, unclaimed, unclaimedValue,
  };
};

/**
 * Field writes that keep percentage charges' stored `amount` current after an item edit —
 * for clients that only read `amount` (the App Store 1.1 app). `nextItems` is the item list
 * after the edit. Rules already allow `charges` changes alongside `items`.
 */
export const percentChargeRefresh = (bill, nextItems) => {
  const pct = (bill.charges || []).filter((c) => c.percent != null);
  if (!pct.length) return {};
  const totals = liveTotals({ ...bill, items: nextItems });
  const out = {};
  totals.charges.forEach((c) => { if (c.percent != null) out[`charges.${c.id}.amount`] = c.amount; });
  return out;
};

const HOUR = 36e5;
/**
 * Where the table is in its life, from the guest's side.
 *  open     — claims, edits, joins, payments
 *  closed   — host finished (locked / status:"closed"); payments only, for 7 days
 *  expired  — past expiresAt without being finished; payments only
 */
export const tablePhase = (bill, { now = Date.now(), denied = false } = {}) => {
  if (bill.closed) {
    const payWindowOpen = !bill.closedAt || now < bill.closedAt + 7 * 24 * HOUR;
    return { phase: 'closed', canEdit: false, canPay: payWindowOpen };
  }
  if (denied || (bill.expiresAt && now >= bill.expiresAt)) {
    return { phase: 'expired', canEdit: false, canPay: true };
  }
  return { phase: 'open', canEdit: true, canPay: true };
};

// ── Static (v1 snapshot) ─────────────────────────────────
export const normalizeStatic = (data) => ({
  storeName: data.storeName || '',
  currency: data.currency || 'GBP',
  date: data.date ?? null,
  rating: typeof data.rating === 'number' ? data.rating : null,
  ratingCount: num(data.ratingCount),
  placeType: data.placeType || '',
  restaurantPhotoUrl: data.restaurantPhotoUrl || '',
  receiptImageUrl: data.receiptImageUrl || '',
  payment: data.payment || null,
  totalBill: num(data.totalBill),
  people: (data.people || []).map((p, i) => ({
    index: i,
    id: `p${i}`,
    name: String(p.name || `Person ${i + 1}`),
    color: displayColor(p.color),
    subtotal: num(p.subtotal),
    tax: num(p.tax),
    serviceCharge: num(p.serviceCharge),
    tip: num(p.tip),
    // Additive fields from app 1.2+: discount (positive magnitude) and other charges.
    discount: Math.abs(num(p.discount)),
    other: num(p.other),
    total: num(p.total),
    items: (p.items || []).map((it) => ({
      name: String(it.name || 'Item'),
      price: num(it.price),
      quantity: num(it.quantity, 1) || 1,
    })),
  })),
});

// ── Paying the host ───────────────────────────────────────
// What a guest can pay WITH, per rail (researched Oct 2026). Guests kept assuming they
// needed the host's app, so every option says what actually works. PayPal is honest:
// guest card checkout isn't guaranteed. Mirrors PaymentMethodType.guestCapability (iOS).
export const CAPABILITY = {
  monzo: 'Card, Apple Pay or bank transfer. No Monzo account needed',
  starling: 'Card or Apple Pay. No Starling account needed',
  revolut: 'Card or Apple Pay. No Revolut account needed',
  paypal: 'PayPal account may be needed',
  venmo: 'Venmo account needed',
  bank: 'From any banking app',
};

/**
 * Deep links for each method the host set up, best payer experience first. Monzo and
 * PayPal accept an amount in the URL; Starling Settle Up and Revolut open the profile
 * and the guest types the amount (no amount format is documented for Settle Up).
 */
export const buildPayOptions = (payment, { amount, currency, reference }) => {
  const p = payment || {};
  const amt = linkAmount(amount, currency);
  const cur = (currency || 'GBP').toUpperCase();
  const ref = encodeURIComponent((reference || 'Split').slice(0, 40));
  const shown = formatMoney(amount, currency);
  const handle = (s) => encodeURIComponent(String(s).trim().replace(/^@/, ''));
  const filled = `${shown} filled in for you`;
  const enter = `Enter ${shown} when it opens`;
  const opts = [];

  if (p.monzoUsername) opts.push({
    key: 'monzo', label: 'Monzo', logo: 'logo-monzo.jpg',
    href: `https://monzo.me/${handle(p.monzoUsername)}/${amt}?d=${ref}`,
    note: filled, prefilled: true, capability: CAPABILITY.monzo,
  });
  if (p.starlingUsername) opts.push({
    key: 'starling', label: 'Starling', logo: 'logo-starling.png',
    href: `https://settleup.starlingbank.com/${handle(p.starlingUsername)}`,
    note: enter, prefilled: false, capability: CAPABILITY.starling,
  });
  if (p.revolutUsername) opts.push({
    key: 'revolut', label: 'Revolut', logo: 'logo-revolut.png',
    href: `https://revolut.me/${handle(p.revolutUsername)}`,
    note: enter, prefilled: false, capability: CAPABILITY.revolut,
  });
  if (p.paypalUsername) opts.push({
    key: 'paypal', label: 'PayPal', logo: 'logo-paypal.png',
    href: `https://paypal.me/${handle(p.paypalUsername)}/${amt}${cur}`,
    note: filled, prefilled: true, capability: CAPABILITY.paypal,
  });
  if (p.venmoHandle) opts.push({
    key: 'venmo', label: 'Venmo', mark: 'V', tint: '#008cff',
    href: `https://venmo.com/${handle(p.venmoHandle)}?txn=pay&amount=${amt}&note=${ref}`,
    note: filled, prefilled: true, capability: CAPABILITY.venmo,
  });
  return opts;
};

/**
 * The pay page's layout: one primary way to pay, then "Other ways to pay".
 *  - primary: the host's `payment.defaultMethod` when it's still usable; otherwise the
 *    first link (best payer first); otherwise bank transfer. Docs from older apps have
 *    no defaultMethod and land on the first link — the old order, unchanged.
 *  - others: the remaining links. Bank details are ALWAYS shown under other ways
 *    (unless bank transfer is itself the primary).
 * → { primary: {kind:'link', opt} | {kind:'bank'} | null, others: opt[], bank: boolean }
 */
export const payPlan = (payment, opts) => {
  const links = buildPayOptions(payment, opts);
  const bank = bankRows(payment).length > 0;
  const wanted = String(payment?.defaultMethod || '').toLowerCase();
  let primary = null;
  if (wanted === 'bank' && bank) primary = { kind: 'bank' };
  else {
    const chosen = links.find((o) => o.key === wanted) || links[0];
    if (chosen) primary = { kind: 'link', opt: chosen };
    else if (bank) primary = { kind: 'bank' };
  }
  const others = primary?.kind === 'link' ? links.filter((o) => o !== primary.opt) : links;
  return { primary, others, bank: bank && primary?.kind !== 'bank' };
};

/** "Kyle" for "Pay Kyle £11.00": the live host's name, else the static doc's payeeName. */
export const payeeOf = (payment, fallback) => {
  const name = String(fallback || payment?.payeeName || '').trim();
  return name && name !== 'the host' ? name : '';
};

export const bankRows = (payment) => {
  const p = payment || {};
  const rows = [];
  if (p.bankAccountName) rows.push({ label: 'Name', value: String(p.bankAccountName) });
  (Array.isArray(p.bankDetails) ? p.bankDetails : [])
    .filter((f) => f && f.label && f.value)
    .forEach((f) => rows.push({ label: String(f.label), value: String(f.value) }));
  return rows;
};

export const hasAnyPayMethod = (payment) =>
  buildPayOptions(payment, { amount: 0 }).length > 0 || bankRows(payment).length > 0 || !!payment?.qrCodeUrl;
