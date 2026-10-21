// The free calculators. All money goes through money.js, the same engine as the app and
// the guest page (copied in at build time), so every share is exact to the penny.
import { splitBill, parseAmount, largestRemainderInt } from './money.js';
import { assignFaces, faceKey } from './faces.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const fmt = (minor) => gbp.format((minor || 0) / 100);
const toMinor = (text) => {
  const v = parseAmount(String(text ?? ''), 'GBP');
  return v == null || !Number.isFinite(v) || v < 0 ? 0 : Math.round(v * 100);
};
const escH = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const faceImg = (id, size) => (id ? `<img class="face" style="--size:${size}px" src="/assets/faces/${id}.webp" width="${size}" height="${size}" alt="">` : '');
const facesOf = (names) => assignFaces(names.map((n, i) => ({ key: faceKey({ name: n.trim() || 'Person ' + (i + 1) }) })));
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };

function segment(root, onChange) {
  const btns = $$('button', root);
  btns.forEach((b) => b.addEventListener('click', () => {
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    onChange(b.dataset.v ?? b.dataset.mode);
  }));
  const on = btns.find((b) => b.getAttribute('aria-pressed') === 'true');
  return on ? on.dataset.v ?? on.dataset.mode : null;
}

async function copy(text, btn) {
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text);
    const old = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = old; }, 1600);
  } catch { /* cancelled */ }
}

// ── Split the bill ──────────────────────────────────────
function splitTool(root) {
  const KEY = 'ob-split-v1';
  const initial = {
    mode: 'items',
    people: ['Sam', 'Priya', 'Jon', 'Maya'],
    items: [
      { name: 'Chicken ruby', price: '12.90', who: [0] },
      { name: 'Mango lassi', price: '5.50', who: [0] },
      { name: 'Paneer tikka', price: '11.50', who: [1] },
      { name: 'Lamb biryani', price: '14.50', who: [2] },
      { name: 'Two beers', price: '10.20', who: [2] },
      { name: 'Salad', price: '5.30', who: [3] },
      { name: 'Garlic naan and rice', price: '15.30', who: [1, 2, 3] },
    ],
    service: '12.5', tip: '', disc: '',
  };
  const st = { ...initial, ...(load(KEY) || {}) };
  const peopleEl = $('[data-people]', root);
  const itemsEl = $('[data-items]', root);
  const result = $('[data-result]', root);

  const persist = () => save(KEY, st);

  function drawPeople() {
    const faces = facesOf(st.people);
    peopleEl.innerHTML = st.people.map((n, i) => `<div class="person-row">${faceImg(faces[i], 36)}<input class="input" aria-label="Person ${i + 1} name" data-pi="${i}" value="${escH(n)}" placeholder="Name"><button class="iconbtn" type="button" data-pdel="${i}" aria-label="Remove ${escH(n || 'person')}" ${st.people.length <= 1 ? 'disabled' : ''}>×</button></div>`).join('')
      + `<button class="addbtn" type="button" data-padd>Add person</button>`;
  }
  function drawItems() {
    const faces = facesOf(st.people);
    itemsEl.innerHTML = st.items.map((it, i) => `<div class="item-row">
      <div class="item-top"><input class="input" aria-label="Item ${i + 1}" data-iname="${i}" value="${escH(it.name)}" placeholder="Item"><input class="input money-in" aria-label="Price of ${escH(it.name || 'item')}" inputmode="decimal" data-iprice="${i}" value="${escH(it.price)}" placeholder="£0.00"><button class="iconbtn" type="button" data-idel="${i}" aria-label="Remove ${escH(it.name || 'item')}">×</button></div>
      <div class="who" role="group" aria-label="Who had ${escH(it.name || 'this')}">${st.people.map((n, p) => `<button type="button" data-who="${i}:${p}" aria-pressed="${it.who.includes(p)}">${faceImg(faces[p], 26)}${escH(n || 'Person ' + (p + 1))}</button>`).join('')}</div>
    </div>`).join('') + `<button class="addbtn" type="button" data-iadd>Add item</button>`;
  }

  function compute() {
    const service = Number(st.service) || 0;
    const charges = [];
    const disc = toMinor(st.disc);
    if (disc) charges.push({ name: 'Discount', kind: 'discount', amount: -disc });
    if (service) charges.push({ name: `Service ${service}%`, kind: 'service', amount: 0, percent: service });
    const tip = toMinor(st.tip);
    if (tip) charges.push({ name: 'Tip', kind: 'tip', amount: tip });

    if (st.mode === 'equal') {
      const total = toMinor($('#eq-total', root).value);
      const n = Math.max(1, Math.min(200, parseInt($('#eq-people', root).value, 10) || 1));
      const bill = { lines: [{ id: 'all', name: 'Bill', amount: total, quantity: n }], charges };
      const alloc = [Object.fromEntries(Array.from({ length: n }, (_, p) => [p, 1]))];
      const r = splitBill(bill, n, alloc);
      const amounts = r.parties.map((x) => x.total);
      const groups = new Map();
      amounts.forEach((a) => groups.set(a, (groups.get(a) || 0) + 1));
      const rows = [...groups.entries()].sort((a, b) => b[0] - a[0]);
      result.innerHTML = `<span class="quiet">Each person pays</span>
        <div class="hero-money">${fmt(Math.max(...amounts))}</div>
        ${rows.length > 1 ? `<p class="foot">${rows.map(([a, c]) => `${c} ${c === 1 ? 'person pays' : 'people pay'} ${fmt(a)}`).join(', ')}, so it adds up exactly.</p>` : ''}
        <div class="group">${r.math.chargeMinor.map((c, k) => `<div class="row"><span class="row-body">${escH(charges[k].name)}</span><span class="money">${fmt(c)}</span></div>`).join('')}<div class="row"><span class="row-body"><b>Total</b></span><span class="money"><b>${fmt(r.total)}</b></span></div></div>
        <span class="ok">✓ Adds up to ${fmt(r.total)}</span>
        <button class="btn btn-secondary" type="button" data-copy>Copy for the group chat</button>`;
      $('[data-copy]', result).addEventListener('click', (e) => copy(`Bill ${fmt(r.total)} split ${n} ways: ${rows.map(([a, c]) => (rows.length > 1 ? `${c} × ${fmt(a)}` : fmt(a) + ' each')).join(', ')}.\nWorked out at onlybills.app/tools/split-bill-calculator`, e.currentTarget));
      return;
    }

    const n = st.people.length;
    const lines = st.items.map((it, i) => ({ id: 'l' + i, name: it.name || 'Item', amount: toMinor(it.price), quantity: 1 }));
    const alloc = st.items.map((it) => Object.fromEntries(it.who.filter((p) => p < n).map((p) => [p, 1 / it.who.filter((q) => q < n).length])));
    const r = splitBill({ lines, charges }, n, alloc);
    const faces = facesOf(st.people);
    const sumParties = r.parties.reduce((s, x) => s + x.total, 0);
    const names = st.people.map((x, i) => x.trim() || 'Person ' + (i + 1));
    result.innerHTML = `<span class="quiet">Total bill</span>
      <div class="hero-money">${fmt(r.total)}</div>
      ${r.math.chargeMinor.length ? `<p class="foot">${r.math.chargeMinor.map((c, k) => `${escH(charges[k].name)} ${fmt(c)}`).join(' · ')}</p>` : ''}
      <div class="group">${r.parties.map((x, p) => `<div class="row" style="--sep-inset:68px">${faceImg(faces[p], 36)}<span class="row-body"><span class="row-title">${escH(names[p])}</span><span class="row-sub">${x.lines.filter(Boolean).length} item${x.lines.filter(Boolean).length === 1 ? '' : 's'}${x.total - x.subtotal ? ` · incl. ${fmt(x.total - x.subtotal)} extras` : ''}</span></span><span class="money" style="font-weight:600">${fmt(x.total)}</span></div>`).join('')}</div>
      ${r.unassigned.total > 0 ? `<p class="foot" style="color:var(--negative-text)">${fmt(r.unassigned.total)} isn’t assigned to anyone yet. Tap who had each item.</p>` : `<span class="ok">✓ Adds up to ${fmt(sumParties)}</span>`}
      <button class="btn btn-secondary" type="button" data-copy>Copy for the group chat</button>`;
    $('[data-copy]', result).addEventListener('click', (e) => copy(`Bill ${fmt(r.total)}:\n${r.parties.map((x, p) => `${names[p]}: ${fmt(x.total)}`).join('\n')}\nWorked out at onlybills.app/tools/split-bill-calculator`, e.currentTarget));
  }

  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.pi != null) { st.people[+t.dataset.pi] = t.value; drawItemsKeepFocus(); }
    else if (t.dataset.iname != null) st.items[+t.dataset.iname].name = t.value;
    else if (t.dataset.iprice != null) st.items[+t.dataset.iprice].price = t.value;
    else if (t.id === 'x-tip') st.tip = t.value;
    else if (t.id === 'x-disc') st.disc = t.value;
    persist(); compute();
  });
  // Renaming a person redraws the chips but must not steal focus from the name field.
  function drawItemsKeepFocus() { drawItems(); }
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    if (b.dataset.padd != null) { st.people.push(''); drawPeople(); drawItems(); $$('[data-pi]', root).at(-1)?.focus(); }
    else if (b.dataset.pdel != null) {
      const i = +b.dataset.pdel; st.people.splice(i, 1);
      st.items.forEach((it) => { it.who = it.who.filter((p) => p !== i).map((p) => (p > i ? p - 1 : p)); });
      drawPeople(); drawItems();
    } else if (b.dataset.iadd != null) { st.items.push({ name: '', price: '', who: [] }); drawItems(); $$('[data-iname]', root).at(-1)?.focus(); }
    else if (b.dataset.idel != null) { st.items.splice(+b.dataset.idel, 1); drawItems(); }
    else if (b.dataset.who) {
      const [i, p] = b.dataset.who.split(':').map(Number);
      const w = st.items[i].who; const k = w.indexOf(p);
      k >= 0 ? w.splice(k, 1) : w.push(p);
      b.setAttribute('aria-pressed', String(k < 0));
    } else return;
    persist(); compute();
  });
  $('#x-tip', root).value = st.tip; $('#x-disc', root).value = st.disc;
  $$('[data-service] button', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(st.service))));
  segment($('[data-service]', root), (v) => { st.service = v; persist(); compute(); });
  const modeSeg = $('.seg', root);
  $$('button', modeSeg).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === st.mode)));
  const setMode = (m) => { st.mode = m; $$('[data-pane]', root).forEach((p) => { p.hidden = p.dataset.pane !== m; }); persist(); compute(); };
  segment(modeSeg, setMode);
  ['#eq-total', '#eq-people'].forEach((s) => $(s, root).addEventListener('input', compute));
  drawPeople(); drawItems(); setMode(st.mode);
}

// ── How much does splitting equally cost you? ───────────
function overpayTool(root) {
  const answers = {};
  const qs = $$('[data-q]', root);
  const bar = $('[data-progress]', root);
  const result = $('[data-result]', root);
  qs.forEach((q) => segment($('.choices', q), (v) => {
    answers[q.dataset.q] = Number(v);
    bar.style.width = `${(Object.keys(answers).length / qs.length) * 100}%`;
    const next = qs.find((x) => answers[x.dataset.q] == null);
    if (next) next.querySelector('button').focus({ preventScroll: true });
    if (Object.keys(answers).length === qs.length) show();
  }));
  function show() {
    const { meals, spend, gap, drink, freq } = answers;
    const totalGap = gap + drink;
    const perMeal = Math.round(spend * totalGap * 100); // pence
    const yearly = Math.round(meals * 12 * spend * totalGap * freq) * 100; // whole pounds: it's an estimate
    result.hidden = false;
    if (yearly <= 0) {
      result.innerHTML = `<span class="eyebrow">Your result</span>
        <h2 class="h2" style="font-size:32px">Splitting equally probably doesn’t cost you.</h2>
        <p class="lede">You order about the same as your friends${gap < 0 ? ', or a bit more' : ''}, so an even split works out for you. Not everyone at the table may feel the same.</p>
        <div class="stat-strip"><div class="card stat-card"><span class="num">43%</span><p>feel awkward about how to pay when eating out</p><cite>comparethemarket survey, 2021</cite></div><div class="card stat-card"><span class="num">13%</span><p>have fallen out with someone over the bill</p><cite>comparethemarket survey, 2021</cite></div></div>
        <p>Letting everyone tick their own items keeps it fair for the quieter eaters too. <a href="/blog/bill-splitting-etiquette/">Read the unwritten rules</a>.</p>`;
    } else {
      result.innerHTML = `<span class="eyebrow">Your estimated overpay</span>
        <div class="big-out">${fmt(yearly).replace('.00', '')}<span style="font-size:0.35em;color:var(--text-2);font-weight:600;margin-left:0.3em">a year</span></div>
        <p class="lede">That’s about ${fmt(perMeal)} on each meal that’s split equally. OnlyBills costs £5.99 a year, and your first split is free.</p>
        <div class="btn-row"><a class="btn btn-primary" href="https://apps.apple.com/gb/app/onlybills/id6754412082" data-cta="overpay-result" rel="noopener">Get OnlyBills</a><button class="btn btn-secondary" type="button" data-copy>Share my number</button></div>
        <p class="foot">An estimate from your answers and our assumptions (much less = 30% under the table average, a bit less = 15%, not drinking adds 15 points). It isn’t a research figure.</p>`;
      $('[data-copy]', result).addEventListener('click', (e) => copy(`Splitting the bill equally costs me about ${fmt(yearly).replace('.00', '')} a year. Work out yours: https://onlybills.app/tools/overpay-calculator/`, e.currentTarget));
    }
    result.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }
}

// ── Tip and service ─────────────────────────────────────
function tipTool(root) {
  const result = $('[data-result]', root);
  let pct = segment($('[data-pct]', root), (v) => { pct = v; compute(); });
  function compute() {
    const bill = toMinor($('#t-bill', root).value);
    const n = Math.max(1, Math.min(200, parseInt($('#t-people', root).value, 10) || 1));
    const included = $('#t-included', root).checked;
    const p = included ? 0 : Number(pct) || 0;
    const tip = Math.round((bill * p) / 100);
    const total = bill + tip;
    const parts = largestRemainderInt(total, Array(n).fill(1));
    const hi = Math.max(...parts); const hiN = parts.filter((x) => x === hi).length;
    result.innerHTML = `${included ? '<p class="note" style="display:block"><b>Service is already included.</b> That’s the tip, so there’s no need to add more unless you want to.</p>' : ''}
      <div class="group"><div class="row"><span class="row-body">Bill</span><span class="money">${fmt(bill)}</span></div><div class="row"><span class="row-body">${included ? 'Tip' : `Tip at ${p}%`}</span><span class="money">${fmt(tip)}</span></div><div class="row"><span class="row-body"><b>Total</b></span><span class="money"><b>${fmt(total)}</b></span></div></div>
      <span class="quiet">${n === 1 ? 'You pay' : 'Each person pays'}</span>
      <div class="hero-money">${fmt(hi)}</div>
      ${hiN !== n ? `<p class="foot">${hiN} pay ${fmt(hi)} and ${n - hiN} pay ${fmt(hi - 1)}, so it adds up to ${fmt(total)} exactly.</p>` : ''}
      <p class="foot">Ordered different amounts? <a href="/tools/split-bill-calculator/">Split by item instead</a>.</p>`;
  }
  ['#t-bill', '#t-people'].forEach((s) => $(s, root).addEventListener('input', compute));
  $('#t-included', root).addEventListener('change', compute);
  compute();
}

// ── Service charge: add it, or find it inside a total ───
function serviceTool(root) {
  const result = $('[data-result]', root);
  const input = $('#s-amount', root);
  const label = $('[data-svlabel]', root);
  let mode = segment($('[data-svmode]', root), (v) => {
    mode = v;
    label.textContent = mode === 'add' ? 'Bill before service' : 'Total you paid, including service';
    input.value = mode === 'add' ? '75.00' : '84.38';
    compute();
  });
  let pct = segment($('[data-svpct]', root), (v) => { pct = v; compute(); });
  function compute() {
    const amount = toMinor(input.value);
    const p = Number(pct) || 0;
    let before; let service; let total;
    if (mode === 'add') {
      before = amount; service = Math.round((amount * p) / 100); total = before + service;
    } else {
      total = amount; before = Math.round(amount / (1 + p / 100)); service = total - before;
    }
    result.innerHTML = `<span class="quiet">${mode === 'add' ? 'Service charge' : 'Of which service'}</span>
      <div class="hero-money">${fmt(service)}</div>
      <div class="group"><div class="row"><span class="row-body">Bill before service</span><span class="money">${fmt(before)}</span></div><div class="row"><span class="row-body">Service at ${p}%</span><span class="money">${fmt(service)}</span></div><div class="row"><span class="row-body"><b>Total</b></span><span class="money"><b>${fmt(total)}</b></span></div></div>
      <p class="foot">Splitting it with friends? <a href="/tools/split-bill-calculator/">Share the service by what each person had</a>.</p>`;
  }
  input.addEventListener('input', compute);
  compute();
}

// ── Who owes who: fewest transfers to settle shared costs ─
function settleTool(root) {
  const KEY = 'ob-settle-v1';
  const st = load(KEY) || { people: [['Sam', '120'], ['Maya', '75'], ['Priya', '45'], ['Jon', '0']] };
  const list = $('[data-payers]', root);
  const result = $('[data-result]', root);
  function draw() {
    const faces = facesOf(st.people.map((p) => p[0]));
    list.innerHTML = st.people.map(([n, paid], i) => `<div class="person-row">${faceImg(faces[i], 36)}<input class="input" aria-label="Person ${i + 1} name" data-sn="${i}" value="${escH(n)}" placeholder="Name"><input class="input money-in" style="max-width:110px" aria-label="${escH(n || 'Person')} paid" inputmode="decimal" data-sp="${i}" value="${escH(paid)}" placeholder="£0.00"><button class="iconbtn" type="button" data-sdel="${i}" aria-label="Remove ${escH(n || 'person')}" ${st.people.length <= 2 ? 'disabled' : ''}>×</button></div>`).join('')
      + '<button class="addbtn" type="button" data-sadd>Add person</button>';
  }
  function compute() {
    const names = st.people.map(([n], i) => n.trim() || 'Person ' + (i + 1));
    const paid = st.people.map(([, v]) => toMinor(v));
    const total = paid.reduce((a, b) => a + b, 0);
    const n = names.length;
    const shares = largestRemainderInt(total, Array(n).fill(1));
    const bal = paid.map((p, i) => p - shares[i]); // + is owed, - owes
    const owe = bal.map((b, i) => [i, -b]).filter(([, b]) => b > 0);
    const owed = bal.map((b, i) => [i, b]).filter(([, b]) => b > 0);
    const moves = [];
    while (owe.length && owed.length) {
      owe.sort((a, b) => b[1] - a[1]); owed.sort((a, b) => b[1] - a[1]);
      const amt = Math.min(owe[0][1], owed[0][1]);
      moves.push([owe[0][0], owed[0][0], amt]);
      owe[0][1] -= amt; owed[0][1] -= amt;
      if (!owe[0][1]) owe.shift();
      if (!owed[0][1]) owed.shift();
    }
    const faces = facesOf(names);
    const each = Math.max(...shares);
    result.innerHTML = `<span class="quiet">Total spent ${fmt(total)} · ${fmt(each)} each</span>
      ${moves.length ? `<div class="group">${moves.map(([a, b, amt]) => `<div class="row" style="--sep-inset:68px"><span class="faces" style="--size:30px">${faceImg(faces[a], 30)}${faceImg(faces[b], 30)}</span><span class="row-body"><span class="row-title">${escH(names[a])} pays ${escH(names[b])}</span></span><span class="money" style="font-weight:600">${fmt(amt)}</span></div>`).join('')}</div>
      <span class="ok">✓ ${moves.length} payment${moves.length === 1 ? '' : 's'} and everyone’s square</span>
      <button class="btn btn-secondary" type="button" data-copy>Copy for the group chat</button>` : '<p class="lede">Everyone’s already square.</p>'}`;
    const c = $('[data-copy]', result);
    if (c) c.addEventListener('click', (e) => copy(`Settling up (${fmt(total)} total, ${fmt(each)} each):\n${moves.map(([a, b, amt]) => `${names[a]} pays ${names[b]} ${fmt(amt)}`).join('\n')}\nWorked out at onlybills.app/tools/settle-up-calculator`, e.currentTarget));
  }
  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.sn != null) st.people[+t.dataset.sn][0] = t.value;
    else if (t.dataset.sp != null) st.people[+t.dataset.sp][1] = t.value;
    else return;
    save(KEY, st); compute();
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.sadd != null) { st.people.push(['', '0']); draw(); $$('[data-sn]', root).at(-1)?.focus(); }
    else if (b.dataset.sdel != null) { st.people.splice(+b.dataset.sdel, 1); draw(); }
    else return;
    save(KEY, st); compute();
  });
  draw(); compute();
}

const tools = { split: splitTool, overpay: overpayTool, tip: tipTool, service: serviceTool, settle: settleTool };
$$('[data-tool]').forEach((el) => tools[el.dataset.tool]?.(el));
