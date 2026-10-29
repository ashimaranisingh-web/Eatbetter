// ── Add a meal: grouped meals + search ────────────────────────────────
// Replaces the old "quick pick" list in the Add-a-meal sheet:
//  • meals grouped into Indian homemade, eggs & non-veg, fruits & veggies…
//  • a search that understands amounts ("100g rice", "2 roti")
//  • tap a food → choose servings or grams → live calories and macros → add.
// Food data: the assistant's food table, the meal plan's own foods and any
// custom foods saved by the user (all per serving; grams where known).
(function () {
  const { esc } = EB;
  const $ = id => document.getElementById(id);

  const GROUPS = [
    ['treats', 'Treats', /pizza|burger|fries|french|momo|samosa|pakora|bhajji|kachori|vada pav|pav bhaji|bhel|chaat|biscuit|cookie|cake|pastry|brownie|sweet|ladoo|barfi|halwa|kheer|jalebi|rasgulla|gulab|ice ?cream|kulfi|chocolate|maggi|instant|beer|wine|cocktail|whisk|vodka|sugar|jaggery|honey|quesadilla/i],
    ['nonveg', 'Eggs & Non-veg', /egg|omelet|chicken|mutton|lamb|goat|fish|salmon|prawn|shrimp|tuna|tikka|tandoori/i],
    ['drinks', 'Drinks & Shakes', /milk|chai|tea|coffee|latte|lassi|buttermilk|chaas|smoothie|juice|coconut water|protein|whey|shake/i],
    ['fruit', 'Fruits & Veggies', /banana|apple|orange|mango|papaya|grape|watermelon|fruit|berr|salad|cucumber|carrot|veg sticks|sweet corn|tomato/i],
    ['snacks', 'Nuts & Snacks', /almond|walnut|peanut|nuts|makhana|dates|sprout|dhokla|chana \(|roasted chana|seeds/i],
    ['indian', 'Indian Homemade', /roti|chapati|phulka|paratha|thepla|puri|bhatura|rice|pulao|biryani|khichdi|dal|daal|rajma|chole|chana|sambar|sabzi|aloo|bhindi|palak|paneer|soya|poha|upma|idli|dosa|uttapam|vada|chilla|cheela|curd|raita|chutney|ghee|carb|kadhi|besan|moong/i],
    ['more', 'Continental & More', /./]
  ];
  const ORDER = ['indian', 'nonveg', 'fruit', 'snacks', 'drinks', 'more', 'treats'];
  const groupOf = name => (GROUPS.find(([, , re]) => re.test(name)) || GROUPS[GROUPS.length - 1])[0];

  // Cleaner names for the meal plan's own entries ("Carb — roti / paratha / rice (150 cal)").
  const tidy = n => n.replace(/^carb\s*[—–-]\s*/i, '').replace(/\s*\(\d+\s*cal\)\s*$/i, '').replace(/^\w/, c => c.toUpperCase());

  function foods() {
    const seen = new Set(), out = [];
    const add = (name, serving, g, cal, p, c, f, fib) => {
      const n = tidy(name), key = n.toLowerCase();
      if (seen.has(key) || !(cal >= 0)) return;
      seen.add(key);
      out.push({ n, serving: serving || '1 serving', g: g || null, cal: +cal || 0, p: +p || 0, c: +c || 0, f: +f || 0, fib: +fib || 0 });
    };
    try { getCustomIngredients().forEach(i => add(i.name, i.unit, null, i.cal, i.p, i.c, i.f, i.fib)); } catch {}
    try {
      [...INGREDIENTS, ...SNACK_INGREDIENTS, ...COFFEE_OPTIONS, ...PROTEIN_OPTIONS].forEach(i =>
        add(i.name, i.unit, /^(\d+)\s*g\b/.test(i.unit) ? parseInt(i.unit) : null, i.cal, i.p, i.c, i.f, i.fib));
    } catch {}
    try { (window.EBAssistant ? EBAssistant.foods() : []).forEach(f => add(f.n, f.serving, f.g, f.cal, f.p, f.c, f.f, f.fib)); } catch {}
    return out;
  }

  // "100g rice" → { q: 'rice', grams: 100 }; "2 roti" → { q: 'roti', servings: 2 }
  function parseQuery(raw) {
    let q = (raw || '').toLowerCase().trim(), grams = null, servings = null;
    const g = q.match(/(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|ml)\b/);
    if (g) { grams = parseFloat(g[1]); q = q.replace(g[0], ' '); }
    const n = !g && q.match(/^(\d+(?:\.\d+)?)\s+/);
    if (n) { servings = parseFloat(n[1]); q = q.slice(n[0].length); }
    q = q.replace(/\b(of|grams?)\b/g, ' ').replace(/\s+/g, ' ').trim();
    return { q, grams, servings };
  }
  function matches(food, q) {
    const name = food.n.toLowerCase();
    const words = q.split(' ').filter(Boolean);
    if (!words.every(w => name.includes(w) || name.includes(w.replace(/s$/, '')))) return -1;
    return name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2;
  }

  const r1 = n => Math.round(n * 10) / 10;
  const macroLine = f => `P ${r1(f.p)}g · C ${r1(f.c)}g · F ${r1(f.f)}g${f.fib ? ` · Fib ${r1(f.fib)}g` : ''}`;
  function scaled(f, amt) {
    const k = amt.mode === 'g' && f.g ? amt.v / f.g : amt.v;
    return { cal: Math.round(f.cal * k), p: r1(f.p * k), c: r1(f.c * k), f: r1(f.f * k), fib: r1(f.fib * k) };
  }

  let list = [], open = null, pre = {};
  function itemHTML(f, i) {
    return `<div class="mf-item${open === i ? ' open' : ''}" data-i="${i}">
      <button type="button" class="mf-row" data-mf-toggle="${i}">
        <span class="mf-main"><b>${esc(f.n)}</b><span>${esc(f.serving)}${f.g && !/\d+\s*g\b/.test(f.serving) ? ` · ${f.g} g` : ''}</span></span>
        <span class="mf-side"><b>${f.cal}</b><span>cal</span></span>
      </button>
      <p class="mf-macros">${macroLine(f)}</p>
      ${open === i ? detailHTML(f, i) : ''}
    </div>`;
  }
  function detailHTML(f, i) {
    const amt = pre[i] || (pre[i] = { mode: f.g && pre.grams ? 'g' : 'srv', v: f.g && pre.grams ? pre.grams : (pre.servings || 1) });
    const t = scaled(f, amt);
    return `<div class="mf-detail">
      ${f.g ? `<div class="eb-seg mf-mode">
        <button type="button" class="eb-seg-btn${amt.mode === 'srv' ? ' on' : ''}" data-mf-mode="srv">Servings</button>
        <button type="button" class="eb-seg-btn${amt.mode === 'g' ? ' on' : ''}" data-mf-mode="g">Grams</button></div>` : ''}
      <div class="mf-amount">
        ${amt.mode === 'g'
          ? `<input class="eb-input mf-grams" type="number" inputmode="decimal" min="1" value="${amt.v}" data-mf-grams aria-label="Grams"><span>g</span>`
          : `<button type="button" class="eb-step-btn" data-mf-step="-0.5" aria-label="Less">−</button>
             <span class="mf-srv"><b>${amt.v}</b> × ${esc(f.serving)}</span>
             <button type="button" class="eb-step-btn" data-mf-step="0.5" aria-label="More">+</button>`}
      </div>
      <p class="mf-total"><b>${t.cal} cal</b> · ${macroLine(t)}${f.g ? `<br><span>Per 100 g: ${Math.round(f.cal / f.g * 100)} cal</span>` : ''}</p>
      <button type="button" class="eb-btn primary sm" data-mf-add>${selectedCustomSlot ? `Add to ${selectedCustomSlot.charAt(0).toUpperCase() + selectedCustomSlot.slice(1)}` : 'Pick a meal time above'}</button>
    </div>`;
  }

  function render(term) {
    const box = $('quickPickList'); if (!box) return;
    const all = foods();
    const { q, grams, servings } = parseQuery(term);
    pre = { grams, servings };
    if (q) {
      list = all.map(f => [f, matches(f, q)]).filter(([, s]) => s >= 0).sort((a, b) => a[1] - b[1] || a[0].n.length - b[0].n.length).map(([f]) => f).slice(0, 40);
      if (open == null && list.length === 1) open = 0;
      box.innerHTML = list.length
        ? `<p class="mf-count">${list.length} result${list.length > 1 ? 's' : ''}</p>${list.map(itemHTML).join('')}`
        : `<p class="quick-pick-empty">Nothing found for “${esc(q)}”. Add it by hand below.</p>`;
      return;
    }
    list = all;
    const byGroup = {};
    all.forEach((f, i) => (byGroup[groupOf(f.n)] = byGroup[groupOf(f.n)] || []).push([f, i]));
    box.innerHTML = ORDER.filter(k => byGroup[k]).map((k, gi) => {
      const label = GROUPS.find(g => g[0] === k)[1];
      return `<details class="mf-group"${gi === 0 || byGroup[k].some(([, i]) => i === open) ? ' open' : ''}>
        <summary><span>${label}</span><span class="mf-n">${byGroup[k].length}</span></summary>
        ${byGroup[k].map(([f, i]) => itemHTML(f, i)).join('')}
      </details>`;
    }).join('');
  }

  function rerender() { render($('quickPickSearch').value); }

  function onClick(e) {
    const t = e.target;
    const tg = t.closest('[data-mf-toggle]');
    if (tg) { const i = +tg.dataset.mfToggle; open = open === i ? null : i; return rerender(); }
    const item = t.closest('.mf-item'); if (!item) return;
    const i = +item.dataset.i, f = list[i], amt = pre[i];
    if (t.closest('[data-mf-mode]')) {
      const mode = t.closest('[data-mf-mode]').dataset.mfMode;
      pre[i] = { mode, v: mode === 'g' ? (f.g || 100) : 1 }; return rerender();
    }
    if (t.closest('[data-mf-step]')) {
      amt.v = Math.max(0.5, Math.round((amt.v + +t.closest('[data-mf-step]').dataset.mfStep) * 2) / 2); return rerender();
    }
    if (t.closest('[data-mf-add]')) {
      if (!selectedCustomSlot) {
        const st = $('aiStatus'); if (st) { st.textContent = 'Pick when you ate it first.'; st.className = 'ai-status error'; }
        document.querySelector('.mf-slots')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const tot = scaled(f, amt);
      const label = amt.mode === 'g' ? `${amt.v} g` : `${amt.v} × ${f.serving}`;
      const ds = selectedDateStr(), log = getSlotLog(ds);
      if (!Array.isArray(log[selectedCustomSlot])) log[selectedCustomSlot] = log[selectedCustomSlot] ? [log[selectedCustomSlot]] : [];
      log[selectedCustomSlot].push({ name: esc(f.n), qty: esc(label), ...tot });
      setSlotLog(ds, log);
      $('addMealModal').classList.remove('open');
      ['renderSlotSection', 'renderTracker', 'renderWeeklyTracker', 'renderTabs'].forEach(fn => { try { window[fn](); } catch {} });
      EB.toast(`${f.n} added`);
    }
  }
  function onInput(e) {
    if (!e.target.matches('[data-mf-grams]')) return;
    const i = +e.target.closest('.mf-item').dataset.i;
    pre[i].v = Math.max(0, +e.target.value || 0);
    const f = list[i], tot = scaled(f, pre[i]);
    const out = e.target.closest('.mf-detail').querySelector('.mf-total');
    out.innerHTML = `<b>${tot.cal} cal</b> · ${macroLine(tot)}${f.g ? `<br><span>Per 100 g: ${Math.round(f.cal / f.g * 100)} cal</span>` : ''}`;
  }

  // One-time tidy-up of the Add-a-meal sheet: meal time first, then search
  // and meals, then the manual form.
  function setup() {
    const modal = $('addMealModal'); if (!modal) return;
    const acc = $('quickPickAcc'), slots = $('newMealSlotPicker');
    const slotLabel = slots && slots.previousElementSibling;
    const title = modal.querySelector('.modal-title');
    if (slots && title) {
      const wrap = document.createElement('div'); wrap.className = 'mf-slots';
      if (slotLabel && slotLabel.classList.contains('modal-label')) wrap.appendChild(slotLabel);
      wrap.appendChild(slots);
      title.after(wrap);
    }
    if (acc) {
      acc.open = true;
      const sum = acc.querySelector('.quick-pick-summary span'); if (sum) sum.textContent = 'Meals';
      const search = $('quickPickSearch'); if (search) search.placeholder = 'Search, e.g. 100g rice, 2 roti, paneer';
    }
    const manual = modal.querySelector('#newMealTitle');
    if (manual && manual.previousElementSibling) manual.previousElementSibling.textContent = 'Or add it by hand: meal name';
    const box = $('quickPickList');
    if (box) { box.addEventListener('click', onClick); box.addEventListener('input', onInput); }
    // Picking a meal time updates the Add button label
    if (slots) slots.addEventListener('click', () => setTimeout(rerender, 0));
    window.renderQuickPick = term => { open = null; pre = {}; render(term); };
  }

  function openSearch(term) {
    try { openAddModal(); } catch { return; }
    const acc = $('quickPickAcc'); if (acc) acc.open = true;
    setTimeout(() => {
      const s = $('quickPickSearch'); if (!s) return;
      if (term) { s.value = term; s.dispatchEvent(new Event('input', { bubbles: true })); }
      s.focus();
    }, 50);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
  window.EBMeals = { openSearch, foods, parseQuery };
})();
