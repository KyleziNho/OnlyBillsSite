// Paying the host. One big primary button for the host's default method ("Pay Kyle
// £11.00") and one line on what the guest pays WITH ("Card or Apple Pay · £11.00 filled in
// for you"). Never the host's bank name: guests read "via Monzo" as "I need Monzo" and
// stopped (Oct 2026). Then "Other ways to pay": the remaining links, titled the same way,
// and bank details ALWAYS (copy per line), plus an optional payment QR.
// Docs without `payment.defaultMethod` (older apps) lead with the first link, as before.
import { useState } from 'react';
import { bankRows, payPlan, payeeOf, CAPABILITY, PAY_WITH } from '../lib/bill.js';
import { formatMoney, haptic } from '../lib/format.js';
import { Row, Section } from './Section.jsx';
import { ArrowUpRight, BankIcon, CardIcon, CheckIcon, CopyIcon, QrIcon } from './Icons.jsx';
import { HeroArt } from './HeroArt.jsx';

const Logo = ({ opt, size = 36 }) => (opt.logo
  ? <img className="pay-logo" src={opt.logo} alt="" width={size} height={size} style={{ width: size, height: size }} />
  : <span className="pay-logo pay-mark" style={{ background: opt.tint, width: size, height: size }}>{opt.mark}</span>);

/** Card-friendly links show a card, not the host's bank logo. */
const usesCard = (opt) => opt.key === 'monzo' || opt.key === 'starling' || opt.key === 'revolut';

const MethodIcon = ({ opt }) => (usesCard(opt)
  ? <span className="pay-logo pay-card" aria-hidden="true"><CardIcon size={20} /></span>
  : <Logo opt={opt} />);

export function PayOption({ opt, index, onOpen }) {
  return (
    <Row
      href={opt.href} target="_blank" rel="noopener noreferrer" index={index}
      className="pay-option" inset="leading"
      onClick={() => { haptic(6); onOpen?.(opt); }}
      leading={<MethodIcon opt={opt} />}
      title={opt.payWith}
      subtitle={opt.key === 'paypal' || opt.key === 'venmo' ? `${opt.capability}. ${opt.note}` : opt.note}
      trailing={<span className="pay-go" aria-hidden="true"><ArrowUpRight size={15} strokeWidth={2.4} /></span>}
      aria-label={`${opt.payWith}. ${opt.note}. Opens a payment page.`}
    />
  );
}

/** "[card] Card or Apple Pay · £11.00 filled in for you": what you pay with, never whose bank. */
function PayWithLine({ opt }) {
  const card = !opt || usesCard(opt);
  const text = opt ? opt.payWith : `${PAY_WITH.bank} from any banking app`;
  const note = opt ? (opt.key === 'paypal' || opt.key === 'venmo' ? opt.capability : opt.note) : null;
  return (
    <p className="pay-with">
      <span className="pay-with-icon" aria-hidden="true">{card ? (opt ? <CardIcon size={15} /> : <BankIcon size={14} />) : <Logo opt={opt} size={16} />}</span>
      <span><strong>{text}</strong>{note ? <> · {note}</> : null}</span>
    </p>
  );
}

function useCopy(onCopied) {
  const [hit, setHit] = useState(null);
  const copy = async (r, i) => {
    let ok = true;
    try { await navigator.clipboard.writeText(r.value); }
    catch {
      // iOS in-app browsers sometimes block the async clipboard — fall back.
      try {
        const ta = Object.assign(document.createElement('textarea'), { value: r.value });
        ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove();
      } catch { ok = false; }
    }
    haptic(6);
    setHit(i);
    setTimeout(() => setHit((cur) => (cur === i ? null : cur)), 1400);
    onCopied?.(r.label, ok);
  };
  return [hit, copy];
}

function BankRowsList({ rows, onCopied }) {
  const [hit, copy] = useCopy(onCopied);
  return rows.map((r, i) => (
    <Row key={i} index={i} onClick={() => copy(r, i)} className={`bank-row ${hit === i ? 'is-copied' : ''}`}
      aria-label={`Copy ${r.label}: ${r.value}`}
      trailing={
        <span className="copy-chip" aria-hidden="true">
          <span className="copy-state copy-idle"><CopyIcon size={15} />Copy</span>
          <span className="copy-state copy-done"><CheckIcon size={15} strokeWidth={2.8} />Copied</span>
        </span>
      }>
      <span className="bank-label">{r.label}</span>
      <span className="bank-value">{r.value}</span>
    </Row>
  ));
}

export function BankDetails({ payment, onCopied, title = 'Bank transfer' }) {
  const rows = bankRows(payment);
  if (!rows.length) return null;
  return (
    <Section className="bank"
      title={<><BankIcon size={15} /> {title}</>}
      trailing={<span className="quiet">{CAPABILITY.bank}</span>}
      footer="Tap a line to copy it.">
      <BankRowsList rows={rows} onCopied={onCopied} />
    </Section>
  );
}

/** The one primary way to pay. */
function PrimaryPay({ plan, payment, amount, currency, payee, onCopied }) {
  const shown = formatMoney(amount, currency);
  const label = payee ? `Pay ${payee} ${shown}` : `Pay ${shown}`;
  if (plan.primary.kind === 'link') {
    const opt = plan.primary.opt;
    return (
      <div className="pay-primary" data-method={opt.key}>
        <a className="btn btn-accent pay-primary-btn" href={opt.href} target="_blank" rel="noopener noreferrer"
          onClick={() => haptic(8)} aria-label={`${label}. ${opt.payWith}. ${opt.note}. Opens a payment page.`}>
          <span className="btn-label">{label}</span>
          <ArrowUpRight size={17} strokeWidth={2.4} />
        </a>
        <PayWithLine opt={opt} />
      </div>
    );
  }
  // Bank transfer leads: the details ARE the action.
  return (
    <div className="pay-primary is-bank" data-method="bank">
      <div className="pay-primary-head">
        <span className="pay-primary-title">{label}</span>
        <PayWithLine opt={null} />
      </div>
      <Section className="bank" footer="Tap a line to copy it.">
        <BankRowsList rows={bankRows(payment)} onCopied={onCopied} />
      </Section>
    </div>
  );
}

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
  const hasOthers = plan.others.length > 0 || plan.bank;
  return (
    <>
      {plan.primary && (
        <PrimaryPay plan={plan} payment={payment} amount={amount} currency={currency} payee={name} onCopied={onCopied} />
      )}
      {hasOthers && (
        <div className="pay-others">
          <h2 className="pay-others-title">Other ways to pay</h2>
          {plan.others.length > 0 && (
            <Section className="pay-apps">
              {plan.others.map((o, i) => <PayOption key={o.key} opt={o} index={i} />)}
            </Section>
          )}
          {plan.bank && <BankDetails payment={payment} onCopied={onCopied} />}
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
    </>
  );
}
