// Sample data mirroring the Firestore `sharedReceipts` document shapes.
// Local preview: `npm run dev` (auto) or ?demo=1 → static v1 page; ?demo=2 → live v2 table.

// v2 LIVE document (keyed maps, as written by LiveSessionService.swift)
export const DEMO_LIVE_DATA = {
  schemaVersion: 2,
  storeName: "Nando's Peri-Peri",
  currency: 'GBP',
  date: new Date('2026-07-05T19:30:00'),
  rating: 4.3,
  ratingCount: 1284,
  placeType: 'Restaurant',
  locked: false,
  restaurantPhotoUrl:
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=70',
  receiptImageUrl:
    'https://images.unsplash.com/photo-1554774853-b415df9eeb92?auto=format&fit=crop&w=900&q=75',
  payment: {
    monzoUsername: 'kylezinho',
    paypalUsername: 'kylezinho',
    bankAccountName: 'Kyle O’Sullivan',
    bankDetails: [
      { label: 'Sort code', value: '04-00-04' },
      { label: 'Account no', value: '12345678' },
    ],
  },
  items: {
    itm_000: { order: 0, name: 'Butterfly Chicken', price: 12.0, qty: 1, claimedBy: { gst_host: true } },
    itm_001: { order: 1, name: 'Wing Platter', price: 16.5, qty: 1, claimedBy: { gst_host: true, gst_dad: true } },
    itm_002: { order: 2, name: 'Peri Chips', price: 4.0, qty: 1, claimedBy: { gst_dad: true } },
    itm_003: { order: 3, name: 'Spicy Rice', price: 4.5, qty: 1, claimedBy: {} },
    itm_004: { order: 4, name: 'Garlic Bread', price: 3.5, qty: 1, claimedBy: {} },
    itm_005: { order: 5, name: 'Bottomless Drink', price: 3.0, qty: 2, claimedBy: { gst_dad: true } },
    itm_006: { order: 6, name: 'Chocolate Cake', price: 3.5, qty: 1, claimedBy: {} },
  },
  charges: {
    chg_000: { name: 'Service (10%)', amount: 4.7 },
  },
  guests: {
    gst_host: { name: 'Kyle', color: '#ff5a3c', joinedAt: null },
    gst_dad: { name: 'Dad', color: '#4dabf7', joinedAt: null },
  },
  paid: { gst_dad: 'pending' },
};

// v1 STATIC snapshot document
export const DEMO_DATA = {
  storeName: "Nando's Peri-Peri",
  date: new Date('2026-07-05T19:30:00'),
  currency: 'GBP',
  totalBill: 74.4,
  rating: 4.3,
  ratingCount: 1284,
  placeType: 'Restaurant',
  restaurantPhotoUrl:
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=70',
  receiptImageUrl:
    'https://images.unsplash.com/photo-1554774853-b415df9eeb92?auto=format&fit=crop&w=900&q=75',
  payment: {
    monzoUsername: 'kylezinho',
    revolutUsername: 'kylezinho',
    paypalUsername: 'kylezinho',
    bankAccountName: 'Kyle O’Sullivan',
    bankDetails: [
      { label: 'Sort code', value: '04-00-04' },
      { label: 'Account no', value: '12345678' },
    ],
  },
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
