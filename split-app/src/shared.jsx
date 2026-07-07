// Shared helpers + presentational components for the OnlyBills split pages.
// Used by both the static (v1) page and the live table (v2) page — keep the
// money math here in lockstep with LiveBill math on iOS (LiveSessionService.swift).
import { useState } from 'react';
import { motion } from 'framer-motion';

// ── Money / formatting ───────────────────────────────────
export const CURRENCY_SYMBOLS = {
  GBP: '£', USD: '$', EUR: '€', JPY: '¥', CAD: 'C$', AUD: 'A$',
  SGD: 'S$', MYR: 'RM', THB: '฿', INR: '₹', KRW: '₩', CNY: '¥', HKD: 'HK$'
};
export const symbolFor = (currency) => CURRENCY_SYMBOLS[currency] || (currency ? currency + ' ' : '£');
export const money = (amount, currency) => symbolFor(currency) + (amount ?? 0).toFixed(2);

export const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatCount = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n);

// ── Avatars ──────────────────────────────────────────────
const startsWithEmoji = (str) => /^(?:\p{Emoji_Presentation}|\p{Emoji}️)/u.test(str.trim());
export const getAvatarDisplay = (name) => {
  const n = (name || '?').trim();
  if (startsWithEmoji(n)) {
    const match = n.match(/^(\p{Emoji_Presentation}|\p{Emoji}️|\p{Emoji})/u);
    return { isEmoji: true, char: match ? match[0] : n.charAt(0) };
  }
  const parts = n.split(' ').filter(Boolean);
  const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : n.charAt(0).toUpperCase();
  return { isEmoji: false, char: initials };
};

export const Avatar = ({ name, color, size = 'md' }) => {
  const d = getAvatarDisplay(name);
  return (
    <span className={`avatar av-${size} ${d.isEmoji ? 'emoji' : ''}`}
      style={!d.isEmoji ? { background: color } : undefined}>
      {d.char}
    </span>
  );
};

// Guest colour palette (assigned at join, stable per guest)
export const GUEST_COLORS = ['#4dabf7', '#e8b84b', '#38d39f', '#b57bff', '#ff8787', '#f7a94d', '#63d7e0', '#f783ac'];
export const pickGuestColor = (taken) => {
  const free = GUEST_COLORS.filter((c) => !taken.includes(c));
  return free.length ? free[0] : GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)];
};

// ── Live money math — MUST mirror LiveBill (iOS) ─────────
export const liveTotals = (bill) => {
  const items = bill.items || [];
  const itemsSubtotal = items.reduce((s, it) => s + (it.price || 0), 0);
  const chargesNet = (bill.charges || []).reduce((s, c) => s + (c.amount || 0), 0);
  const grandTotal = Math.max(0, itemsSubtotal + chargesNet);

  const subtotalFor = (guestId) => items.reduce((s, it) => {
    const claimers = it.claimedBy || [];
    return claimers.includes(guestId) ? s + (it.price || 0) / claimers.length : s;
  }, 0);

  const totalFor = (guestId) => {
    const sub = subtotalFor(guestId);
    if (itemsSubtotal <= 0.0001) return sub;
    return sub + chargesNet * (sub / itemsSubtotal);
  };

  const unclaimed = items.filter((it) => !(it.claimedBy || []).length);
  const unclaimedSub = unclaimed.reduce((s, it) => s + (it.price || 0), 0);
  const unclaimedValue = itemsSubtotal > 0.0001
    ? unclaimedSub + chargesNet * (unclaimedSub / itemsSubtotal)
    : unclaimedSub;

  return { itemsSubtotal, chargesNet, grandTotal, subtotalFor, totalFor, unclaimed, unclaimedValue };
};

// ── Pay options (host-only payee) ────────────────────────
export const buildPayOptions = (payment, { amount, currency, reference }) => {
  const p = payment || {};
  const amt = (amount ?? 0).toFixed(2);
  const cur = (currency || 'GBP').toUpperCase();
  const ref = encodeURIComponent(reference || 'Split');
  const sym = symbolFor(currency);
  const opts = [];

  if (p.monzoUsername) opts.push({
    key: 'monzo', label: 'Monzo', color: 'var(--monzo)', mark: 'M', logo: 'logo-monzo.jpg',
    href: `https://monzo.me/${p.monzoUsername}/${amt}?d=${ref}`,
    note: `Opens with ${sym}${amt} ready to send`, prefilled: true,
  });
  if (p.revolutUsername) opts.push({
    key: 'revolut', label: 'Revolut', color: 'var(--revolut)', mark: 'R', logo: 'logo-revolut.png',
    href: `https://revolut.me/${p.revolutUsername}`,
    note: `Opens Revolut · enter ${sym}${amt}`, prefilled: false,
  });
  if (p.paypalUsername) opts.push({
    key: 'paypal', label: 'PayPal', color: 'var(--paypal)', mark: 'P', logo: 'logo-paypal.png',
    href: `https://paypal.me/${p.paypalUsername.replace(/^@/, '')}/${amt}${cur}`,
    note: `Opens with ${sym}${amt} ready to send`, prefilled: true,
  });
  if (p.venmoHandle) opts.push({
    key: 'venmo', label: 'Venmo', color: 'var(--venmo)', mark: 'V',
    href: `https://venmo.com/${p.venmoHandle.replace(/^@/, '')}?txn=pay&amount=${amt}&note=${ref}`,
    note: `Opens with ${sym}${amt} ready to send`, prefilled: true,
  });
  return opts;
};

export const hasBank = (p) => p && (p.bankAccountName || (p.bankDetails && p.bankDetails.length));

// ── Icons ────────────────────────────────────────────────
export const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="ico"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
export const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="ico"><rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
);
export const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="ico"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
export const ChevronIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" className="chev"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
export const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="ico"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 6.5 17.5 10" stroke="currentColor" strokeWidth="2"/></svg>
);
export const ReceiptGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" className="ico"><path d="M6 3.5h12v17l-2.2-1.4L13.5 20.5 12 19l-1.5 1.5L8.2 19.1 6 20.5v-17Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 8h6M9 11.5h6M9 15h3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
);

// ── Shared components ────────────────────────────────────
export const PayButton = ({ opt, index }) => (
  <motion.a className="pay-btn" href={opt.href} target="_blank" rel="noopener noreferrer"
    style={{ '--brand': opt.color }}
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + index * 0.05 }}
    whileTap={{ scale: 0.98 }}>
    <span className={`pay-mark ${opt.logo ? 'has-logo' : ''}`}>
      {opt.logo ? <img src={opt.logo} alt="" className="pay-logo" /> : opt.mark}
    </span>
    <span className="pay-text">
      <span className="pay-label">Pay with {opt.label}</span>
      <span className="pay-note">{opt.prefilled && <span className="pre-dot" />}{opt.note}</span>
    </span>
    <ArrowIcon />
  </motion.a>
);

// Each field copies on its own tap — sort code, account number, name — because
// bank apps want them pasted one at a time. `onCopied(label, value)` lets the
// host page confirm the copy and (on the live page) float the pay panel back up.
export const BankCard = ({ payment, onCopied }) => {
  const [hit, setHit] = useState(null);
  const rows = [];
  if (payment.bankAccountName) rows.push({ label: 'Name', value: payment.bankAccountName });
  (payment.bankDetails || []).filter((f) => f.label && f.value)
    .forEach((f) => rows.push({ label: f.label, value: f.value }));

  const copyRow = async (r, i) => {
    try { await navigator.clipboard?.writeText(String(r.value)); } catch { /* clipboard blocked */ }
    setHit(i);
    setTimeout(() => setHit((cur) => (cur === i ? null : cur)), 1100);
    onCopied?.(r.label, r.value);
  };

  return (
    <motion.div className="bank-card" style={{ '--brand': 'var(--bank)' }}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
      <div className="bank-head">
        <span className="pay-mark small">&pound;</span>
        <div className="bank-head-text">
          <span className="bank-title">Pay by bank transfer</span>
          <span className="bank-sub">Tap any field to copy it</span>
        </div>
      </div>
      <div className="bank-rows">
        {rows.map((r, i) => (
          <motion.button className={`bank-row ${hit === i ? 'copied' : ''}`} key={i}
            onClick={() => copyRow(r, i)} whileTap={{ scale: 0.985 }}>
            <span className="bank-row-label">{r.label}</span>
            <span className="bank-row-val">{r.value}</span>
            <span className="bank-row-copy">
              {hit === i ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export const ImageModal = ({ url, onClose }) => (
  <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <button className="modal-x" onClick={onClose} aria-label="Close">&times;</button>
    <motion.img src={url} alt="" initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }} onClick={(e) => e.stopPropagation()} />
  </motion.div>
);

export const Hero = ({ data, live }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="hero">
      {data.restaurantPhotoUrl && (
        <img className={`hero-img ${loaded ? 'in' : ''}`} src={data.restaurantPhotoUrl} alt="" onLoad={() => setLoaded(true)} />
      )}
      <div className="hero-grad" />
      <motion.div className="hero-body"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
        <div className="hero-kicker">
          <ReceiptGlyph /> <span>OnlyBills</span>
          {live && <span className="live-chip"><span className="live-dot" />LIVE</span>}
        </div>
        <h1 className="venue">{data.storeName}</h1>
        <div className="venue-meta">
          {data.rating != null && (
            <span className="chip"><span className="star">★</span>{data.rating.toFixed(1)}
              {data.ratingCount ? <span className="muted"> ({formatCount(data.ratingCount)})</span> : null}</span>
          )}
          {data.placeType && <span className="chip muted-chip">{data.placeType}</span>}
          {data.date && <span className="chip muted-chip">{formatDate(data.date)}</span>}
        </div>
      </motion.div>
    </div>
  );
};

export const ReceiptPhoto = ({ url, onOpen }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <section className="section">
      <div className="section-label"><ReceiptGlyph /> The receipt</div>
      <motion.div className="receipt-frame" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5 }}>
        <img className={`receipt-img ${loaded ? 'in' : ''}`} src={url} alt="Receipt" onLoad={() => setLoaded(true)} onClick={() => onOpen(url)} />
        <span className="receipt-hint">Tap to zoom</span>
      </motion.div>
    </section>
  );
};

export const Footer = () => (
  <motion.footer className="footer" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
    <a className="dl-card" href="https://apps.apple.com/app/onlybills" target="_blank" rel="noopener noreferrer">
      <img src="app-icon.png" alt="OnlyBills" />
      <div className="dl-text">
        <span className="dl-small">Split your own bills with</span>
        <span className="dl-big">OnlyBills for iPhone</span>
      </div>
      <ArrowIcon />
    </a>
    <p className="footer-note">Scan a receipt &middot; split by item &middot; get paid back</p>
  </motion.footer>
);

export const Toast = ({ children }) => (
  <motion.div className="toast" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>
    <CheckIcon /> {children}
  </motion.div>
);
