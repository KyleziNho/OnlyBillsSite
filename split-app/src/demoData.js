// Demo fixtures mirroring the Firestore `sharedReceipts` document shapes — one per
// guest-facing state, so every screen can be previewed without touching production.
//
//   ?demo=2&state=<state>   live table (v2) — see LIVE_STATES below
//                           (pay, pay-default, pay-starling, pay-paypal, pay-bank: getting paid)
//   ?demo=1[&person=Dad][&state=pay]   static shared bill (v1)
//   ?demo=loading | notfound | error | offline   app-level pages
//
// Nothing here ever writes to Firestore: demo writes only update local state.

const HOUR = 36e5;
const t = (msAgo) => new Date(Date.now() - msAgo);

const PHOTO = 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=70';
const RECEIPT = 'https://images.unsplash.com/photo-1554774853-b415df9eeb92?auto=format&fit=crop&w=900&q=75';

const PAYMENT = {
  monzoUsername: 'kylezinho',
  revolutUsername: 'kylezinho',
  paypalUsername: 'kylezinho',
  bankAccountName: 'Kyle O’Sullivan',
  bankDetails: [
    { label: 'Sort code', value: '04-00-04' },
    { label: 'Account no', value: '12345678' },
  ],
};

export const ME = { gid: 'gst_me', name: 'Ana' };

// v2 LIVE document (keyed maps, as written by LiveSessionService.swift)
const baseLive = () => ({
  schemaVersion: 2,
  // Keyword-stuffed Places name on purpose — the header shows "Nando's Peri-Peri".
  storeName: "Nando's Peri-Peri | Flame-Grilled Chicken Restaurant · Leeds Trinity",
  currency: 'GBP',
  date: t(1.5 * HOUR),
  rating: 4.3,
  ratingCount: 1284,
  placeType: 'Restaurant',
  locked: false,
  status: 'open',
  expiresAt: new Date(Date.now() + 10 * HOUR),
  restaurantPhotoUrl: PHOTO,
  receiptImageUrl: RECEIPT,
  payment: PAYMENT,
  items: {
    itm_000: { order: 0, name: 'Butterfly Chicken', price: 12.0, qty: 1, claimedBy: { gst_host: true } },
    itm_001: { order: 1, name: 'Wing Platter', price: 16.5, qty: 1, claimedBy: { gst_host: true, gst_dad: true } },
    itm_002: { order: 2, name: 'Peri Chips', price: 4.0, qty: 1, claimedBy: { gst_dad: true } },
    itm_003: { order: 3, name: 'Spicy Rice', price: 4.5, qty: 1, claimedBy: {} },
    itm_004: { order: 4, name: 'Garlic Bread', price: 3.5, qty: 1, claimedBy: {} },
    itm_005: { order: 5, name: 'Bottomless Drink', price: 6.0, qty: 2, claimedBy: { gst_dad: true } },
    itm_006: { order: 6, name: 'Halloumi Sticks', price: 5.5, qty: 1, claimedBy: { gst_gran: true } },
    itm_007: { order: 7, name: 'Chocolate Cake', price: 3.5, qty: 1, claimedBy: {} },
  },
  charges: {
    chg_000: { name: 'Service (10%)', amount: 5.55 },
  },
  guests: {
    gst_host: { name: 'Kyle', color: '#ff5a3c', joinedAt: t(1.4 * HOUR) },
    gst_dad: { name: 'Dad', color: '#4dabf7', joinedAt: t(1.3 * HOUR) },
    gst_gran: { name: 'Gran', color: '#5E5CE6', joinedAt: t(1.2 * HOUR), addedByHost: true },
  },
  paid: { gst_dad: 'confirmed' },
  paidAmount: { gst_dad: 17.6 },
});

const withMe = (d, claims = []) => {
  d.guests.gst_me = { name: ME.name, color: '#4dcc80', joinedAt: t(HOUR) };
  claims.forEach((id) => { d.items[id].claimedBy.gst_me = true; });
  return d;
};

/** state → { data, identity, sheet, denyEdits, conn } */
export const LIVE_STATES = {
  join: () => ({ data: baseLive(), identity: null }),
  'join-solo': () => {
    const d = baseLive();
    d.guests = { gst_host: d.guests.gst_host };
    Object.values(d.items).forEach((it) => { it.claimedBy = it.claimedBy.gst_host ? { gst_host: true } : {}; });
    d.paid = {}; d.paidAmount = {};
    return { data: d, identity: null };
  },
  fresh: () => ({ data: withMe(baseLive()), identity: ME }),
  claiming: () => ({ data: withMe(baseLive(), ['itm_001', 'itm_003']), identity: ME }),
  pay: () => ({ data: withMe(baseLive(), ['itm_001', 'itm_003']), identity: ME, sheet: 'pay' }),
  edit: () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    return { data: d, identity: ME, sheetEdit: 'itm_004' };
  },
  // Getting paid: the host's default leads ("Pay Kyle £11.00"), the rest sit under
  // "Other ways to pay" with bank details always shown. `pay` itself is a 1.1-era doc
  // (no defaultMethod) — it must keep working: first link leads.
  'pay-default': () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    d.payment = { ...PAYMENT, starlingUsername: 'kylezinho', defaultMethod: 'starling' };
    return { data: d, identity: ME, sheet: 'pay' };
  },
  'pay-starling': () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    d.payment = { starlingUsername: 'kylezinho', bankAccountName: PAYMENT.bankAccountName, bankDetails: PAYMENT.bankDetails, defaultMethod: 'starling' };
    return { data: d, identity: ME, sheet: 'pay' };
  },
  'pay-paypal': () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    d.payment = { paypalUsername: 'kylezinho', defaultMethod: 'paypal' };
    return { data: d, identity: ME, sheet: 'pay' };
  },
  'pay-bank': () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    d.payment = { bankAccountName: PAYMENT.bankAccountName, bankDetails: PAYMENT.bankDetails, defaultMethod: 'bank' };
    return { data: d, identity: ME, sheet: 'pay' };
  },
  nopay: () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    d.payment = null;
    return { data: d, identity: ME, sheet: 'pay' };
  },
  paid: () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    d.paid.gst_me = 'confirmed';
    d.paidAmount.gst_me = 11.0;
    return { data: d, identity: ME };
  },
  'paid-sheet': () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    d.paid.gst_me = 'confirmed';
    d.paidAmount.gst_me = 11.0;
    return { data: d, identity: ME, sheet: 'pay' };
  },
  topup: () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003', 'itm_007']);
    d.paid.gst_me = 'paid';            // an unknown-but-truthy value still reads as paid
    d.paidAmount.gst_me = 11.0;        // then the cake got claimed → "+£3.85 since you paid"
    return { data: d, identity: ME };
  },
  settled: () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    Object.assign(d, { locked: true, status: 'closed', closedAt: t(0.5 * HOUR) });
    d.items.itm_004.claimedBy = { gst_host: true, gst_dad: true };
    d.items.itm_007.claimedBy = { gst_gran: true };
    return { data: d, identity: ME };
  },
  'settled-guest': () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    Object.assign(d, { locked: true, status: 'closed', closedAt: t(0.5 * HOUR) });
    return { data: d, identity: null };
  },
  'settled-late': () => {
    // Closed more than 7 days ago: rules refuse paid writes, so no "I've paid".
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    Object.assign(d, { locked: true, status: 'closed', closedAt: t(8 * 24 * HOUR), date: t(8 * 24 * HOUR) });
    return { data: d, identity: ME };
  },
  expired: () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    d.expiresAt = t(0.2 * HOUR);
    return { data: d, identity: ME, denyEdits: true };
  },
  'expired-guest': () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    d.expiresAt = t(0.2 * HOUR);
    return { data: d, identity: null, denyEdits: true };
  },
  denied: () => {
    // Older doc without expiresAt — the first claim is refused by the rules.
    const d = withMe(baseLive(), ['itm_001']);
    delete d.expiresAt;
    return { data: d, identity: ME, denyEdits: true };
  },
  offline: () => ({ data: withMe(baseLive(), ['itm_001', 'itm_003']), identity: ME, conn: 'offline' }),
  busy: () => {
    const d = baseLive();
    d.storeName = 'The Very Long Named Gastropub and Kitchen at the Old Corn Exchange Building - Leeds City Centre';
    d.restaurantPhotoUrl = '';
    const extra = [
      ['Sharing Platter for the Whole Table with Extra Dips', 34.0, 1, ['gst_dad', 'gst_host', 'gst_gran', 'gst_sam', 'gst_jo']],
      ['Pints of Lager', 27.0, 5, ['gst_sam']], ['Sparkling Water', 4.5, 1, []], ['Mac & Cheese', 7.25, 1, ['gst_jo']],
      ['Sticky Toffee Pudding', 6.95, 1, ['gst_me']], ['Espresso Martini', 22.0, 2, ['gst_jo', 'gst_sam']],
    ];
    extra.forEach(([name, price, qty, who], i) => {
      d.items[`itm_${String(8 + i).padStart(3, '0')}`] = { order: 8 + i, name, price, qty, claimedBy: Object.fromEntries(who.map((g) => [g, true])) };
    });
    d.charges.chg_001 = { name: 'Tip', amount: 12 };
    d.charges.chg_002 = { name: 'Student discount', amount: -6 };
    d.guests.gst_sam = { name: 'Sam Taylor', color: '#9966ff', joinedAt: t(0.9 * HOUR) };
    d.guests.gst_jo = { name: '🍕 Jo', color: '#ff66b3', joinedAt: t(0.8 * HOUR) };
    d.guests.gst_lee = { name: 'Lee', color: '#4db3cc', joinedAt: t(0.7 * HOUR) };
    d.paid.gst_sam = 'pending';
    withMe(d, ['itm_001', 'itm_003', 'itm_008', 'itm_012']);
    return { data: d, identity: ME };
  },
};

// v1 STATIC snapshot document
export const DEMO_DATA = {
  storeName: "Nando's Peri-Peri - Leeds Trinity",
  date: t(26 * HOUR),
  currency: 'GBP',
  totalBill: 75.0,
  rating: 4.3,
  ratingCount: 1284,
  placeType: 'Restaurant',
  restaurantPhotoUrl: PHOTO,
  receiptImageUrl: RECEIPT,
  payment: PAYMENT,
  people: [
    {
      name: 'Dad', color: '#ff6b6b', subtotal: 21.0, tax: 0, serviceCharge: 2.1, tip: 1.5, total: 24.6,
      items: [
        { name: '1/2 Chicken', price: 9.5 },
        { name: 'Peri Chips', price: 4.0 },
        { name: 'Garlic Bread', price: 3.5, quantity: 1 },
        { name: 'Sprite', price: 4.0, quantity: 2 },
      ],
    },
    {
      name: 'Mum', color: '#4dabf7', subtotal: 16.5, tax: 0, serviceCharge: 1.65, tip: 1.2, total: 19.35,
      items: [
        { name: 'Wrap Combo', price: 11.0 },
        { name: 'Halloumi Sticks', price: 5.5 },
      ],
    },
    {
      name: 'Kyle', color: '#e8b84b', subtotal: 26.5, tax: 0, serviceCharge: 2.65, tip: 1.9, total: 31.05,
      items: [
        { name: 'Butterfly Chicken', price: 12.0 },
        { name: 'Spicy Rice', price: 4.5 },
        { name: 'Corn on the Cob', price: 3.5 },
        { name: 'Bottomless Drink', price: 3.0 },
        { name: 'Chocolate Cake', price: 3.5 },
      ],
    },
  ],
};
