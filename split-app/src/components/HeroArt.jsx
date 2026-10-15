// The frosted-glass illustration family (public/art). Each piece arrives with a soft
// focus-pull, then floats on a slow breath above a contact shadow that tightens as
// it lifts — the HeroArt view on iOS. Still under reduced motion.
export function HeroArt({ name, size = 160, delay = 0, className = '', eager = false }) {
  return (
    <span className={`hero-art ${className}`} style={{ '--art': `${size}px`, '--art-delay': `${delay}ms` }} aria-hidden="true">
      <span className="hero-art-shadow" />
      <span className="hero-art-float">
        <picture>
          <source srcSet={`art/${name}-dark.webp`} media="(prefers-color-scheme: dark)" />
          <img src={`art/${name}.webp`} alt="" width={size} height={size}
            decoding="async" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} />
        </picture>
      </span>
    </span>
  );
}
