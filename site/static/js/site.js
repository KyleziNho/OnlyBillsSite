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

  // Animated live table: plays once when it scrolls into view, with a replay button.
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('[data-live]').forEach((demo) => {
    const rows = $$('.ld-row', demo).sort((a, b) => a.dataset.at - b.dataset.at);
    const toasts = $$('.ld-toast', demo);
    const amts = $$('[data-amt]', demo);
    const meta = demo.querySelector('[data-meta]');
    const replay = demo.querySelector('.ld-replay');
    let timers = [];
    const setAmt = (v, bump) => amts.forEach((a) => {
      a.textContent = v;
      if (bump && a.classList.contains('ld-amt')) { a.classList.remove('bump'); void a.offsetWidth; a.classList.add('bump'); }
    });
    const finish = () => { rows.forEach((r) => r.classList.add('on')); setAmt('£22.22'); meta.textContent = '3 items · 1 shared · incl. £2.47 extras'; };
    const play = () => {
      timers.forEach(clearTimeout); timers = [];
      rows.forEach((r) => r.classList.remove('on')); toasts.forEach((t) => t.classList.remove('show'));
      setAmt('£0.00'); meta.textContent = 'Tap what you had'; if (replay) replay.hidden = true;
      const at = (ms, fn) => timers.push(setTimeout(fn, ms));
      rows.forEach((r) => at(+r.dataset.at, () => { r.classList.add('on'); if (r.dataset.share) setAmt(r.dataset.share, true); }));
      toasts.forEach((t) => { at(+t.dataset.at, () => t.classList.add('show')); at(+t.dataset.at + 2200, () => t.classList.remove('show')); });
      at(5000, () => { setAmt('£22.22', true); meta.textContent = '3 items · 1 shared · incl. £2.47 extras'; });
      at(8400, () => { if (replay) replay.hidden = false; });
    };
    if (reduce || capture) { finish(); return; }
    if (replay) replay.addEventListener('click', play);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); play(); } }, { threshold: 0.45 });
      io.observe(demo);
    } else play();
  });

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
