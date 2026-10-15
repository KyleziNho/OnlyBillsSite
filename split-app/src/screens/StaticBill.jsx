// Static shared bill (v1 snapshot, shared by older app versions). Read-only: pick your
// name → see your share → pay. Same visual language as the live table.
import { useCallback, useMemo, useRef, useState } from 'react';
import { normalizeStatic, hasAnyPayMethod } from '../lib/bill.js';
import { cleanVenueName, formatMoney, plural } from '../lib/format.js';
import { withViewTransition } from '../lib/motion.js';
import { Avatar, FacesProvider } from '../components/Avatar.jsx';
import { assignFaces, faceKey } from '../lib/faces.js';
import { Money } from '../components/Money.jsx';
import { Row, Section } from '../components/Section.jsx';
import { HeroArt } from '../components/HeroArt.jsx';
import { Button, GlassBar } from '../components/Glass.jsx';
import { Sheet } from '../components/Sheet.jsx';
import { PayMethods } from '../components/Pay.jsx';
import { Backdrop, CompactBar, Footer, ImageViewer, Toast, VenueHeader } from '../components/Chrome.jsx';
import { useToast } from '../lib/useToast.js';
import { ChevronDown, ChevronRight } from '../components/Icons.jsx';

const feesOf = (p) => [
  p.tax > 0.004 && ['Tax', p.tax],
  p.serviceCharge > 0.004 && ['Service', p.serviceCharge],
  p.tip > 0.004 && ['Tip', p.tip],
  Math.abs(p.other) > 0.004 && ['Other', p.other],
  p.discount > 0.004 && ['Discount', -p.discount],
].filter(Boolean);

export default function StaticBill({ data, initialPerson = null, initialSheet = null }) {
  const bill = useMemo(() => normalizeStatic(data), [data]);
  const [meIndex, setMeIndex] = useState(initialPerson);
  const [sheet, setSheet] = useState(initialSheet && initialPerson != null ? initialSheet : null);
  const [viewer, setViewer] = useState(null);
  const [toast, showToast] = useToast();
  const headerRef = useRef(null);
  const me = meIndex != null ? bill.people[meIndex] : null;
  // Distinct faces for the bill's people, in bill order — as the app assigns them.
  const faces = useMemo(() => {
    const picked = assignFaces(bill.people.map((p, i) => ({ key: faceKey({ name: p.name, id: `p${i}` }) })));
    return Object.fromEntries(picked.map((f, i) => [`p${i}`, f]));
  }, [bill.people]);
  const venue = cleanVenueName(bill.storeName);

  const pick = (i) => {
    withViewTransition(() => setMeIndex(i));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeSheet = useCallback(() => setSheet(null), []);
  const closeViewer = useCallback(() => setViewer(null), []);

  return (
    <FacesProvider value={faces}>
    <div className="app-shell">
      <main className="page">
        <Backdrop photo={bill.restaurantPhotoUrl} />
        <CompactBar headerRef={headerRef} bill={bill}
          trailing={me ? <Money value={me.total} currency={bill.currency} className="compact-money" roll={false} /> : null} />
        <VenueHeader bill={bill} headerRef={headerRef}
          badge={<span className="badge badge-quiet">Shared bill</span>}
          extraMeta={bill.people.length ? `${bill.people.length} people` : null} />

        {me ? (
          <>
            <section className="card share-card" style={{ viewTransitionName: 'share' }} aria-label="Your share">
              <div className="share-head">
                <Avatar id={`p${meIndex}`} name={me.name} color={me.color} size={40} />
                <div className="share-who">
                  <span className="eyebrow">Your share</span>
                  <span className="share-name">{me.name}</span>
                </div>
                <button type="button" className="text-btn small" onClick={() => withViewTransition(() => setMeIndex(null))}>Not you?</button>
              </div>
              <Money value={me.total} currency={bill.currency} className="share-total" />
              <p className="share-sub">
                {[plural(me.items.length, 'item'), ...feesOf(me).map(([l, v]) => `${formatMoney(v, bill.currency)} ${l.toLowerCase()}`)].join(' · ')}
              </p>
            </section>

            <Section title="What you had" labelId="yours-title">
              {me.items.map((it, i) => (
                <Row key={i} index={i} title={it.name}
                  trailing={<>{it.quantity > 1.5 && <span className="chip">{Math.round(it.quantity)}</span>}
                    <Money value={it.price} currency={bill.currency} roll={false} className="row-money" /></>} />
              ))}
              {feesOf(me).map(([l, v]) => (
                <Row key={l} title={l} className="charge-row"
                  trailing={<Money value={v} currency={bill.currency} roll={false} className="row-money quiet" />} />
              ))}
              <Row title="Your total" className="total-row"
                trailing={<Money value={me.total} currency={bill.currency} roll={false} className="row-money strong" />} />
            </Section>
          </>
        ) : (
          <>
            <section className="card join-card" style={{ viewTransitionName: 'share' }}>
              <HeroArt name="receipts" size={124} eager />
              <h2 className="join-title">Who are you?</h2>
              <p className="join-sub">Tap your name to see exactly what you had and your share to pay.</p>
            </section>
            <Section title="Everyone on the bill" labelId="people-title">
              {bill.people.map((p, i) => (
                <Row key={p.id} index={i} onClick={() => pick(i)} inset="leading"
                  leading={<Avatar id={`p${i}`} name={p.name} color={p.color} size={36} />}
                  title={p.name} subtitle={plural(p.items.length, 'item')}
                  trailing={<><Money value={p.total} currency={bill.currency} roll={false} className="row-money" /><ChevronRight size={16} className="chev" /></>} />
              ))}
            </Section>
          </>
        )}

        {me && <WholeBill bill={bill} meIndex={meIndex} onPick={pick} />}

        {bill.receiptImageUrl && (
          <Section className="receipt-section">
            <Row onClick={() => setViewer(bill.receiptImageUrl)} inset="leading"
              leading={<span className="receipt-thumb"><img src={bill.receiptImageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /></span>}
              title="The receipt" subtitle="Check it against the bill"
              trailing={<ChevronRight size={16} className="chev" />} />
          </Section>
        )}

        <Footer />

        {me && me.total > 0.004 && (
          <GlassBar>
            <Button tone="accent" onClick={() => setSheet('pay')}>
              Pay your share <Money value={me.total} currency={bill.currency} roll={false} />
            </Button>
          </GlassBar>
        )}
      </main>

      <Sheet open={sheet === 'pay' && !!me} onClose={closeSheet} title="Pay your share" subtitle={venue}
        footer={<Button tone="quiet" onClick={closeSheet}>Done</Button>}>
        {me && (
          <div className="pay-sheet">
            <div className="pay-hero">
              <Money value={me.total} currency={bill.currency} className="pay-amount" />
              <p className="pay-hero-sub">{me.name}’s share at {venue}</p>
            </div>
            <PayMethods payment={bill.payment} amount={me.total} currency={bill.currency} reference={venue}
              onCopied={(label, ok) => showToast(ok ? `${label} copied` : 'Couldn’t copy — hold to select', { tone: ok ? undefined : 'quiet' })}
              onOpenQr={setViewer} />
            {hasAnyPayMethod(bill.payment) && <p className="pay-note">Payments go straight to whoever paid the bill.</p>}
          </div>
        )}
      </Sheet>

      <ImageViewer url={viewer} alt="Receipt" onClose={closeViewer} />
      <Toast toast={toast} />
    </div>
    </FacesProvider>
  );
}

function WholeBill({ bill, meIndex, onPick }) {
  const [open, setOpen] = useState(null);
  return (
    <Section title="The whole bill" labelId="whole-title"
      trailing={<Money value={bill.totalBill || bill.people.reduce((s, p) => s + p.total, 0)} currency={bill.currency} roll={false} className="quiet" />}>
      {bill.people.map((p, i) => {
        const expanded = open === i;
        return (
          <div key={p.id} className={`disclosure ${expanded ? 'is-open' : ''}`}>
            <Row onClick={() => setOpen(expanded ? null : i)} inset="leading" index={i}
              aria-expanded={expanded}
              leading={<Avatar id={`p${i}`} name={p.name} color={p.color} size={36} />}
              title={<>{p.name}{i === meIndex && <span className="you-tag">You</span>}</>}
              subtitle={plural(p.items.length, 'item')}
              trailing={<><Money value={p.total} currency={bill.currency} roll={false} className="row-money" /><ChevronDown size={16} className="chev disclosure-chev" /></>} />
            <div className="disclosure-body">
              <div className="disclosure-inner">
                {p.items.map((it, j) => (
                  <div className="mini-row" key={j}><span>{it.name}{it.quantity > 1.5 ? ` ×${Math.round(it.quantity)}` : ''}</span><Money value={it.price} currency={bill.currency} roll={false} /></div>
                ))}
                {feesOf(p).map(([l, v]) => (
                  <div className="mini-row quiet" key={l}><span>{l}</span><Money value={v} currency={bill.currency} roll={false} /></div>
                ))}
                {i !== meIndex && (
                  <button type="button" className="text-btn" onClick={() => onPick(i)}>This is me</button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </Section>
  );
}

