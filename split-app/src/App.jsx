// OnlyBills split viewer.
// v1 docs (static snapshot shares) render the classic read-only page below.
// v2 docs (schemaVersion 2) are LIVE tables → LiveBill.jsx takes over.
import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import { db } from './firebase';
import LiveBillPage from './LiveBill.jsx';
import { DEMO_DATA, DEMO_LIVE_DATA } from './demoData';
import {
  money, formatDate, buildPayOptions as buildStaticPayOptions, hasBank,
  Avatar, PayButton, BankCard, ImageModal, Hero, ReceiptPhoto, Footer, Toast,
  ChevronIcon, ArrowIcon, CheckIcon,
} from './shared.jsx';

// Static (v1) pay options work off the person's snapshot total.
const payOptionsFor = (data, person) =>
  buildStaticPayOptions(data.payment, {
    amount: person?.total ?? 0, currency: data.currency, reference: data.storeName,
  });

// ── Static v1 components (unchanged behaviour) ───────────
const PersonPicker = ({ people, currency, onPick }) => (
  <motion.section className="picker"
    initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
    <p className="picker-eyebrow">Tap your name</p>
    <h2 className="picker-title">Who are you?</h2>
    <p className="picker-sub">We&rsquo;ll show exactly what you ordered and your share to pay.</p>
    <div className="picker-grid">
      {people.map((person, i) => (
        <motion.button key={i} className="picker-chip" onClick={() => onPick(i)}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 + i * 0.05 }} whileTap={{ scale: 0.96 }}>
          <Avatar name={person.name} color={person.color} />
          <span className="picker-name">{person.name}</span>
          <span className="picker-amt">{money(person.total, currency)}</span>
        </motion.button>
      ))}
    </div>
  </motion.section>
);

const QRCard = ({ payment, onOpen }) => (
  <motion.div className="qr-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
    <img src={payment.qrCodeUrl} alt="Payment QR" onClick={() => onOpen(payment.qrCodeUrl)} />
    <div className="qr-meta">
      <b>{payment.qrCodeDescription || 'Scan to pay'}</b>
      <span>Tap to enlarge</span>
    </div>
  </motion.div>
);

const ShareTicket = ({ data, person, onChange, onToast, onQR }) => {
  const cur = data.currency;
  const payOpts = payOptionsFor(data, person);
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
            <Avatar name={person.name} color={person.color} size="lg" />
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

const PersonRow = ({ person, currency, index, isMe, onSelect }) => {
  const [open, setOpen] = useState(false);
  const count = person.items?.length || 0;
  return (
    <div className={`prow ${open ? 'open' : ''}`}>
      <button className="prow-head" onClick={() => setOpen(!open)}>
        <Avatar name={person.name} color={person.color} size="sm" />
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

// ── Static v1 page ───────────────────────────────────────
function StaticBillPage({ data, initialPerson }) {
  const [meIndex, setMeIndex] = useState(initialPerson);
  const [modalImage, setModalImage] = useState(null);
  const [toast, setToast] = useState(null);

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

  const me = useMemo(() => (meIndex != null ? data.people?.[meIndex] : null), [data, meIndex]);

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
        {toast && <Toast>{toast}</Toast>}
      </AnimatePresence>
    </div>
  );
}

// ── Router ───────────────────────────────────────────────
function App() {
  const [page, setPage] = useState({ state: 'loading' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const demo = params.get('demo');

    const preselect = (d) => {
      const who = params.get('person');
      if (who == null || !d.people) return null;
      const asIndex = Number(who);
      if (Number.isInteger(asIndex) && d.people[asIndex]) return asIndex;
      const idx = d.people.findIndex((p) => (p.name || '').toLowerCase() === who.toLowerCase());
      return idx >= 0 ? idx : null;
    };

    const run = async () => {
      if (demo === '2') {
        document.title = `${DEMO_LIVE_DATA.storeName} — OnlyBills`;
        setPage({ state: 'live', id: 'demo2', data: DEMO_LIVE_DATA, demo: true });
        return;
      }
      if (demo === '1' || (!id && import.meta.env.DEV)) {
        document.title = `${DEMO_DATA.storeName} — OnlyBills`;
        setPage({ state: 'static', data: DEMO_DATA, person: preselect(DEMO_DATA) });
        return;
      }
      if (!id) { setPage({ state: 'error', message: 'No receipt link provided.' }); return; }

      try {
        const snap = await getDoc(doc(db, 'sharedReceipts', id));
        if (!snap.exists()) {
          setPage({ state: 'error', message: 'This bill link has expired or doesn’t exist.' });
          return;
        }
        const data = snap.data();
        document.title = `${data.storeName} — OnlyBills`;
        if (data.schemaVersion === 2) {
          setPage({ state: 'live', id, data });
        } else {
          setPage({ state: 'static', data, person: preselect(data) });
        }
      } catch (e) {
        console.error(e);
        setPage({ state: 'error', message: 'Something went wrong loading this bill.' });
      }
    };

    run();
  }, []);

  if (page.state === 'loading') return <Loading />;
  if (page.state === 'error') return <ErrorView message={page.message} />;
  if (page.state === 'live') return <LiveBillPage docId={page.id} initialData={page.data} demo={page.demo} />;
  return <StaticBillPage data={page.data} initialPerson={page.person} />;
}

export default App;
