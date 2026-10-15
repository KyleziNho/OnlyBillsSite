// People are faces. Same rule as AvatarView on iOS (SplitSwift/Design/PersonAvatar.swift):
// a face from the 24 — the table's distinct assignment (FacesProvider, keyed by guest id)
// or, outside a table, the face the person's name hashes to (src/lib/faces.js, the same
// function iOS runs) — and only without any identity, a monogram: the person's colour as
// a soft top-lit gradient, white rounded initials. Stacks overlap FaceTime-style.
import { createContext, useContext, useState } from 'react';
import { isPageSettled } from '../lib/motion.js';
import { faceKey, faceUrl, preferredFace } from '../lib/faces.js';

const EMOJI_START = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)/u;

const initialsFor = (name) => {
  const n = String(name || '').trim();
  const emoji = n.match(EMOJI_START);
  if (emoji) return { emoji: true, text: emoji[0] };
  const letters = n.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((p) => Array.from(p)[0]?.toUpperCase() || '').join('');
  return { emoji: false, text: letters };
};

/** id → face id ("blue-1") for everyone at one table / on one bill. */
const FacesContext = createContext(null);
export const FacesProvider = FacesContext.Provider;

/** Images that failed to load this session — never retried, initials instead. */
const broken = new Set();

export function Avatar({ id, name, color, size = 40, ring = false, pop = false, face, className = '', title }) {
  // Pop only when the avatar *arrives* after the page has settled (a new claim,
  // someone joining) — never on first paint.
  const [arriving] = useState(() => pop && isPageSettled());
  const faces = useContext(FacesContext);
  const key = faceKey({ name, id });
  const resolved = face || (id != null && faces?.[id]) || (key ? preferredFace(key) : null);
  const [failed, setFailed] = useState(() => (resolved ? broken.has(resolved) : false));
  const showFace = resolved && !failed && !broken.has(resolved);
  const { emoji, text } = initialsFor(name);
  return (
    <span
      className={`avatar ${showFace ? 'is-face' : ''} ${!showFace && emoji ? 'is-emoji' : ''} ${ring ? 'is-ringed' : ''} ${arriving ? 'is-arriving' : ''} ${className}`}
      style={{ '--av': color, '--av-size': `${size}px` }}
      title={title}
      aria-hidden="true"
    >
      {showFace ? (
        <img
          className="avatar-face"
          src={faceUrl(resolved)}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => { broken.add(resolved); setFailed(true); }}
        />
      ) : text ? <span className="avatar-text">{text}</span> : (
        <svg viewBox="0 0 24 24" className="avatar-silhouette" aria-hidden="true">
          <circle cx="12" cy="9" r="4.2" fill="currentColor" />
          <path d="M4.5 21c.9-4 3.9-6 7.5-6s6.6 2 7.5 6z" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}

/** Overlapping faces. Shows up to `limit`, then "+n". */
export function AvatarStack({ people, size = 22, limit = 4, pop = true, label }) {
  const shown = people.slice(0, limit);
  const extra = people.length - shown.length;
  return (
    <span className="avatar-stack" style={{ '--av-size': `${size}px`, '--overlap': `${Math.round(size * (size < 32 ? 0.22 : 0.26))}px` }}
      role={label ? 'img' : undefined} aria-label={label}>
      {shown.map((p) => (
        <Avatar key={p.id} id={p.id} name={p.name} color={p.color} face={p.face} size={size} ring pop={pop} />
      ))}
      {extra > 0 && <span className="avatar avatar-more is-ringed" aria-hidden="true">+{extra}</span>}
    </span>
  );
}
