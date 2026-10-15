// Bottom sheet — the iOS .sheet with a grabber and drag-to-dismiss. Springs up from
// the bottom (transform only), dims the page behind, traps Esc, restores focus.
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from '../lib/motion.js';
import { GlassIconButton } from './Glass.jsx';
import { CloseIcon } from './Icons.jsx';

export function Sheet({ open, onClose, title, subtitle, children, footer, className = '' }) {
  const { rendered, closing, onExited } = usePresence(open);
  const panel = useRef(null);
  const titleId = useId();
  const drag = useRef(null);

  // Lock page scroll + remember focus while open.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const root = document.documentElement;
    root.classList.add('has-sheet');
    const t = setTimeout(() => panel.current?.focus({ preventScroll: true }), 30);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      root.classList.remove('has-sheet');
      window.removeEventListener('keydown', onKey);
      if (previous && previous.focus) previous.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!rendered) return null;

  // Drag-to-dismiss from the grabber/header zone.
  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest('button, a, input')) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    panel.current.style.transition = 'none';
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const raw = e.clientY - drag.current.y;
    // Rubber-band upward drags; follow downward ones 1:1.
    const dy = raw < 0 ? -Math.sqrt(-raw) * 2 : raw;
    drag.current.dy = raw;
    panel.current.style.transform = `translate3d(0, ${dy}px, 0)`;
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    const { dy, t } = drag.current;
    const v = dy / Math.max(1, performance.now() - t);
    drag.current = null;
    const el = panel.current;
    el.style.transition = '';
    if (dy > 120 || (dy > 30 && v > 0.6)) {
      el.style.transform = '';
      onClose();
    } else {
      el.style.transform = '';
    }
  };

  return createPortal(
    <div className={`sheet-layer ${closing ? 'is-closing' : ''}`}>
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        className={`sheet ${className}`}
        role="dialog" aria-modal="true" aria-labelledby={titleId}
        tabIndex={-1}
        onAnimationEnd={(e) => { if (e.target === e.currentTarget) onExited(); }}
      >
        <div className="sheet-head" onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <span className="sheet-grabber" aria-hidden="true" />
          <div className="sheet-titles">
            <h2 className="sheet-title" id={titleId}>{title}</h2>
            {subtitle && <p className="sheet-subtitle">{subtitle}</p>}
          </div>
          <GlassIconButton label="Close" onClick={onClose} className="sheet-close">
            <CloseIcon size={16} strokeWidth={2.6} />
          </GlassIconButton>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
