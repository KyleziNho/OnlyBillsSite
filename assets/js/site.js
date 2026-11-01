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

  // Real app recordings: light or dark file, loaded only when visible, played once.
  const scheme = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const loadVideo = (v, name) => {
    const m = scheme();
    v.poster = `/assets/video/${name}-${m}-poster.jpg`;
    v.innerHTML = `<source src="/assets/video/${name}-${m}.webm" type="video/webm"><source src="/assets/video/${name}-${m}.mp4" type="video/mp4">`;
    v.dataset.loaded = name; v.load();
  };
  const tryPlay = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const visible = (el, on, off) => {
    if (!('IntersectionObserver' in window)) { on(); return; }
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? on() : off && off())), { threshold: 0.5 }).observe(el);
  };
  $$('video[data-video]:not([data-hiw-video])').forEach((v) => {
    const name = v.dataset.video;
    const replay = v.parentElement.querySelector('.vid-replay');
    v.poster = `/assets/video/${name}-${scheme()}-poster.jpg`;
    if (capture) return;
    if (replay) replay.addEventListener('click', () => { if (v.dataset.loaded !== name) loadVideo(v, name); v.currentTime = 0; replay.hidden = true; tryPlay(v); });
    v.addEventListener('ended', () => { if (replay) replay.hidden = false; });
    if (reduce) { if (replay) replay.hidden = false; return; }
    let played = false;
    visible(v, () => { if (!played) { played = true; loadVideo(v, name); tryPlay(v); } else if (!v.ended) tryPlay(v); }, () => v.pause());
  });
  $$('[data-hiw]').forEach((box) => {
    const steps = $$('.hiw-step', box);
    const v = box.querySelector('video');
    const replay = box.querySelector('.vid-replay');
    let i = 0;
    const show = (k, play = true) => {
      i = k;
      steps.forEach((b, j) => { b.classList.toggle('on', j === k); b.setAttribute('aria-pressed', String(j === k)); b.style.setProperty('--p', '0'); });
      if (replay) replay.hidden = true;
      loadVideo(v, steps[k].dataset.step);
      if (play) tryPlay(v);
    };
    v.poster = `/assets/video/${steps[0].dataset.step}-${scheme()}-poster.jpg`;
    if (capture) return;
    // Progress bar: read the playhead every frame (timeupdate only fires about 4 times a second).
    let raf = 0;
    const tick = () => { if (v.duration) steps[i].style.setProperty('--p', String(v.currentTime / v.duration)); if (!v.paused && !v.ended) raf = requestAnimationFrame(tick); };
    v.addEventListener('play', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); });
    v.addEventListener('pause', () => cancelAnimationFrame(raf));
    v.addEventListener('ended', () => { steps[i].style.setProperty('--p', '1'); if (i < steps.length - 1) show(i + 1); else if (replay) replay.hidden = false; });
    steps.forEach((b, k) => b.addEventListener('click', () => show(k)));
    if (replay) replay.addEventListener('click', () => show(0));
    if (reduce) { if (replay) replay.hidden = false; return; }
    let started = false;
    visible(box, () => { if (!started) { started = true; show(0); } else if (!v.ended) tryPlay(v); }, () => v.pause());
  });


  // Hero film: HTML captions and progress dots follow the video; plays only while on screen.
  $$('[data-film]').forEach((stage) => {
    const v = stage.querySelector('video');
    const caps = $$('.stage-caps li', stage);
    const dots = $$('.stage-dots button', stage);
    const pause = stage.querySelector('[data-pause]');
    const seg = caps.map((li) => [+li.dataset.start, +li.dataset.end]);
    let cur = 0, raf = 0, userPaused = reduce;
    const set = (k) => {
      if (k === cur) return;
      cur = k;
      caps.forEach((li, j) => li.classList.toggle('on', j === k));
      dots.forEach((d, j) => { if (j === k) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
    };
    const tick = () => {
      const t = v.currentTime;
      let k = seg.findIndex(([a, b]) => t >= a && t < b);
      if (k < 0) k = seg.length - 1;
      set(k);
      const [a, b] = seg[k];
      dots[k].querySelector('i').style.setProperty('--p', String(Math.min(1, (t - a) / (b - a))));
      if (!v.paused) raf = requestAnimationFrame(tick);
    };
    const setPaused = (p) => {
      stage.classList.toggle('paused', p);
      pause.setAttribute('aria-label', p ? 'Play the film' : 'Pause the film');
    };
    const play = () => { const r = v.play(); if (r && r.catch) r.catch(() => setPaused(true)); };
    v.addEventListener('play', () => { setPaused(false); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); });
    v.addEventListener('pause', () => { cancelAnimationFrame(raf); tick(); });
    dots.forEach((d, k) => d.addEventListener('click', () => { v.currentTime = seg[k][0] + 0.01; tick(); if (!userPaused) play(); }));
    pause.addEventListener('click', () => { userPaused = !v.paused ? true : false; if (userPaused) { v.pause(); setPaused(true); } else play(); });
    if (capture) { v.currentTime = 11.6; return; }
    if (reduce) { setPaused(true); return; }
    visible(stage, () => { if (!userPaused) play(); }, () => v.pause());
  });

  // Chats: messages arrive one by one with typing dots, like the app's welcome screen.
  // Plays once when it scrolls into view; Reduce Motion and ?capture show the whole thread.
  $$('[data-chat]').forEach((chat) => {
    const msgs = $$('[data-msg]', chat);
    const notifs = $$('[data-notif]', chat);
    const typing = chat.querySelector('[data-typing-row]');
    const replay = chat.querySelector('.chat-replay');
    const speed = +(chat.dataset.chatSpeed || 1);
    let timers = [];
    const showAll = () => { msgs.forEach((m) => m.classList.add('show')); notifs.forEach((n, j) => { n.classList.add('show'); n.dataset.depth = String(notifs.length - 1 - j); }); };
    if (reduce || capture) { showAll(); return; }
    const run = () => {
      timers.forEach(clearTimeout); timers = [];
      msgs.forEach((m) => m.classList.remove('show')); notifs.forEach((n) => { n.classList.remove('show'); delete n.dataset.depth; });
      if (replay) replay.hidden = true;
      let t = 300;
      const at = (ms, fn) => timers.push(setTimeout(fn, ms));
      msgs.forEach((m) => {
        const typ = +m.dataset.typing * speed;
        const sent = m.classList.contains('sent');
        t += (sent ? 700 : 380) * speed;
        if (typ && typing) {
          at(t, () => { typing.hidden = false; typing.classList.remove('show'); void typing.offsetWidth; });
          t += typ;
          at(t, () => { typing.hidden = true; });
        } else t += typ * 0.4;
        at(t, () => m.classList.add('show'));
      });
      notifs.forEach((n, k) => { t += 900; at(t, () => { n.classList.add('show'); notifs.forEach((o, j) => { if (j <= k) o.dataset.depth = String(k - j); }); }); });
      at(t + 1600, () => { if (replay) replay.hidden = false; });
    };
    if (replay) replay.addEventListener('click', run);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); run(); } }, { threshold: 0.4 });
      io.observe(chat);
    } else showAll();
  });

  // Looping decorative films (the closing Orbit): load near the viewport, wide or narrow file.
  $$('video[data-lazy-loop]').forEach((v) => {
    const narrow = matchMedia('(max-width: 699px)').matches;
    const base = narrow ? v.dataset.srcNarrow : v.dataset.srcWide;
    v.poster = base + '-poster.jpg';
    if (capture || reduce) return;
    let loaded = false;
    visible(v, () => {
      if (!loaded) { loaded = true; v.innerHTML = `<source src="${base}.webm" type="video/webm"><source src="${base}.mp4" type="video/mp4">`; v.load(); }
      tryPlay(v);
    }, () => v.pause());
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
