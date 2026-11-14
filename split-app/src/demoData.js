// Demo fixtures mirroring the Firestore `sharedReceipts` document shapes — one per
// guest-facing state, so every screen can be previewed without touching production.
//
//   ?demo=2&state=<state>   live table (v2) — see LIVE_STATES below
//                           (assigned: a bill the host split and sent as links; add
//                            &p=gst_a3f9c2e1 for Ana's per-person link)
//                           (pay, pay-default, pay-starling, pay-paypal, pay-bank: getting paid)
//                           (pay-us, pay-es, pay-de, pay-br, pay-unknown, pay-link, pay-demoted:
//                            regional payouts, documents with `payment.methods`)
//                           (pay-th: a UK host on a baht bill, paid back in pounds at a frozen
//                            rate, `payment.settle`; claiming-th: the same table, share card)
//   ?demo=1[&person=Dad][&state=pay]   static shared bill (v1)
//   ?demo=loading | notfound | error | offline   app-level pages
//
// Venues, people, handles and numbers are made up (no real restaurant, no real account):
// screenshots of these states go on the website and in articles.
//
// Nothing here ever writes to Firestore: demo writes only update local state.

const HOUR = 36e5;
const t = (msAgo) => new Date(Date.now() - msAgo);

const PHOTO = 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=70';
const RECEIPT = 'https://images.unsplash.com/photo-1554774853-b415df9eeb92?auto=format&fit=crop&w=900&q=75';

const PAYMENT = {
  monzoUsername: 'kyledemo27',
  revolutUsername: 'kyledemo27',
  paypalUsername: 'kyledemo27',
  bankAccountName: 'Kyle Test',
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

// Made-up menus for the regional states (invented venues, everyday dishes): [name, price, qty?]
// in item order, so the claims in baseLive() stay the same (you: itm_001 shared, itm_003).
const MENUS = {
  us: { items: [['Carnitas Tacos', 12.5], ['Chips & Guacamole', 9], ['Elote', 6], ['Al Pastor Tacos', 12],
    ['Horchata', 4.5], ['Mexican Coke', 8, 2], ['Fish Tacos', 13.5], ['Churros', 7]],
    charges: { chg_000: { name: 'Tax', amount: 6.26, kind: 'tax' }, chg_001: { name: 'Tip', amount: 14.5, kind: 'tip' } } },
  es: { items: [['Tortilla española', 7.5], ['Croquetas de jamón', 8.5], ['Patatas bravas', 6.5], ['Gambas al ajillo', 12],
    ['Pan con tomate', 3.5], ['Caña', 5, 2], ['Pimientos de Padrón', 6], ['Tinto de verano', 4.5]], charges: {} },
  br: { items: [['Feijoada', 52], ['Porção de mandioca', 26], ['Coxinha', 14], ['Pastel de queijo', 18],
    ['Pão de queijo', 16], ['Chope', 24, 2], ['Caipirinha', 22], ['Guaraná', 8]],
    charges: { chg_000: { name: 'Serviço (10%)', amount: 18, percent: 10 } } },
  saffron: { items: [['Black Daal', 7.9], ['Garlic Naan', 4.8, 2], ['Onion Bhaji', 4.9], ['Lamb Keema Bun', 13.2],
    ['Butter Chicken', 14.5], ['Mango Lassi', 9.9, 2], ['Paneer Tikka', 9.5], ['Chai', 3.7]],
    charges: { chg_000: { name: 'Service (12.5%)', amount: 8.55, percent: 12.5 } } },
  th: { items: [['Pad Thai', 180], ['Massaman Curry', 280], ['Som Tam', 120], ['Tom Yum Goong', 320],
    ['Jasmine Rice', 40], ['Thai Iced Tea', 140, 2], ['Mango Sticky Rice', 150], ['Spring Rolls', 120]],
    charges: { chg_000: { name: 'Service (10%)', amount: 135, percent: 10 } } },
};
const withMenu = (d, menu) => {
  const m = MENUS[menu];
  if (!m) return d;
  m.items.forEach(([name, price, qty = 1], i) => {
    Object.assign(d.items[`itm_00${i}`], { name, price, qty });
  });
  d.charges = JSON.parse(JSON.stringify(m.charges));
  delete d.rating; delete d.ratingCount; delete d.receiptImageUrl;
  return d;
};

/** A table in another currency with the pay sheet open, for the regional payout states. */
const payDemo = (currency, storeName, payment, menu = 'saffron') => {
  const d = withMenu(withMe(baseLive(), ['itm_001', 'itm_003']), menu);
  Object.assign(d, { currency, storeName, payment });
  return { data: d, identity: ME, sheet: 'pay' };
};

/** A Bangkok table in baht (a made-up Thai menu), its host paid back in pounds (`payment.settle`). */
const thaiDemo = (sheet) => {
  const d = withMenu(withMe(baseLive(), ['itm_001', 'itm_003']), 'th');
  Object.assign(d, {
    currency: 'THB', storeName: 'Baan Som Saeng',
    payment: {
      monzoUsername: 'kyledemo27', defaultMethod: 'monzo', payeeName: 'Kyle',
      settle: { cur: 'GBP', base: 'GBP', rate: '43.80', src: 'frankfurter', date: '2026-11-13' },
    },
  });
  return { data: d, identity: ME, ...(sheet ? { sheet: 'pay' } : {}) };
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
    d.payment = { ...PAYMENT, starlingUsername: 'kyledemo27', defaultMethod: 'starling' };
    return { data: d, identity: ME, sheet: 'pay' };
  },
  'pay-starling': () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    d.payment = { starlingUsername: 'kyledemo27', bankAccountName: PAYMENT.bankAccountName, bankDetails: PAYMENT.bankDetails, defaultMethod: 'starling' };
    return { data: d, identity: ME, sheet: 'pay' };
  },
  'pay-paypal': () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    d.payment = { paypalUsername: 'kyledemo27', defaultMethod: 'paypal' };
    return { data: d, identity: ME, sheet: 'pay' };
  },
  'pay-bank': () => {
    const d = withMe(baseLive(), ['itm_001', 'itm_003']);
    d.payment = { bankAccountName: PAYMENT.bankAccountName, bankDetails: PAYMENT.bankDetails, defaultMethod: 'bank' };
    return { data: d, identity: ME, sheet: 'pay' };
  },
  // Regional payouts: documents with `payment.methods`, as the app writes them (the legacy
  // keys beside it are the mirror rows older clients show; this page ignores them).
  'pay-us': () => payDemo('USD', 'Juniper Lane Tacos', {
    v: 2, payeeName: 'Kyle', defaultMethod: 'bank', bankAccountName: 'Kyle',
    bankDetails: [{ label: 'Venmo', value: '@kyle-demo-27' }, { label: 'Zelle', value: '+14155550123' }],
    methods: [
      { id: 'venmo', kind: 'link', label: 'Venmo', handle: 'kyle-demo-27', cur: ['USD'], fields: [{ label: 'Venmo', value: '@kyle-demo-27' }] },
      { id: 'zelle', kind: 'copy', label: 'Zelle', cur: ['USD'], fields: [{ label: 'Zelle', value: '+14155550123' }] },
    ],
  }, 'us'),
  'pay-es': () => payDemo('EUR', 'Taberna La Gaviota Azul', {
    v: 2, payeeName: 'Kyle', revolutUsername: 'kyledemo27', defaultMethod: 'bank', bankAccountName: 'Kyle',
    bankDetails: [{ label: 'Bizum', value: '+34612345678' }],
    methods: [
      { id: 'bizum', kind: 'copy', label: 'Bizum', cur: ['EUR'], fields: [{ label: 'Bizum', value: '+34612345678' }] },
      { id: 'revolut', kind: 'link', label: 'Revolut', handle: 'kyledemo27' },
    ],
  }, 'es'),
  'pay-de': () => payDemo('EUR', 'Saffron House', {
    v: 2, payeeName: 'Kyle', paypalUsername: 'kyledemo27', defaultMethod: 'paypal', bankAccountName: 'Kyle Test',
    bankDetails: [{ label: 'IBAN', value: 'DE89370400440532013000' }],
    methods: [
      { id: 'paypal', kind: 'link', label: 'PayPal', handle: 'kyledemo27' },
      { id: 'iban', kind: 'copy', label: 'IBAN', fields: [{ label: 'IBAN', value: 'DE89370400440532013000' }, { label: 'Name', value: 'Kyle Test' }] },
    ],
  }),
  'pay-br': () => payDemo('BRL', 'Boteco Seu Ramiro', {
    v: 2, payeeName: 'Kyle', defaultMethod: 'bank', bankAccountName: 'Kyle',
    bankDetails: [{ label: 'Pix key', value: '123e4567-e89b-12d3-a456-426614174000' }],
    methods: [
      { id: 'pix', kind: 'pix', label: 'Pix', cur: ['BRL'], key: '123e4567-e89b-12d3-a456-426614174000', name: 'KYLE TEST', city: 'SAO PAULO',
        fields: [{ label: 'Pix key', value: '123e4567-e89b-12d3-a456-426614174000' }] },
    ],
  }, 'br'),
  // A method id this build has never heard of: labelled copy rows, never a link.
  'pay-unknown': () => payDemo('INR', 'Saffron House', {
    v: 2, payeeName: 'Kyle',
    methods: [
      { id: 'upi', kind: 'link', label: 'UPI', url: 'https://upi.example/kyletest', cur: ['INR'],
        fields: [{ label: 'UPI ID', value: 'kyletest@okbank' }, { label: 'Name', value: 'Kyle Test' }] },
    ],
  }),
  // Only a pasted link (the Netherlands): named from the allow-list, never from the document.
  'pay-link': () => payDemo('EUR', 'Saffron House', {
    v: 2, payeeName: 'Kyle',
    methods: [{ id: 'link', kind: 'link', label: 'Tikkie', url: 'https://tikkie.me/pay/example/abc123' }],
  }),
  // A US host on a euro bill: nothing takes the currency, so the order stays and each says why.
  'pay-demoted': () => payDemo('EUR', 'Taberna La Gaviota Azul', {
    v: 2, payeeName: 'Kyle',
    methods: [
      { id: 'venmo', kind: 'link', label: 'Venmo', handle: 'kyle-demo-27', cur: ['USD'] },
      { id: 'zelle', kind: 'copy', label: 'Zelle', cur: ['USD'], fields: [{ label: 'Zelle', value: 'kyle.test@example.com' }] },
      { id: 'pix', kind: 'pix', label: 'Pix', cur: ['BRL'], key: '123e4567-e89b-12d3-a456-426614174000', name: 'KYLE TEST', city: 'SAO PAULO' },
    ],
  }, 'es'),
  // Settle currency: a UK Monzo host on a baht bill, paid back in pounds at £1 = ฿43.80.
  'pay-th': () => thaiDemo(true),
  'claiming-th': () => thaiDemo(false),
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
  // Link-only request: the host split it in the app (status "assigned", unlocked) and
  // sent everyone their own link. No claims; find your name or arrive via &p=<gid>.
  assigned: () => {
    const d = baseLive();
    Object.assign(d, { status: 'assigned', locked: false, expiresAt: new Date(Date.now() + 7 * 24 * HOUR), requestedAt: t(0.2 * HOUR) });
    d.storeName = 'Saffron House';
    d.rating = 4.6; d.ratingCount = 9120; d.placeType = 'Indian restaurant';
    d.items = {
      itm_000: { order: 0, name: 'Butter Chicken', price: 14.9, qty: 1, claimedBy: { gst_host: true } },
      itm_001: { order: 1, name: 'Black Daal', price: 7.9, qty: 1, claimedBy: { gst_host: true, gst_a3f9c2e1: true } },
      itm_002: { order: 2, name: 'Garlic Naan', price: 10.5, qty: 3, claimedBy: { gst_a3f9c2e1: 2, gst_7b2e4d90: true } },
      itm_003: { order: 3, name: 'Lamb Keema Bun', price: 12.5, qty: 1, claimedBy: { gst_7b2e4d90: true } },
      itm_004: { order: 4, name: 'Paneer Tikka', price: 9.5, qty: 1, claimedBy: { gst_a3f9c2e1: true } },
      itm_005: { order: 5, name: 'Mango Lassi', price: 11.0, qty: 2, claimedBy: { gst_a3f9c2e1: true, gst_c41e8a07: true } },
      itm_006: { order: 6, name: 'Okra Fries', price: 6.5, qty: 1, claimedBy: { gst_c41e8a07: true } },
    };
    d.charges = { chg_000: { name: 'Service (12.5%)', amount: 9.1, percent: 12.5 } };
    d.guests = {
      gst_host: { name: 'Kyle', color: '#ff5a3c', joinedAt: t(0.2 * HOUR + 4000) },
      gst_a3f9c2e1: { name: 'Ana', color: '#4dcc80', joinedAt: t(0.2 * HOUR + 3000), addedByHost: true },
      gst_7b2e4d90: { name: 'Dad', color: '#4dabf7', joinedAt: t(0.2 * HOUR + 2000), addedByHost: true },
      gst_c41e8a07: { name: 'Gran', color: '#5E5CE6', joinedAt: t(0.2 * HOUR + 1000), addedByHost: true },
    };
    d.paid = { gst_c41e8a07: 'confirmed' };
    d.paidAmount = { gst_c41e8a07: 13.5 };
    return { data: d, identity: null };
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
