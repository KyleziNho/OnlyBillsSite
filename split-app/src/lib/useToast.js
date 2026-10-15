// One toast at a time — a glass pill above the CTA (see Toast in components/Chrome.jsx).
import { useCallback, useEffect, useRef, useState } from 'react';

/** One toast at a time: a glass pill floating just above the CTA. */
export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const seq = useRef(0);
  const show = useCallback((text, opts = {}) => {
    clearTimeout(timer.current);
    seq.current += 1;
    setToast({ text, id: seq.current, ...opts });
    timer.current = setTimeout(() => setToast(null), opts.duration || 2600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [toast, show];
}
