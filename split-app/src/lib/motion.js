// Motion plumbing. Everything animates with CSS (transform/opacity on the
// compositor); JS only decides *when*. View Transitions morph whole-state swaps
// (join → table, unpaid → paid) where the browser supports them.
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

const media = (q) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null);

export const prefersReducedMotion = () => !!media('(prefers-reduced-motion: reduce)')?.matches;

/**
 * Run a React state update inside a View Transition (cross-fade + morph of any
 * element with a view-transition-name). Falls back to an instant update.
 */
export const withViewTransition = (update) => {
  if (typeof document === 'undefined' || !document.startViewTransition || prefersReducedMotion()) {
    update();
    return;
  }
  try {
    document.startViewTransition(() => flushSync(update));
  } catch {
    update();
  }
};

/**
 * Keeps an element mounted while it animates out. `closing` is true for the exit
 * run; call `onExited` from onAnimationEnd to unmount.
 */
export const usePresence = (open) => {
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) setRendered(true);
  return {
    rendered: rendered || open,
    closing: rendered && !open,
    onExited: () => { if (!open) setRendered(false); },
  };
};

/** True once the first paint has settled — lets mount animations (avatar pops)
 *  play only for things that *arrive*, not for the initial page. */
let pageSettled = false;
if (typeof window !== 'undefined') setTimeout(() => { pageSettled = true; }, 1200);
export const isPageSettled = () => pageSettled;

/** Live `navigator.onLine`. */
export const useOnline = () => {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return online;
};
