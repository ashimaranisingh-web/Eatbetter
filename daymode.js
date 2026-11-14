// ── How you eat today: Plan / Log / Guide, chosen per day ─────────────
// Plan  = the meal plan as it has always worked (slots, swaps, Log it).
// Log   = search any food and add it; entries go into the same per-day log
//         (slots_<date>) so totals, the weekly tracker and deficit maths
//         keep working without a second set of sums.
// Guide = targets for each meal, nothing to search. A ticked meal counts at
//         the middle of its range, marked as an estimate.
// The choice is stored per date (dayMode_<date>). New days start on the last
// mode used. Once a day has food logged or a meal ticked, its mode is locked:
// you can change it from the next day.
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const MODES = [
    { v: 'plan', t: 'Plan', line: 'Follow your meal plan, one meal at a time.' },
    { v: 'log', t: 'Log', line: 'Search any food and add it as you eat.' },
    { v: 'guide', t: 'Guide', line: 'Just targets for each meal. Nothing to log.' }
  ];
  const ds = () => { try { return selectedDateStr(); } catch { return ''; } };
  // Days logged before this feature existed were Plan days.
  function modeFor(d) {
    const saved = get('dayMode_' + d, null); if (saved) return saved;
    let n = 0; try { n = rawCalories(d); } catch {}
    return n > 0 ? 'plan' : get('eb_lastDayMode', 'plan');
  }

  // ── Guide data: number of meals, split (% of the day), ticked meals ──
  const SPLITS = {
    3: [['Breakfast', 30], ['Lunch', 40], ['Dinner', 30]],
    4: [['Breakfast', 25], ['Lunch', 35], ['Snack', 10], ['Dinner', 30]],
    5: [['Breakfast', 25], ['Mid-morning', 10], ['Lunch', 30], ['Snack', 10], ['Dinner', 25]]
  };
  function guideFor(d) {
    const g = get('guide_' + d, null);
    if (g && SPLITS[g.n]) return g;
    const n = get('eb_guideMeals', 4);
    return { n, split: SPLITS[n].map(x => x[1]), done: [] };
  }
  const saveGuide = (d, g) => { put('guide_' + d, g); put('eb_guideMeals', g.n); };

  function dayTargets() {
    try { return (typeof isPMSMode === 'function' && isPMSMode()) ? PMS_TARGETS : TARGETS; } catch { return { cal: 1600, p: 90, c: 180, f: 50, fib: 25 }; }
  }
  // Each meal: a range of ±10% around its share, and macros for the share.
  function guideMeals(d) {
    const g = guideFor(d), T = dayTargets();
    return SPLITS[g.n].map(([name], i) => {
      const pct = g.split[i] / 100, mid = T.cal * pct, r10 = n => Math.round(n / 10) * 10;
      return { name, pct: g.split[i], lo: r10(mid * 0.9), hi: r10(mid * 1.1), mid: r10(mid),
        p: Math.round(T.p * pct), c: Math.round(T.c * pct), f: Math.round(T.f * pct), fib: Math.round(T.fib * pct), done: g.done.includes(i) };
    });
  }
  // Calories and macros the ticked Guide meals stand for (an estimate).
  function estimate(d) {
    const t = { cal: 0, p: 0, c: 0, f: 0, fib: 0 };
    if (get('dayMode_' + d, null) !== 'guide') return t;
    guideMeals(d).filter(m => m.done).forEach(m => { t.cal += m.mid; t.p += m.p; t.c += m.c; t.f += m.f; t.fib += m.fib; });
    return t;
  }

  // Locked once anything is logged (any mode) or a Guide meal is ticked.
  const rawCalories = typeof getDayCalories === 'function' ? getDayCalories : () => 0;
  function hasFood(d) {
    let n = 0; try { n = rawCalories(d); } catch {}
    return n > 0 || guideFor(d).done.length > 0 && get('dayMode_' + d, null) === 'guide';
  }

  // Every weekly sum reads getDayCalories, so ticked Guide meals count there.
  if (typeof getDayCalories === 'function') {
    window.getDayCalories = d => rawCalories(d) + estimate(d).cal;
  }

  // ── Views ──
  // A dropdown that shows each mode with its one-line explainer. The menu
  // opens inside the same card (no overlay), so nothing can cover it.
  let menuOpen = false;
  const CHEVRON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;
  const CHECK = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
  function pickerHTML(d, mode, locked) {
    const m = MODES.find(x => x.v === mode);
    return `<div class="app-dm${menuOpen ? ' open' : ''}">
        <button type="button" class="app-dm-btn" data-dm-toggle aria-haspopup="listbox" aria-expanded="${menuOpen}">
          <span>How you eat today</span><b>${m.t}</b>${CHEVRON}
        </button>
        ${menuOpen ? `<ul class="app-dm-menu" role="listbox" aria-label="How you eat today">${MODES.map(x => `<li>
            <button type="button" class="app-dm-opt${x.v === mode ? ' on' : ''}" role="option" aria-selected="${x.v === mode}" data-dm-pick="${x.v}"${locked && x.v !== mode ? ' disabled' : ''}>
              <span><b>${x.t}</b><small>${x.line}</small></span>${x.v === mode ? CHECK : ''}
            </button></li>`).join('')}</ul>
          ${locked ? '<p class="app-dm-lock">Set for this day, since you’ve started. Pick again tomorrow.</p>' : ''}` : ''}
      </div>`;
  }
  function paintPicker(focus) {
    const box = $('dayModeBox'); if (!box) return;
    const d = ds();
    box.innerHTML = pickerHTML(d, modeFor(d), hasFood(d));
    if (focus === 'menu') { const o = box.querySelector('.app-dm-opt.on'); if (o) o.focus(); }
    if (focus === 'btn') { const b = box.querySelector('[data-dm-toggle]'); if (b) b.focus(); }
  }

  function guideHTML(d) {
    const g = guideFor(d), meals = guideMeals(d), T = dayTargets();
    let why = '';
    try {
      const n = window.EBPlanner && EBPlanner.numbers(EB.getProfile());
      if (n) why = n.deficit > 0 ? `${n.tdee.toLocaleString()} to maintain your weight, minus ${n.deficit.toLocaleString()} to lose gently`
        : n.deficit < 0 ? `${n.tdee.toLocaleString()} to maintain your weight, plus ${(-n.deficit).toLocaleString()} to gain`
        : `what your body uses in a day, so your weight stays steady`;
    } catch {}
    const pms = typeof isPMSMode === 'function' && isPMSMode();
    return `<div class="app-card app-guide">
      <div class="app-row"><p class="app-card-label">Meals today</p>
        <div class="eb-seg app-guide-n" role="radiogroup" aria-label="Meals today">${[3, 4, 5].map(n =>
          `<button type="button" class="eb-seg-btn${g.n === n ? ' on' : ''}" data-guide-n="${n}" role="radio" aria-checked="${g.n === n}"${g.done.length && g.n !== n ? ' disabled' : ''}>${n}</button>`).join('')}</div></div>
      <p class="app-guide-why">Your target is <b>${T.cal.toLocaleString()} cal</b> a day${why ? `: ${why}` : ''}${pms ? ', plus about 150 for PMS days' : ''}. Aim for ${T.p} g protein, ${T.c} g carbs, ${T.f} g fat and ${T.fib} g fibre across the day.</p>
      <ul class="app-guide-list">${meals.map((m, i) => `<li class="${m.done ? 'done' : ''}">
          <button type="button" class="app-guide-tick" data-guide-done="${i}" aria-pressed="${m.done}" aria-label="${esc(m.name)} done"></button>
          <div class="app-guide-text">
            <div class="app-guide-head"><b>${esc(m.name)}</b><span>${m.lo}–${m.hi} cal</span></div>
            <p>About ${m.p} g protein · ${m.c} g carbs · ${m.f} g fat · ${m.fib} g fibre</p>
          </div>
          <div class="eb-stepper app-guide-step">
            <button type="button" class="eb-step-btn" data-guide-split="${i}" data-delta="-5" aria-label="Smaller ${esc(m.name)}">−</button>
            <span class="eb-step-val">${m.pct}%</span>
            <button type="button" class="eb-step-btn" data-guide-split="${i}" data-delta="5" aria-label="Bigger ${esc(m.name)}">+</button>
          </div></li>`).join('')}</ul>
      <p class="app-muted small">The split is a suggestion. Make any meal bigger or smaller and the others adjust. Ticked meals count at the middle of their range, as an estimate. General guidance, not medical advice.</p>
    </div>`;
  }

  const SLOT_NAMES = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };
  function logHTML(d) {
    if (window.EBFoodLog) return EBFoodLog.html(d);
    let log = {}; try { log = getSlotLog(d); } catch {}
    const rows = [];
    Object.keys(SLOT_NAMES).concat(Object.keys(log).filter(k => !SLOT_NAMES[k])).forEach(slot => {
      (Array.isArray(log[slot]) ? log[slot] : log[slot] ? [log[slot]] : []).forEach((m, i) => {
        if (m && m.name) rows.push(`<li><span><b>${m.name}</b><small>${esc(SLOT_NAMES[slot] || slot)}${m.qty ? ` · ${m.qty}` : ''}</small></span>
          <em>${Math.round(m.cal || 0)} cal</em><button type="button" class="app-log-del" data-log-del="${esc(slot)}" data-i="${i}" aria-label="Remove ${m.name}">×</button></li>`);
      });
    });
    return `<button type="button" class="app-food-search app-log-search" data-food-search><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>Search food to log</span></button>
      ${rows.length ? `<div class="app-card"><p class="app-card-label">Logged today</p><ul class="app-log-list">${rows.join('')}</ul></div>`
        : '<p class="app-log-empty">Nothing logged yet. Search a food above, for example “2 roti” or “100g rice”.</p>'}`;
  }

  function paint() {
    const page = $('pageFood'); if (!page) return;
    let box = $('dayModeBox');
    if (!box) {
      box = document.createElement('div'); box.id = 'dayModeBox'; box.className = 'app-daymode';
      const body = document.createElement('div'); body.id = 'dayModeBody';
      const tracker = $('tracker');
      if (tracker) { tracker.before(box); } else page.appendChild(box);
      const anchor = $('cravingWrap') || $('slotSection');
      if (anchor) anchor.before(body); else page.appendChild(body);
    }
    const d = ds(), mode = modeFor(d), locked = hasFood(d);
    page.dataset.dayview = mode;   // not "daymode": that name belongs to the picker buttons
    // Log puts search right under the picker; Guide and Plan sit below the day's totals.
    const body = $('dayModeBody'), want = mode === 'log' ? box : ($('cravingWrap') || $('slotSection'));
    if (want === box) { if (box.nextElementSibling !== body) box.after(body); }
    else if (want && want.previousElementSibling !== body) want.before(body);
    box.innerHTML = pickerHTML(d, mode, locked);
    $('dayModeBody').innerHTML = mode === 'guide' ? guideHTML(d) : mode === 'log' ? logHTML(d) : '';
    if (mode === 'log' && window.EBFoodLog) EBFoodLog.mounted();
  }

  function refresh() {
    ['renderSlotSection', 'renderTracker', 'renderWeeklyTracker'].forEach(fn => { try { window[fn](); } catch {} });
    paint();
  }

  function setMode(v) {
    const d = ds(); if (hasFood(d) || !MODES.some(x => x.v === v)) return;
    put('dayMode_' + d, v); put('eb_lastDayMode', v);
    window.EBAnalytics && EBAnalytics.track('day_mode_set', { mode: v });
    refresh();
  }
  document.addEventListener('keydown', e => {
    if (!menuOpen || !e.target.closest || !e.target.closest('.app-dm')) return;
    if (e.key === 'Escape') { menuOpen = false; return paintPicker('btn'); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const opts = [...document.querySelectorAll('.app-dm-opt:not([disabled])')], i = opts.indexOf(document.activeElement);
      e.preventDefault(); const n = opts[(i + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length]; if (n) n.focus();
    }
  });
  document.addEventListener('change', e => {
    if (e.target.matches && e.target.matches('[data-dayview-pick]')) setMode(e.target.value);
  });

  document.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('[data-dm-toggle]')) { menuOpen = !menuOpen; return paintPicker(menuOpen ? 'menu' : null); }
    const pick = t.closest('[data-dm-pick]');
    if (pick) { if (pick.disabled) return; menuOpen = false; const same = pick.dataset.dmPick === modeFor(ds()); if (same) return paintPicker('btn'); return setMode(pick.dataset.dmPick); }
    if (menuOpen && !t.closest('.app-dm')) { menuOpen = false; paintPicker(); }
    const m = t.closest('[data-daymode]');
    if (m && !m.disabled) {
      const d = ds(); if (hasFood(d)) return;
      put('dayMode_' + d, m.dataset.daymode); put('eb_lastDayMode', m.dataset.daymode);
      window.EBAnalytics && EBAnalytics.track('day_mode_set', { mode: m.dataset.daymode });
      return refresh();
    }
    const n = t.closest('[data-guide-n]');
    if (n && !n.disabled) { const d = ds(), g = guideFor(d), k = +n.dataset.guideN; if (g.n === k || g.done.length) return;
      saveGuide(d, { n: k, split: SPLITS[k].map(x => x[1]), done: [] }); return refresh(); }
    const s = t.closest('[data-guide-split]');
    if (s) {
      // Bigger here means smaller in the largest other meal (never under 5%).
      const d = ds(), g = guideFor(d), i = +s.dataset.guideSplit, dl = +s.dataset.delta;
      const others = g.split.map((v, j) => [v, j]).filter(([, j]) => j !== i);
      const pick = dl > 0 ? others.filter(([v]) => v > 5).sort((a, b) => b[0] - a[0])[0]
                          : others.sort((a, b) => a[0] - b[0])[0];
      if (!pick || g.split[i] + dl < 5 || g.split[i] + dl > 70) return;
      g.split[i] += dl; g.split[pick[1]] -= dl; saveGuide(d, g); return refresh();
    }
    const dn = t.closest('[data-guide-done]');
    if (dn) {
      const d = ds(), g = guideFor(d), i = +dn.dataset.guideDone;
      g.done = g.done.includes(i) ? g.done.filter(x => x !== i) : g.done.concat(i);
      put('dayMode_' + d, 'guide'); saveGuide(d, g); return refresh();
    }
    const del = t.closest('[data-log-del]');
    if (del) {
      const d = ds(), log = getSlotLog(d), slot = del.dataset.logDel, i = +del.dataset.i;
      const arr = Array.isArray(log[slot]) ? log[slot] : log[slot] ? [log[slot]] : [];
      const gone = arr.splice(i, 1)[0];
      if (arr.length) log[slot] = arr; else delete log[slot];
      setSlotLog(d, log); refresh();
      EB.toast && EB.toast(`${(gone && gone.name || 'Item').replace(/<[^>]*>/g, '')} removed`);
    }
  });

  window.EBDayMode = { paint, refresh, modeFor, estimate, guideMeals };
})();
