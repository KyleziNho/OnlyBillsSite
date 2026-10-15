// The live table (schemaVersion 2), guest side. Everyone at the table opens the same
// link, says who they are and taps what they had; claims, edits and "I've paid" are
// field-level Firestore updates, so a whole table tapping at once merges cleanly.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HOST_ID, liveTotals, normalizeLive, percentChargeRefresh, pickGuestColor, tablePhase, hasAnyPayMethod,
} from '../lib/bill.js';
import { cleanVenueName, formatMoney, haptic, plural, roundMoney } from '../lib/format.js';
import { exponent, parseAmount } from '../lib/money.js';
import { DELETE, NOW, subscribeShared, updateShared } from '../lib/store.js';
import { useOnline, withViewTransition } from '../lib/motion.js';
import { Avatar, AvatarStack } from '../components/Avatar.jsx';
import { Money } from '../components/Money.jsx';
import { Row, Section } from '../components/Section.jsx';
import { HeroArt } from '../components/HeroArt.jsx';
import { Button, GlassBar } from '../components/Glass.jsx';
import { Sheet } from '../components/Sheet.jsx';
import { PayMethods } from '../components/Pay.jsx';
import {
  Backdrop, CompactBar, Footer, ImageViewer, LiveBadge, StatusPill, Toast, VenueHeader,
} from '../components/Chrome.jsx';
import { useToast } from '../lib/useToast.js';
import {
  CheckIcon, ChevronRight, MinusIcon, PencilIcon, PhotoIcon, PlusIcon, UndoIcon,
} from '../components/Icons.jsx';

// ── Per-device identity ──────────────────────────────────
const identityKey = (docId) => `ob_guest_${docId}`;
const loadIdentity = (docId) => {
  try { return JSON.parse(localStorage.getItem(identityKey(docId))) || null; } catch { return null; }
};
const saveIdentity = (docId, identity) => {
  try {
    if (identity) localStorage.setItem(identityKey(docId), JSON.stringify(identity));
    else localStorage.removeItem(identityKey(docId));
  } catch { /* private mode */ }
};

const newId = (prefix) => {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return prefix + Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 7);
};

const useNow = (ms = 30000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
};

// ── Page ─────────────────────────────────────────────────
export default function LiveBill({ docId, initialData, demo = null }) {
  const [bill, setBill] = useState(() => normalizeLive(initialData));
  const [identity, setIdentity] = useState(() => (demo ? demo.identity || null : loadIdentity(docId)));
  const [sheet, setSheet] = useState(() => {                        // 'pay' | {edit: item | 'new'}
    if (demo?.sheetEdit) return { edit: normalizeLive(initialData).items.find((i) => i.id === demo.sheetEdit) || 'new' };
    return demo?.sheet || null;
  });
  const [editMode, setEditMode] = useState(false);
  // What the pay sheet is for, fixed when it opens so its title/buttons don't flip
  // underneath the guest while it animates away after "I've paid".
  const [payMode, setPayMode] = useState(null);
  const [denied, setDenied] = useState(!!demo?.denied);
  const [gone, setGone] = useState(false);
  const [conn, setConn] = useState(demo?.conn || null);              // null | 'offline' | 'reconnecting'
  const [viewer, setViewer] = useState(null);
  const [toast, showToast] = useToast();
  const now = useNow();
  const online = useOnline();
  const headerRef = useRef(null);
  const nameInputRef = useRef(null);
  const [joinName, setJoinName] = useState('');

  // Snapshot → state, with friendly diffs ("Sam joined", "Dad paid").
  const identityRef = useRef(identity);
  useEffect(() => { identityRef.current = identity; }, [identity]);
  const prevRef = useRef(null);

  useEffect(() => {
    if (demo) return undefined;
    return subscribeShared(docId, (data, meta) => {
      if (!data) { setGone(true); return; }
      const next = normalizeLive(data);
      const prev = prevRef.current;
      const mine = identityRef.current?.gid;
      if (prev) {
        const prevIds = new Set(prev.guests.map((g) => g.id));
        next.guests.forEach((g) => {
          if (g.id === mine) return;
          if (next.paid[g.id] && !prev.paid[g.id] && !g.isHost) showToast(`${g.name} paid`, { person: g });
          else if (!prevIds.has(g.id) && !g.isHost) showToast(`${g.name} joined the table`, { person: g });
        });
        if (next.closed && !prev.closed) {
          const host = next.guests.find((g) => g.isHost);
          showToast(`${host?.name || 'The host'} finished the table`);
        }
      }
      prevRef.current = next;
      setGone(false);
      setConn(meta.fromCache && !navigator.onLine ? 'offline' : null);
      setBill(next);
    }, (err) => {
      console.error(err);
      setConn('reconnecting');
    });
  }, [docId, demo, showToast]);

  // ── Writes ──────────────────────────────────────────────
  const phaseInfo = tablePhase(bill, { now, denied: denied || gone });
  const { phase, canEdit, canPay } = phaseInfo;

  const write = useCallback(async (fields, { optimistic, paymentOnly = false } = {}) => {
    if (optimistic) setBill(optimistic);
    if (demo) {
      // Demo: simulate the rules — after close/expiry only payments get through.
      if (demo.denyEdits && !paymentOnly) {
        setDenied(true);
        setBill(normalizeLive(demo.data));
        showToast('This table has closed — claims are locked', { tone: 'quiet' });
      }
      return true;
    }
    try {
      await updateShared(docId, fields);
      return true;
    } catch (e) {
      console.error(e);
      if (e?.code === 'permission-denied') {
        if (!paymentOnly) setDenied(true);
        showToast(paymentOnly ? 'Couldn’t save that — the table has closed' : 'This table has closed — claims are locked', { tone: 'quiet' });
      } else {
        setConn('reconnecting');
        showToast('Couldn’t save — check your connection', { tone: 'quiet' });
      }
      return false;
    }
  }, [demo, docId, showToast]);

  // ── Derived ─────────────────────────────────────────────
  const totals = useMemo(() => liveTotals(bill), [bill]);
  const host = bill.guests.find((g) => g.isHost);
  const hostName = host?.name || 'the host';
  const me = identity ? bill.guests.find((g) => g.id === identity.gid) : null;
  const myTotal = me ? totals.totalFor(me.id) : 0;
  const myItems = me ? bill.items.filter((i) => i.claimedBy.includes(me.id)) : [];
  const isPaid = !!(me && bill.paid[me.id]);
  const paidAmt = me ? bill.paidAmount[me.id] : undefined;
  const topUp = isPaid && paidAmt != null ? roundMoney(myTotal - paidAmt, bill.currency) : 0;
  const owesTopUp = topUp > 0.005;
  const venue = cleanVenueName(bill.storeName);
  const currentPayMode = isPaid && !owesTopUp ? 'settled' : owesTopUp ? 'topup' : 'pay';
  const sheetMode = payMode || currentPayMode;
  const openPay = () => { setPayMode(currentPayMode); setSheet('pay'); haptic(6); };

  // ── Actions ─────────────────────────────────────────────
  const join = (raw) => {
    const name = raw.trim().slice(0, 24);
    if (!name || !canEdit) return;
    const gid = newId('gst_');
    const color = pickGuestColor(bill.guests.map((g) => g.color), bill.guests.length);
    const mine = { gid, name };
    haptic(10);
    withViewTransition(() => {
      setIdentity(mine);
      if (!demo) saveIdentity(docId, mine);
      setBill((b) => ({ ...b, guests: [...b.guests, { id: gid, name, color, joinedAt: Date.now(), isHost: false, addedByHost: false }] }));
    });
    write({ [`guests.${gid}`]: { name, color, joinedAt: NOW } });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** "That's me": reuse an existing guest on this device (no write needed). */
  const becomeGuest = (g) => {
    haptic(10);
    const mine = { gid: g.id, name: g.name };
    withViewTransition(() => {
      setIdentity(mine);
      if (!demo) saveIdentity(docId, mine);
    });
    showToast(`Welcome back, ${g.name}`, { person: g });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const notMe = () => {
    withViewTransition(() => {
      setIdentity(null);
      if (!demo) saveIdentity(docId, null);
      setEditMode(false);
    });
  };

  const toggleClaim = (item) => {
    if (!me) { nudgeJoin(); return; }
    if (!canEdit) return;
    const mine = item.claimedBy.includes(me.id);
    haptic(8);
    const next = {
      ...bill,
      items: bill.items.map((i) => (i.id !== item.id ? i : {
        ...i, claimedBy: mine ? i.claimedBy.filter((g) => g !== me.id) : [...i.claimedBy, me.id].sort(),
      })),
    };
    write({ [`items.${item.id}.claimedBy.${me.id}`]: mine ? DELETE : true }, { optimistic: next });
  };

  const nudgeJoin = () => {
    haptic([6, 30, 6]);
    const el = nameInputRef.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
      el.closest('.join-field')?.classList.remove('is-nudged');
      requestAnimationFrame(() => el.closest('.join-field')?.classList.add('is-nudged'));
    }
    showToast('Add your name first, then tap away', { tone: 'quiet' });
  };

  const saveItem = (item, values) => {
    if (!canEdit) return;
    if (item === 'new') {
      const id = newId('itm_');
      const order = Math.max(-1, ...bill.items.map((i) => i.order)) + 1;
      const fresh = { id, order, name: values.name, price: values.price, discount: 0, qty: values.qty, claimedBy: [] };
      const items = [...bill.items, fresh];
      // Percentage charges follow the items; keep their stored amount current for older apps.
      write({ [`items.${id}`]: { order, name: values.name, price: values.price, qty: values.qty, claimedBy: {} },
        ...percentChargeRefresh(bill, items) },
        { optimistic: { ...bill, items } });
      showToast('Added to the bill');
    } else {
      // A re-priced line drops its printed item discount (the new price is the price).
      const repriced = Math.abs(values.price - item.price) > 0.0001 && item.discount > 0;
      const edited = { ...values, ...(repriced ? { discount: 0 } : {}) };
      const items = bill.items.map((i) => (i.id === item.id ? { ...i, ...edited } : i));
      write({
        [`items.${item.id}.name`]: values.name,
        [`items.${item.id}.price`]: values.price,
        [`items.${item.id}.qty`]: values.qty,
        ...(repriced ? { [`items.${item.id}.discount`]: DELETE } : {}),
        ...percentChargeRefresh(bill, items),
      }, { optimistic: { ...bill, items } });
      showToast('Item updated');
    }
    setSheet(null);
  };

  const deleteItem = (item) => {
    const items = bill.items.filter((i) => i.id !== item.id);
    write({ [`items.${item.id}`]: DELETE, ...percentChargeRefresh(bill, items) }, { optimistic: { ...bill, items } });
    setSheet(null);
    showToast(`Removed ${item.name}`);
  };

  const markPaid = () => {
    if (!me || !canPay) return;
    const amount = roundMoney(myTotal, bill.currency);
    haptic([8, 40, 8]);
    setSheet(null);
    // Same value the shipping app understands ('confirmed'), plus what was owed at the
    // time so a later edit reads "+£x since you paid" on both sides. The card celebrates
    // with its own mount animations once the sheet has cleared (no page-wide snapshot).
    setBill((b) => ({ ...b, paid: { ...b.paid, [me.id]: 'confirmed' }, paidAmount: { ...b.paidAmount, [me.id]: amount } }));
    write({ [`paid.${me.id}`]: 'confirmed', [`paidAmount.${me.id}`]: amount }, { paymentOnly: true });
    showToast(owesTopUp ? 'All square again — thanks!' : `Marked as paid — ${hostName} will see it`);
  };

  const unmarkPaid = () => {
    if (!me || !canPay) return;
    haptic(8);
    setSheet(null);
    setBill((b) => {
      const paid = { ...b.paid }; delete paid[me.id];
      const paidAmount = { ...b.paidAmount }; delete paidAmount[me.id];
      return { ...b, paid, paidAmount };
    });
    write({ [`paid.${me.id}`]: DELETE, [`paidAmount.${me.id}`]: DELETE }, { paymentOnly: true });
    showToast('Okay — marked as not paid', { tone: 'quiet' });
  };

  const onCopied = (label, ok) => showToast(ok ? `${label} copied` : `Couldn’t copy — hold to select`, { tone: ok ? undefined : 'quiet' });

  const closeSheet = useCallback(() => setSheet(null), []);
  const closeViewer = useCallback(() => setViewer(null), []);

  // ── CTA ─────────────────────────────────────────────────
  let cta = null;
  if (!me && phase === 'open') {
    cta = <JoinCta name={joinName} />;
  } else if (me && canPay) {
    if (myItems.length === 0) {
      if (phase === 'open') cta = <Button key="tap" tone="quiet" disabled>Tap what you had</Button>;
    } else if (myTotal < 0.005) {
      cta = <Button key="zero" tone="quiet" disabled>Nothing to pay</Button>;
    } else if (isPaid && !owesTopUp) {
      cta = (
        <Button key="paid" tone="paid" onClick={openPay} icon={<span className="btn-tick"><CheckIcon size={14} strokeWidth={3.2} /></span>}>
          Paid <Money value={paidAmt ?? myTotal} currency={bill.currency} roll={false} />
        </Button>
      );
    } else {
      cta = (
        <Button key={owesTopUp ? 'topup' : 'pay'} tone="accent" onClick={openPay}>
          {owesTopUp ? 'Pay the extra ' : `Pay ${hostName} `}
          <Money value={owesTopUp ? topUp : myTotal} currency={bill.currency} />
        </Button>
      );
    }
  }

  return (
    <div className="app-shell">
      <main className={`page phase-${phase}`}>
        <Backdrop photo={bill.restaurantPhotoUrl} />
        <CompactBar headerRef={headerRef} bill={bill}
          trailing={me && myItems.length > 0 ? <Money value={myTotal} currency={bill.currency} className="compact-money" /> : null} />
        <VenueHeader bill={bill} headerRef={headerRef} badge={<LiveBadge phase={phase} />}
          extraMeta={bill.guests.length > 1 ? `${bill.guests.length} at the table` : null} />

        {phase !== 'open' && (
          <PhaseBanner phase={phase} hostName={hostName} canPay={canPay} joined={!!me} gone={gone} />
        )}

        {me ? (
          <ShareCard me={me} bill={bill} totals={totals} myItems={myItems} myTotal={myTotal}
            isPaid={isPaid} paidAmt={paidAmt} topUp={owesTopUp ? topUp : 0} phase={phase}
            hostName={hostName} onNotMe={!isPaid ? notMe : null} onOpenPay={openPay} />
        ) : phase === 'open' ? (
          <JoinCard bill={bill} totals={totals} host={host} inputRef={nameInputRef}
            name={joinName} setName={setJoinName} onJoin={join} onPick={becomeGuest} />
        ) : (
          <FindYourself bill={bill} totals={totals} hostName={hostName} onPick={becomeGuest} />
        )}

        <BillSection bill={bill} totals={totals} me={me} canEdit={canEdit && !!me} phase={phase}
          editMode={editMode} setEditMode={setEditMode}
          onClaim={toggleClaim} onEdit={(item) => setSheet({ edit: item })} />

        <ExtrasSection bill={bill} totals={totals} />

        {(me || phase !== 'open') && bill.guests.length > 0 && (
          <TableSection bill={bill} totals={totals} me={me} />
        )}

        {bill.receiptImageUrl && (
          <Section className="receipt-section">
            <Row onClick={() => setViewer(bill.receiptImageUrl)} inset="leading"
              leading={<span className="receipt-thumb"><img src={bill.receiptImageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /></span>}
              title="The receipt" subtitle="Check it against the bill"
              trailing={<ChevronRight size={16} className="chev" />} />
          </Section>
        )}

        <Footer />

        {cta && <GlassBar>{cta}</GlassBar>}
      </main>

      <Sheet open={sheet === 'pay' && !!me} onClose={closeSheet}
        title={sheetMode === 'settled' ? 'You’re all square' : sheetMode === 'topup' ? 'Pay the extra' : `Pay ${hostName}`}
        subtitle={venue}
        footer={me && canPay ? (
          sheetMode === 'settled'
            ? <Button tone="quiet" onClick={unmarkPaid} icon={<UndoIcon size={17} />}>Not paid yet? Undo</Button>
            : <Button tone="positive" onClick={markPaid} icon={<CheckIcon size={18} strokeWidth={2.8} />}>
                {sheetMode === 'topup' ? 'I’ve paid the extra' : `I’ve paid ${hostName}`}
              </Button>
        ) : null}>
        {me && (
          <PaySheetBody bill={bill} totals={totals} me={me} myItems={myItems} myTotal={myTotal}
            mode={sheetMode} paidAmt={paidAmt} topUp={owesTopUp ? topUp : 0} hostName={hostName}
            venue={venue} onCopied={onCopied} onOpenQr={setViewer} />
        )}
      </Sheet>

      <EditSheet open={!!sheet?.edit} item={sheet?.edit} currency={bill.currency} onClose={closeSheet}
        onSave={saveItem} onDelete={deleteItem} />

      <ImageViewer url={viewer} alt="Receipt" onClose={closeViewer} />
      <Toast toast={toast} />
      <StatusPill kind={!online ? 'offline' : conn} />
    </div>
  );
}

// ── Banners ──────────────────────────────────────────────
function PhaseBanner({ phase, hostName, canPay, joined, gone }) {
  const closed = phase === 'closed';
  const host = hostName === 'the host' ? 'The host' : hostName;
  return (
    <section className={`card banner banner-${phase}`} style={{ viewTransitionName: 'banner' }}>
      <HeroArt name={closed ? 'allclear' : 'scan'} size={84} eager />
      <div className="banner-text">
        <h2 className="banner-title">{closed ? 'Settled — totals are final' : 'This table has closed'}</h2>
        <p className="banner-body">
          {closed ? `${host} finished the table.` : gone ? 'It’s no longer live.' : 'Claims are locked now.'}{' '}
          {canPay
            ? (joined ? 'You can still pay and mark yourself as paid.' : 'Find your name to see what you owe.')
            : `Settle anything left directly with ${hostName}.`}
        </p>
      </div>
    </section>
  );
}

// ── Join ─────────────────────────────────────────────────
function JoinCta({ name }) {
  const trimmed = name.trim();
  return (
    <Button tone="accent" type="submit" form="join-form" disabled={!trimmed}>
      {trimmed ? <>Join as <span className="btn-name">{trimmed}</span></> : 'Join the table'}
    </Button>
  );
}

function JoinCard({ bill, totals, host, inputRef, name, setName, onJoin, onPick }) {
  const others = bill.guests.filter((g) => !g.isHost);
  return (
    <>
      <section className="card join-card" style={{ viewTransitionName: 'share' }}>
        <HeroArt name="claim" size={132} eager />
        <h2 className="join-title">Who are you?</h2>
        <p className="join-sub">Add your name, then tap what you had. Your share adds itself up as you go.</p>
        <form id="join-form" className="join-field" onSubmit={(e) => { e.preventDefault(); onJoin(name); }}
          onAnimationEnd={(e) => e.currentTarget.classList.remove('is-nudged')}>
          <label htmlFor="join-name" className="sr-only">Your name</label>
          <input id="join-name" ref={inputRef} className="field" type="text" placeholder="Your name"
            value={name} onChange={(e) => setName(e.target.value)}
            maxLength={24} autoComplete="given-name" autoCapitalize="words" enterKeyHint="go" spellCheck={false} />
        </form>
        {host && (
          <p className="join-host">
            <Avatar name={host.name} color={host.color} size={20} />
            <span><strong>{host.name}</strong> is hosting · pays the bill</span>
          </p>
        )}
      </section>

      {others.length > 0 && (
        <Section title="Already at the table" labelId="already-title"
          footer="On a new phone? Tap your name to pick up where you left off.">
          {others.map((g, i) => {
            const n = bill.items.filter((it) => it.claimedBy.includes(g.id)).length;
            return (
              <Row key={g.id} index={i} onClick={() => onPick(g)} inset="leading"
                leading={<Avatar name={g.name} color={g.color} size={36} />}
                title={g.name}
                subtitle={g.addedByHost ? `Added by ${host?.name || 'the host'}` : n ? `${plural(n, 'item')} · ${formatMoney(totals.totalFor(g.id), bill.currency)}` : 'Just joined'}
                trailing={<span className="link-label">That’s me</span>}
                aria-label={`That's me: ${g.name}`} />
            );
          })}
        </Section>
      )}
    </>
  );
}

function FindYourself({ bill, totals, hostName, onPick }) {
  const people = bill.guests.filter((g) => !g.isHost);
  if (!people.length) return null;
  return (
    <Section title="Find your name" labelId="find-title" footer={`Not listed? Ask ${hostName} what you owe.`}>
      {people.map((g, i) => (
        <Row key={g.id} index={i} onClick={() => onPick(g)} inset="leading"
          leading={<Avatar name={g.name} color={g.color} size={36} />}
          title={g.name}
          subtitle={bill.paid[g.id] ? <span className="paid-label"><CheckIcon size={13} strokeWidth={3} />Paid</span> : null}
          trailing={<><Money value={totals.totalFor(g.id)} currency={bill.currency} roll={false} className="row-money" /><ChevronRight size={16} className="chev" /></>} />
      ))}
    </Section>
  );
}

// ── Your share ───────────────────────────────────────────
function ShareCard({ me, bill, totals, myItems, myTotal, isPaid, paidAmt, topUp, phase, hostName, onNotMe, onOpenPay }) {
  const extras = totals.chargesFor(me.id).reduce((s, c) => s + c.share, 0);
  const shared = myItems.filter((i) => i.claimedBy.length > 1).length;
  let sub;
  if (!myItems.length) {
    sub = phase === 'open' ? 'Tap what you had below.' : 'You didn’t claim anything here.';
  } else {
    const bits = [plural(myItems.length, 'item')];
    if (shared) bits.push(`${shared} shared`);
    if (Math.abs(extras) > 0.005) bits.push(`${extras < 0 ? 'less' : 'incl.'} ${formatMoney(Math.abs(extras), bill.currency)} ${extras < 0 ? 'discount' : 'extras'}`);
    sub = bits.join(' · ');
  }
  return (
    <section className={`card share-card ${isPaid ? 'is-paid' : ''}`} style={{ viewTransitionName: 'share' }} aria-label="Your share">
      <div className="share-head">
        <Avatar name={me.name} color={me.color} size={40} />
        <div className="share-who">
          <span className="eyebrow">Your share</span>
          <span className="share-name">{me.name}</span>
        </div>
        {isPaid ? (
          <span className="pill pill-paid"><CheckIcon size={13} strokeWidth={3} />Paid</span>
        ) : onNotMe ? (
          <button type="button" className="text-btn small" onClick={onNotMe}>Not you?</button>
        ) : null}
      </div>
      <Money value={myTotal} currency={bill.currency} className={`share-total ${myTotal < 0.005 ? 'is-zero' : ''}`} />
      <p className="share-sub">{sub}</p>
      {isPaid && (
        <p className="share-paid-line">
          {topUp > 0
            ? <button type="button" className="text-btn topup" onClick={onOpenPay}><PlusIcon size={14} strokeWidth={2.8} />{formatMoney(topUp, bill.currency)} since you paid</button>
            : paidAmt != null && paidAmt - myTotal > 0.005
              ? <span className="overpaid">You paid {formatMoney(paidAmt, bill.currency)} — {formatMoney(paidAmt - myTotal, bill.currency)} over your share now. Sort it with {hostName}.</span>
              : <span>You paid {hostName} {formatMoney(paidAmt ?? myTotal, bill.currency)}</span>}
        </p>
      )}
      {isPaid && !topUp && <HeroArt name="paid" size={104} className="share-art" delay={260} />}
    </section>
  );
}

// ── The bill ─────────────────────────────────────────────
function useLongPress(onLong, ms = 480) {
  const t = useRef(null);
  const fired = useRef(false);
  const start = useRef(null);
  const clear = () => { clearTimeout(t.current); t.current = null; };
  return {
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      clear();
      t.current = setTimeout(() => { fired.current = true; haptic(12); onLong(); }, ms);
    },
    onPointerMove: (e) => {
      if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu: (e) => { e.preventDefault(); clear(); if (!fired.current) { fired.current = true; onLong(); } },
    wasLong: () => { const f = fired.current; fired.current = false; return f; },
  };
}

function ItemRow({ item, index, bill, me, myShare, canClaim, canEdit, editMode, onClaim, onEdit }) {
  const guestById = useMemo(() => Object.fromEntries(bill.guests.map((g) => [g.id, g])), [bill.guests]);
  const claimers = item.claimedBy.map((id) => guestById[id]).filter(Boolean);
  const mine = !!me && item.claimedBy.includes(me.id);
  const shared = claimers.length > 1;
  const { wasLong, ...press } = useLongPress(() => canEdit && onEdit(item));
  const interactive = editMode ? canEdit : canClaim;

  const who = claimers.length === 0 ? null
    : claimers.length === 1 ? (claimers[0].id === me?.id ? 'You' : claimers[0].name)
      : `split ${claimers.length} ways`;

  const body = (
    <>
      {!editMode && canClaim && (
        <span className={`check ${mine ? 'is-on' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M6.5 12.4l3.6 3.6 7.4-7.6" /></svg>
        </span>
      )}
      <span className="row-body">
        <span className="row-title">{item.name}</span>
        <span className="row-sub">
          {claimers.length === 0
            ? <span className="grabs">Up for grabs</span>
            : <><AvatarStack people={claimers} size={20} label={claimers.map((c) => c.name).join(', ')} /><span>{who}</span></>}
        </span>
      </span>
      {item.qty > 1.5 && <span className="chip" aria-label={`quantity ${Math.round(item.qty)}`}>{Math.round(item.qty)}</span>}
      <span className="row-trailing item-price">
        <Money value={item.price} currency={bill.currency} roll={false} className="row-money" />
        {item.discount > 0 && <span className="my-share"><s>{formatMoney(item.price + item.discount, bill.currency)}</s></span>}
        {mine && shared && <span className="my-share">You · {formatMoney(myShare, bill.currency)}</span>}
      </span>
      {editMode && canEdit && <PencilIcon size={16} className="edit-glyph" />}
    </>
  );

  if (!interactive) {
    return <div className={`row item-row ${mine ? 'is-mine' : ''}`} style={{ '--i': index }}>{body}</div>;
  }
  return (
    <button type="button" className={`row item-row is-tappable ${mine ? 'is-mine' : ''} ${editMode ? 'is-editing' : ''}`}
      style={{ '--i': index }}
      aria-pressed={editMode ? undefined : mine}
      aria-label={editMode ? `Edit ${item.name}` : undefined}
      {...(canEdit && !editMode ? press : {})}
      onClick={() => {
        if (!editMode && wasLong()) return;
        if (editMode) onEdit(item); else onClaim(item);
      }}>
      {body}
    </button>
  );
}

function BillSection({ bill, totals, me, canEdit, phase, editMode, setEditMode, onClaim, onEdit }) {
  const grabs = totals.unclaimed.length;
  const canClaim = phase === 'open';
  const trailing = editMode
    ? <button type="button" className="text-btn" onClick={() => setEditMode(false)}>Done</button>
    : grabs > 0
      ? <span className="quiet">{grabs} up for grabs · {formatMoney(totals.unclaimedValue, bill.currency)}</span>
      : bill.items.length > 0 ? <span className="all-claimed"><CheckIcon size={13} strokeWidth={3} />All claimed</span> : null;

  return (
    <Section title="The bill" trailing={trailing} className={`bill-section ${editMode ? 'is-editing' : ''}`} id="the-bill" labelId="bill-title">
      {bill.items.length === 0 && (
        <div className="row empty-row"><span className="row-body"><span className="row-sub">No items yet — the host is still adding them.</span></span></div>
      )}
      {bill.items.map((item, i) => (
        <ItemRow key={item.id} item={item} index={i} bill={bill} me={me}
          myShare={me ? totals.itemShareFor(item, me.id) : 0}
          canClaim={canClaim} canEdit={canEdit} editMode={editMode} onClaim={onClaim} onEdit={onEdit} />
      ))}
      {editMode && canEdit && (
        <Row onClick={() => onEdit('new')} className="add-row" inset="leading"
          leading={<span className="add-dot"><PlusIcon size={15} strokeWidth={2.8} /></span>}
          title="Add something missing" />
      )}
      {!editMode && canEdit && (
        <div className="bill-tools">
          <button type="button" className="text-btn" onClick={() => setEditMode(true)}>
            <PencilIcon size={15} />Something wrong? Edit items
          </button>
        </div>
      )}
    </Section>
  );
}

function ExtrasSection({ bill, totals }) {
  return (
    <Section className="extras" footer={bill.charges.length ? 'Service and extras are shared in proportion to what you ordered.' : null}>
      {totals.charges.map((c) => (
        <Row key={c.id} title={c.name} className="charge-row"
          trailing={<Money value={c.amount} currency={bill.currency} roll={false} className="row-money quiet" />} />
      ))}
      <Row title="Bill total" className="total-row"
        trailing={<Money value={totals.grandTotal} currency={bill.currency} className="row-money strong" />} />
    </Section>
  );
}

function TableSection({ bill, totals, me }) {
  const payers = bill.guests.filter((g) => !g.isHost);
  const paidCount = payers.filter((g) => bill.paid[g.id]).length;
  const allPaid = payers.length > 0 && paidCount === payers.length;
  return (
    <Section title="At the table" labelId="table-title"
      trailing={payers.length > 0 ? (allPaid
        ? <span className="all-claimed"><CheckIcon size={13} strokeWidth={3} />Everyone’s paid</span>
        : <span className="quiet">{paidCount} of {payers.length} paid</span>) : null}>
      {bill.guests.map((g, i) => {
        const total = totals.totalFor(g.id);
        const paid = !!bill.paid[g.id];
        const then = bill.paidAmount[g.id];
        const extra = paid && then != null ? roundMoney(total - then, bill.currency) : 0;
        const n = bill.items.filter((it) => it.claimedBy.includes(g.id)).length;
        const isMe = me && g.id === me.id;
        let sub;
        if (g.id === HOST_ID) sub = 'Host · paid the bill';
        else if (paid && extra > 0.005) sub = <span className="since-label"><PlusIcon size={12} strokeWidth={3} />{formatMoney(extra, bill.currency)} since paid</span>;
        else if (paid) sub = <span className="paid-label"><CheckIcon size={13} strokeWidth={3} />Paid</span>;
        else sub = n ? plural(n, 'item') : 'Nothing claimed yet';
        return (
          <Row key={g.id} index={i} inset="leading" className={isMe ? 'is-me' : ''}
            leading={<Avatar name={g.name} color={g.color} size={36} pop />}
            title={<>{g.name}{isMe && <span className="you-tag">You</span>}</>}
            subtitle={sub}
            trailing={<Money value={total} currency={bill.currency} className="row-money" />} />
        );
      })}
    </Section>
  );
}

// ── Pay sheet ────────────────────────────────────────────
function PaySheetBody({ bill, totals, me, myItems, myTotal, mode, paidAmt, topUp, hostName, venue, onCopied, onOpenQr }) {
  const settled = mode === 'settled';
  const amount = mode === 'topup' && topUp ? topUp : myTotal;
  const charges = totals.chargesFor(me.id).filter((c) => Math.abs(c.share) > 0.004);
  return (
    <div className="pay-sheet">
      <div className={`pay-hero ${settled ? 'is-settled' : ''}`}>
        {settled && <HeroArt name="paid" size={120} eager />}
        <Money value={amount} currency={bill.currency} className="pay-amount" />
        <p className="pay-hero-sub">
          {settled ? `You told ${hostName} you’ve paid. Nice one.`
            : mode === 'topup' && topUp ? `Your share went from ${formatMoney(paidAmt, bill.currency)} to ${formatMoney(myTotal, bill.currency)} after a change.`
              : `Your share at ${venue}`}
        </p>
      </div>

      {!settled && (
        <PayMethods payment={bill.payment} amount={amount} currency={bill.currency} reference={venue}
          payee={hostName} onCopied={onCopied} onOpenQr={onOpenQr} />
      )}

      <Section title="Your items" className="breakdown">
        {myItems.map((it) => (
          <Row key={it.id} title={it.name}
            subtitle={it.claimedBy.length > 1 ? `Split ${it.claimedBy.length} ways · ${formatMoney(it.price, bill.currency)}` : null}
            trailing={<>
              {it.qty > 1.5 && <span className="chip">{Math.round(it.qty)}</span>}
              <Money value={totals.itemShareFor(it, me.id)} currency={bill.currency} roll={false} className="row-money" />
            </>} />
        ))}
        {charges.map((c) => (
          <Row key={c.id} title={c.name} className="charge-row"
            trailing={<Money value={c.share} currency={bill.currency} roll={false} className="row-money quiet" />} />
        ))}
        <Row title="Your total" className="total-row"
          trailing={<Money value={myTotal} currency={bill.currency} roll={false} className="row-money strong" />} />
      </Section>

      {!settled && hasAnyPayMethod(bill.payment) && (
        <p className="pay-note">Paid? Tap “I’ve paid” so {hostName} knows — it ticks you off on their phone.</p>
      )}
    </div>
  );
}

// ── Edit / add item sheet ────────────────────────────────
function EditSheet({ open, item, currency, onClose, onSave, onDelete }) {
  // Keep the last item while the sheet animates out.
  const [last, setLast] = useState(item);
  if (item && item !== last) setLast(item);
  const it = item || last;
  return (
    <Sheet open={open} onClose={onClose} title={it === 'new' ? 'Add an item' : 'Edit item'}
      subtitle={it === 'new' ? 'Something missing from the bill?' : 'Fix a name, price or quantity'}>
      {it && <EditForm key={it === 'new' ? 'new' : it.id} item={it} currency={currency} onSave={onSave} onDelete={onDelete} />}
    </Sheet>
  );
}

function EditForm({ item, currency, onSave, onDelete }) {
  const isNew = item === 'new';
  const [name, setName] = useState(isNew ? '' : item.name);
  const [price, setPrice] = useState(isNew ? '' : item.price.toFixed(exponent(currency)));
  const [qty, setQty] = useState(isNew ? 1 : Math.max(1, Math.round(item.qty)));
  // Thousands separators and comma decimals ("1,234.50", "12,50", "¥1,200") — B12.
  const parsed = parseAmount(price, currency) ?? NaN;
  const valid = name.trim().length > 0 && parsed > 0 && parsed < 100000;
  const sym = formatMoney(0, currency).replace(/[\d.,\s]/g, '');

  return (
    <form className="edit-form" onSubmit={(e) => { e.preventDefault(); if (valid) onSave(item, { name: name.trim().slice(0, 60), price: roundMoney(parsed, currency), qty }); }}>
      <div className="group form-group">
        <label className="form-row">
          <span className="form-label">Item</span>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Garlic bread"
            maxLength={60} autoCapitalize="sentences" enterKeyHint="next" />
        </label>
        <label className="form-row">
          <span className="form-label">Price</span>
          <span className="form-price">
            <span className="form-sym" aria-hidden="true">{sym}</span>
            <input className="form-input money-input" value={price} onChange={(e) => setPrice(e.target.value)}
              style={{ width: `${Math.max(4, String(price).length + 0.5)}ch` }}
              inputMode="decimal" placeholder="0.00" enterKeyHint="done" aria-label={`Price for the whole line, in ${currency}`} />
          </span>
        </label>
        <div className="form-row">
          <span className="form-label" id="qty-label">Quantity</span>
          <span className="stepper" role="group" aria-labelledby="qty-label">
            <button type="button" onClick={() => { haptic(5); setQty(Math.max(1, qty - 1)); }} disabled={qty <= 1} aria-label="Fewer"><MinusIcon size={16} strokeWidth={2.6} /></button>
            <span className="stepper-val" aria-live="polite">{qty}</span>
            <button type="button" onClick={() => { haptic(5); setQty(Math.min(50, qty + 1)); }} aria-label="More"><PlusIcon size={16} strokeWidth={2.6} /></button>
          </span>
        </div>
      </div>
      <p className="section-foot">Price is for the whole line — {qty > 1 ? `all ${qty} together` : 'as printed on the receipt'}.</p>
      <Button tone="accent" type="submit" disabled={!valid}>{isNew ? 'Add to the bill' : 'Save changes'}</Button>
      {!isNew && (
        <button type="button" className="text-btn danger center" onClick={() => onDelete(item)}>Remove from the bill</button>
      )}
    </form>
  );
}
