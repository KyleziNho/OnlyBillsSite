// The guest's locale: how money LOOKS on this device ("R$ 11,00", "11,00 €", "$11.00").
// It never changes what the bill is in: the currency always comes from the bill. One place,
// so the shown amount and the copied Amount row always agree on the decimal mark.
// Tests (and anything else that needs a fixed rendering) pin it with setGuestLocale().

const FALLBACK = 'en-GB';
let pinned = null;
let detected = null;

/** The first browser language Intl can format money in, else en-GB. */
const detect = () => {
  try {
    const nav = typeof navigator === 'undefined' ? null : navigator;
    const wanted = [...(nav?.languages || []), nav?.language].filter((l) => typeof l === 'string' && l);
    for (const l of wanted) {
      try {
        const [ok] = Intl.NumberFormat.supportedLocalesOf(l);
        if (ok) return ok;
      } catch { /* malformed tag: try the next one */ }
    }
  } catch { /* odd navigator or Intl: use the fallback */ }
  return FALLBACK;
};

/** BCP 47 tag money is formatted for ("pt-BR"). */
export const guestLocale = () => pinned || (detected ??= detect());

/** Pins the locale (tests, previews); null goes back to the browser's. */
export const setGuestLocale = (locale) => {
  pinned = locale || null;
  detected = null;
};

/** The guest's decimal mark: "," for pt-BR or de-DE, "." for en-GB or en-US. */
export const decimalMark = (locale = guestLocale()) => {
  try {
    return new Intl.NumberFormat(locale).formatToParts(1.1).find((p) => p.type === 'decimal')?.value || '.';
  } catch { return '.'; }
};
