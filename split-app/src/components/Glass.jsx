// Floating chrome. Glass is for things that hover over content (the CTA tray, the
// compact header, toasts, sheet close buttons) — never for content itself.
import { useRefraction } from '../lib/glass.js';

/** The pinned bottom action tray: fades the page out beneath, floats a glass tray
 *  holding the one primary capsule. Sticky, so it lives inside the column on desktop
 *  and always clears the home indicator. */
export function GlassBar({ children, note, className = '' }) {
  const ref = useRefraction({ radius: 34 });
  return (
    <div className={`glassbar-dock ${className}`}>
      <div className="glassbar glass" ref={ref}>
        {note && <div className="glassbar-note">{note}</div>}
        {children}
      </div>
    </div>
  );
}

/** Full-width capsule. `tone`: accent | positive | quiet. */
export function Button({ children, tone = 'accent', className = '', icon, ...rest }) {
  return (
    <button type="button" className={`btn btn-${tone} ${className}`} {...rest}>
      {icon}
      <span className="btn-label">{children}</span>
    </button>
  );
}

/** Round glass icon button (sheet close, image viewer). */
export function GlassIconButton({ children, label, className = '', ...rest }) {
  return (
    <button type="button" className={`glass-icon glass ${className}`} aria-label={label} {...rest}>
      {children}
    </button>
  );
}
