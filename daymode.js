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
    // Lunch heaviest, breakfast second, a small snack, a lighter dinner.
    3: [['Breakfast', 35], ['Lunch', 40], ['Dinner', 25]],
    4: [['Breakfast', 30], ['Lunch', 35], ['Snack', 10], ['Dinner', 25]],
    5: [['Breakfast', 25], ['Mid-morning', 10], ['Lunch', 35], ['Snack', 10], ['Dinner', 20]]
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
        <button type="button" class="app-dm-btn" data-dm-toggle aria-haspopup="listbox" aria-expanded="${menuOpen}" aria-label="How you eat today: ${m.t}">
          <b>${m.t}</b>${CHEVRON}
        </button>
        ${menuOpen ? `<ul class="app-dm-menu" role="listbox" aria-label="How you eat today">${MODES.map(x => `<li>
            <button type="button" class="app-dm-opt${x.v === mode ? ' on' : ''}" role="option" aria-selected="${x.v === mode}" data-dm-pick="${x.v}"${locked && x.v !== mode ? ' disabled' : ''}>
              <span><b>${x.t}</b><small>${x.line}</small></span>${x.v === mode ? CHECK : ''}
            </button></li>`).join('')}${locked ? '<li><p class="app-dm-lock">Set for this day, since you’ve started. Pick again tomorrow.</p></li>' : ''}</ul>` : ''}
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
    let deficit = 0;
    try { const n = window.EBPlanner && EBPlanner.numbers(EB.getProfile()); if (n) deficit = n.deficit; } catch {}
    // Plain words instead of percentages: which meal is big and which is light.
    const order = meals.map((m, i) => [m.pct, i]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    const size = (m, i) => /snack|mid-morning/i.test(m.name) ? 'A small snack'
      : i === order[0] ? 'Your heaviest meal' : i === order[1] ? 'Second heaviest' : 'Keep it light';
    const pms = typeof isPMSMode === 'function' && isPMSMode();
    return `<div class="app-card app-guide">
      <div class="app-row"><p class="app-card-label">Meals today</p>
        <div class="eb-seg app-guide-n" role="radiogroup" aria-label="Meals today">${[3, 4, 5].map(n =>
          `<button type="button" class="eb-seg-btn${g.n === n ? ' on' : ''}" data-guide-n="${n}" role="radio" aria-checked="${g.n === n}"${g.done.length && g.n !== n ? ' disabled' : ''}>${n}</button>`).join('')}</div></div>
      <p class="app-guide-why">You have <b>${T.cal.toLocaleString()} cal</b> a day${deficit > 0 ? `, with a ${deficit.toLocaleString()} cal deficit included` : ''}${pms ? ' (plus about 150 for PMS days)' : ''}. Aim for <b>${T.p} g protein</b>, ${T.c} g carbs and ${T.f} g fat.</p>
      <ul class="app-guide-list">${meals.map((m, i) => `<li class="${m.done ? 'done' : ''}">
          <button type="button" class="app-guide-tick" data-guide-done="${i}" aria-pressed="${m.done}" aria-label="${esc(m.name)} done"></button>
          <div class="app-guide-text">
            <div class="app-guide-head"><b>${esc(m.name)}</b><span>${m.lo}–${m.hi} cal</span></div>
            <p><span class="app-guide-size">${size(m, i)}</span> · about ${m.p} g protein</p>
          </div></li>`).join('')}</ul>
      <p class="app-muted small">Tick a meal when you’ve had it; it counts at the middle of its range. General guidance, not medical advice.</p>
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

  // ── Pages inside the app (back button, tab bar stays) ──
  function subpage(title, onClose) {
    closeSubpages();
    const el = document.createElement('div');
    el.className = 'ob pf app-subpage';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', title);
    el.innerHTML = `<div class="ob-top"><button type="button" class="eb-icon-btn" data-sub-close aria-label="Back"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button><h1 class="pf-title">${esc(title)}</h1><span class="eb-icon-btn" aria-hidden="true"></span></div><div class="ob-body app-subpage-body"></div>`;
    el._close = () => { onClose && onClose(); el.remove(); document.documentElement.classList.remove('eb-locked'); };
    el.addEventListener('click', e => { if (e.target.closest('[data-sub-close]')) el._close(); });
    document.body.appendChild(el);
    document.documentElement.classList.add('eb-locked');
    return el.querySelector('.app-subpage-body');
  }
  function closeSubpages() { document.querySelectorAll('.app-subpage').forEach(p => p._close ? p._close() : p.remove()); }

  // ── Craving something? (its own page) ──
  function openCraving() {
    window.EBAnalytics && EBAnalytics.track('craving_opened');
    const crave = $('cravingWrap'); if (!crave) return;
    const home = crave.parentElement, next = crave.nextSibling;
    const body = subpage('Craving something?', () => { home.insertBefore(crave, next); crave.classList.remove('in-page'); });
    crave.classList.add('in-page');
    body.appendChild(crave);
    setTimeout(() => { const i = $('cravingInput'); if (i) i.focus(); }, 80);
  }

  // ── Your meal plan: diet, cuisines and usual foods → a week of meals ──
  const profile = () => { try { return EB.getProfile(); } catch { return null; } };
  function foodsHTML() {
    const p = profile(); if (!p || !p.food) return '';
    if (String(p.food.usual || '').trim()) return '';
    return `<div class="app-card app-foods">
      <p class="app-foods-t">Build your plan around food you like</p>
      <p class="app-foods-d">Tell us what you usually eat and we’ll plan a week around it, at your calories, with PMS days included.</p>
      <button type="button" class="eb-btn primary" data-foods-open>Prepare my meal plan</button>
    </div>`;
  }
  const chipRow = (name, list, sel, multi) => `<div class="eb-chips" role="group">${list.map(o => {
    const on = multi ? (sel || []).includes(o.v) : sel === o.v;
    return `<button type="button" class="eb-chip${on ? ' on' : ''}" data-mp="${name}" data-v="${o.v}" ${multi ? 'data-multi' : ''} aria-pressed="${on}">${esc(o.t)}</button>`; }).join('')}</div>`;
  function openMealPlan() {
    const p = profile(); if (!p) return;
    const draft = { diet: p.food.diet || '', cuisines: (p.food.cuisines || []).slice(), usual: p.food.usual || '' };
    const O = window.EBOnboarding || {};
    const body = subpage('Your meal plan');
    const paintForm = () => {
      body.innerHTML = `
        <p class="app-mp-lead">We plan 7 days of meals at your daily calories, built around food you like, with warmer, comforting meals on PMS days.</p>
        <p class="eb-label">How do you eat?</p>${chipRow('diet', O.DIETS || [], draft.diet, false)}
        <p class="eb-label">Food you enjoy</p>${chipRow('cuisines', O.CUISINES || [], draft.cuisines, true)}
        <p class="eb-label">What do you eat on a usual day?</p>
        <textarea class="eb-input app-mp-usual" id="mpUsual" rows="6" placeholder="e.g. poha and chai for breakfast, dal rice and sabzi for lunch, makhana in the evening, paneer and roti at night">${esc(draft.usual)}</textarea>
        <p class="app-mp-err" id="mpErr" role="alert"></p>
        <button type="button" class="eb-btn primary app-mp-go" data-mp-go>Prepare my meal plan</button>`;
    };
    paintForm();
    body.addEventListener('input', e => { if (e.target.id === 'mpUsual') draft.usual = e.target.value; });
    body.addEventListener('click', e => {
      const c = e.target.closest('[data-mp]');
      if (c) {
        const k = c.dataset.mp, v = c.dataset.v;
        if (k === 'diet') draft.diet = draft.diet === v ? '' : v;
        else draft.cuisines = draft.cuisines.includes(v) ? draft.cuisines.filter(x => x !== v) : draft.cuisines.concat(v);
        draft.usual = ($('mpUsual') || {}).value || draft.usual;
        return paintForm();
      }
      if (e.target.closest('[data-mp-go]')) {
        if (!draft.diet) { $('mpErr').textContent = 'Pick how you eat first.'; return; }
        const fresh = profile();
        Object.assign(fresh.food, { diet: draft.diet, cuisines: draft.cuisines, usual: draft.usual.trim() });
        EB.saveProfile(fresh);
        return dishList(body, 'Build my plan', prepare);
      }
    });
    function prepare() {
        window.EBAnalytics && EBAnalytics.track('meal_plan_prepared', { diet: draft.diet, cuisines: (draft.cuisines || []).length });
        if (window.EBPlanner) EBPlanner.rebuild ? EBPlanner.rebuild() : EBPlanner.refresh();
        body.innerHTML = `<div class="ob-calc"><div class="ob-calc-load"><div class="ob-calc-spin"></div><p>Preparing your meal plan</p>
          <ul><li>Reading the foods you usually eat</li><li>Fitting them to your daily calories</li><li>Balancing protein, carbs and fibre</li><li>Adding comforting meals for PMS days</li></ul></div></div>`;
        setTimeout(() => {
          const plan = window.EBPlanner && EBPlanner.current(), t = plan && plan.targets;
          body.innerHTML = `<div class="app-mp-done">
            <p class="app-mp-tick" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></p>
            <h2>Your meal plan is ready</h2>
            <ul class="app-mp-sum">
              ${t ? `<li><b>${t.normal.cal.toLocaleString()} cal</b> and <b>${t.normal.p} g protein</b> a day</li>` : ''}
              ${t ? `<li>PMS days: <b>${t.pms.cal.toLocaleString()} cal</b>, warmer and more comforting</li>` : ''}
              <li>7 days, 4 meals a day, built around what you eat</li>
            </ul>
            <button type="button" class="eb-btn primary" data-sub-close>See my plan</button></div>`;
          refresh();
        }, 1800);
    }
  }

  // ── Dishes in your plan: everything her diet allows, ones that match her
  // usual foods first. Tap to cross out; crossed-out dishes never get planned.
  const MEAL_NAMES = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };
  const MIN_LEFT = 3;   // keep enough per meal for a varied week
  function dishList(body, cta, onDone) {
    const paint = () => {
      const p = profile(); if (!p || !window.EBPlanner || !EBPlanner.suggest) return onDone();
      const groups = EBPlanner.suggest(p);
      const matched = groups.reduce((n, g) => n + g.dishes.filter(d => d.hits.length).length, 0);
      body.innerHTML = `
        <p class="app-mp-lead">${matched ? `<b>${matched} dishes</b> use foods you mentioned, so they come up most. ` : ''}Cross out anything that doesn’t work for you and it won’t be planned.</p>
        ${groups.map(g => `
          <p class="eb-group-label">${MEAL_NAMES[g.slot]}</p>
          <div class="eb-list dish-list">${g.dishes.map(d => `
            <button type="button" class="eb-list-row dish-row${d.out ? ' out' : ''}" data-dish="${esc(d.name)}" data-slot="${g.slot}" aria-pressed="${d.out}">
              <span class="eb-row-text"><span class="eb-list-label dish-name">${esc(d.name)}</span>
                <span class="eb-list-value">${d.hits.length ? `<span class="dish-tag">You eat ${esc(d.hits[0])}</span> ` : ''}${esc(d.what)}</span></span>
              <span class="dish-x" aria-hidden="true">${d.out ? '↺' : '✕'}</span>
            </button>`).join('')}</div>`).join('')}
        <button type="button" class="eb-btn primary app-mp-go" data-dish-done>${esc(cta)}</button>`;
    };
    paint();
    body.onclick = e => {
      const row = e.target.closest('[data-dish]');
      if (row) {
        const p = profile(), name = row.dataset.dish;
        const skip = (p.food.skip || []).slice(), i = skip.indexOf(name);
        if (i >= 0) skip.splice(i, 1);
        else {
          const g = EBPlanner.suggest(p).find(x => x.slot === row.dataset.slot);
          const left = g ? g.dishes.filter(d => !d.out).length : 99;
          if (left <= MIN_LEFT) return EB.toast(`Keep at least ${MIN_LEFT} for ${MEAL_NAMES[row.dataset.slot].toLowerCase()}`);
          skip.push(name);
          window.EBAnalytics && EBAnalytics.track('dish_crossed_out', { slot: row.dataset.slot });
        }
        p.food.skip = skip; EB.saveProfile(p);
        const y = body.closest('.ob-body') ? body.closest('.ob-body').scrollTop : 0;
        paint(); if (body.closest('.ob-body')) body.closest('.ob-body').scrollTop = y;
        return;
      }
      if (e.target.closest('[data-dish-done]')) { body.onclick = null; onDone(); }
    };
  }
  function openDishes() {
    const body = subpage('Dishes in your plan');
    dishList(body, 'Done', () => { if (window.EBPlanner) EBPlanner.refresh(); closeSubpages(); });
  }
  document.addEventListener('click', e => {
    const t = e.target; if (!t.closest) return;
    if (t.closest('[data-foods-open]')) return openMealPlan();
    if (t.closest('[data-crave-open]')) return openCraving();
    // Craving swap → log it: close the craving page and open it in food search, calories filled in.
    const cl = t.closest('[data-crave-log]');
    if (cl) {
      closeSubpages();
      window.EBAnalytics && EBAnalytics.track('craving_swap_logged');
      if (window.EBFoodLog) EBFoodLog.focusSearch(null, cl.dataset.craveLog, { cal: +cl.dataset.craveCal || null });
      return;
    }
    if (t.closest('[data-tools-search]')) { searchOpen = true; if (window.EBFoodLog && EBFoodLog.focus) EBFoodLog.focus(); paint(); const i = $('flSearch'); if (i) i.focus(); return; }
    if (t.closest('[data-tools-scan]')) { searchOpen = true; paint(); const b = document.querySelector('#foodLog [data-fl-scan]'); if (b) b.click(); return; }
    if (t.closest('[data-tools-close]')) { searchOpen = false; if (window.EBFoodLog && EBFoodLog.reset) EBFoodLog.reset(); return paint(); }
  });

  let searchOpen = false;   // Plan days: is the search row unfolded into a bar?
  function openSearch() { searchOpen = true; if (window.EBFoodLog && EBFoodLog.focus) EBFoodLog.focus(); }
  function closeSearch() { searchOpen = false; if (window.EBFoodLog && EBFoodLog.reset) EBFoodLog.reset(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && searchOpen && !$('flSheet')) { closeSearch(); paint(); } });
  function paint() {
    const page = $('pageFood'); if (!page) return;
    if (!$('dayModeSearch')) {
      const body = document.createElement('div'); body.id = 'dayModeBody';
      const search = document.createElement('div'); search.id = 'dayModeSearch';
      page.appendChild(search); page.appendChild(body);
    }
    const d = ds(), mode = modeFor(d), locked = hasFood(d);
    page.dataset.dayview = mode;   // not "daymode": that name belongs to the picker buttons
    // Order: Normal / PMS → day numbers → search → "Craving something?" → Guide / Log → meals → "Change the foods your plan uses"
    // (Normal / PMS sits above the day numbers; app.js places it.)
    // Plan days: the meals are already listed, so search is folded into one quiet row under
    // the numbers: "Craving some junk?" on the left, search and scan icons on the right.
    // Everything below goes after the switch + numbers block (app.js), or the numbers alone.
    const tracker = $('tracker') && ($('tracker').closest('.app-modecard') || $('tracker')), search = $('dayModeSearch'), body = $('dayModeBody'), crave = $('cravingWrap');
    const plan = mode === 'plan';
    let tools = $('dayModeTools');
    if (plan && !tools) {
      tools = document.createElement('div'); tools.id = 'dayModeTools'; tools.className = 'app-tools';
      tools.innerHTML = `<button type="button" class="app-tools-crave" data-crave-open>Craving some junk? <b>Find alternatives</b></button>
        <span class="app-tools-icons">
          <button type="button" class="app-tools-btn" data-tools-search aria-label="Search food"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></button>
          <button type="button" class="app-tools-btn" data-tools-scan aria-label="Scan a barcode"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/></svg></button>
        </span>`;
    }
    // Plan / Guide days: search is its own full-screen page (recent + frequent foods),
    // so the meal list underneath never gets mixed up with results.
    const open = mode !== 'log' && (searchOpen || (window.EBFoodLog && EBFoodLog.isActive && EBFoodLog.isActive()));
    page.classList.toggle('tools-open', !!open);
    document.body.classList.toggle('fl-page-open', !!open);
    if (plan) {
      if (tracker && tracker.nextElementSibling !== tools) tracker.after(tools);
      if (tools.nextElementSibling !== search) tools.after(search);
      if (search.nextElementSibling !== body) search.after(body);
    } else {
      if (tools) tools.remove();
      if (tracker && tracker.nextElementSibling !== search) tracker.after(search);
    }
    let link = $('craveLink');
    if (!link) { link = document.createElement('button'); link.type = 'button'; link.id = 'craveLink'; link.className = 'eb-link app-crave-link'; link.setAttribute('data-crave-open', ''); link.textContent = 'Craving something?'; }
    // Plan days: the craving link lives in the row above. Otherwise it sits under search.
    if (plan) { if (link.parentElement) link.remove(); }
    else {
      if (search.nextElementSibling !== link) search.after(link);
      if (link.nextElementSibling !== body) link.after(body);
    }
    // The finder itself waits, hidden, until the link opens it on its own page.
    if (crave && !crave.classList.contains('in-page') && crave.parentElement !== page) page.appendChild(crave);
    const ci = $('cravingInput');
    if (ci && ci.placeholder !== 'Sweet, salty, spicy, crunchy…') { ci.placeholder = 'Sweet, salty, spicy, crunchy…'; ci.setAttribute('aria-label', 'What are you craving?'); }
    // Plan days: the meal-plan editor sits at the bottom of the page.
    let foot = $('mealPlanFoot');
    if (!foot) { foot = document.createElement('div'); foot.id = 'mealPlanFoot'; }
    const slots = $('slotSection');
    if (slots && slots.nextElementSibling !== foot) slots.after(foot);
    const p = profile();
    foot.innerHTML = mode === 'plan' && p && String(p.food && p.food.usual || '').trim()
      ? `<button type="button" class="app-tools-crave app-mp-text" data-foods-open>Want different meals? <b>Change your plan’s foods</b></button>` : '';
    // Log mode's body has its own full search (with the logged list).
    search.classList.toggle('fl-page', !!open);
    if (open) search.setAttribute('role', 'dialog'); else search.removeAttribute('role');
    search.setAttribute('aria-label', 'Search food');
    const bar = `<button type="button" class="fl-fakebar" data-tools-search><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>Search food, e.g. 2 roti</span></button>`;
    search.innerHTML = mode === 'log' || !window.EBFoodLog ? ''
      : open ? `<div class="flp-head"><button type="button" class="flp-back" data-tools-close aria-label="Back"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Back</button><b>Add food</b><span></span></div>${EBFoodLog.html(d, { compact: true })}`
      : plan ? '' : bar;
    body.innerHTML = mode === 'guide' ? guideHTML(d) : mode === 'log' ? logHTML(d) : foodsHTML();
    if (window.EBFoodLog) EBFoodLog.mounted();
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

  // Profile → How you track food. Applies from today on; past days keep theirs.
  // Today's food is cleared first (the caller confirms that with her).
  function clearDay(d) {
    ['slots_', 'guide_', 'wakeup_items_', 'wakeup_checked_'].forEach(k => { try { localStorage.removeItem(k + d); } catch {} });
    try { Object.keys(localStorage).filter(k => k.startsWith('slotEaten_' + d + '_')).forEach(k => localStorage.removeItem(k)); } catch {}
  }
  function changeMode(v) {
    if (!MODES.some(x => x.v === v)) return;
    const d = todayStr();
    if (hasFood(d)) clearDay(d);
    put('eb_lastDayMode', v); put('dayMode_' + d, v);
    window.EBAnalytics && EBAnalytics.track('day_mode_set', { mode: v });
    refresh();
  }
  const currentMode = () => modeFor(todayStr());

  window.EBDayMode = { openSearch, closeSearch, subpage, closeSubpages, openMealPlan, openDishes, paint, refresh, modeFor, estimate, guideMeals, changeMode, currentMode, hasFood, MODES };
})();
