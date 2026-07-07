// Sample data mirroring the Firestore `sharedReceipts` document shape.
// Used for local preview: `npm run dev` (auto), or add ?demo=1 to any URL.
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
