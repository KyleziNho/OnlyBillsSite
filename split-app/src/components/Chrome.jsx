// Page chrome: the venue backdrop + header, the compact glass bar that takes over
// on scroll, toasts, the status pill, the footer and the full-page states.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cleanVenueName, displayDate, formatCount } from '../lib/format.js';
import { usePresence } from '../lib/motion.js';
import { HeroArt } from './HeroArt.jsx';
import { Avatar } from './Avatar.jsx';
import { Button, GlassIconButton } from './Glass.jsx';
import { ArrowUpRight, CheckIcon, CloseIcon, StarIcon, WifiOffIcon } from './Icons.jsx';

/** Soft accent wash at the top of the page; with a venue photo, a blurred, saturated
 *  pool of it behind the header (VenueBackdrop on iOS). */
export function Backdrop({ photo }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="backdrop" aria-hidden="true">
      {photo && (
        // Opacity lives on the wrapper, the blur on the image: WebKit ignores opacity on
        // an element that also carries filter: blur().
        <div className={`backdrop-photo ${loaded ? 'is-loaded' : ''}`}>
          <img src={photo} alt="" decoding="async" onLoad={() => setLoaded(true)} referrerPolicy="no-referrer" />
        </div>
      )}
      <div className="backdrop-wash" />
    </div>
  );
}

export function Brand({ badge }) {
  return (
    <div className="brand">
      <picture>
        <source srcSet="app-icon-dark-64.png" media="(prefers-color-scheme: dark)" />
        <img className="brand-icon" src="app-icon-64.png" alt="" width="26" height="26" />
      </picture>
      <span className="brand-name">OnlyBills</span>
      {badge}
    </div>
  );
}

export function LiveBadge({ phase }) {
  if (phase === 'closed') return <span className="badge badge-done"><CheckIcon size={12} strokeWidth={3} />Settled</span>;
  if (phase === 'expired') return <span className="badge badge-quiet">Closed</span>;
  return <span className="badge badge-live"><span className="live-dot" />Live</span>;
}

/** Thumb + large venue name + one quiet meta line. Observed so the compact bar knows
 *  when it has scrolled away. */
export function VenueHeader({ bill, badge, headerRef, extraMeta }) {
  const [thumbOk, setThumbOk] = useState(true);
  const name = cleanVenueName(bill.storeName);
  const date = displayDate(bill.date);
  // One quiet line: rating · when · who. The place type only when there's room.
  const meta = [date, extraMeta].filter(Boolean);
  if (!bill.rating && meta.length < 2 && bill.placeType && bill.placeType.length < 20) meta.push(bill.placeType);
  return (
    <header className="venue" ref={headerRef}>
      <Brand badge={badge} />
      <div className="venue-row">
        <div className="venue-thumb">
          {bill.restaurantPhotoUrl && thumbOk ? (
            <img src={bill.restaurantPhotoUrl} alt="" onError={() => setThumbOk(false)} referrerPolicy="no-referrer" />
          ) : (
            <span className="venue-monogram" aria-hidden="true">{Array.from(name)[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="venue-text">
          <h1 className="venue-name" title={bill.storeName || undefined}>{name}</h1>
          {(meta.length > 0 || bill.rating) && (
            <p className="venue-meta">
              {bill.rating ? (
                <span className="venue-rating">
                  <StarIcon size={13} />{bill.rating.toFixed(1)}
                  {bill.ratingCount ? <span className="venue-rating-count"> ({formatCount(bill.ratingCount)})</span> : null}
                </span>
              ) : null}
              {meta.map((m, i) => <span key={i} className="venue-meta-item">{m}</span>)}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}

/** Glass capsule that slides in once the header has scrolled away. */
export function CompactBar({ headerRef, bill, trailing }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = headerRef.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0),
      { rootMargin: '-12px 0px 0px 0px', threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [headerRef]);
  return (
    <div className={`compact-bar ${show ? 'is-shown' : ''}`} aria-hidden={!show}>
      <div className="compact-inner glass">
        {bill.restaurantPhotoUrl
          ? <img className="compact-thumb" src={bill.restaurantPhotoUrl} alt="" referrerPolicy="no-referrer" />
          : <span className="compact-thumb compact-mono">{Array.from(cleanVenueName(bill.storeName))[0]}</span>}
        <span className="compact-name">{cleanVenueName(bill.storeName)}</span>
        {trailing && <span className="compact-trailing">{trailing}</span>}
      </div>
    </div>
  );
}

// ── Toasts ────────────────────────────────────────────────
export function Toast({ toast }) {
  const [last, setLast] = useState(toast);
  if (toast && toast !== last) setLast(toast);
  const { rendered, closing, onExited } = usePresence(!!toast);
  const t = toast || last;
  if (!rendered || !t) return null;
  return createPortal(
    <div className="toast-layer" role="status" aria-live="polite">
      <div key={t.id} className={`toast glass ${closing ? 'is-closing' : ''} ${t.tone ? `toast-${t.tone}` : ''}`}
        onAnimationEnd={(e) => { if (e.target === e.currentTarget && closing) onExited(); }}>
        {t.person ? <Avatar name={t.person.name} color={t.person.color} size={22} />
          : t.icon || (t.tone === 'quiet' ? null : <span className="toast-tick"><CheckIcon size={13} strokeWidth={3} /></span>)}
        <span>{t.text}</span>
      </div>
    </div>,
    document.body,
  );
}

/** Persistent connection pill (offline / reconnecting). */
export function StatusPill({ kind }) {
  const { rendered, closing, onExited } = usePresence(!!kind);
  const [last, setLast] = useState(kind);
  if (kind && kind !== last) setLast(kind);
  const k = kind || last;
  if (!rendered) return null;
  return createPortal(
    <div className="status-layer" role="status" aria-live="polite">
      <div className={`status-pill glass ${closing ? 'is-closing' : ''}`}
        onAnimationEnd={(e) => { if (e.target === e.currentTarget && closing) onExited(); }}>
        <WifiOffIcon size={15} />
        {k === 'offline' ? 'Offline. Your taps will sync later' : 'Reconnecting…'}
      </div>
    </div>,
    document.body,
  );
}

// ── Footer ────────────────────────────────────────────────
export function Footer() {
  return (
    <footer className="footer">
      <a className="get-app" href="https://apps.apple.com/app/onlybills" target="_blank" rel="noopener noreferrer">
        <picture>
          <source srcSet="app-icon-dark-128.png" media="(prefers-color-scheme: dark)" />
          <img src="app-icon-128.png" alt="" width="44" height="44" loading="lazy" />
        </picture>
        <span className="get-app-text">
          <span className="get-app-title">Split your next bill</span>
          <span className="get-app-sub">OnlyBills for iPhone</span>
        </span>
        <span className="get-app-cta">Get <ArrowUpRight size={14} strokeWidth={2.4} /></span>
      </a>
      <p className="footer-note">Payments go straight to whoever paid the bill. OnlyBills never holds your money.</p>
    </footer>
  );
}

// ── Full-page states (loading / not found / error / offline) ──────────
export function StatePage({ art, title, body, action, secondary }) {
  return (
    <main className="page state-page">
      <Backdrop />
      <div className="venue"><Brand /></div>
      <div className="state-card">
        <HeroArt name={art} size={196} eager />
        <h1 className="state-title">{title}</h1>
        <p className="state-body">{body}</p>
        {action && <div className="state-action">{action}</div>}
        {secondary && <div className="state-secondary">{secondary}</div>}
      </div>
      <Footer />
    </main>
  );
}

export function LoadingPage() {
  return (
    <main className="page is-loading" aria-busy="true" aria-label="Opening the bill">
      <Backdrop />
      <div className="venue">
        <div className="brand"><span className="sk sk-icon" /><span className="sk sk-line" style={{ width: 84 }} /></div>
        <div className="venue-row">
          <span className="sk sk-thumb" />
          <span className="venue-text"><span className="sk sk-title" /><span className="sk sk-line" style={{ width: 120 }} /></span>
        </div>
      </div>
      <div className="card sk-card"><span className="sk sk-line" style={{ width: 90 }} /><span className="sk sk-money" /><span className="sk sk-line" style={{ width: 160 }} /></div>
      <div className="section">
        <div className="section-head"><span className="sk sk-line" style={{ width: 70 }} /></div>
        <div className="group">
          {[0, 1, 2, 3, 4].map((i) => (
            <div className="row sk-row" key={i} style={{ '--i': i }}>
              <span className="sk sk-dot" /><span className="row-body"><span className="sk sk-line" style={{ width: `${48 + ((i * 37) % 30)}%` }} /></span><span className="sk sk-price" />
            </div>
          ))}
        </div>
      </div>
      <p className="sr-only">Opening the bill…</p>
    </main>
  );
}

// ── Image viewer (receipt photo, payment QR) ──────────────
export function ImageViewer({ url, alt, onClose }) {
  const { rendered, closing, onExited } = usePresence(!!url);
  const [last, setLast] = useState(url);
  if (url && url !== last) setLast(url);
  useEffect(() => {
    if (!url) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.documentElement.classList.add('has-sheet');
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.classList.remove('has-sheet'); };
  }, [url, onClose]);
  if (!rendered) return null;
  return createPortal(
    <div className={`viewer ${closing ? 'is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={alt}
      onClick={onClose} onAnimationEnd={(e) => { if (e.target === e.currentTarget && closing) onExited(); }}>
      <img src={url || last} alt={alt} onClick={(e) => e.stopPropagation()} referrerPolicy="no-referrer" />
      <GlassIconButton label="Close" className="viewer-close" onClick={onClose} autoFocus>
        <CloseIcon size={18} strokeWidth={2.6} />
      </GlassIconButton>
    </div>,
    document.body,
  );
}

export { Button };
