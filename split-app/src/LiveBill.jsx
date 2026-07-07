// The live table experience (schemaVersion 2). Everyone at the table opens the same
// link, says who they are, and taps what they ordered — claims, edits and totals sync
// through Firestore field-level updates (never whole-array writes; see docs brief).
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './firebase';
import {
  money, symbolFor, liveTotals, buildPayOptions, hasBank, pickGuestColor,
  Avatar, PayButton, BankCard, ImageModal, Hero, ReceiptPhoto, Footer, Toast,
  CheckIcon, PencilIcon, ChevronIcon,
} from './shared.jsx';

const HOST_ID = 'gst_host';

// ── Normalise the Firestore doc into render-friendly shape ──
export const normalizeLive = (data) => {
  const items = Object.entries(data.items || {})
    .map(([id, it]) => ({
      id,
      order: it.order ?? 0,
      name: it.name || '',
      price: it.price || 0,
      qty: it.qty || 1,
      claimedBy: Object.entries(it.claimedBy || {}).filter(([, v]) => v).map(([k]) => k).sort(),
    }))
    .sort((a, b) => (a.order - b.order) || (a.id < b.id ? -1 : 1));

  const charges = Object.entries(data.charges || {})
    .map(([id, c]) => ({ id, name: c.name || '', amount: c.amount || 0 }))
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const guests = Object.entries(data.guests || {})
    .map(([id, g]) => ({
      id, name: g.name || 'Guest', color: g.color || '#ff5a3c',
      joinedAt: g.joinedAt?.toMillis?.() ?? 0, isHost: id === HOST_ID,
    }))
    .sort((a, b) => (a.isHost !== b.isHost ? (a.isHost ? -1 : 1) : a.joinedAt - b.joinedAt));

  return {
    storeName: data.storeName || 'Receipt',
    currency: data.currency || 'GBP',
    date: data.date,
    rating: data.rating, ratingCount: data.ratingCount, placeType: data.placeType,
    restaurantPhotoUrl: data.restaurantPhotoUrl,
    receiptImageUrl: data.receiptImageUrl,
    payment: data.payment || null,
    locked: !!data.locked,
    items, charges, guests,
    paid: data.paid || {},
  };
};

// ── Per-device identity ──────────────────────────────────
const identityKey = (docId) => `ob_guest_${docId}`;
const loadIdentity = (docId) => {
  try { return JSON.parse(localStorage.getItem(identityKey(docId))) || null; }
  catch { return null; }
};
const saveIdentity = (docId, identity) => {
  try { localStorage.setItem(identityKey(docId), JSON.stringify(identity)); } catch { /* private mode */ }
};

// ── Page ─────────────────────────────────────────────────
export default function LiveBillPage({ docId, initialData, demo }) {
  const [bill, setBill] = useState(() => normalizeLive(initialData));
  const [identity, setIdentity] = useState(() => (demo ? { gid: 'gst_demo_me', name: 'You' } : loadIdentity(docId)));
  const [editing, setEditing] = useState(null);      // item being edited, or 'new'
  const [modalImage, setModalImage] = useState(null);
  const [toast, setToast] = useState(null);
  const [writeError, setWriteError] = useState(false);
  const toastTimer = useRef(null);

  const ref = useMemo(() => (demo ? null : doc(db, 'sharedReceipts', docId)), [docId, demo]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  // Keep a live ref to identity so the snapshot listener can tell "me" apart
  // from everyone else without re-subscribing every time someone joins.
  const identityRef = useRef(identity);
  useEffect(() => { identityRef.current = identity; }, [identity]);

  // Remember who'd joined / paid last tick, so an incoming snapshot can be
  // diffed into a friendly "Dad paid up" nudge — makes the table feel live.
  const seenRef = useRef(null);
  if (seenRef.current === null) {
    const n0 = normalizeLive(initialData);
    seenRef.current = {
      paid: n0.paid,
      names: Object.fromEntries(n0.guests.map((g) => [g.id, g.name])),
    };
  }

  useEffect(() => {
    if (!ref) return;
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data();
      if (!data) return;
      const next = normalizeLive(data);
      const prev = seenRef.current;
      const myGid = identityRef.current?.gid;
      if (prev) {
        next.guests.forEach((g) => {
          if (g.id === myGid) return;
          const paidNow = !!next.paid[g.id];
          const paidBefore = !!prev.paid[g.id];
          if (paidNow && !paidBefore) showToast(`${g.name} paid their share 🎉`);
          else if (!prev.names[g.id] && !g.isHost) showToast(`${g.name} joined the table`);
        });
      }
      seenRef.current = {
        paid: next.paid,
        names: Object.fromEntries(next.guests.map((g) => [g.id, g.name])),
      };
      setBill(next);
    });
    return unsub;
  }, [ref, showToast]);

  const write = useCallback(async (fields, optimistic) => {
    if (demo) { optimistic && setBill(optimistic); return; }
    try {
      setWriteError(false);
      await updateDoc(ref, { ...fields, updatedAt: serverTimestamp() });
    } catch (e) {
      console.error(e);
      setWriteError(true);
      showToast('Couldn’t save — check connection');
    }
  }, [ref, demo, showToast]);

  // ── Actions ────────────────────────────────────────────
  const join = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const gid = 'gst_' + Math.random().toString(36).slice(2, 8);
    const color = pickGuestColor(bill.guests.map((g) => g.color));
    const me = { gid, name: trimmed };
    setIdentity(me);
    if (!demo) saveIdentity(docId, me);
    // Optimistically seat the guest so the demo (no Firestore) is fully explorable.
    const optimistic = { ...bill, guests: [...bill.guests, { id: gid, name: trimmed, color, joinedAt: 0, isHost: false }] };
    write({ [`guests.${gid}`]: { name: trimmed, color, joinedAt: serverTimestamp() } }, optimistic);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const toggleClaim = (item) => {
    if (!identity || bill.locked) return;
    const mine = item.claimedBy.includes(identity.gid);
    if (navigator.vibrate) navigator.vibrate(8);
    // Optimistic local update keeps the tap feeling instant; snapshot reconciles.
    const next = structuredClone(bill);
    const target = next.items.find((i) => i.id === item.id);
    target.claimedBy = mine
      ? target.claimedBy.filter((g) => g !== identity.gid)
      : [...target.claimedBy, identity.gid];
    setBill(next);
    write({ [`items.${item.id}.claimedBy.${identity.gid}`]: mine ? deleteField() : true }, next);
  };

  const saveItem = (item, values) => {
    if (item === 'new') {
      const id = 'itm_' + Math.random().toString(36).slice(2, 8);
      const order = Math.max(-1, ...bill.items.map((i) => i.order)) + 1;
      write({ [`items.${id}`]: { order, name: values.name, price: values.price, qty: values.qty, claimedBy: {} } });
    } else {
      write({
        [`items.${item.id}.name`]: values.name,
        [`items.${item.id}.price`]: values.price,
        [`items.${item.id}.qty`]: values.qty,
      });
    }
    setEditing(null);
    showToast(item === 'new' ? 'Item added' : 'Item updated');
  };

  const deleteItem = (item) => {
    write({ [`items.${item.id}`]: deleteField() });
    setEditing(null);
    showToast('Item removed');
  };

  const markPaid = () => {
    if (!identity) return;
    // No host confirmation step — tapping "I've paid" settles your share outright.
    write({ [`paid.${identity.gid}`]: 'confirmed' }, { ...bill, paid: { ...bill.paid, [identity.gid]: 'confirmed' } });
    showToast('Nice one — marked as paid 🎉');
    if (navigator.vibrate) navigator.vibrate([8, 40, 8]);
  };

  const unmarkPaid = () => {
    if (!identity) return;
    const nextPaid = { ...bill.paid };
    delete nextPaid[identity.gid];
    write({ [`paid.${identity.gid}`]: deleteField() }, { ...bill, paid: nextPaid });
    showToast('Okay — marked as unpaid');
  };

  // Copy one bank field, confirm it, and float the pay panel back into view so
  // the amount + methods stay in sight while you paste. Non-destructive: keep tapping.
  const copyField = useCallback((label) => {
    showToast(`${label} copied — paste it into your bank`);
    if (navigator.vibrate) navigator.vibrate(6);
    document.getElementById('my-ticket')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showToast]);

  const scrollToBill = () => {
    document.getElementById('the-bill')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Derived ────────────────────────────────────────────
  const totals = useMemo(() => liveTotals(bill), [bill]);
  const meJoined = identity && bill.guests.some((g) => g.id === identity.gid);
  const myTotal = meJoined ? totals.totalFor(identity.gid) : 0;
  const myItems = meJoined ? bill.items.filter((i) => i.claimedBy.includes(identity.gid)) : [];
  const myPaid = meJoined ? bill.paid[identity.gid] : undefined;
  const payOpts = buildPayOptions(bill.payment, {
    amount: myTotal, currency: bill.currency, reference: bill.storeName,
  });
  const hostName = bill.guests.find((g) => g.isHost)?.name || 'the host';

  return (
    <div className="wrap">
      <Hero data={bill} live />

      {bill.locked && (
        <motion.div className="lock-banner" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          ✨ This table is settled — totals are final. You can still view and pay your share.
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {!meJoined ? (
          <JoinCard key="join" guests={bill.guests} onJoin={join} />
        ) : (
          <MyTicket key="ticket"
            bill={bill} identity={identity} myItems={myItems} myTotal={myTotal}
            myPaid={myPaid} payOpts={payOpts} hostName={hostName}
            onCopy={copyField} onMarkPaid={markPaid} onUnmarkPaid={unmarkPaid} onAmend={scrollToBill} />
        )}
      </AnimatePresence>

      <BillList
        bill={bill} totals={totals} identity={meJoined ? identity : null}
        onClaim={toggleClaim} onEdit={setEditing} />

      <TableTotals bill={bill} totals={totals} identity={identity} />

      {bill.receiptImageUrl && <ReceiptPhoto url={bill.receiptImageUrl} onOpen={setModalImage} />}

      <Footer />

      <AnimatePresence>
        {editing && (
          <EditSheet key="edit" item={editing} currency={bill.currency}
            onSave={saveItem} onDelete={deleteItem} onClose={() => setEditing(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {modalImage && <ImageModal url={modalImage} onClose={() => setModalImage(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {toast && <Toast>{toast}</Toast>}
      </AnimatePresence>
      {writeError && <div className="offline-pill">Reconnecting…</div>}
    </div>
  );
}

// ── Join ─────────────────────────────────────────────────
const JoinCard = ({ guests, onJoin }) => {
  const [name, setName] = useState('');
  const others = guests.filter((g) => !g.isHost);

  return (
    <motion.section className="join-card"
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      <p className="picker-eyebrow">Live table split</p>
      <h2 className="picker-title">Who are you?</h2>
      <p className="picker-sub">Pop your name in, then tap what you ordered — the bill splits itself.</p>

      <form className="join-row" onSubmit={(e) => { e.preventDefault(); onJoin(name); }}>
        <input
          className="join-input" type="text" value={name} placeholder="Your name"
          maxLength={24} autoComplete="given-name"
          onChange={(e) => setName(e.target.value)}
        />
        <motion.button className="join-btn" type="submit" disabled={!name.trim()} whileTap={{ scale: 0.96 }}>
          Join
        </motion.button>
      </form>

      {guests.length > 0 && (
        <div className="join-present">
          <div className="join-avatars">
            {guests.map((g) => (
              <motion.span key={g.id} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}>
                <Avatar name={g.name} color={g.color} size="sm" />
              </motion.span>
            ))}
          </div>
          <span>
            {guests[0] ? `${guests[0].name}${guests[0].isHost ? ' (host)' : ''}` : ''}
            {others.length > 0 && ` + ${others.length} other${others.length === 1 ? '' : 's'} here`}
          </span>
        </div>
      )}
    </motion.section>
  );
};

// ── My ticket ────────────────────────────────────────────
const MyTicket = ({ bill, identity, myItems, myTotal, myPaid, payOpts, hostName, onCopy, onMarkPaid, onUnmarkPaid, onAmend }) => {
  const cur = bill.currency;
  const hasClaims = myItems.length > 0;
  const isPaid = !!myPaid;
  const owes = myTotal > 0.004;
  const canPay = hasClaims && owes && !isPaid;
  const hasBankT = hasBank(bill.payment);
  const hasAnyMethod = payOpts.length > 0 || hasBankT;

  return (
    <motion.section id="my-ticket" className="ticket-wrap"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      <div className="ticket">
        <div className="ticket-top">
          <div className="ticket-who">
            <Avatar name={identity.name}
              color={bill.guests.find((g) => g.id === identity.gid)?.color || '#ff5a3c'} size="lg" />
            <div>
              <div className="ticket-eyebrow">Your share</div>
              <div className="ticket-name">{identity.name}</div>
            </div>
          </div>
          {isPaid ? (
            <span className="paid-chip confirmed"><CheckIcon /> Paid</span>
          ) : !bill.locked && hasClaims ? (
            <button className="change-btn" onClick={onAmend}>
              <PencilIcon /> Amend
            </button>
          ) : null}
        </div>

        {hasClaims ? (
          <div className="ticket-items">
            <AnimatePresence initial={false}>
              {myItems.map((it) => (
                <motion.div className="tick-row" key={it.id} layout
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <span className="tick-name">
                    {it.name}{it.claimedBy.length > 1 ? ` · split ${it.claimedBy.length} ways` : ''}
                  </span>
                  <span className="tick-dots" />
                  <span className="tick-price">{money(it.price / it.claimedBy.length, cur)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <button className="ticket-empty tappable" onClick={onAmend}>
            You haven’t claimed anything yet — tap here to pick your items.
          </button>
        )}

        <div className="perf" />

        <div className="ticket-total">
          <span>You owe</span>
          <motion.span className="ticket-total-amt" key={myTotal.toFixed(2)}
            initial={{ scale: 0.94, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 20 }}>
            {money(myTotal, cur)}
          </motion.span>
        </div>
      </div>

      {isPaid ? (
        <motion.div className="paid-done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="paid-done-main"><CheckIcon /> You’ve settled up with {hostName}</span>
          <button className="paid-undo" onClick={onUnmarkPaid}>Not paid? Undo</button>
        </motion.div>
      ) : canPay ? (
        <div className="pay-stack">
          <p className="pay-lead">
            Send <b>{money(myTotal, cur)}</b> to {hostName}
          </p>
          {payOpts.map((opt, i) => <PayButton key={opt.key} opt={opt} index={i} />)}
          {hasBankT && <BankCard payment={bill.payment} onCopied={onCopy} />}
          {!hasAnyMethod && (
            <div className="no-pay">{hostName} hasn’t added a payment method yet — settle up in person.</div>
          )}
          <motion.button className="ive-paid" onClick={onMarkPaid} whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <CheckIcon /> I’ve paid
          </motion.button>
        </div>
      ) : hasClaims && !owes ? (
        <p className="pay-lead settled">Nothing to pay — you’re all square.</p>
      ) : null}
    </motion.section>
  );
};

// ── The bill (claim list) ────────────────────────────────
const BillList = ({ bill, totals, identity, onClaim, onEdit }) => {
  const cur = bill.currency;
  const guestById = Object.fromEntries(bill.guests.map((g) => [g.id, g]));
  const upForGrabs = totals.unclaimed.length;

  return (
    <section className="section" id="the-bill">
      <div className="section-head-row">
        <span className="section-title">The bill</span>
        {upForGrabs > 0 ? (
          <span className="grabs-chip">{upForGrabs} up for grabs · {money(totals.unclaimedValue, cur)}</span>
        ) : bill.items.length > 0 ? (
          <span className="grabs-chip done"><CheckIcon /> all claimed</span>
        ) : null}
      </div>

      <div className="live-items">
        {bill.items.map((item) => {
          const mine = identity && item.claimedBy.includes(identity.gid);
          const claimers = item.claimedBy.map((g) => guestById[g]).filter(Boolean);
          return (
            <motion.div key={item.id} layout className={`live-row ${mine ? 'mine' : ''} ${bill.locked || !identity ? 'static' : ''}`}>
              <button className="live-row-main" onClick={() => onClaim(item)} disabled={bill.locked || !identity}>
                <span className="live-check">
                  <motion.span className="live-check-ring" animate={{
                    borderColor: mine ? 'var(--mint)' : 'rgba(245,241,232,0.22)',
                    backgroundColor: mine ? 'var(--mint)' : 'rgba(0,0,0,0)',
                  }}>
                    {mine && <CheckIcon />}
                  </motion.span>
                </span>

                <span className="live-row-info">
                  <span className="live-row-name">
                    {item.name}{item.qty > 1.5 ? <span className="qty-chip">×{Math.round(item.qty)}</span> : null}
                  </span>
                  <span className="live-row-sub">
                    {claimers.length === 0 ? (
                      <span className="up-for-grabs">up for grabs</span>
                    ) : (
                      <span className="claim-stack">
                        {claimers.map((g) => (
                          <motion.span key={g.id} initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 24 }}>
                            <Avatar name={g.name} color={g.color} size="xs" />
                          </motion.span>
                        ))}
                        {claimers.length > 1 && <em>split {claimers.length} ways · {money(item.price / claimers.length, cur)} each</em>}
                      </span>
                    )}
                  </span>
                </span>

                <span className="live-row-price">{money(item.price, cur)}</span>
              </button>

              {!bill.locked && (
                <button className="live-row-edit" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}>
                  <PencilIcon />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {!bill.locked && identity && (
        <button className="add-item" onClick={() => onEdit('new')}>+ Add something missing</button>
      )}

      {bill.charges.length > 0 && (
        <div className="charges-card">
          {bill.charges.map((c) => (
            <div className="tick-row muted" key={c.id}>
              <span className="tick-name">{c.name}</span>
              <span className="tick-dots" />
              <span className="tick-price">{c.amount < 0 ? '−' : ''}{money(Math.abs(c.amount), cur)}</span>
            </div>
          ))}
          <div className="tick-row grand">
            <span className="tick-name">Total</span>
            <span className="tick-dots" />
            <span className="tick-price">{money(totals.grandTotal, cur)}</span>
          </div>
          <p className="charges-note">Service &amp; extras are shared in proportion to what you ordered.</p>
        </div>
      )}
    </section>
  );
};

// ── Everyone's totals ────────────────────────────────────
const TableTotals = ({ bill, totals, identity }) => {
  if (bill.guests.length === 0) return null;
  const paidCount = bill.guests.filter((g) => bill.paid[g.id]).length;
  const total = bill.guests.length;
  const allPaid = paidCount === total && total > 0;
  return (
    <section className="section">
      <div className="section-head-row">
        <span className="section-title">The table</span>
        <span className={`pay-progress ${allPaid ? 'done' : ''}`}>
          {allPaid ? <><CheckIcon /> everyone’s paid</> : `${paidCount} of ${total} paid`}
        </span>
      </div>
      <div className="table-grid">
        {bill.guests.map((g) => {
          const paid = !!bill.paid[g.id];
          return (
            <motion.div className={`table-cell ${paid ? 'is-paid' : ''}`} key={g.id} layout
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Avatar name={g.name} color={g.color} size="sm" />
              <span className="table-name">
                {identity && g.id === identity.gid ? 'You' : g.isHost ? `${g.name} · host` : g.name}
              </span>
              <span className="table-amt">{money(totals.totalFor(g.id), bill.currency)}</span>
              {paid && <span className="paid-chip mini confirmed"><CheckIcon /> paid</span>}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

// ── Edit / add sheet ─────────────────────────────────────
const EditSheet = ({ item, currency, onSave, onDelete, onClose }) => {
  const isNew = item === 'new';
  const [name, setName] = useState(isNew ? '' : item.name);
  const [price, setPrice] = useState(isNew ? '' : String(item.price));
  const [qty, setQty] = useState(isNew ? 1 : Math.max(1, Math.round(item.qty)));

  const parsedPrice = parseFloat(String(price).replace(',', '.'));
  const valid = name.trim() && parsedPrice > 0;

  return (
    <motion.div className="sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="sheet" onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
        <div className="sheet-grab" />
        <h3 className="sheet-title">{isNew ? 'Add an item' : 'Fix this item'}</h3>

        <input className="sheet-input" type="text" placeholder="Item name" value={name}
          maxLength={60} onChange={(e) => setName(e.target.value)} />

        <div className="sheet-row">
          <div className="sheet-price">
            <span>{symbolFor(currency)}</span>
            <input type="text" inputMode="decimal" placeholder="0.00" value={price}
              onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="sheet-qty">
            <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Fewer">−</button>
            <span>×{qty}</span>
            <button onClick={() => setQty(Math.min(50, qty + 1))} aria-label="More">+</button>
          </div>
        </div>

        <motion.button className="sheet-save" disabled={!valid} whileTap={{ scale: 0.98 }}
          onClick={() => onSave(item, { name: name.trim(), price: parsedPrice, qty })}>
          {isNew ? 'Add to the bill' : 'Save changes'}
        </motion.button>

        {!isNew && (
          <button className="sheet-delete" onClick={() => onDelete(item)}>Remove from the bill</button>
        )}
      </motion.div>
    </motion.div>
  );
};
