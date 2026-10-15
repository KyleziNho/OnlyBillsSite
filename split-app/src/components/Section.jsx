// Inset grouped surfaces (DSSection / DSRow on iOS): a quiet sentence-case header,
// rows in one rounded container, hairlines inset to the text.

export function Section({ title, trailing, footer, children, className = '', id, style, labelId }) {
  return (
    <section className={`section ${className}`} id={id} style={style} aria-labelledby={title ? labelId : undefined}>
      {(title || trailing) && (
        <header className="section-head">
          {title && <h2 className="section-title" id={labelId}>{title}</h2>}
          {trailing && <div className="section-trailing">{trailing}</div>}
        </header>
      )}
      <div className="group">{children}</div>
      {footer && <p className="section-foot">{footer}</p>}
    </section>
  );
}

/**
 * A grouped row. Renders a <button>, <a> or <div> depending on props; leading /
 * trailing slots; title + subtitle. `index` drives the staggered reveal.
 */
export function Row({
  leading, title, subtitle, trailing, onClick, href, className = '', index, inset = 'text',
  as, children, ...rest
}) {
  const Tag = as || (href ? 'a' : onClick ? 'button' : 'div');
  const props = Tag === 'button' ? { type: 'button', onClick } : Tag === 'a' ? { href, onClick } : {};
  return (
    <Tag className={`row ${onClick || href ? 'is-tappable' : ''} inset-${inset} ${className}`}
      style={index != null ? { '--i': index } : undefined} {...props} {...rest}>
      {leading && <span className="row-leading">{leading}</span>}
      <span className="row-body">
        {title != null && <span className="row-title">{title}</span>}
        {subtitle != null && subtitle !== false && <span className="row-sub">{subtitle}</span>}
        {children}
      </span>
      {trailing != null && <span className="row-trailing">{trailing}</span>}
    </Tag>
  );
}
