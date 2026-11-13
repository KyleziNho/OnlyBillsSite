// Copying to the clipboard from a tap. Browsers only allow a write while the tap is being
// handled, so `copyText` must be called straight from the click handler with a value that
// was worked out beforehand (never after an await).

const copyWithSelection = (text) => {
  try {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.fontSize = '16px';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
};

/**
 * Starts the write synchronously → Promise<boolean>. No clipboard API (older or in-app
 * browsers): the hidden-textarea copy runs in the same tap. When neither works the value
 * is still selectable text on the page, and the caller says so.
 */
export const copyText = (text) => {
  let pending = null;
  try { pending = navigator.clipboard?.writeText ? navigator.clipboard.writeText(text) : null; } catch { pending = null; }
  if (!pending) return Promise.resolve(copyWithSelection(text));
  return pending.then(() => true, () => copyWithSelection(text));
};
