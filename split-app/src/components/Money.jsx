// Money in SF Pro Rounded with tabular digits. When the value changes, each digit
// rolls through its column (the web cousin of .contentTransition(.numericText())).
// Screen readers get the plain formatted string.
import { formatMoney } from '../lib/format.js';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function Money({ value, currency, className = '', roll = true, as = 'span', prefix = '' }) {
  const Tag = as;
  const text = prefix + formatMoney(value, currency);
  if (!roll) return <Tag className={`money ${className}`}>{text}</Tag>;

  const chars = Array.from(text);
  return (
    <Tag className={`money is-rolling ${className}`}>
      <span className="sr-only">{text}</span>
      <span className="money-glyphs" aria-hidden="true">
        {chars.map((ch, i) => {
          // Key from the right so units stay units when the length changes (9.99 → 10.00).
          const key = chars.length - i;
          if (!/\d/.test(ch)) return <span key={`s${key}${ch}`} className="money-sym">{ch}</span>;
          return (
            <span key={`d${key}`} className="digit">
              <span className="digit-strip" style={{ '--d': Number(ch) }}>
                {DIGITS.map((d) => <span key={d}>{d}</span>)}
              </span>
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
