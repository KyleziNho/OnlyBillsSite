import { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import { DEMO_DATA } from './demoData';

// ── Firebase ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyByDh_nxkV1kWGdIHFldDAoIU7iGqU3FQc",
  authDomain: "onlybills-b8dac.firebaseapp.com",
  projectId: "onlybills-b8dac",
  storageBucket: "onlybills-b8dac.firebasestorage.app",
  messagingSenderId: "572680746912",
  appId: "1:572680746912:web:9c3890b712bdc19a9a16c5"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Helpers ──────────────────────────────────────────────
const CURRENCY_SYMBOLS = {
  GBP: '£', USD: '$', EUR: '€', JPY: '¥', CAD: 'C$', AUD: 'A$',
  SGD: 'S$', MYR: 'RM', THB: '฿', INR: '₹', KRW: '₩', CNY: '¥', HKD: 'HK$'
};
const symbolFor = (currency) => CURRENCY_SYMBOLS[currency] || (currency ? currency + ' ' : '£');
const money = (amount, currency) => symbolFor(currency) + (amount ?? 0).toFixed(2);

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatCount = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n);

const startsWithEmoji = (str) => /^(?:\p{Emoji_Presentation}|\p{Emoji}️)/u.test(str.trim());
const getAvatarDisplay = (name) => {
  const n = (name || '?').trim();
  if (startsWithEmoji(n)) {
    const match = n.match(/^(\p{Emoji_Presentation}|\p{Emoji}️|\p{Emoji})/u);
    return { isEmoji: true, char: match ? match[0] : n.charAt(0) };
  }
  const parts = n.split(' ').filter(Boolean);
  const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : n.charAt(0).toUpperCase();
  return { isEmoji: false, char: initials };
};

// Build the tappable pay options for a specific person's exact amount.
const buildPayOptions = (data, person) => {
  const p = data.payment || {};
  const amount = person?.total ?? 0;
  const amt = amount.toFixed(2);
  const cur = (data.currency || 'GBP').toUpperCase();
  const ref = encodeURIComponent(data.storeName || 'Split');
  const sym = symbolFor(data.currency);
  const opts = [];

  if (p.monzoUsername) opts.push({
    key: 'monzo', label: 'Monzo', color: 'var(--monzo)', mark: 'M',
    href: `https://monzo.me/${p.monzoUsername}/${amt}?d=${ref}`,
    note: `Opens with ${sym}${amt} ready to send`, prefilled: true,
  });
  if (p.revolutUsername) opts.push({
    key: 'revolut', label: 'Revolut', color: 'var(--revolut)', mark: 'R',
    href: `https://revolut.me/${p.revolutUsername}`,
    note: `Opens Revolut · enter ${sym}${amt}`, prefilled: false,
  });
  if (p.paypalUsername) opts.push({
    key: 'paypal', label: 'PayPal', color: 'var(--paypal)', mark: 'P',
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

const hasBank = (p) => p && (p.bankAccountName || (p.bankDetails && p.bankDetails.length));

// ── Icons ────────────────────────────────────────────────
const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="ico"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="ico"><rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="ico"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const ChevronIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" className="chev"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const ReceiptGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" className="ico"><path d="M6 3.5h12v17l-2.2-1.4L13.5 20.5 12 19l-1.5 1.5L8.2 19.1 6 20.5v-17Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 8h6M9 11.5h6M9 15h3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
);

// ── Hero (venue) ─────────────────────────────────────────
const Hero = ({ data }) => {
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

// ── "Who are you?" picker ────────────────────────────────
const PersonPicker = ({ people, currency, onPick }) => (
  <motion.section className="picker"
    initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
    <p className="picker-eyebrow">Tap your name</p>
    <h2 className="picker-title">Who are you?</h2>
    <p className="picker-sub">We&rsquo;ll show exactly what you ordered and your share to pay.</p>
    <div className="picker-grid">
      {people.map((person, i) => {
        const d = getAvatarDisplay(person.name);
        return (
          <motion.button key={i} className="picker-chip" onClick={() => onPick(i)}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 + i * 0.05 }} whileTap={{ scale: 0.96 }}>
            <span className={`avatar ${d.isEmoji ? 'emoji' : ''}`} style={!d.isEmoji ? { background: person.color } : undefined}>{d.char}</span>
            <span className="picker-name">{person.name}</span>
            <span className="picker-amt">{money(person.total, currency)}</span>
          </motion.button>
        );
      })}
    </div>
  </motion.section>
);

// ── Pay button ───────────────────────────────────────────
const PayButton = ({ opt, index }) => (
  <motion.a className="pay-btn" href={opt.href} target="_blank" rel="noopener noreferrer"
    style={{ '--brand': opt.color }}
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.06 }}
    whileTap={{ scale: 0.98 }}>
    <span className="pay-mark">{opt.mark}</span>
    <span className="pay-text">
      <span className="pay-label">Pay with {opt.label}</span>
      <span className="pay-note">{opt.prefilled && <span className="pre-dot" />}{opt.note}</span>
    </span>
    <ArrowIcon />
  </motion.a>
);

// ── Bank card (copy) ─────────────────────────────────────
const BankCard = ({ payment, onToast }) => {
  const fields = (payment.bankDetails || []).filter((f) => f.label && f.value);
  const copy = () => {
    const lines = [];
    if (payment.bankAccountName) lines.push(payment.bankAccountName);
    fields.forEach((f) => lines.push(`${f.label}: ${f.value}`));
    navigator.clipboard?.writeText(lines.join('\n'));
    onToast('Bank details copied');
  };
  return (
    <motion.button className="bank-card" onClick={copy} style={{ '--brand': 'var(--bank)' }}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }} whileTap={{ scale: 0.99 }}>
      <div className="bank-head">
        <span className="pay-mark small">&pound;</span>
        <span className="bank-title">Bank transfer</span>
        <span className="bank-copy"><CopyIcon /> Copy</span>
      </div>
      <div className="bank-rows">
        {payment.bankAccountName && (
          <div className="bank-row"><span>Name</span><b>{payment.bankAccountName}</b></div>
        )}
        {fields.map((f, i) => (
          <div className="bank-row" key={i}><span>{f.label}</span><b>{f.value}</b></div>
        ))}
      </div>
    </motion.button>
  );
};

// ── QR card ──────────────────────────────────────────────
const QRCard = ({ payment, onOpen }) => (
  <motion.div className="qr-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
    <img src={payment.qrCodeUrl} alt="Payment QR" onClick={() => onOpen(payment.qrCodeUrl)} />
    <div className="qr-meta">
      <b>{payment.qrCodeDescription || 'Scan to pay'}</b>
      <span>Tap to enlarge</span>
    </div>
  </motion.div>
);

// ── Your-share receipt ticket (the centrepiece) ──────────
const ShareTicket = ({ data, person, onChange, onToast, onQR }) => {
  const d = getAvatarDisplay(person.name);
  const cur = data.currency;
  const payOpts = buildPayOptions(data, person);
  const fees = [
    person.tax > 0 && ['Tax', person.tax],
    person.serviceCharge > 0 && ['Service', person.serviceCharge],
    person.tip > 0 && ['Tip', person.tip],
  ].filter(Boolean);

  return (
    <motion.section className="ticket-wrap"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      <div className="ticket">
        <div className="ticket-top">
          <div className="ticket-who">
            <span className={`avatar lg ${d.isEmoji ? 'emoji' : ''}`} style={!d.isEmoji ? { background: person.color } : undefined}>{d.char}</span>
            <div>
              <div className="ticket-eyebrow">Your share</div>
              <div className="ticket-name">{person.name}</div>
            </div>
          </div>
          <button className="change-btn" onClick={onChange}>Not you?</button>
        </div>

        <div className="ticket-merchant">
          <span>{data.storeName}</span>
          <span className="muted">{formatDate(data.date)}</span>
        </div>

        <div className="ticket-items">
          {(person.items || []).map((it, i) => (
            <div className="tick-row" key={i}>
              <span className="tick-name">{it.name}{it.quantity && it.quantity !== 1 ? ` ×${it.quantity}` : ''}</span>
              <span className="tick-dots" />
              <span className="tick-price">{money(it.price, cur)}</span>
            </div>
          ))}
          {fees.map(([label, val], i) => (
            <div className="tick-row muted" key={`f${i}`}>
              <span className="tick-name">{label}</span>
              <span className="tick-dots" />
              <span className="tick-price">{money(val, cur)}</span>
            </div>
          ))}
        </div>

        <div className="perf" />

        <div className="ticket-total">
          <span>You owe</span>
          <motion.span className="ticket-total-amt"
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 340, damping: 18, delay: 0.15 }}>
            {money(person.total, cur)}
          </motion.span>
        </div>
      </div>

      <div className="pay-stack">
        {payOpts.map((opt, i) => <PayButton key={opt.key} opt={opt} index={i} />)}
        {hasBank(data.payment) && <BankCard payment={data.payment} onToast={onToast} />}
        {data.payment?.qrCodeUrl && <QRCard payment={data.payment} onOpen={onQR} />}
        {payOpts.length === 0 && !hasBank(data.payment) && !data.payment?.qrCodeUrl && (
          <div className="no-pay">The bill owner hasn&rsquo;t added a payment method yet.</div>
        )}
      </div>
    </motion.section>
  );
};

// ── Full breakdown (everyone) ────────────────────────────
const PersonRow = ({ person, currency, index, isMe, onSelect }) => {
  const [open, setOpen] = useState(false);
  const d = getAvatarDisplay(person.name);
  const count = person.items?.length || 0;
  return (
    <div className={`prow ${open ? 'open' : ''}`}>
      <button className="prow-head" onClick={() => setOpen(!open)}>
        <span className={`avatar sm ${d.isEmoji ? 'emoji' : ''}`} style={!d.isEmoji ? { background: person.color } : undefined}>{d.char}</span>
        <span className="prow-info">
          <span className="prow-name">{person.name}{isMe && <span className="you-tag">you</span>}</span>
          <span className="prow-count">{count} item{count !== 1 ? 's' : ''}</span>
        </span>
        <span className="prow-amt">{money(person.total, currency)}</span>
        <ChevronIcon />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="prow-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}>
            <div className="prow-body-in">
              {(person.items || []).map((it, i) => (
                <div className="tick-row" key={i}>
                  <span className="tick-name">{it.name}{it.quantity && it.quantity !== 1 ? ` ×${it.quantity}` : ''}</span>
                  <span className="tick-dots" />
                  <span className="tick-price">{money(it.price, currency)}</span>
                </div>
              ))}
              {(person.tax > 0 || person.serviceCharge > 0 || person.tip > 0) && (
                <div className="prow-fees">
                  {person.tax > 0 && <div className="tick-row muted"><span className="tick-name">Tax</span><span className="tick-dots" /><span className="tick-price">{money(person.tax, currency)}</span></div>}
                  {person.serviceCharge > 0 && <div className="tick-row muted"><span className="tick-name">Service</span><span className="tick-dots" /><span className="tick-price">{money(person.serviceCharge, currency)}</span></div>}
                  {person.tip > 0 && <div className="tick-row muted"><span className="tick-name">Tip</span><span className="tick-dots" /><span className="tick-price">{money(person.tip, currency)}</span></div>}
                </div>
              )}
              {!isMe && <button className="prow-pay" onClick={() => onSelect(index)}>This is me &mdash; pay {money(person.total, currency)}</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Breakdown = ({ data, meIndex, onSelect }) => {
  const [open, setOpen] = useState(false);
  return (
    <section className="section">
      <button className="section-toggle" onClick={() => setOpen(!open)}>
        <span className="section-title">The whole bill</span>
        <span className="section-right">
          <span className="section-total">{money(data.totalBill, data.currency)}</span>
          <span className={`section-caret ${open ? 'up' : ''}`}><ChevronIcon /></span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} style={{ overflow: 'hidden' }}>
            <div className="prows">
              {(data.people || []).map((person, i) => (
                <PersonRow key={i} person={person} currency={data.currency} index={i} isMe={i === meIndex} onSelect={onSelect} />
              ))}
              <div className="bill-total">
                <span>{(data.people || []).length} people &middot; Total</span>
                <b>{money(data.totalBill, data.currency)}</b>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

// ── Receipt photo ────────────────────────────────────────
const ReceiptPhoto = ({ url, onOpen }) => {
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

// ── Image modal ──────────────────────────────────────────
const ImageModal = ({ url, onClose }) => (
  <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <button className="modal-x" onClick={onClose} aria-label="Close">&times;</button>
    <motion.img src={url} alt="" initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }} onClick={(e) => e.stopPropagation()} />
  </motion.div>
);

// ── Footer ───────────────────────────────────────────────
const Footer = () => (
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

// ── States ───────────────────────────────────────────────
const Loading = () => (
  <div className="wrap">
    <div className="sk sk-hero" />
    <div className="sk sk-ticket" />
    <div className="sk sk-row" />
    <div className="sk sk-row" />
  </div>
);

const ErrorView = ({ message }) => (
  <div className="wrap">
    <div className="error">
      <img src="app-icon.png" alt="OnlyBills" />
      <h2>Nothing to see here</h2>
      <p>{message}</p>
      <a className="dl-card compact" href="https://apps.apple.com/app/onlybills"><span>Get OnlyBills</span><ArrowIcon /></a>
    </div>
  </div>
);

// ── App ──────────────────────────────────────────────────
function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meIndex, setMeIndex] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const preselect = (d, params) => {
      const who = params.get('person');
      if (who == null || !d.people) return;
      const asIndex = Number(who);
      if (Number.isInteger(asIndex) && d.people[asIndex]) { setMeIndex(asIndex); return; }
      const idx = d.people.findIndex((p) => (p.name || '').toLowerCase() === who.toLowerCase());
      if (idx >= 0) setMeIndex(idx);
    };

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      const wantsDemo = params.get('demo') === '1' || (!id && import.meta.env.DEV);

      if (wantsDemo) {
        setData(DEMO_DATA);
        preselect(DEMO_DATA, params);
        document.title = `${DEMO_DATA.storeName} — OnlyBills`;
        setLoading(false);
        return;
      }
      if (!id) { setError('No receipt link provided.'); setLoading(false); return; }

      try {
        const snap = await getDoc(doc(db, 'sharedReceipts', id));
        if (!snap.exists()) { setError('This bill link has expired or doesn’t exist.'); setLoading(false); return; }
        const d = snap.data();
        setData(d);
        preselect(d, params);
        document.title = `${d.storeName} — OnlyBills`;
      } catch (e) {
        console.error(e);
        setError('Something went wrong loading this bill.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setModalImage(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(window.__t);
    window.__t = setTimeout(() => setToast(null), 1600);
  };

  const selectMe = (i) => {
    setMeIndex(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const me = useMemo(() => (data && meIndex != null ? data.people?.[meIndex] : null), [data, meIndex]);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} />;

  return (
    <div className="wrap">
      <Hero data={data} />

      <AnimatePresence mode="wait">
        {me ? (
          <ShareTicket key="ticket" data={data} person={me}
            onChange={() => setMeIndex(null)} onToast={showToast} onQR={setModalImage} />
        ) : (
          <PersonPicker key="picker" people={data.people || []} currency={data.currency} onPick={selectMe} />
        )}
      </AnimatePresence>

      <Breakdown data={data} meIndex={meIndex} onSelect={selectMe} />

      {data.receiptImageUrl && <ReceiptPhoto url={data.receiptImageUrl} onOpen={setModalImage} />}

      <Footer />

      <AnimatePresence>
        {modalImage && <ImageModal url={modalImage} onClose={() => setModalImage(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>
            <CheckIcon /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
