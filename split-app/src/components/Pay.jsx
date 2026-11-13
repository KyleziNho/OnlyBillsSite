// Paying the host. One primary way to pay ("Pay Kyle £11.00") with one line on what the
// guest pays WITH ("Apple Pay or card · £11.00 filled in for you"). Never the host's bank
// name: guests read "via Monzo" as "I need Monzo" and stopped (Oct 2026). Then "Other ways
// to pay", and an optional payment QR.
//
// Three kinds of method (lib/payMethods.js decides which, from the host's document):
//  - link: a real anchor to the provider's https page (the form universal links need).
//  - copy: rows the guest copies into their own bank app (UK bank details, Zelle, Bizum,
//    IBAN…). Each tap copies exactly one value; an Amount row copies the bare number.
//  - pix:  a Pix "Copia e Cola" code built here from the guest's amount, plus a QR of the
//    same string on a desktop.
// A UK document (no `payment.methods`) renders exactly as it did before regional payouts.
import { useEffect, useState } from 'react';
import { payPlan, payeeOf } from '../lib/bill.js';
import { TEXT, ZELLE_NOTICE, fillText, iconFor, rateParts } from '../lib/payMethods.js';
import { localeDecimal, plainAmount } from '../lib/payText.js';
import { toMinor } from '../lib/money.js';
import { copyText } from '../lib/clipboard.js';
import { formatMoney, haptic } from '../lib/format.js';
import { guestLocale } from '../lib/locale.js';
import { Row, Section } from './Section.jsx';
import { ArrowUpRight, BankIcon, CardIcon, CheckIcon, CopyIcon, QrIcon } from './Icons.jsx';
import { HeroArt } from './HeroArt.jsx';

const BANK_PAY_WITH = 'Bank transfer from any banking app';
const BANK_CAPABILITY = 'From any banking app';
const TAP_TO_COPY = 'Tap a line to copy it.';

/** Card-friendly links show a card, not the host's bank logo. */
const usesCard = (opt) => iconFor(opt).type === 'card';

/** A brand's own logo; anything without one is the bank glyph on a tile. */
const Logo = ({ opt, size = 36 }) => {
  const icon = iconFor(opt);
  if (icon.type === 'logo') {
    return <img className="pay-logo" src={icon.src} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  }
  return <span className="pay-logo pay-card" aria-hidden="true"><BankIcon size={19} /></span>;
};

const MethodIcon = ({ opt }) => (usesCard(opt)
  ? <span className="pay-logo pay-card" aria-hidden="true"><CardIcon size={20} /></span>
  : <Logo opt={opt} />);

/** Methods the guest needs an account for say so before the amount note. */
const namesItself = (opt) => !usesCard(opt) && !!opt.capability;

export function PayOption({ opt, index, onOpen }) {
  return (
    <Row
      href={opt.url} target="_blank" rel="noopener noreferrer" index={index}
      className="pay-option" inset="leading"
      onClick={() => { haptic(6); onOpen?.(opt); }}
      leading={<MethodIcon opt={opt} />}
      title={opt.payWith}
      subtitle={namesItself(opt) && !opt.demoted ? `${opt.capability}. ${opt.note}` : opt.note}
      trailing={<span className="pay-go" aria-hidden="true"><ArrowUpRight size={15} strokeWidth={2.4} /></span>}
      aria-label={`${opt.payWith}. ${opt.note.replace(/\.$/, '')}. Opens a payment page.`}
    />
  );
}

/** "[card] Apple Pay or card · £11.00 filled in for you": what you pay with, never whose bank. */
function PayWithLine({ opt }) {
  const glyph = opt ? iconFor(opt).type : 'bank';
  const text = opt ? opt.payWith : BANK_PAY_WITH;
  // Copy methods carry their hint (or the reason they sit lower) under their rows instead.
  const note = !opt || opt.kind === 'copy' ? null : namesItself(opt) && !opt.demoted ? opt.capability : opt.note;
  return (
    <p className="pay-with">
      <span className="pay-with-icon" aria-hidden="true">{glyph === 'card' ? <CardIcon size={15} /> : glyph === 'bank' ? <BankIcon size={14} /> : <Logo opt={opt} size={16} />}</span>
      {/* A demoted method's reason already starts with its name ("Venmo only takes US
          dollars."): say it once, not "Venmo · Venmo only takes…". */}
      {opt?.demoted && note && note.startsWith(`${text} `)
        ? <span><strong>{text}</strong>{note.slice(text.length)}</span>
        : <span><strong>{text}</strong>{note ? <> · {note}</> : null}</span>}
    </p>
  );
}

/** "Number copied", "IBAN copied": what the toast calls a copied line. */
const copiedName = (label) => (label === 'Phone' ? 'Number' : label);

/** What a screen reader says: "Copy Zelle phone number: +14155550100", "Copy amount: €11.00". */
const copyAria = (r, i, owner) => {
  let name = r.label === 'Phone' ? 'phone number' : r.label === 'Email' ? 'email'
    : r.label === TEXT.amountLabel ? 'amount' : r.label;
  if (owner && i === 0 && r.label !== TEXT.amountLabel && !r.label.toLowerCase().includes(owner.toLowerCase())) {
    name = `${owner} ${name}`;
  }
  return `Copy ${name}: ${r.display}`;
};

/** Which row was just copied (for its "Copied" capsule), and the tap handler. */
function useCopy(onCopied) {
  const [hit, setHit] = useState(null);
  // Runs inside the tap: the value is already known, the write starts synchronously.
  const copy = (r, i) => {
    const done = copyText(r.copy);
    haptic(6);
    setHit(i);
    setTimeout(() => setHit((cur) => (cur === i ? null : cur)), 1400);
    done.then((ok) => onCopied?.(copiedName(r.label), ok));
  };
  return [hit, copy];
}

/** Copy rows: label, value, a "Copy" capsule that turns to "Copied". `r.copy` is what is copied. */
function CopyRows({ rows, hit, copy, owner }) {
  return rows.map((r, i) => (
    <Row key={i} index={i} onClick={() => copy(r, i)} className={`bank-row ${hit === i ? 'is-copied' : ''}`}
      aria-label={copyAria(r, i, owner)}
      trailing={
        <span className="copy-chip" aria-hidden="true">
          <span className="copy-state copy-idle"><CopyIcon size={15} />Copy</span>
          <span className="copy-state copy-done"><CheckIcon size={15} strokeWidth={2.8} />Copied</span>
        </span>
      }>
      <span className="bank-label">{r.label}</span>
      <span className="bank-value">{r.display}</span>
    </Row>
  ));
}

function BankRowsList({ rows, onCopied, owner }) {
  const [hit, copy] = useCopy(onCopied);
  return <CopyRows rows={rows} hit={hit} copy={copy} owner={owner} />;
}

/** The Amount row: shows the money, copies the bare number with the guest's decimal mark. */
const amountRow = (amount, currency) => ({
  label: TEXT.amountLabel,
  display: formatMoney(amount, currency),
  copy: plainAmount(toMinor(amount, currency), currency, localeDecimal()),
});

/** A copy method's rows, with the Amount row when the method has one. */
const copyRowsOf = (opt, amount, currency) => (opt.amountCopy != null ? [...opt.rows, amountRow(amount, currency)] : opt.rows);

/** UK bank details under "Other ways to pay": unchanged. */
export function BankDetails({ rows, onCopied, title = 'Bank transfer' }) {
  if (!rows.length) return null;
  return (
    <Section className="bank"
      title={<><BankIcon size={15} /> {title}</>}
      trailing={<span className="quiet">{BANK_CAPABILITY}</span>}
      footer={TAP_TO_COPY}>
      <BankRowsList rows={rows} onCopied={onCopied} />
    </Section>
  );
}

/** Any other copy method under "Other ways to pay": the same rows, its own hint beneath. */
function CopyDetails({ opt, amount, currency, onCopied }) {
  const bank = iconFor(opt).type === 'bank';
  const rows = opt.kind === 'pix'
    ? [{ label: 'Pix Copia e Cola', display: formatMoney(amount, currency), copy: opt.pixCode }, ...opt.rows]
    : copyRowsOf(opt, amount, currency);
  return (
    <Section className="bank wraps" title={<>{bank ? <BankIcon size={15} /> : <Logo opt={opt} size={18} />} {opt.label}</>}
      footer={opt.demoted ? opt.note : opt.hint}>
      <BankRowsList rows={rows} onCopied={onCopied} owner={opt.kind === 'pix' ? null : opt.label} />
    </Section>
  );
}

/** True on a desktop-sized screen with a mouse: not the phone the guest pays with. */
function useDesktop() {
  const query = '(hover: hover) and (pointer: fine) and (min-width: 720px)';
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq?.addEventListener) return undefined;
    const onChange = () => setDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return desktop;
}

/**
 * A QR of the Pix code, for scanning off a desktop screen. The encoder is bundled but only
 * loaded here; nothing leaves the page (the code holds the host's key).
 */
function PixQr({ code }) {
  const [qr, setQr] = useState(null);
  useEffect(() => {
    let cancelled = false;
    import('qrcode-generator').then(({ default: qrcode }) => {
      const q = qrcode(0, 'M');
      q.addData(code, 'Byte');
      q.make();
      const n = q.getModuleCount();
      let d = '';
      for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) if (q.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
      if (!cancelled) setQr({ code, size: n + 8, d });
    }).catch(() => { /* the copy button still works */ });
    return () => { cancelled = true; };
  }, [code]);
  if (!qr || qr.code !== code) return null;
  return (
    <figure className="pix-qr">
      <figcaption>Scan with your bank app</figcaption>
      <svg viewBox={`0 0 ${qr.size} ${qr.size}`} width="220" height="220" role="img" aria-label="Pix QR code" shapeRendering="crispEdges">
        <rect width={qr.size} height={qr.size} fill="#fff" />
        <path d={qr.d} fill="#000" />
      </svg>
    </figure>
  );
}

/**
 * "Copy number": the accent action; once used it steps back to "Copy number again". A method
 * that can't take the bill's currency is never the loud button (`quiet`): its reason leads.
 */
function PinnedCopy({ text, again, used, quiet = false, onClick }) {
  return (
    <button type="button" className={`btn ${used || quiet ? 'btn-quiet' : 'btn-accent'} pay-copy-btn`} onClick={onClick}>
      {used ? <CheckIcon size={17} strokeWidth={2.8} /> : <CopyIcon size={17} />}
      <span className="btn-label">{used ? again : text}</span>
    </button>
  );
}

/** A copy method leading the sheet: the rows are the action, plus one button for the identifier. */
function PrimaryCopy({ opt, label, amount, currency, onCopied }) {
  const [hit, copy] = useCopy(onCopied);
  const [used, setUsed] = useState(false);
  const rows = copyRowsOf(opt, amount, currency);
  const uk = opt.id === 'bank';
  return (
    <div className="pay-primary is-bank" data-method={opt.id}>
      <div className="pay-primary-head">
        <span className="pay-primary-title">{label}</span>
        <PayWithLine opt={uk ? null : opt} />
      </div>
      <Section className={uk ? 'bank' : 'bank wraps'} footer={uk ? TAP_TO_COPY : opt.demoted ? opt.note : opt.hint}>
        {/* Copying the identifier from its row counts as using the method, like the button. */}
        <CopyRows rows={rows} hit={hit} owner={uk ? null : opt.label} copy={(r, i) => { copy(r, i); if (i === 0 && opt.pinned) setUsed(true); }} />
      </Section>
      {opt.pinned && (
        <PinnedCopy text={opt.pinned} again={fillText(TEXT.again, { pinned: opt.pinned })} used={used} quiet={opt.demoted}
          onClick={() => { copy(rows[0], 0); setUsed(true); }} />
      )}
    </div>
  );
}

/** Pix leading the sheet: one button copies a code that already carries the amount. */
function PrimaryPix({ opt, label, onCopied }) {
  const [used, setUsed] = useState(false);
  const desktop = useDesktop();
  const copyCode = () => {
    const done = copyText(opt.pinnedCopy);
    haptic(6);
    setUsed(true);
    done.then((ok) => onCopied?.('Pix code', ok));
  };
  return (
    <div className="pay-primary is-bank is-pix" data-method={opt.id}>
      <div className="pay-primary-head">
        <span className="pay-primary-title">{label}</span>
        <PayWithLine opt={opt} />
      </div>
      {desktop && <PixQr code={opt.pixCode} />}
      <PinnedCopy text={opt.pinned} again={TEXT.pixAgain} used={used} onClick={copyCode} />
      <p className="pay-primary-note">{opt.hint}</p>
      <details className="pay-key">
        <summary className="text-btn small">{TEXT.useKey}</summary>
        <Section className="bank wraps">
          <BankRowsList rows={opt.rows} onCopied={onCopied} />
        </Section>
      </details>
    </div>
  );
}

/** The one primary way to pay. */
function PrimaryPay({ opt, amount, currency, payee, onCopied }) {
  const shown = formatMoney(amount, currency);
  const label = payee ? `Pay ${payee} ${shown}` : `Pay ${shown}`;
  if (opt.kind === 'pix') return <PrimaryPix opt={opt} label={label} onCopied={onCopied} />;
  // Bank transfer and the other copy methods lead with their details: they ARE the action.
  if (opt.kind === 'copy') return <PrimaryCopy opt={opt} label={label} amount={amount} currency={currency} onCopied={onCopied} />;
  const noteShown = !(namesItself(opt) && !opt.demoted);
  if (opt.demoted) {
    // Nothing on this host's list takes the bill's currency: say why first, and keep the
    // way to open it as a quiet button, never "Pay Kyle €22.22" (the amount isn't in it).
    const open = `Open ${opt.label}`;
    return (
      <div className="pay-primary is-demoted" data-method={opt.id}>
        <PayWithLine opt={opt} />
        <a className="btn btn-quiet pay-primary-btn" href={opt.url} target="_blank" rel="noopener noreferrer"
          onClick={() => haptic(8)} aria-label={`${open}. ${opt.note.replace(/\.$/, '')}. Opens a payment page.`}>
          <span className="btn-label">{open}</span>
          <ArrowUpRight size={17} strokeWidth={2.4} />
        </a>
      </div>
    );
  }
  return (
    <div className="pay-primary" data-method={opt.id}>
      <a className="btn btn-accent pay-primary-btn" href={opt.url} target="_blank" rel="noopener noreferrer"
        onClick={() => haptic(8)} aria-label={`${label}. ${opt.payWith}. ${opt.note.replace(/\.$/, '')}. Opens a payment page.`}>
        <span className="btn-label">{label}</span>
        <ArrowUpRight size={17} strokeWidth={2.4} />
      </a>
      <PayWithLine opt={opt} />
      {opt.amountCopy != null && (
        <Section className="bank" footer={noteShown ? null : opt.note}>
          <BankRowsList rows={[amountRow(amount, currency)]} onCopied={onCopied} />
        </Section>
      )}
    </div>
  );
}

/** "Other ways to pay" in order: runs of links share one group, each copy method has its own. */
const groupOthers = (others) => {
  const groups = [];
  others.forEach((o) => {
    const last = groups[groups.length - 1];
    if (o.kind === 'link' && last?.links) last.links.push(o);
    else groups.push(o.kind === 'link' ? { links: [o] } : { opt: o });
  });
  return groups;
};

/** Everything a guest needs to pay `amount`. */
export function PayMethods({ payment, amount, currency, reference, payee, onCopied, onOpenQr }) {
  const plan = payPlan(payment, { amount, currency, reference });
  const name = payeeOf(payment, payee);
  const qr = payment?.qrCodeUrl;
  if (!plan.primary && !qr) {
    return (
      <div className="card no-pay">
        <HeroArt name="payout" size={92} />
        <p><strong>{name ? `${name} hasn’t` : 'No one has'} added a way to pay yet.</strong>
          <br />Settle up in person or ask for their details.</p>
      </div>
    );
  }
  // The model's wording keeps {amount}; fill it once for everything on the sheet.
  const shown = { amount: formatMoney(amount, currency) };
  const filled = (o) => ({ ...o, note: fillText(o.note, shown) });
  const primary = plan.primary && filled(plan.primary);
  const others = plan.others.map(filled);
  // One Amount row is enough: links below only get one when the primary has not shown it.
  const amountShown = primary?.amountCopy != null;
  return (
    <>
      {primary && (
        <PrimaryPay key={primary.id} opt={primary} amount={amount} currency={currency} payee={name} onCopied={onCopied} />
      )}
      {others.length > 0 && (
        <div className="pay-others">
          <h2 className="pay-others-title">Other ways to pay</h2>
          {groupOthers(others).map((g) => (g.links ? (
            <Section className="pay-apps" key={g.links[0].id}>
              {g.links.map((o, i) => <PayOption key={o.id} opt={o} index={i} />)}
              {!amountShown && g.links.some((o) => o.amountCopy != null) && (
                <BankRowsList rows={[amountRow(amount, currency)]} onCopied={onCopied} />
              )}
            </Section>
          ) : g.opt.id === 'bank' ? (
            <BankDetails key="bank" rows={g.opt.rows} onCopied={onCopied} />
          ) : (
            <CopyDetails key={g.opt.id} opt={g.opt} amount={amount} currency={currency} onCopied={onCopied} />
          )))}
        </div>
      )}
      {qr && (
        <Section title="Scan to pay">
          <Row onClick={() => onOpenQr?.(qr)} inset="leading"
            leading={<img className="pay-logo pay-qr" src={qr} alt="" referrerPolicy="no-referrer" />}
            title={payment.qrCodeDescription || 'Payment QR code'} subtitle="Tap to enlarge"
            trailing={<QrIcon size={18} className="quiet" />} />
        </Section>
      )}
      {[primary, ...others].some((o) => o?.id === 'zelle') && (
        <p className="pay-legal">{ZELLE_NOTICE}</p>
      )}
    </>
  );
}

const rateMoney = (value, currency, digits, locale) => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits,
    }).format(Number(value));
  } catch {
    return `${currency} ${value}`;
  }
};
const currencyName = (code, locale) => {
  try { return new Intl.DisplayNames(locale, { type: 'currency' }).of(code) || code; } catch { return code; }
};
const rateDate = (iso, locale, month = 'short') => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
};

/** "£1 = ฿43.80 · rate from 13 Nov", "£1 = ฿44.00 · Kyle's rate". */
export function SettleRateLine({ settle, billCurrency, host }) {
  if (!settle) return null;
  const locale = guestLocale();
  const bill = String(billCurrency || 'GBP').toUpperCase();
  const other = settle.base === settle.cur ? bill : settle.cur;
  const parts = rateParts(settle.rate, settle.base, other);
  const digits = (parts.value.split('.')[1] || '').length;
  const text = `${rateMoney(1, parts.one, 0, locale)} = ${rateMoney(parts.value, parts.other, digits, locale)}`;
  const whose = host ? `${host}’s rate` : 'the host’s rate';
  const tail = settle.manual ? whose : settle.date ? `rate from ${rateDate(settle.date, locale)}` : null;
  const spoken = `1 ${currencyName(parts.one, locale)} is ${parts.value} ${currencyName(parts.other, locale)}`
    + (settle.manual ? `, ${whose}` : settle.date ? `, rate from ${rateDate(settle.date, locale, 'long')}` : '');
  return <p className="pay-rate" aria-label={spoken}>{tail ? `${text} · ${tail}` : text}</p>;
}
