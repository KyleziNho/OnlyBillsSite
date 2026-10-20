// Small progressive enhancements. Every page works without this file.
(() => {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Mobile menu
  const btn = document.querySelector('.menu-btn');
  const menu = document.getElementById('mobile-nav');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    });
  }

  // Reveal sections once as they scroll in (?capture shows everything at once, for screenshots)
  const els = $$('.reveal');
  const capture = location.search.includes('capture');
  if (capture) $$('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
  if (!capture && 'IntersectionObserver' in window && els.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach((el) => io.observe(el));
  } else {
    els.forEach((el) => el.classList.add('in'));
  }

  // Copy link / native share
  $$('[data-share]').forEach((b) => b.addEventListener('click', async () => {
    const url = location.href.split('#')[0];
    const label = b.querySelector('span');
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: b.dataset.title, url }); return; }
      await navigator.clipboard.writeText(url);
      if (label) { label.textContent = 'Copied'; setTimeout(() => { label.textContent = 'Copy link'; }, 1800); }
    } catch { /* cancelled */ }
  }));

  // Article filters on /blog/
  const grid = document.querySelector('[data-filterable]');
  const fb = $$('[data-filter]');
  if (grid && fb.length) {
    fb.forEach((b) => b.addEventListener('click', () => {
      fb.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const cat = b.dataset.filter;
      $$('[data-cat]', grid).forEach((c) => { c.hidden = !!cat && c.dataset.cat !== cat; });
    }));
  }
})();
