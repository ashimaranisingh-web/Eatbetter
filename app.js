// ── App shell ─────────────────────────────────────────────────────────
// Five tabs at the bottom: Home, Food, Fitness, Chat, Profile.
// Food is the original meal-plan page. Fitness gets the activity log,
// weekly goals and an energy check-in that drives a workout suggestion.
// The cycle calendar and Mon–Sun day tabs are shared by Food and Fitness
// and move to whichever of the two is open.
(function () {
  const { esc, ICONS } = EB;
  const $ = id => document.getElementById(id);

  const TAB_ICONS = {
    home: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/></svg>',
    food: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18a9 9 0 01-18 0zM7 7c0-2 2-2 2-4M12 7c0-2 2-2 2-4M17 7c0-2 2-2 2-4"/></svg>',
    fitness: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/></svg>',
    chat: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    profile: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'
  };
  const TABS = [['home', 'Home'], ['food', 'Food'], ['fitness', 'Fitness'], ['chat', 'Chat'], ['profile', 'Profile']];

  // ── Energy check-in ──
  const ENERGY = [
    { v: 1, t: 'Low' }, { v: 2, t: 'Okay' }, { v: 3, t: 'Good' }, { v: 4, t: 'High' }
  ];
  const EKEY = 'eb_energy';
  function energyLog() { try { return JSON.parse(localStorage.getItem(EKEY) || '{}'); } catch { return {}; } }
  function energyFor(ds) { return energyLog()[ds] || 0; }
  function setEnergy(ds, v) {
    const log = energyLog(); if (log[ds] === v) delete log[ds]; else log[ds] = v;
    try { localStorage.setItem(EKEY, JSON.stringify(log)); } catch {}
  }

  // ── Workout suggestion: energy + cycle phase + what she likes doing ──
  const KCAL_PER_MIN = { walking: 4, yoga: 3, pilates: 4, strength: 6, hiit: 9, running: 10, dance: 7, sports: 7, cycling: 7, swimming: 8, stretching: 2.5 };
  const NAMES = { walking: 'Walk', yoga: 'Yoga', pilates: 'Pilates', strength: 'Strength training', hiit: 'HIIT', running: 'Run',
    dance: 'Dance workout', sports: 'Sport', cycling: 'Cycling', swimming: 'Swim', stretching: 'Stretching' };
  function phaseOf(ds) {
    try { const cs = getCycleStart(); return cs ? getPhaseForDate(ds, cs) : null; } catch { return null; }
  }
  function suggest(ds) {
    const energy = energyFor(ds);
    const info = phaseOf(ds);
    const phase = info && info.phase;
    const likes = (EB.getProfile().activity.types || []);
    const pick = (opts) => opts.find(o => likes.includes(o)) || opts[0];
    let kind, mins, why;
    if (!energy) return null;
    if (energy === 1 || (phase === 'menstrual' && info.dayNum <= 2)) {
      kind = pick(['yoga', 'walking', 'stretching']); mins = 20;
      why = phase === 'menstrual' ? 'Low energy and early in your period: keep it gentle.' : 'Low energy today: move gently, it still counts.';
    } else if (phase === 'luteal' || (typeof isPMSMode === 'function' && isPMSMode())) {
      kind = energy >= 3 ? pick(['strength', 'pilates', 'cycling']) : pick(['pilates', 'walking', 'yoga']); mins = energy >= 3 ? 40 : 30;
      why = 'PMS phase: moderate effort, lighter weights, more rest between sets.';
    } else if ((phase === 'follicular' || phase === 'ovulation') && energy >= 3) {
      kind = pick(['strength', 'hiit', 'running', 'dance', 'sports']); mins = energy === 4 ? 50 : 45;
      why = phase === 'ovulation' ? 'Peak-energy days: a good time to push harder.' : 'Energy is rising this phase: build strength.';
    } else {
      kind = energy >= 3 ? pick(['strength', 'dance', 'cycling', 'running']) : pick(['walking', 'pilates', 'yoga']);
      mins = energy >= 3 ? 40 : 30;
      why = energy >= 3 ? 'Good energy: a solid session.' : 'Steady day: something moderate.';
    }
    return { kind, name: NAMES[kind], mins, kcal: Math.round(KCAL_PER_MIN[kind] * mins), why };
  }

  function energyHTML(ds, compact) {
    const cur = energyFor(ds);
    return `<div class="app-card">
      <p class="app-card-label">${compact ? 'Energy today' : 'How’s your energy?'}</p>
      <div class="eb-seg app-energy" role="radiogroup" aria-label="Energy">
        ${ENERGY.map(e => `<button type="button" class="eb-seg-btn${cur === e.v ? ' on' : ''}" data-energy="${e.v}" role="radio" aria-checked="${cur === e.v}">${e.t}</button>`).join('')}
      </div>
      ${suggestionHTML(ds)}
    </div>`;
  }
  function suggestionHTML(ds) {
    const s = suggest(ds);
    if (!s) return '<p class="app-muted">Tap how you feel and I’ll suggest a workout for your energy and cycle.</p>';
    const done = getActivities(ds).some(a => a.suggested === ds);
    return `<div class="app-suggest">
      <div><b>${esc(s.name)} · ${s.mins} min</b><span>${esc(s.why)}</span></div>
      <button type="button" class="eb-btn ${done ? 'secondary' : 'primary'} sm" data-log-suggest ${done ? 'disabled' : ''}>${done ? 'Logged' : `Log ~${s.kcal} cal`}</button>
    </div>`;
  }

  // ── Home ──
  function todayKey() { return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]; }
  function greeting(name) {
    const h = new Date().getHours();
    const part = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
    return name ? `${part}, ${esc(name.split(' ')[0])}` : part;
  }
  function nextMeal() {
    const ds = selectedDateStr(), pms = isPMSMode();
    const slots = (pms ? PMS_MEAL_SLOTS : MEAL_SLOTS).filter(s => ['breakfast', 'lunch', 'snack', 'dinner'].includes(s.id));
    const log = getSlotLog(ds);
    const s = slots.find(sl => !log[sl.id] && !getSlotEaten(ds, sl.id));
    if (!s) return null;
    const m = getEffectiveDefaultMeal(s, currentDay, pms);
    return m && { slot: s.name, time: s.time, name: m.name, cal: m.cal };
  }
  function renderHome() {
    const page = $('pageHome'); if (!page) return;
    if (currentDay !== todayKey()) { currentDay = todayKey(); try { renderTabs(); } catch {} }
    const ds = selectedDateStr();
    const p = EB.getProfile();
    const eaten = computeConsumed(currentDay).cal;
    const target = isPMSMode() ? PMS_TARGETS.cal : TARGETS.cal;
    const pct = Math.min(100, Math.round(eaten / target * 100));
    const info = phaseOf(ds);
    const meta = info && PHASE_META[info.phase];
    const nm = nextMeal();
    page.querySelector('.app-home-body').innerHTML = `
      <header class="app-head">
        <p class="app-date">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1>${greeting(p.name)}</h1>
      </header>
      <div class="app-card">
        <div class="app-row">
          <p class="app-card-label">Today</p>
          ${meta ? `<span class="app-phase"><i style="background:${meta.color}"></i>Day ${info.dayNum} · ${meta.label}</span>`
                 : `<button type="button" class="eb-link" data-go="food">Add your period date</button>`}
        </div>
        <div class="app-cal"><b>${eaten.toLocaleString()}</b><span>of ${target.toLocaleString()} cal</span></div>
        <div class="bar"><div class="bar-fill cal" style="width:${pct}%;background:var(--accent)"></div></div>
        ${nm ? `<button type="button" class="app-next" data-go="food">
            <span><small>Next · ${esc(nm.slot)} · ${esc(nm.time)}</small><b>${esc(nm.name)}</b></span>
            <span class="app-next-cal">${Math.round(nm.cal)} cal ${ICONS.chevron}</span></button>`
              : '<p class="app-muted">All of today’s meals are logged.</p>'}
      </div>
      ${energyHTML(ds)}`;
  }

  // ── Fitness ──
  function renderFitnessPage() {
    const page = $('pageFitness'); if (!page) return;
    const ds = selectedDateStr();
    page.querySelector('.app-fit-energy').innerHTML = energyHTML(ds, true);
    const sub = page.querySelector('.app-fit-sub');
    const burned = getActivities(ds).reduce((a, x) => a + (parseInt(x.cal) || 0), 0);
    sub.textContent = `${DAY_NAMES[currentDay]} · ${burned ? burned.toLocaleString() + ' cal burned' : 'nothing logged yet'}`;
  }

  // ── Building the pages from the existing single page ──
  let active = 'home';
  function build() {
    const container = document.querySelector('.container');
    if (!container || $('pageFood')) return;
    document.body.classList.add('has-tabs');
    const header = container.querySelector(':scope > header');
    const mk = (id, cls = '') => { const d = document.createElement('section'); d.id = id; d.className = 'app-page ' + cls; return d; };

    const home = mk('pageHome');
    home.innerHTML = '<div class="app-home-body"></div>';
    const weekly = $('weeklyTrackerSection');
    home.appendChild(weekly);

    const food = mk('pageFood');
    const foodHead = document.createElement('header'); foodHead.className = 'app-head';
    foodHead.innerHTML = '<div class="app-head-row"><h1>Food</h1></div>';
    const reset = $('resetBtn'); if (reset) foodHead.firstChild.appendChild(reset);
    foodHead.appendChild($('modeSubtitle'));
    food.appendChild(foodHead);
    const calSlotFood = document.createElement('div'); calSlotFood.className = 'app-shared';
    food.appendChild(calSlotFood);
    ['insightSection', 'tracker', 'survivalBadgeSection'].forEach(id => food.appendChild($(id)));
    food.appendChild($('modeToggleBar'));
    food.appendChild($('cravingWrap'));
    food.appendChild($('slotSection'));
    const drawers = [...container.querySelectorAll(':scope > .drawer-group')];
    const activityGroup = drawers.find(g => g.querySelector('#activityBlock'));
    drawers.filter(g => g !== activityGroup).forEach(g => food.appendChild(g));

    const fit = mk('pageFitness');
    fit.innerHTML = `<header class="app-head"><h1>Fitness</h1><p class="subtitle app-fit-sub"></p></header>
      <div class="app-shared"></div><div class="app-fit-energy"></div>`;
    if (activityGroup) {
      fit.appendChild(activityGroup);
      const det = activityGroup.querySelector('#activityBlock'); if (det) det.open = true;
    }

    if (header) header.style.display = 'none';
    // Where the shared calendar + day tabs wait while Home is open
    const park = document.createElement('div'); park.id = 'appParking'; park.hidden = true;
    container.append(home, food, fit, park);

    // Tab bar
    const bar = document.createElement('nav');
    bar.className = 'eb-tabbar';
    bar.setAttribute('aria-label', 'Main');
    bar.innerHTML = TABS.map(([id, t]) => `<button type="button" data-tab="${id}">${TAB_ICONS[id]}<span>${t}</span></button>`).join('');
    document.body.appendChild(bar);
    bar.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });

    document.addEventListener('click', onPageClick);
    new MutationObserver(markActive).observe(document.body, { childList: true });

    // Keep Home/Fitness in step with the rest of the app
    const wrap = name => { const orig = window[name]; if (typeof orig !== 'function') return;
      window[name] = function () { const r = orig.apply(this, arguments); repaint(); return r; }; };
    ['switchDay', 'renderTracker', 'renderActivity', 'setMode'].forEach(wrap);
    document.addEventListener('eb:profile', repaint);

    go(location.hash.replace('#', '') || 'home', true);
  }

  let painting = false;
  function repaint() {
    if (painting) return; painting = true;
    try { if (active === 'home') renderHome(); if (active === 'fitness') renderFitnessPage(); } finally { painting = false; }
  }

  // Move the calendar and day tabs into the open page.
  function placeShared(page) {
    const slot = page.id === 'appParking' ? page : page.querySelector('.app-shared'); if (!slot) return;
    slot.appendChild($('cycleSection'));
    const days = document.querySelector('.day-tabs'); if (days) slot.appendChild(days);
    // Moving the strip resets its scroll; repaint so today is centred again.
    if (page.id !== 'appParking') { try { renderCycleCalendar(); } catch {} }
  }

  function go(tab, initial) {
    if (tab === 'chat') { if (window.EBAssistant) EBAssistant.open(); return markActive(); }
    if (tab === 'profile') { if (window.EBProfile) EBProfile.open(); return markActive(); }
    if (!['home', 'food', 'fitness'].includes(tab)) tab = 'home';
    active = tab;
    ['home', 'food', 'fitness'].forEach(t => { $('page' + t[0].toUpperCase() + t.slice(1)).hidden = t !== tab; });
    placeShared(tab === 'food' ? $('pageFood') : tab === 'fitness' ? $('pageFitness') : $('appParking'));
    if (tab === 'home') { renderHome(); try { renderWeeklyTracker(); } catch {} }
    if (tab === 'fitness') { renderFitnessPage(); try { renderActivity(); } catch {} }
    if (tab === 'food') { try { renderTracker(); renderSlotSection(); } catch {} }
    history.replaceState(null, '', '#' + tab);
    if (!initial) window.scrollTo(0, 0);
    markActive();
  }
  // Chat and Profile are overlays: their tab lights up while they're open.
  function markActive() {
    const overlay = document.querySelector('.as-overlay') ? 'chat' : document.querySelector('.ob.pf') ? 'profile' : null;
    document.querySelectorAll('.eb-tabbar [data-tab]').forEach(b => {
      const on = b.dataset.tab === (overlay || active);
      b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false');
    });
  }

  function onPageClick(e) {
    const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); return go(g.dataset.go); }
    const en = e.target.closest('[data-energy]');
    if (en) { setEnergy(selectedDateStr(), +en.dataset.energy); return repaint(); }
    const ls = e.target.closest('[data-log-suggest]');
    if (ls && !ls.disabled) {
      const ds = selectedDateStr(), s = suggest(ds); if (!s) return;
      const list = getActivities(ds);
      list.push({ name: s.name, cal: s.kcal, ts: Date.now(), suggested: ds });
      setActivities(ds, list);
      renderActivity(); renderTracker(); try { renderWeeklyTracker(); } catch {}
      EB.toast(`${s.name} logged`);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  window.EBApp = { go, suggest, energyFor };
})();
