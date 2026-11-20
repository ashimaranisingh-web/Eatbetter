// ── Groceries: one list of foods, each either To buy or Stocked ──────
// Lives on Nutrition (a card under the meals). Every item has a checkbox on
// the right: ticked = Stocked (badge, sinks to the bottom), unticked = to buy.
// "To buy only" hides the stocked ones. Add box at the bottom, where the thumb is.
// Below the list: what the rest of this week's meal plan uses, to add in a tap.
// Saved in eb_grocery (synced to her account like the rest of her data).
(function () {
  const KEY = 'eb_grocery';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // { items: [{ id, n, note, stocked, at }], hidden: [names not to suggest] }
  // Older saves had two lists ({ buy, stock }); they're folded into one.
  function load() {
    let v = null; try { v = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
    if (v && Array.isArray(v.items)) return { items: v.items, hidden: v.hidden || [] };
    if (v && (Array.isArray(v.buy) || Array.isArray(v.stock)))
      return { items: [...(v.buy || []).map(x => ({ ...x, stocked: false })), ...(v.stock || []).map(x => ({ ...x, stocked: true }))], hidden: v.hidden || [] };
    return { items: [], hidden: [] };
  }
  const save = g => { try { localStorage.setItem(KEY, JSON.stringify(g)); } catch {} };
  const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const track = e => { try { window.EBAnalytics && EBAnalytics.track(e); } catch {} };
  const TICK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  // What the rest of this week's plan uses (today → Sunday), added up.
  // Plan items look like "Paneer (70 g)"; same food + same unit is summed.
  function fromPlan() {
    if (typeof MEAL_SLOTS === 'undefined') return [];
    const pms = typeof isPMSMode === 'function' && isPMSMode();
    const slots = (pms ? PMS_MEAL_SLOTS : MEAL_SLOTS).filter(s => ['breakfast', 'lunch', 'snack', 'dinner'].includes(s.id));
    const week = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const today = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
    const days = week.slice(week.indexOf(today));
    const out = new Map();
    days.forEach(day => slots.forEach(slot => {
      let m = null; try { m = getEffectiveDefaultMeal(slot, day, pms); } catch {}
      (m && Array.isArray(m.items) ? m.items : []).forEach(it => {
        const raw = String(it.n || '').replace(/<[^>]*>/g, '');
        const name = raw.replace(/\s*\(.*$/, '').replace(/\s+[—–-]\s.*$/, '').trim(); if (!name) return;
        const q = (raw.match(/\(([^)]*)\)/) || [])[1] || '';
        const num = q.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i);
        const k = norm(name), cur = out.get(k) || { n: name, meals: 0, amt: 0, unit: '', counted: 0 };
        cur.meals++;
        if (num) { const u = num[2].toLowerCase(), v = +num[1] * (u === 'kg' || u === 'l' ? 1000 : 1), base = u === 'kg' ? 'g' : u === 'l' ? 'ml' : u;
          if (!cur.unit || cur.unit === base) { cur.unit = base; cur.amt += v; cur.counted++; } }
        out.set(k, cur);
      });
    }));
    // Most-used first. The amount shows only when every meal gave one (else it would undercount).
    return [...out.values()].sort((a, b) => b.meals - a.meals).map(x => ({ n: x.n, note: `${x.amt && x.counted === x.meals ? `~${x.amt >= 1000 ? (Math.round(x.amt / 100) / 10) + (x.unit === 'g' ? ' kg' : ' l') : Math.round(x.amt) + ' ' + x.unit} · ` : ''}`.replace(/ · $/, '') }));
  }

  let onlyBuy = false;   // the "To buy only" filter
  function counts() { const g = load(); const stock = g.items.filter(x => x.stocked).length; return { buy: g.items.length - stock, stock }; }

  function rowHTML(it) {
    // Items added before: their note may still say "1 meal"; show only an amount.
    it = { ...it, note: String(it.note || '').replace(/(\s*·\s*)?\d+ meals?/, '').trim() };
    return `<li class="gr-swipe-wrap">
      <button type="button" class="gr-swipe-act" data-gr-del="${esc(it.id)}" aria-label="Delete ${esc(it.n)}">Delete</button>
      <div class="gr-item${it.stocked ? ' stocked' : ''}">
        <span class="gr-name">${esc(it.n)}${it.note ? `<small>${esc(it.note)}</small>` : ''}</span>
        ${it.stocked ? '<em class="gr-badge">Stocked</em>' : ''}
        <button type="button" class="gr-check${it.stocked ? ' on' : ''}" data-gr-toggle="${esc(it.id)}" role="checkbox" aria-checked="${!!it.stocked}" aria-label="${esc(it.n)}: stocked">${it.stocked ? TICK : ''}</button>
      </div></li>`;
  }
  function bodyHTML() {
    const g = load(), c = counts(), have = new Set(g.items.map(x => norm(x.n))), hidden = new Set(g.hidden);
    // To buy on top (newest first), stocked below.
    const items = [...g.items.filter(x => !x.stocked), ...(onlyBuy ? [] : g.items.filter(x => x.stocked))];
    const sugg = fromPlan().filter(s => !have.has(norm(s.n)) && !hidden.has(norm(s.n)));
    return `<div class="gr">
      <div class="gr-bar">
        <p class="gr-count">${c.buy} to buy · ${c.stock} stocked</p>
        <label class="gr-filter"><input type="checkbox" data-gr-filter${onlyBuy ? ' checked' : ''}><span>To buy only</span></label>
      </div>
      ${items.length ? `<ul class="gr-list">${items.map(rowHTML).join('')}</ul>`
        : `<p class="gr-empty">${g.items.length ? 'Everything’s stocked.' : `Add foods with the box at the bottom${sugg.length ? ', or from your plan below' : ''}. Tick one when it’s in your kitchen.`}</p>`}
      ${sugg.length ? `<div class="gr-plan">
        <div class="gr-plan-head"><p>From your plan this week</p><button type="button" class="eb-link" data-gr-addall>Add all</button></div>
        <ul class="gr-list">${sugg.map(s => `<li class="gr-swipe-wrap">
          <button type="button" class="gr-swipe-act" data-gr-hide="${esc(s.n)}" aria-label="Don’t suggest ${esc(s.n)}">Hide</button>
          <div class="gr-item">
            <span class="gr-name">${esc(s.n)}${s.note ? `<small>${esc(s.note)}</small>` : ''}</span>
            <button type="button" class="gr-plus" data-gr-plan="${esc(s.n)}" data-gr-note="${esc(s.note)}" aria-label="Add ${esc(s.n)}">+</button>
          </div></li>`).join('')}</ul></div>` : ''}
    </div>`;
  }

  let ov = null;
  function paint() { if (ov) ov.querySelector('.app-sheet-body').innerHTML = bodyHTML(); window.dispatchEvent(new Event('eb:grocery')); }
  function open() {
    if (ov) return paint();
    ov = document.createElement('div'); ov.className = 'eb-cal-overlay app-sheet-overlay';
    ov.innerHTML = `<div class="eb-cal app-sheet gr-sheet" role="dialog" aria-modal="true" aria-label="Groceries">
      <div class="app-sheet-head"><b>Groceries</b><button type="button" class="eb-icon-btn" data-sheet-close aria-label="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="app-sheet-body"></div>
      <form class="gr-add" data-gr-form>
        <input class="eb-input" type="text" enterkeyhint="done" autocomplete="off" placeholder="Add a food, e.g. paneer" aria-label="Add a food">
        <button type="submit" class="eb-btn primary">Add</button>
      </form></div>`;
    document.body.appendChild(ov); paint();
    let sw = null;
    const shut = keep => ov.querySelectorAll('.gr-swipe-wrap.open').forEach(w => { if (w !== keep) { w.classList.remove('open'); w.querySelector('.gr-item').style.transform = ''; } });
    ov.addEventListener('touchstart', e => {
      const w = e.target.closest('.gr-swipe-wrap'); if (!w || e.target.closest('.gr-swipe-act')) return;
      shut(w); sw = { w, row: w.querySelector('.gr-item'), x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, open: w.classList.contains('open'), lock: null };
      sw.row.style.transition = 'none';
    }, { passive: true });
    ov.addEventListener('touchmove', e => {
      if (!sw) return;
      const dx = e.touches[0].clientX - sw.x, dy = e.touches[0].clientY - sw.y;
      if (sw.lock === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) sw.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (sw.lock !== 'x') return;
      sw.dx = Math.min(0, Math.max(-96, dx + (sw.open ? -88 : 0)));
      sw.row.style.transform = `translateX(${sw.dx}px)`;
    }, { passive: true });
    ov.addEventListener('touchend', () => {
      if (!sw) return; const { w, row } = sw;
      row.style.transition = ''; row.style.transform = '';
      if (sw.lock === 'x') { w.classList.toggle('open', sw.dx < -40); sw.moved = true; }
      sw = null;
    });
    ov.addEventListener('click', onClick);
    ov.addEventListener('submit', onSubmit);
    track('grocery_opened');
  }
  function close() { if (ov) { ov.remove(); ov = null; } window.dispatchEvent(new Event('eb:grocery')); }
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // Adding something already on the list moves it back to To buy (no duplicates).
  function add(g, n, note) {
    const k = norm(n); if (!k) return;
    g.items = g.items.filter(x => norm(x.n) !== k);
    g.items.unshift({ id: id(), n: String(n).trim().replace(/^./, c => c.toUpperCase()), note: note || '', stocked: false, at: Date.now() });
  }
  function onSubmit(e) {
    if (!e.target.matches('[data-gr-form]')) return;
    e.preventDefault();
    const inp = e.target.querySelector('input'), v = inp.value.trim(); if (!v) return;
    const g = load();
    v.split(/\s*,\s*/).filter(Boolean).forEach(n => add(g, n));   // "milk, eggs, bread" adds three
    save(g); track('grocery_added'); inp.value = ''; paint(); inp.focus();
    const body = ov.querySelector('.app-sheet-body'); body.scrollTop = 0;   // new items are at the top
  }
  function onClick(e) {
    const t = e.target, at = s => t.closest(s); let n;
    if (t === ov || at('[data-sheet-close]')) return close();
    // A tap on an open row (not its Delete) just closes it.
    const openRow = at('.gr-swipe-wrap.open');
    if (openRow && !at('.gr-swipe-act')) { openRow.classList.remove('open'); return; }
    if (t.matches && t.matches('input[data-gr-filter]')) { onlyBuy = t.checked; return paint(); }
    const g = load();
    if ((n = at('[data-gr-toggle]'))) {
      const it = g.items.find(x => x.id === n.dataset.grToggle); if (!it) return;
      it.stocked = !it.stocked; it.at = Date.now();
      if (it.stocked) it.note = '';
      // Freshly ticked goes to the top of Stocked; un-ticked to the top of To buy.
      g.items = [it, ...g.items.filter(x => x !== it)];
      save(g); if (it.stocked) track('grocery_bought');
      try { window.EBNative && EBNative.haptic && EBNative.haptic('light'); } catch {}
      return paint();
    }
    if ((n = at('[data-gr-del]'))) { g.items = g.items.filter(x => x.id !== n.dataset.grDel); save(g); return paint(); }
    if ((n = at('[data-gr-plan]'))) { add(g, n.dataset.grPlan, n.dataset.grNote); save(g); track('grocery_added'); return paint(); }
    if ((n = at('[data-gr-hide]'))) { g.hidden = [...new Set([...g.hidden, norm(n.dataset.grHide)])]; save(g); return paint(); }
    if (at('[data-gr-addall]')) {
      const have = new Set(g.items.map(x => norm(x.n))), hidden = new Set(g.hidden);
      fromPlan().filter(s => !have.has(norm(s.n)) && !hidden.has(norm(s.n))).reverse().forEach(s => add(g, s.n, s.note));
      save(g); track('grocery_added'); return paint();
    }
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov) close(); });

  window.EBGrocery = { open, counts };
})();
