// Liquid Glass refraction — Chromium-only progressive enhancement.
//
// Every browser gets the base glass (backdrop blur + saturation, specular rim; see
// components.css). Chromium can additionally run an SVG filter as a backdrop-filter,
// so there we generate a displacement map for the element's exact rounded shape:
// pixels near the rim are pushed inward, bending whatever scrolls underneath like
// the edge of a lens. Safari/Firefox never see it (and couldn't render it).
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './motion.js';

let supported = null;
export const refractionSupported = () => {
  if (supported !== null) return supported;
  try {
    const chromium = !!navigator.userAgentData?.brands?.some((b) => /Chromium/i.test(b.brand));
    supported = chromium
      && CSS.supports('backdrop-filter', 'url(#a)')
      && !prefersReducedMotion()
      && !window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
  } catch { supported = false; }
  return supported;
};

let uid = 0;
const SVG_NS = 'http://www.w3.org/2000/svg';

const host = () => {
  let svg = document.getElementById('lg-filters');
  if (!svg) {
    svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('id', 'lg-filters');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    document.body.appendChild(svg);
  }
  return svg;
};

/** Displacement map for a w×h rounded rect: R/G encode the inward normal near the rim. */
const makeMap = (w, h, radius, bezel) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const r = Math.min(radius, w / 2, h / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Signed distance to the rounded-rect edge and the outward normal.
      const px = x + 0.5, py = y + 0.5;
      const cx = Math.min(Math.max(px, r), w - r);
      const cy = Math.min(Math.max(py, r), h - r);
      let dx = px - cx, dy = py - cy;
      let dist;
      const len = Math.hypot(dx, dy);
      if (len > 0) { dist = r - len; dx /= len; dy /= len; }
      else {
        const dl = px, dr = w - px, dt = py, db = h - py;
        dist = Math.min(dl, dr, dt, db);
        dx = dist === dl ? -1 : dist === dr ? 1 : 0;
        dy = dx !== 0 ? 0 : (dist === dt ? -1 : 1);
      }
      const t = Math.max(0, 1 - dist / bezel);
      const m = t * t * (3 - 2 * t);               // smoothstep falloff into the body
      const i = (y * w + x) * 4;
      img.data[i] = 128 - dx * m * 127;            // pull inward → lens-like edge
      img.data[i + 1] = 128 - dy * m * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
};

/**
 * Attach to a glass element. Re-generates the map when it resizes. Returns a ref.
 * `blur` and `saturate` are folded into the same backdrop-filter chain.
 */
export const useRefraction = ({ radius = 30, bezel = 18, scale = 34, blur = 9, saturate = 1.9 } = {}) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !refractionSupported()) return undefined;
    const id = `lg-${++uid}`;
    const svg = host();
    const filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('id', id);
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    filter.setAttribute('x', '0'); filter.setAttribute('y', '0');
    filter.setAttribute('width', '100%'); filter.setAttribute('height', '100%');
    filter.setAttribute('filterUnits', 'userSpaceOnUse');
    const feImage = document.createElementNS(SVG_NS, 'feImage');
    feImage.setAttribute('result', 'map');
    feImage.setAttribute('preserveAspectRatio', 'none');
    const disp = document.createElementNS(SVG_NS, 'feDisplacementMap');
    disp.setAttribute('in', 'SourceGraphic');
    disp.setAttribute('in2', 'map');
    disp.setAttribute('scale', String(scale));
    disp.setAttribute('xChannelSelector', 'R');
    disp.setAttribute('yChannelSelector', 'G');
    filter.append(feImage, disp);
    svg.appendChild(filter);

    let last = '';
    const apply = () => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      if (!w || !h || `${w}x${h}` === last) return;
      last = `${w}x${h}`;
      filter.setAttribute('width', String(w)); filter.setAttribute('height', String(h));
      feImage.setAttribute('width', String(w)); feImage.setAttribute('height', String(h));
      feImage.setAttribute('href', makeMap(w, h, radius, bezel));
      el.style.backdropFilter = `url(#${id}) blur(${blur}px) saturate(${saturate})`;
      el.classList.add('is-refracting');
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      filter.remove();
      el.style.backdropFilter = '';
      el.classList.remove('is-refracting');
    };
  }, [radius, bezel, scale, blur, saturate]);
  return ref;
};
