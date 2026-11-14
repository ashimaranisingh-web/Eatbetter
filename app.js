// ── App shell ─────────────────────────────────────────────────────────
// Tabs at the bottom: Home, Menstruation, Nutrition (food), Fitness, plus a
// round Luna (chat) button. Profile opens from the avatar on Home.
// Food is the original meal-plan page. Fitness gets the energy check-in,
// workout options, Apple Health, the activity log and weekly goals.
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
    profile: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
  };
  TAB_ICONS.cycle = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c3.5 4.2 6 7.6 6 11a6 6 0 01-12 0c0-3.4 2.5-6.8 6-11z"/></svg>';
  // Plain labels: the Me·Nu·Fi letter play lives on the splash screen only.
  const TABS = [['home', 'Home'], ['cycle', 'Menstruation'], ['food', 'Nutrition'], ['fitness', 'Fitness']];
  const PAGES = ['home', 'cycle', 'food', 'fitness'];
  const pageEl = t => $('page' + t[0].toUpperCase() + t.slice(1));
  // Luna (chat) sits apart from the tabs as a round button, like an assistant key.
  const MIRA_ICON = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8z"/></svg>';

  // ── Energy check-in ──
  const ENERGY = [{ v: 1, t: 'Low' }, { v: 2, t: 'Okay' }, { v: 3, t: 'Good' }, { v: 4, t: 'High' }];
  const EKEY = 'eb_energy';
  function energyLog() { try { return JSON.parse(localStorage.getItem(EKEY) || '{}'); } catch { return {}; } }
  function energyFor(ds) { return energyLog()[ds] || 0; }
  function setEnergy(ds, v) {
    const log = energyLog(); if (v) log[ds] = v; else delete log[ds];
    try { localStorage.setItem(EKEY, JSON.stringify(log)); } catch {}
  }

  // ── Workout options: energy + cycle phase + what she likes doing ──
  const KCAL_PER_MIN = { walking: 4, yoga: 3, pilates: 4, strength: 6, hiit: 9, running: 10, dance: 7, sports: 7, cycling: 7, swimming: 8, stretching: 2.5 };
  const NAMES = { walking: 'Walk', yoga: 'Yoga', pilates: 'Pilates', strength: 'Strength training', hiit: 'HIIT', running: 'Run',
    dance: 'Dance workout', sports: 'Sport', cycling: 'Cycling', swimming: 'Swim', stretching: 'Stretching' };
  const MINS = { hiit: 25, stretching: 15, running: 30 };
  function phaseOf(ds) {
    try { const cs = getCycleStart(); return cs ? getPhaseForDate(ds, cs) : null; } catch { return null; }
  }
  function suggest(ds, assumed) {
    const energy = energyFor(ds) || assumed;   // the widget assumes "Okay" until she taps one
    if (!energy) return null;
    const info = phaseOf(ds), phase = info && info.phase;
    let kinds, mins, why;
    if (energy === 1 || (phase === 'menstrual' && info.dayNum <= 2)) {
      kinds = ['yoga', 'walking', 'stretching', 'pilates', 'swimming']; mins = 25;
      why = phase === 'menstrual' ? 'Low energy and early in your period. Keep it gentle.' : 'Low energy today. Gentle movement still counts.';
    } else if (phase === 'luteal' || (typeof isPMSMode === 'function' && isPMSMode())) {
      kinds = energy >= 3 ? ['strength', 'pilates', 'cycling', 'swimming', 'walking'] : ['pilates', 'walking', 'yoga', 'swimming', 'stretching'];
      mins = energy >= 3 ? 35 : 30;
      why = 'PMS phase: moderate effort, lighter weights, more rest.';
    } else if ((phase === 'follicular' || phase === 'ovulation') && energy >= 3) {
      kinds = ['strength', 'hiit', 'running', 'dance', 'sports']; mins = energy === 4 ? 50 : 45;
      why = phase === 'ovulation' ? 'Peak-energy days. A good time to push harder.' : 'Energy is rising this phase. Build strength.';
    } else {
      kinds = energy >= 3 ? ['strength', 'dance', 'cycling', 'running', 'swimming'] : ['walking', 'pilates', 'yoga', 'cycling', 'dance'];
      mins = energy >= 3 ? 40 : 30;
      why = energy >= 3 ? 'Good energy. A solid session.' : 'A steady day. Something moderate.';
    }
    // Activities she picked in onboarding come first.
    const likes = EB.getProfile().activity.types || [];
    kinds = [...kinds.filter(k => likes.includes(k)), ...kinds.filter(k => !likes.includes(k))].slice(0, 5);
    const options = kinds.map(k => {
      const m = MINS[k] && MINS[k] < mins ? MINS[k] : mins;
      return { kind: k, name: NAMES[k], mins: m, kcal: Math.round(KCAL_PER_MIN[k] * m) };
    });
    return { why, options };
  }

  // ── Food picks: three easy foods to lift or hold energy, by energy + phase + diet ──
  function foodIdeas(ds) {
    const energy = energyFor(ds);
    if (!energy) return [];
    const info = phaseOf(ds), phase = info && info.phase;
    const diet = EB.getProfile().food.diet || 'veg';
    const protein = { vegan: ['Tofu', 'Protein from soya, keeps you full'], jain: ['Paneer', 'Protein that keeps energy steady'],
      egg: ['Boiled egg', 'Protein that keeps energy steady'], pescatarian: ['Boiled egg', 'Protein that keeps energy steady'],
      nonveg: ['Chicken', 'Lean protein for recovery'] }[diet] || ['Paneer', 'Protein that keeps energy steady'];
    let picks;
    if (phase === 'menstrual') picks = [['Dates', 'Quick energy and a little iron'], ['Banana', 'Easy carbs and potassium for cramps'], ['Khichdi', 'Warm and easy to digest'], ['Palak', 'Iron to replace what you lose'], ['Ginger tea', 'Warm, settles the stomach']];
    else if (phase === 'luteal' || (typeof isPMSMode === 'function' && isPMSMode())) picks = [['Oats', 'Slow carbs, fewer sugar crashes'], ['Almonds', 'Magnesium can ease cramps and mood'], ['Banana', 'B6 and easy energy'], ['Roasted chana', 'Protein and fibre for cravings'], ['Curd', 'Calcium may ease PMS']];
    else if (energy <= 2) picks = [['Banana', 'Fast, easy energy'], ['Dates', 'A natural sugar lift'], ['Coconut water', 'Tiredness is often thirst'], ['Peanuts', 'Protein and fat that last'], ['Poha', 'Light carbs that don’t weigh you down']];
    else picks = [protein, ['Sprouts', 'Fibre and protein, slow release'], ['Coconut water', 'Fluids and electrolytes for training'], ['Curd', 'Protein and gut-friendly'], ['Apple', 'Fibre for steady energy']];
    const all = window.EBMeals ? EBMeals.foods() : [];
    return picks.map(([n, why]) => {
      const f = all.find(x => x.n.toLowerCase().startsWith(n.toLowerCase())) || all.find(x => x.n.toLowerCase().includes(n.toLowerCase()));
      return { n, why, cal: f ? f.cal : null };
    });
  }

  // One suggested pairing: the top workout plus the food that suits it.
  // Low energy: eat first for a lift. Good/High: protein after to recover.
  // Okay: a food for this cycle phase after. Reason comes from the phase.
  const PHASE_WHY = { menstrual: 'iron helps replace what your period takes', follicular: 'protein builds muscle fastest now',
    ovulation: 'fibre helps clear the oestrogen peak', luteal: 'slow carbs keep cravings steady' };
  function comboHTML(ds, s, foods) {
    const w = s.options[0]; if (!w) return '';
    const energy = energyFor(ds), info = phaseOf(ds), phase = info && info.phase;
    const pf = phase ? (phaseFoods(phase, EB.getProfile().food.diet || 'veg') || {}).foods || [] : [];
    const protein = foods.find(f => /protein/i.test(f.why));
    let line, why;
    if (energy === 1) {
      const f = foods[0]; if (!f) return '';
      line = `A little <b>${esc(f.n)}</b> first, then <b>${w.mins} min ${esc(w.name.toLowerCase())}</b>`;
      why = 'Easy fuel before gentle movement lifts a low day.';
    } else if (energy >= 3 && (protein || pf[0])) {
      const n = protein ? protein.n : pf[0];
      line = `<b>${w.mins} min ${esc(w.name.toLowerCase())}</b>, then <b>${esc(n)}</b> within the hour`;
      why = 'Protein after a hard session helps your muscles recover.';
    } else {
      const n = pf[0] || (foods[0] && foods[0].n); if (!n) return '';
      line = `<b>${w.mins} min ${esc(w.name.toLowerCase())}</b>, then <b>${esc(n)}</b>`;
      why = phase ? `In this phase, ${PHASE_WHY[phase]}.` : 'Move, then refuel with something real.';
    }
    return `<div class="app-combo"><span class="app-meta">Today’s combo</span><p>${line}</p><small>${why}</small></div>`;
  }
  function energyHTML(ds) {
    const cur = energyFor(ds);
    const s = suggest(ds);
    const foods = foodIdeas(ds);
    const logged = getActivities(ds).filter(a => a.suggested === ds);
    // The four levels stay on screen, so changing your energy is one tap.
    return `<div class="app-card app-energy-card">
      <p class="app-card-label">${cur ? 'Energy today' : 'How’s your energy?'}</p>
      <div class="eb-seg app-energy" role="radiogroup" aria-label="Energy">
        ${ENERGY.map(e => `<button type="button" class="eb-seg-btn${cur === e.v ? ' on' : ''}" data-energy="${e.v}" role="radio" aria-checked="${cur === e.v}">${e.t}</button>`).join('')}
      </div>
      ${s ? '' : '<p class="app-muted">Tap how you feel and I’ll suggest workouts and foods for your energy and cycle.</p>'}
      ${s ? comboHTML(ds, s, foods) : ''}
      ${s ? `<p class="app-rail-label">Workouts</p>
      <div class="app-rail">${s.options.map(o => {
        const done = logged.find(a => a.name === o.name);
        return `<div class="app-rail-tile">
          <div><b>${esc(o.name)}</b><span>${o.mins} min · about ${done ? done.cal : o.kcal} cal</span></div>
          <button type="button" class="app-opt-btn${done ? ' done' : ''}" data-log-opt="${o.kind}" ${done ? 'disabled' : ''}>${done ? 'Logged' : 'Log'}</button>
        </div>`;
      }).join('')}</div>` : ''}
      ${foods.length ? `<p class="app-rail-label">Foods for energy</p>
      <div class="app-rail">${foods.map(f => `<div class="app-rail-tile">
          <div><b>${esc(f.n)}</b><span>${esc(f.why)}${f.cal != null ? ` · ${f.cal} cal` : ''}</span></div>
          <button type="button" class="app-opt-btn" data-food-idea="${esc(f.n)}">Add</button>
        </div>`).join('')}</div>` : ''}
    </div>`;
  }

  // Coloured rounded-square icons (Fuse style)
  const GLYPH = {
    eat: '<path d="M4 11h16a8 8 0 01-16 0zM8 7c0-1.5 1.5-1.5 1.5-3M12 7c0-1.5 1.5-1.5 1.5-3M16 7c0-1.5 1.5-1.5 1.5-3"/>',
    burn: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 01-10 0c0-2.5 1.5-3.8 2.5-5 .3 1.6 1.1 2.6 2 3 0-3-.2-5.2.5-8z"/>',
    drop: '<path d="M12 3c3.5 4.2 6 7.6 6 11a6 6 0 01-12 0c0-3.4 2.5-6.8 6-11z"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    spark: '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/>',
    run: '<circle cx="14" cy="4.5" r="2"/><path d="M7 21l3-6 3 2v5M10 15l1.5-5 3.5 2 3 0M6.5 11l3-2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>'
  };
  const icon = (k, cls) => `<span class="app-ico ${cls}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg></span>`;
  // "1,690" → big digits; units / decimals dimmed, like $8.98
  const big = (n, unit = '') => { const [i, d] = String(n).split('.'); return `<b class="app-big">${i}${d ? `<span>.${d}</span>` : ''}${unit ? `<span> ${unit}</span>` : ''}</b>`; };

  // ── Home ──
  function todayKey() { return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]; }
  function greeting(name) {
    const h = new Date().getHours();
    const part = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
    return name ? `${part}, ${esc(name.split(' ')[0])}` : part;
  }
  function mealSlots() {
    return (isPMSMode() ? PMS_MEAL_SLOTS : MEAL_SLOTS).filter(s => ['breakfast', 'lunch', 'snack', 'dinner'].includes(s.id));
  }
  // "9–10am" → { start: 9, end: 10 }, "1–3pm" → { start: 13, end: 15 }, in hours.
  function slotWindow(time) {
    const m = String(time).match(/(\d+)\s*[–-]\s*(\d+)\s*(am|pm)/i);
    if (!m) return null;
    const pm = m[3].toLowerCase() === 'pm';
    let end = +m[2] % 12 + (pm ? 12 : 0), start = +m[1] % 12 + (pm ? 12 : 0);
    if (start > end) start -= 12;                       // "11–1pm" starts at 11am
    return { start, end };
  }

  // Which meal Home shows as "Up next", given the clock.
  //   slots: [{ id, name, time, window: { start, end }, logged }] in day order
  //   hour:  current hour as a decimal, e.g. 19.5 for 7:30pm
  // Returns one of the slots, or null to show "All of today’s meals are logged".
  function pickNextSlot(slots, hour) {
    const open = slots.filter(s => !s.logged);
    if (!open.length) return null;
    // The first meal whose time hasn't passed; late at night, the last one left.
    return open.find(s => !s.window || s.window.end > hour) || open[open.length - 1];
  }

  function nextMeal() {
    const ds = selectedDateStr(), log = getSlotLog(ds);
    const now = new Date(), hour = now.getHours() + now.getMinutes() / 60;
    const slots = mealSlots().map(sl => ({ ...sl, window: slotWindow(sl.time), logged: !!(log[sl.id] || getSlotEaten(ds, sl.id)) }));
    const s = pickNextSlot(slots, hour) || slots.find(sl => !sl.logged);
    if (!s) return null;
    const m = getEffectiveDefaultMeal(s, currentDay, isPMSMode());
    // Earlier meals left unlogged become a quiet link, not the headline.
    const missed = slots.filter(sl => !sl.logged && sl !== s && sl.window && sl.window.end <= hour).length;
    const isNow = !!(s.window && s.window.start <= hour && hour < s.window.end);
    return m && { slotId: s.id, slot: s.name, time: s.time, name: m.name, cal: m.cal, p: m.p, missed, now: isNow };
  }
  const PHASE_LINE = {
    menstrual: 'Energy often dips. Warm, iron-rich food and gentle movement help.',
    follicular: 'Energy is usually rising. A good time for harder workouts.',
    ovulation: 'Often your strongest days. Push a little harder if you feel like it.',
    luteal: 'Cravings and bloating are common. Steady meals keep them in check.',
  };
  // ── Each phase's look ──
  // deep: a darker shade of the phase colour that white text reads on (WCAG AA).
  // It tints the header of every tab, the widget and the weekly poster.
  // word: the big word on Home. The pattern lives in shell.css (body[data-phase]).
  const PHASE_STYLE = {
    menstrual:  { deep: '#b23a3c', word: 'Period' },
    follicular: { deep: '#2f6fb0', word: 'Follicular' },
    ovulation:  { deep: '#2e7d32', word: 'Ovulation' },
    luteal:     { deep: '#8a6500', word: 'PMS' },
  };
  function applyTint() {
    const info = phaseOf(todayStr()), st = info && PHASE_STYLE[info.phase];
    document.body.dataset.phase = st ? info.phase : '';
    if (st) document.body.style.setProperty('--tint', st.deep); else document.body.style.removeProperty('--tint');
  }
  const firstName = () => ((EB.getProfile().name || '').trim().split(/\s+/)[0] || '');
  const sentence = s => s.charAt(0) + s.slice(1).toLowerCase();   // "Good Afternoon" → "Good afternoon"

  // The eaten number counts up to its new value instead of jumping.
  let shownEaten = null;
  function rollUp(el, to) {
    const from = shownEaten; shownEaten = to;
    if (!el || from === null || from === to || (window.EBNative && EBNative.reduce())) return;
    const node = el.firstChild; if (!node || node.nodeType !== 3) return;
    const t0 = performance.now(), dur = 600;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      node.data = Math.round(from + (to - from) * e).toLocaleString();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderHome() {
    const page = $('pageHome'); if (!page) return;
    if (currentDay !== todayKey()) { currentDay = todayKey(); try { renderTabs(); } catch {} }
    const ds = selectedDateStr();
    const p = EB.getProfile();
    const eaten = Math.round(computeConsumed(currentDay).cal);
    const burned = getActivities(ds).reduce((a, x) => a + (parseInt(x.cal) || 0), 0);
    const target = isPMSMode() ? PMS_TARGETS.cal : TARGETS.cal;
    const left = target - eaten + burned;
    const info = phaseOf(ds);
    const meta = info && PHASE_META[info.phase];
    const nm = nextMeal();

    const initial = (p.name || '').trim().charAt(0).toUpperCase();
    const first = firstName(), now = new Date();
    const st = info && PHASE_STYLE[info.phase];
    // One loud thing per screen: today's cycle day, set big, in her phase colour.
    page.querySelector('.app-home-head').innerHTML = `
      <div class="app-head-row app-head-top">
        <p class="app-date">${first ? `${esc(first)}’s ` : ''}${now.toLocaleDateString(undefined, { weekday: 'long' })} · ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
        <button type="button" class="app-avatar" data-go="profile" aria-label="Profile">${p.photo ? `<img src="${p.photo}" alt="">` : initial ? esc(initial) : TAB_ICONS.profile}</button>
      </div>
      ${st ? `<h1 class="hero-cycle" aria-label="Day ${info.dayNum} of your cycle, ${esc(meta.label === 'PMS' ? 'luteal phase (PMS)' : meta.label)}">
          <span class="hero-num" aria-hidden="true">${info.dayNum}</span>
          <span class="hero-stack" aria-hidden="true"><span class="hero-kicker">Day of your cycle${info.phase === 'luteal' ? ' · luteal' : ''}</span><span class="hero-phase">${st.word}</span></span>
        </h1>`
      : `<h1>${greeting(p.name)}</h1>`}`;
    // The week card is a live element (Nutrition's code keeps it up to date):
    // lift it out before Home is redrawn, then put it back in its slot.
    const weekSec = $('weeklyTrackerSection'), homeBody = page.querySelector('.app-home-body');
    if (weekSec && homeBody.contains(weekSec)) homeBody.after(weekSec);
    page.querySelector('.app-home-body').innerHTML = `
      <div class="app-card app-today app-today-hero">
        ${meta ? '' : `<button type="button" class="app-today-setup" data-go="cycle">Add your last period date to see your phase</button>`}
        ${nm ? `<div class="app-today-next" data-go="food" role="button" tabindex="0" aria-label="${nm.now ? 'Now' : 'Up next'}: ${esc(nm.name)}">
            <div class="app-next-text">
              <span class="app-meta">${esc(nm.slot)} · ${esc(nm.time)}${nm.missed ? ` <span class="app-tolog" data-go="food">${nm.missed} to log</span>` : ''}</span>
              <b class="app-next-name">${esc(nm.name)}</b>
            </div>
            <button type="button" class="app-opt-btn" data-log-next="${nm.slotId}">Log it</button>
          </div>`
          : `<div class="app-today-next" data-go="food" role="button" tabindex="0" aria-label="All meals logged. Open Nutrition">
              <div class="app-next-text"><span class="app-meta">All meals logged</span><b class="app-next-name">Done for today</b></div>
              <button type="button" class="app-opt-btn" data-go="food">Nutrition</button>
            </div>`}
        <button type="button" class="app-today-row app-food-sum" data-go="food">
          <span class="app-today-text">${eaten ? `<b class="app-big">${eaten.toLocaleString()}</b> of ${target.toLocaleString()} today` : 'Nothing logged yet today'}</span>
        </button>
        ${weekStatsHTML()}
      </div>
      <div class="app-home-week"></div>
      ${energyHTML(ds)}
      <div class="ch-home-slot">${window.EBChallenges ? EBChallenges.homeLine() : ''}</div>
`;
    const slot = page.querySelector('.app-home-week'); if (slot && weekSec) slot.appendChild(weekSec);
    rollUp(page.querySelector('.app-food-sum .app-big'), eaten);
    paintHomeWeek();
    maybeWeekSheet();
  }

  // ── Menstruation ──
  // Ordered so short and long words share rows (three rows on a phone, no gaps).
  const SYMPTOMS = [['cramps', 'Cramps'], ['bloating', 'Bloating'], ['cravings', 'Cravings'], ['acne', 'Acne'],
    ['mood', 'Mood swings'], ['fatigue', 'Fatigue'], ['headache', 'Headache'], ['back', 'Back pain'],
    ['tender', 'Breast tenderness'], ['none', 'Feeling fine']];
  const SKEY = 'eb_symptoms';
  function symLog() { try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch { return {}; } }
  function toggleSym(ds, v) {
    window.EBAnalytics && EBAnalytics.track('cycle_log_used', { section: 'symptoms' });
    const log = symLog(); let a = log[ds] || [];
    if (a.includes(v)) a = a.filter(x => x !== v);
    else a = v === 'none' ? ['none'] : a.filter(x => x !== 'none').concat(v);
    if (a.length) log[ds] = a; else delete log[ds];
    try { localStorage.setItem(SKEY, JSON.stringify(log)); } catch {}
  }
  const fmtDay = d => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  // Gentle, everyday suggestions per symptom (eat / do / ease off).
  // General wellness guidance; nothing here replaces a doctor.
  const SYM_TIPS = {
    cramps: [['Eat', 'Magnesium-rich food: pumpkin seeds, banana, 2 squares of dark chocolate'], ['Do', 'Heat pad on your lower belly; child’s pose or cat-cow for 5 minutes'], ['Sip', 'Warm ginger or ajwain water'], ['Ease off', 'Extra coffee and very salty food']],
    bloating: [['Eat', 'Cucumber, curd, papaya; smaller meals'], ['Sip', 'Jeera or saunf water after meals'], ['Do', 'A 10-minute walk after eating'], ['Ease off', 'Fizzy drinks, chips and pickles']],
    cravings: [['Eat', 'Protein + fibre snacks: roasted chana, makhana, a hung curd bowl'], ['Do', 'Don’t skip meals; plan one comfort treat and enjoy it'], ['Sip', 'Water first, cravings often fade'], ['Ease off', 'Sugary drinks that spike and crash']],
    mood: [['Eat', 'Slow carbs (oats, sweet potato) and omega-3 (walnuts, flax seeds)'], ['Do', '10 minutes outdoors, light movement, an early night'], ['Ease off', 'Late caffeine and doom-scrolling']],
    fatigue: [['Eat', 'Iron-rich food with vitamin C: squeeze lemon or have amla'], ['Do', 'Swap a hard workout for a walk or yoga; nap 20 minutes'], ['Sip', 'Water with electrolytes']],
    headache: [['Sip', 'A big glass of water with electrolytes'], ['Do', 'Eat on time, dim screens, rest in a dark room'], ['Note', 'If headaches are severe or new, check with a doctor']],
    acne: [['Eat', 'Zinc-rich food: pumpkin seeds, chana, cashews; plenty of veg'], ['Do', 'Gentle cleanser; don’t pick'], ['Ease off', 'Sugary and deep-fried food']],
    back: [['Do', 'Heat on the lower back; knees-to-chest and cat-cow stretches'], ['Ease off', 'Heavy lifting today'], ['Eat', 'Anti-inflammatory food: turmeric milk, ginger, leafy greens']],
    tender: [['Ease off', 'Salt and caffeine for a few days'], ['Do', 'A supportive, comfortable bra; gentle movement'], ['Eat', 'Flax seeds and leafy greens']]
  };
  // What's happening, what to eat (diet-aware), how to move.
  function phaseGuide(diet) {
    const by = m => m[diet] || m.veg;
    const iron = by({ vegan: 'palak, rajma, tofu, dates, jaggery', veg: 'palak, rajma, chana, dates, jaggery', jain: 'chana, moong, sesame, dates',
      egg: 'eggs, palak, rajma, dates', pescatarian: 'fish, eggs, palak, rajma', nonveg: 'chicken, eggs, palak, rajma' });
    const protein = by({ vegan: 'tofu, soya, dal, peanuts', veg: 'paneer, curd, dal, chana', jain: 'paneer, curd, moong',
      egg: 'eggs, paneer, curd, dal', pescatarian: 'fish, eggs, paneer', nonveg: 'chicken, eggs, paneer, curd' });
    return [
      { k: 'menstrual', n: 'Period', d: 'Days 1–5', body: 'Hormones are at their lowest. Energy can dip and cramps are common.',
        eat: `Iron-rich food (${iron}), warm khichdi, soups, ginger tea`, move: 'Rest days are fine. Yoga, walking or stretching for 20–30 min.', tip: 'Hydrate well and use heat for cramps.' },
      { k: 'follicular', n: 'Follicular', d: 'Days 6–13', body: 'Oestrogen rises. Energy, mood and motivation usually lift.',
        eat: `Protein (${protein}), fresh fruit and veg, whole grains, curd and idli`, move: 'Strength training, HIIT, new classes: your body recovers faster now.', tip: 'A good week to start a new habit.' },
      { k: 'ovulation', n: 'Ovulation', d: 'Days 14–16', body: 'Oestrogen peaks. Often your strongest, most social days.',
        eat: 'Fibre and colour: leafy greens, berries, salads; plenty of water', move: 'Your hardest sessions: heavy lifts, runs, sprints, dance.', tip: 'Warm up properly before going heavy.' },
      { k: 'luteal', n: 'Luteal (PMS)', d: 'Day 17 to your period', body: 'Progesterone rises. Appetite and cravings go up; you may feel bloated or tired near the end.',
        eat: 'Slow carbs (oats, sweet potato, brown rice), banana, nuts, chana; less salt. PMS mode adds 150 cal of comfort food.', move: 'Moderate strength, pilates, swimming, long walks. Go lighter in the last few days.', tip: 'Keep comfort snacks you’re happy with on hand.' }
    ];
  }
  // ── Daily cycle log (Flo / Clue style) ──
  // Flow, mood, cravings and water per date; symptoms stay in eb_symptoms.
  const FLOW = [['spotting', 'Spotting'], ['light', 'Light'], ['medium', 'Medium'], ['heavy', 'Heavy']];
  const MOODS = [['calm', 'Calm'], ['happy', 'Happy'], ['sensitive', 'Sensitive'], ['irritable', 'Irritable'], ['anxious', 'Anxious'], ['low', 'Low']];
  const CRAVINGS = [['sweet', 'Sweet'], ['salty', 'Salty'], ['carbs', 'Carbs'], ['chocolate', 'Chocolate'], ['spicy', 'Spicy'], ['fried', 'Fried']];
  const CRAVE_SWAP = {
    sweet: ['Dates with peanut butter', 'Banana with curd'], salty: ['Roasted chana', 'Makhana with chaat masala'],
    carbs: ['Poha', 'Sweet potato chaat'], chocolate: ['Dark chocolate 70%', 'Almonds'],
    spicy: ['Sprouts chaat', 'Masala chana'], fried: ['Roasted makhana', 'Air-fried sweet potato']
  };
  const DKEY = 'eb_cycle_daily';
  const dayLog = () => { try { return JSON.parse(localStorage.getItem(DKEY) || '{}'); } catch { return {}; } };
  function setDayField(ds, k, v) {
    const log = dayLog(), d = log[ds] || {};
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) delete d[k]; else d[k] = v;
    if (Object.keys(d).length) log[ds] = d; else delete log[ds];
    try { localStorage.setItem(DKEY, JSON.stringify(log)); } catch {}
  }
  const toggleIn = (arr, v) => (arr || []).includes(v) ? arr.filter(x => x !== v) : [...(arr || []), v];
  const addDays = (ds, n) => { const d = new Date(ds + 'T00:00'); d.setDate(d.getDate() + n); return dateToStr(d); };

  // Flow on a day with no period start in the 10 days before it starts a new period.
  function onFlow(ds, v) {
    window.EBAnalytics && EBAnalytics.track('cycle_log_used', { section: 'flow' });
    const cur = (dayLog()[ds] || {}).flow;
    setDayField(ds, 'flow', cur === v ? null : v);
    if (cur !== v && v !== 'spotting' && !periodHistory().some(st => st <= ds && near(st, ds))) {
      logPeriodStart(ds, 'Period started. Your cycle is updated');
    } else learnPeriodLength();
  }
  // Period length = consecutive flow days from each logged start, averaged.
  function learnPeriodLength() {
    const log = dayLog(), lens = [];
    periodHistory().forEach(st => {
      let n = 0; while (n < 12 && log[addDays(st, n)] && log[addDays(st, n)].flow && log[addDays(st, n)].flow !== 'spotting') n++;
      if (n >= 2 && log[addDays(st, n - 1)] && addDays(st, n) <= dateToStr(new Date())) lens.push(n);
    });
    if (!lens.length) return;
    const avg = Math.round(lens.slice(-6).reduce((a, b) => a + b, 0) / Math.min(6, lens.length));
    const pr = EB.getProfile();
    if (+pr.cycle.periodLength !== avg) { pr.cycle.periodLength = avg; EB.saveProfile(pr); try { renderCycleCalendar(); } catch {} }
  }
  const flowDays = st => { const log = dayLog(); let n = 0;
    while (n < 12 && log[addDays(st, n)] && log[addDays(st, n)].flow) n++; return n; };

  const chipRow = (list, sel, attr) => `<div class="app-syms">${list.map(([v, t]) =>
    `<button type="button" class="eb-chip${(Array.isArray(sel) ? sel.includes(v) : sel === v) ? ' on' : ''}" ${attr}="${v}">${t}</button>`).join('')}</div>`;

  // One card for today's log: flow, symptoms, mood, cravings, water.
  function todayLogHTML(ds, phase) {
    const d = dayLog()[ds] || {}, syms = symLog()[ds] || [], water = +d.water || 0;
    const tips = syms.filter(v => SYM_TIPS[v]);
    const symName = v => (SYMPTOMS.find(x => x[0] === v) || [, v])[1];
    const crave = (d.cravings || []).filter(c => CRAVE_SWAP[c]);
    return `<div class="app-card app-daylog">
      <div class="app-row"><p class="app-card-label">How are you feeling today?</p><span class="app-muted small">${fmtDay(new Date(ds + 'T00:00'))}</span></div>
      <div class="app-daylog-sec"><p>Flow</p>${chipRow(FLOW, d.flow, 'data-flow')}</div>
      <div class="app-daylog-sec"><p>Symptoms</p>${chipRow(SYMPTOMS.filter(([v]) => v !== 'cravings'), syms, 'data-sym')}
        ${tips.length ? `<div class="app-tips">${tips.map((v, i) => `<details class="app-tip"${i === 0 ? ' open' : ''}>
            <summary>For ${symName(v).toLowerCase()}</summary>
            ${SYM_TIPS[v].map(([tag, t]) => `<p><span class="app-tag ${tag === 'Ease off' || tag === 'Note' ? 'off' : ''}">${tag}</span>${t}</p>`).join('')}
          </details>`).join('')}</div>` : ''}</div>
      <div class="app-daylog-sec"><p>Mood</p>${chipRow(MOODS, d.mood || [], 'data-mood')}</div>
      <div class="app-daylog-sec"><p>Cravings</p>${chipRow(CRAVINGS, d.cravings || [], 'data-crave')}
        ${crave.length ? `<div class="app-swaps">${crave.map(c => `<div class="app-swap"><span>Craving ${c}? Try</span>
          ${CRAVE_SWAP[c].map(f => `<button type="button" class="app-opt-btn" data-food-idea="${esc(f)}">${f}</button>`).join('')}
          <button type="button" class="app-swap-more" data-crave-more="${c}">More ideas</button></div>`).join('')}</div>` : ''}</div>
      <div class="app-daylog-sec app-water"><p>Water<small>${water} of 8 glasses${phase === 'luteal' ? ' · helps with bloating' : ''}</small></p>
        <div class="app-water-cups" role="group" aria-label="Glasses of water">${Array.from({ length: 8 }, (_, i) =>
          `<button type="button" class="app-cup${i < water ? ' on' : ''}" data-water="${i + 1}" aria-label="${i + 1} glass${i ? 'es' : ''}"></button>`).join('')}</div></div>
    </div>`;
  }

  // What to eat for today's phase: the nutrient that matters and foods to log.
  function phaseFoods(phase, diet) {
    const by = m => m[diet] || m.veg;
    return {
      menstrual: { focus: 'Iron + vitamin C', why: 'You lose iron with every period. Vitamin C helps your body absorb it.',
        foods: by({ vegan: ['Palak dal', 'Rajma', 'Dates', 'Amla'], veg: ['Palak paneer', 'Rajma', 'Dates', 'Amla'], jain: ['Moong dal', 'Chana', 'Dates', 'Amla'],
          egg: ['Eggs', 'Palak dal', 'Dates', 'Amla'], pescatarian: ['Fish curry', 'Eggs', 'Palak dal', 'Amla'], nonveg: ['Chicken curry', 'Eggs', 'Palak dal', 'Amla'] }) },
      follicular: { focus: 'Protein', why: 'Energy is rising and muscles recover faster, so this is the time to build.',
        foods: by({ vegan: ['Tofu', 'Soya chunks', 'Chana', 'Peanuts'], veg: ['Paneer', 'Curd', 'Moong dal chilla', 'Chana'], jain: ['Paneer', 'Curd', 'Moong dal chilla', 'Peanuts'],
          egg: ['Eggs', 'Paneer', 'Curd', 'Chana'], pescatarian: ['Fish', 'Eggs', 'Paneer', 'Curd'], nonveg: ['Chicken', 'Eggs', 'Paneer', 'Curd'] }) },
      ovulation: { focus: 'Fibre + antioxidants', why: 'Oestrogen peaks. Fibre helps your body clear the extra, and colourful food fights inflammation.',
        foods: ['Salad', 'Berries', 'Sprouts', 'Flax seeds'] },
      luteal: { focus: 'Magnesium + slow carbs', why: 'Magnesium eases cramps and mood dips. Slow carbs keep cravings steady. Go easy on salt.',
        foods: ['Pumpkin seeds', 'Banana', 'Oats', 'Sweet potato'] }
    }[phase];
  }
  // What to eat more of in each phase, and why. General guidance only.
  const PHASE_NUTRIENTS = {
    menstrual: [['Iron', 'Replaces what your period takes', 'palak, rajma, dates'], ['Vitamin C', 'Helps your body absorb that iron', 'amla, lemon, guava'], ['Omega-3 fats', 'Can ease cramps', 'walnuts, flax seeds']],
    follicular: [['Protein', 'Muscles build fastest now', 'paneer, eggs, dal'], ['Complex carbs', 'Fuel for rising energy', 'oats, millets, brown rice'], ['Probiotics', 'Support your gut and hormones', 'curd, idli, buttermilk']],
    ovulation: [['Fibre', 'Helps clear the oestrogen peak', 'salads, sprouts, whole grains'], ['Antioxidants', 'Colourful food fights inflammation', 'berries, carrots, tomatoes'], ['Protein', 'For your strongest workouts', 'chana, paneer, eggs']],
    luteal: [['Magnesium', 'Eases cramps and mood dips', 'pumpkin seeds, dark chocolate'], ['Slow carbs', 'Keep cravings steady', 'sweet potato, oats, brown rice'], ['Healthy fats', 'Keep you full for longer', 'nuts, seeds, a little ghee']]
  };
  // Full meals per phase. The protein follows your diet.
  function phaseMeals(phase, diet) {
    const by = m => m[diet] || m.veg;
    return {
      menstrual: [['Breakfast', 'Ragi dosa with peanut chutney', 350],
        ['Lunch', by({ veg: 'Palak dal, brown rice and salad', vegan: 'Palak dal, brown rice and salad', jain: 'Moong dal, brown rice and salad', egg: 'Egg curry, brown rice and palak', pescatarian: 'Fish curry, rice and palak', nonveg: 'Chicken palak with rice' }), 520],
        ['Dinner', 'Moong dal khichdi with veggies', 420]],
      follicular: [['Breakfast', by({ veg: 'Moong dal chilla with curd', vegan: 'Moong dal chilla with mint chutney', jain: 'Moong dal chilla with curd', egg: 'Masala omelette with toast', pescatarian: 'Masala omelette with toast', nonveg: 'Masala omelette with toast' }), 380],
        ['Lunch', by({ veg: 'Paneer bhurji, 2 roti and salad', vegan: 'Tofu bhurji, 2 roti and salad', jain: 'Paneer bhurji, 2 roti and salad', egg: 'Egg bhurji, 2 roti and salad', pescatarian: 'Grilled fish, 2 roti and salad', nonveg: 'Grilled chicken, 2 roti and salad' }), 550],
        ['Dinner', 'Idli with sambar', 400]],
      ovulation: [['Breakfast', 'Sprouts poha', 330],
        ['Lunch', 'Chana and quinoa salad bowl', 480],
        ['Dinner', by({ veg: 'Grilled paneer with sautéed veg', vegan: 'Grilled tofu with sautéed veg', jain: 'Grilled paneer with sautéed veg', egg: 'Egg and veg stir-fry', pescatarian: 'Grilled fish with sautéed veg', nonveg: 'Grilled chicken with sautéed veg' }), 450]],
      luteal: [['Breakfast', 'Oats with banana and pumpkin seeds', 380],
        ['Lunch', by({ veg: 'Rajma, brown rice and raita', vegan: 'Rajma, brown rice and salad', jain: 'Chana, brown rice and raita', egg: 'Rajma, brown rice and raita', pescatarian: 'Rajma, brown rice and raita', nonveg: 'Rajma, brown rice and raita' }), 560],
        ['Dinner', 'Sweet potato and chana curry with roti', 480]]
    }[phase] || [];
  }
  function phaseFoodHTML(phase, diet) {
    const F = phaseFoods(phase, diet);
    if (!F) return '';
    const row = (name, sub) => `<li><span><b>${esc(name)}</b>${sub ? `<small>${sub}</small>` : ''}</span>
        <button type="button" class="app-opt-btn" data-food-idea="${esc(name)}">Add</button></li>`;
    return `<div class="app-card app-phasefood">
      <div class="app-row"><p class="app-card-label">Foods for you today</p><span class="app-phase"><i style="background:${PHASE_META[phase].color}"></i>${PHASE_META[phase].label === 'PMS' ? 'Luteal' : PHASE_META[phase].label}</span></div>
      <div class="app-nutrients">${(PHASE_NUTRIENTS[phase] || []).map(([n, why, ex]) =>
        `<p><span class="app-tag">${n}</span><span>${why}<small>${ex}</small></span></p>`).join('')}</div>
      <p class="app-rail-label">Meals</p>
      <ul class="app-food-list">${phaseMeals(phase, diet).map(([slot, m, cal]) => row(m, `${slot} · about ${cal} cal`)).join('')}</ul>
      <p class="app-rail-label">Quick adds</p>
      <ul class="app-food-list">${F.foods.map(f => row(f)).join('')}</ul>
    </div>`;
  }

  // Patterns from the logs: when symptoms, moods and cravings show up in the
  // cycle, and how eating changes by phase. Needs a few logs to say anything.
  function patternsHTML(p) {
    const s = cycleSettings(), out = [];
    const where = days => {
      const sorted = days.slice().sort((a, b) => a.day - b.day);
      const before = sorted.filter(x => x.len - x.day < 10);   // late in the cycle → count back from the period
      if (before.length > sorted.length / 2) {
        const b = before.map(x => x.len - x.day + 1).sort((a, c) => a - c);
        const lo = b[Math.floor(b.length * .25)], hi = b[Math.ceil(b.length * .75) - 1];
        return lo === hi ? `about ${lo} day${lo === 1 ? '' : 's'} before your period` : `${lo}–${hi} days before your period`;
      }
      const lo = sorted[Math.floor(sorted.length * .25)].day, hi = sorted[Math.ceil(sorted.length * .75) - 1].day;
      return lo === hi ? `on day ${lo}` : `on days ${lo}–${hi}`;
    };
    const collect = (src, pick) => {
      const by = {};
      Object.entries(src).forEach(([ds, v]) => {
        const info = phaseOf(ds); if (!info) return;
        (pick(v) || []).forEach(k => (by[k] = by[k] || []).push({ day: info.dayNum, len: info.cycleLength || s.len }));
      });
      return by;
    };
    const syms = collect(symLog(), v => v.filter(x => x !== 'none'));
    const log = dayLog();
    const moods = collect(log, v => v.mood), craves = collect(log, v => v.cravings);
    const name = (list, k) => (list.find(x => x[0] === k) || [, k])[1];
    Object.entries(syms).filter(([, d]) => d.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 3)
      .forEach(([k, d]) => out.push(`<b>${name(SYMPTOMS, k)}</b> usually ${where(d)}`));
    Object.entries(craves).filter(([, d]) => d.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 2)
      .forEach(([k, d]) => out.push(`<b>${name(CRAVINGS, k)} cravings</b> ${where(d)}`));
    Object.entries(moods).filter(([k, d]) => d.length >= 2 && !['calm', 'happy'].includes(k)).slice(0, 1)
      .forEach(([k, d]) => out.push(`Feeling <b>${name(MOODS, k).toLowerCase()}</b> ${where(d)}`));
    // Eating by phase, from what was logged in the last 90 days.
    const cal = {};
    for (let i = 1; i <= 90; i++) {
      const ds = addDays(dateToStr(new Date()), -i), info = phaseOf(ds);
      let c = 0; try { c = getDayCalories(ds); } catch {}
      if (info && c > 300) (cal[info.phase] = cal[info.phase] || []).push(c);
    }
    const avg = a => a && a.length >= 3 ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
    const lut = avg(cal.luteal), fol = avg(cal.follicular);
    if (lut && fol && Math.abs(lut - fol) >= 80) out.push(`You eat about <b>${Math.abs(lut - fol).toLocaleString()} cal ${lut > fol ? 'more' : 'less'}</b> on PMS days than in your follicular phase${lut > fol ? '. PMS mode plans for this.' : '.'}`);
    // Cycle and period length from the logs.
    const hist = periodHistory(), gaps = periodGaps(hist).filter(g => g >= 15 && g <= 60);
    const stats = [
      ['Average cycle', gaps.length ? `${Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)} days` : `${s.len} days`, gaps.length ? `${gaps.length} logged` : 'your estimate'],
      ['Average period', `${s.period} days`, hist.some(st => flowDays(st) >= 2) ? 'from your flow logs' : 'your estimate'],
      ['Cycle variation', gaps.length >= 2 ? `${Math.max(...gaps) - Math.min(...gaps)} days` : '—', gaps.length >= 2 ? (Math.max(...gaps) - Math.min(...gaps) <= 7 ? 'regular' : 'irregular') : 'needs 3 periods']
    ];
    return `<div class="app-card app-patterns">
      <p class="app-card-label">Your patterns</p>
      <div class="app-stats3">${stats.map(([k, v, n]) => `<div><span>${k}</span><b>${v}</b><small>${n}</small></div>`).join('')}</div>
      ${out.length ? `<ul class="app-insights">${out.map(x => `<li>${x}</li>`).join('')}</ul>`
        : '<p class="app-muted">Log symptoms, moods and cravings for a cycle and I’ll show when they tend to come, and how your eating changes by phase.</p>'}
    </div>`;
  }

  // A bar of the whole cycle, coloured by phase, with today marked.
  function cycleBar(info) {
    const st = { ...cycleSettings(), len: info.cycleLength };
    const segs = [];
    for (let d = 1; d <= st.len; d++) {
      const ph = getCyclePhase(d, st), last = segs[segs.length - 1];
      if (last && last.ph === ph) last.n++; else segs.push({ ph, n: 1 });
    }
    const pct = ((info.dayNum - 0.5) / st.len) * 100;
    return `<div class="app-cycle-bar" role="img" aria-label="Day ${info.dayNum} of a ${st.len}-day cycle">
        ${segs.map(g => `<i style="flex:${g.n};background:${PHASE_META[g.ph].color}"></i>`).join('')}
        <b style="left:${pct}%"></b>
      </div>
      <div class="app-cycle-bar-ends"><span>Day ${info.dayNum} of ${st.len}</span><span>${st.len - info.dayNum + 1} days to next period</span></div>`;
  }

  // Logged period starts, the real gap between each, and how that compares
  // with the cycle length typed at onboarding.
  function periodLogHTML(p) {
    const hist = periodHistory();
    const gaps = periodGaps(hist);
    const real = gaps.filter(g => g >= 15 && g <= 60);
    const claimed = p.cycle.claimedLength != null ? +p.cycle.claimedLength : +p.cycle.cycleLength || 28;
    const avg = real.length ? Math.round(real.reduce((a, b) => a + b, 0) / real.length) : null;
    const lo = real.length ? Math.min(...real) : 0, hi = real.length ? Math.max(...real) : 0;
    const verdict = !avg
      ? `Log ${hist.length ? 'one more period' : 'your last two periods'} to check your ${claimed}-day cycle.`
      : Math.abs(avg - claimed) <= 1
        ? `You said ${claimed} days and your logs agree: ${avg} days on average.`
        : `You said ${claimed} days. Your logs say ${avg} on average, so I’m using ${avg}.`;
    const spread = real.length >= 2 ? (hi - lo > 7
      ? ` Your cycles vary by ${hi - lo} days (${lo}–${hi}). A spread over 7 days is worth mentioning to a doctor.`
      : ` Range ${lo}–${hi} days, which is regular.`) : '';
    // Newest first: each cycle as a bar (red = period days), length on the right.
    const maxLen = Math.max(35, ...gaps.filter(g => g <= 60));
    const today = dateToStr(new Date());
    const rows = hist.slice().reverse().map((d, i, arr) => {
      const nextStart = i === 0 ? null : arr[i - 1];
      const len = nextStart ? Math.round((new Date(nextStart) - new Date(d)) / 86400000)
                            : Math.round((new Date(today) - new Date(d)) / 86400000) + 1;
      const per = flowDays(d) || +p.cycle.periodLength || 5;
      const missed = len > 60;
      const w = Math.min(100, (Math.min(len, maxLen) / maxLen) * 100);
      return `<li>
        <div class="app-hist-top"><span>${fmtDay(new Date(d + 'T00:00'))}${nextStart ? '' : ' · now'}</span>
          <em>${nextStart ? (missed ? `${len} days · long gap` : `${len} days`) : `Day ${len}`}</em>
          <button type="button" class="app-x" data-period-remove="${d}" aria-label="Remove ${d}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 7L7 17M7 7l10 10"/></svg></button></div>
        <div class="app-hist-bar${nextStart ? '' : ' now'}" style="width:${w}%"><i style="width:${Math.min(100, per / Math.max(len, per) * 100)}%"></i></div>
      </li>`;
    }).join('');
    return `<div class="app-card app-period-log">
        <div class="app-row"><p class="app-card-label">Cycle history</p>
          <button type="button" class="app-link" data-period-log>Add a date</button></div>
        <p class="app-muted">${verdict}${spread}</p>
        ${rows ? `<ul class="app-period-list">${rows}</ul>` : ''}
      </div>`;
  }

  function renderCyclePage() {
    const page = $('pageCycle'); if (!page) return;
    const p = EB.getProfile();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const ds = dateToStr(today);
    const info = phaseOf(ds), meta = info && PHASE_META[info.phase];
    const sub = page.querySelector('.app-cycle-sub');
    const body = page.querySelector('.app-cycle-body');
    let next = null, pms = null, until = null, ovu = null;
    const cs = getCycleStart();
    if (cs) {
      const len = +p.cycle.cycleLength || 28;
      next = new Date(cs + 'T00:00'); while (next <= today) next.setDate(next.getDate() + len);
      until = Math.round((next - today) / 86400000);
      const lead = { '1-3': 3, '4-7': 7, '7+': 10 }[p.cycle.pmsStart] || 5;
      pms = new Date(next); pms.setDate(pms.getDate() - lead);
      ovu = new Date(next); ovu.setDate(ovu.getDate() - 14);
    }
    // "Day 2 · Menstrual phase · ends in 4 days": days left in the current phase.
    let left = 0;
    if (info) { const st = { ...cycleSettings(), len: info.cycleLength }; let e = info.dayNum;
      while (e < st.len && getCyclePhase(e + 1, st) === info.phase) e++; left = e - info.dayNum + 1; }
    sub.innerHTML = meta
      ? `<span class="app-hero-line"><b>Day ${info.dayNum}</b> · ${meta.label === 'PMS' ? 'Luteal (PMS)' : meta.label} · ends ${left <= 1 ? 'today' : `in ${left} days`}</span>`
      : '<span class="app-hero-sub">Add your last period date to start</span>';
    const syms = symLog()[ds] || [];
    const iron = ({ vegan: 'palak, rajma, tofu, dates', veg: 'palak, rajma, chana, dates', jain: 'chana, moong, sesame, dates',
      egg: 'eggs, palak, rajma, dates', pescatarian: 'fish, eggs, palak, rajma', nonveg: 'chicken, eggs, palak, rajma' })[p.food.diet] || 'palak, rajma, dates';
    const guide = phaseGuide(p.food.diet);
    const tips = syms.filter(v => SYM_TIPS[v]);
    const symName = v => (SYMPTOMS.find(x => x[0] === v) || [, v])[1];
    // Each upcoming date opens what that phase means: body, eat, move, tip.
    const nextRow = (k, head) => { const g = guide.find(x => x.k === k);
      return `<li><details class="app-next-row"><summary><i style="background:${PHASE_META[k].color}"></i>${head}</summary>
        ${g ? `<div class="app-next-body"><p class="app-phase-body">${g.body}</p>
          <p><span class="app-tag">Eat</span>${g.eat}</p><p><span class="app-tag">Move</span>${g.move}</p><p><span class="app-tag">Tip</span>${g.tip}</p></div>` : ''}
      </details></li>`; };
    body.innerHTML = `
      <div class="app-card app-cycle-card" style="--phase:${meta ? meta.color : '#e1e3e7'}">
        <div class="app-row"><p class="app-card-label">Your cycle</p>${meta ? `<span class="app-phase"><i style="background:${meta.color}"></i>${meta.label}</span>` : ''}</div>
        ${info ? cycleBar(info) : ''}
        ${next ? `<ul class="app-cycle-next">
            ${nextRow('menstrual', `<span>Next period<small>in ${until} day${until === 1 ? '' : 's'}</small></span><b>${fmtDay(next)}</b>`)}
            ${ovu && ovu > today ? `${nextRow('ovulation', `<span>Ovulation around<small>most fertile ${fmtDay(new Date(ovu - 2 * 86400000)).replace(/^\w+ /, '')} to ${fmtDay(new Date(+ovu + 86400000)).replace(/^\w+ /, '')}</small></span><b>${fmtDay(ovu)}</b>`)}` : ''}
            ${nextRow('luteal', `<span>PMS likely from<small>${Math.round((next - pms) / 86400000)} days before your period</small></span><b>${fmtDay(pms)}</b>`)}
          </ul>` : '<p class="app-muted">Add the first day of your last period and I’ll predict the next one.</p>'}
        <p class="app-muted small">General guidance, not medical advice.</p>
      </div>
      ${todayLogHTML(ds, info && info.phase)}
      ${info ? phaseFoodHTML(info.phase, p.food.diet) : ''}
      ${patternsHTML(p)}
      ${periodLogHTML(p)}`;
  }

  // ── Fitness ──
  function healthHTML() {
    const H = window.EBHealth;
    const row = (sub, btn) => `<div class="app-card app-health"><div class="app-health-row">${icon('heart', 'pink')}
      <div class="app-health-text"><b>Apple Health</b><span>${sub}</span></div>${btn}</div></div>`;
    if (H && H.native) {
      return H.isConnected()
        ? row('Connected · workouts, weight and periods sync in', '<button type="button" class="app-opt-btn" data-health="sync">Sync</button>')
        : row('Bring in workouts, weight and period days', '<button type="button" class="app-opt-btn" data-health="connect">Connect</button>');
    }
    return row('Available in the iPhone app', '');
  }
  function renderFitnessPage() {
    const page = $('pageFitness'); if (!page) return;
    const ds = selectedDateStr();
    page.querySelector('.app-fit-energy').innerHTML = energyHTML(ds) + healthHTML();
    const chs = page.querySelector('.app-fit-challenges');
    if (chs && window.EBChallenges) chs.innerHTML = EBChallenges.cardHTML();
    const burned = getActivities(ds).reduce((a, x) => a + (parseInt(x.cal) || 0), 0);
    let week = 0;
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(d => { try { week += getActivities(dateStrForDay(d)).length; } catch {} });
    const weekLine = week ? `${week} workout${week === 1 ? '' : 's'} this week` : 'none this week yet';
    page.querySelector('.app-fit-sub').innerHTML = burned
      ? `<span class="app-hero"><b>${burned.toLocaleString()}</b><span>cal burned ${DAY_NAMES[currentDay]} · ${weekLine}</span></span>`
      : `<span class="app-hero app-hero-empty"><span>No workouts logged ${ds === dateToStr(new Date()) ? 'today' : DAY_NAMES[currentDay]} · ${weekLine}. Log one below, or start a challenge.</span></span>`;
  }

  // ── Food: a line that reacts to how the day is going ──
  const JUNK = /pizza|burger|chips|fries|ice ?cream|chocolate bar|maggi|samosa|momo|cake|pastry|brownie|gulab jamun|jalebi|sweet|mithai|ladoo|cola|soda|kachori|pakora|vada pav|pav bhaji|biscuit|cookie|donut|nachos|junk/i;
  function dayJunk(ds) {
    let cal = 0;
    Object.values(getSlotLog(ds)).forEach(ms => (Array.isArray(ms) ? ms : [ms]).forEach(m => {
      if (m && JUNK.test(m.name || '')) cal += +m.cal || 0;
    }));
    return cal;
  }
  function pickLine(lines, ds) { let h = 0; for (const c of ds) h = (h * 31 + c.charCodeAt(0)) >>> 0; return lines[h % lines.length]; }
  function foodHero() {
    const eaten = Math.round(computeConsumed(currentDay).cal);
    const target = isPMSMode() ? PMS_TARGETS.cal : TARGETS.cal;
    return `<b>${eaten.toLocaleString()}</b><span>of ${target.toLocaleString()} cal eaten · ${DAY_NAMES[currentDay]}</span>`;
  }
  function paintFoodHead() {
    const m = $('foodMotto'); if (m) m.textContent = motto();
    // The day card right below already shows eaten / burned / left, so the header keeps just the line.
    const h = $('foodHero'); if (h) h.hidden = true;
  }
  function motto() {
    const ds = selectedDateStr();
    const eaten = computeConsumed(currentDay).cal;
    const target = isPMSMode() ? PMS_TARGETS.cal : TARGETS.cal;
    const junk = dayJunk(ds);
    if (!eaten) {
      const h = new Date().getHours(), today = ds === dateToStr(new Date());
      if (!today || h < 11) return pickLine(['New day, fresh plate. Start with a good breakfast.', 'Your meals are planned. Just follow along today.', 'Small, steady choices add up. Let’s start.'], ds);
      if (h < 17) return 'Nothing logged yet today. Add what you’ve had so far, it only takes a tap.';
      return 'Nothing logged today. Add what you remember, then enjoy a good dinner.';
    }
    if (junk >= 350 || eaten > target * 1.1)
      return pickLine(['You’re drifting off track today. Pause, drink some water, keep the next meal light.', 'A heavier day. Take a breath and make the next meal a simple one.'], ds);
    if (junk > 0) return pickLine(['A little treat is part of enjoying food. You’re still on track.', 'Enjoyed something fun? That’s allowed. Back to plan for the next meal.'], ds);
    if (eaten > target) return 'Just over today. A short walk or a lighter dinner evens it out.';
    return pickLine(['You’re on track today. Keep it going.', 'Nicely done. Today’s plate looks balanced.', 'Right on plan. Your body will thank you.'], ds);
  }

  // ── PMS survival badge: one line + what she did that week ──
  function survivalBadge() {
    const el = $('survivalBadgeSection'); if (!el) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const info = phaseOf(dateToStr(today));
    if (!info || info.phase !== 'menstrual' || info.dayNum > 3) { el.innerHTML = ''; return; }
    const start = new Date(today); start.setDate(start.getDate() - (info.dayNum - 1));
    const key = dateToStr(start);
    if (getPMSSurvivalData().lastBadgeCycle === key) { el.innerHTML = ''; return; }
    let logged = 0, total = 0, workouts = 0;
    for (let i = 7; i >= 1; i--) {
      const d = new Date(start); d.setDate(d.getDate() - i);
      const ds = dateToStr(d), c = getDayCalories(ds);
      if (c > 0) { logged++; total += c; }
      workouts += getActivities(ds).length;
    }
    const facts = [`${logged} of 7 days logged`, logged ? `avg ${Math.round(total / logged).toLocaleString()} cal` : '', workouts ? `${workouts} workout${workouts > 1 ? 's' : ''}` : '']
      .filter(Boolean);
    el.innerHTML = `<div class="survival-badge app-badge" id="survivalBadge">
      <span class="survival-badge-trophy">🏆</span>
      <div class="survival-badge-body">
        <div class="survival-badge-title">PMS week done. You made it through.</div>
        <div class="app-badge-facts">${facts.map(f => `<span>${f}</span>`).join('')}</div>
      </div>
      <button class="survival-badge-dismiss" onclick="dismissSurvivalBadge('${key}')" aria-label="Dismiss">✕</button>
    </div>`;
  }

  // ── Bottom sheet (snack drawer, meal-prep jars) ──
  function openSheet(title, body) {
    const home = body.parentNode;
    const ov = document.createElement('div');
    ov.className = 'eb-cal-overlay app-sheet-overlay';
    ov.innerHTML = `<div class="eb-cal app-sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="app-sheet-head"><b>${esc(title)}</b><button type="button" class="eb-icon-btn" data-sheet-close aria-label="Close">${ICONS.close}</button></div>
      <div class="app-sheet-body"></div></div>`;
    ov.querySelector('.app-sheet-body').appendChild(body);
    document.body.appendChild(ov);
    const close = () => { home.appendChild(body); ov.remove(); };
    ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-sheet-close]')) close(); });
  }

  // ── "+" quick actions: blurred page, labelled actions (Fuse) ──
  const QUICK = [
    ['luna', 'Ask Luna', 'spark', 'pink'],
    ['food', 'Log food', 'eat', 'green'],
    ['workout', 'Log workout', 'run', 'black'],
    ['period', 'Log period', 'drop', 'pink']
  ];
  function toggleQuick(force) {
    let el = $('appQuick');
    const btn = document.querySelector('[data-quick]');
    const show = force !== undefined ? force : !el;
    if (!show) { if (el) el.remove(); if (btn) { btn.classList.remove('on'); btn.setAttribute('aria-expanded', 'false'); } return; }
    if (el) return;
    el = document.createElement('div'); el.id = 'appQuick'; el.className = 'app-quick';
    el.innerHTML = `<div class="app-quick-list">${QUICK.map(([k, t, g, c]) =>
      `<button type="button" data-q="${k}"><span>${t}</span>${icon(g, c)}</button>`).join('')}</div>`;
    document.body.appendChild(el);
    if (btn) { btn.classList.add('on'); btn.setAttribute('aria-expanded', 'true'); }
    el.addEventListener('click', e => {
      const q = e.target.closest('[data-q]'); toggleQuick(false); if (!q) return;
      const k = q.dataset.q;
      if (k === 'luna') go('chat');
      if (k === 'food') { if (window.EBMeals) EBMeals.openSearch(); }
      if (k === 'workout') workoutSheet();
      if (k === 'period') periodSheet();
    });
  }
  // Centred bottom sheet: icon, title, subtitle, rows with chevrons.
  function listSheet({ ico, title, sub, rows }) {
    const ov = document.createElement('div');
    ov.className = 'eb-cal-overlay app-sheet-overlay';
    ov.innerHTML = `<div class="eb-cal app-lsheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <button type="button" class="eb-icon-btn app-lsheet-x" data-x aria-label="Close">${ICONS.close}</button>
      <div class="app-lsheet-head">${ico}<b>${esc(title)}</b><p>${esc(sub)}</p></div>
      <div class="app-lsheet-rows">${rows.map((r, i) => `<button type="button" class="app-lsheet-row" data-r="${i}">
        ${r.ico}<span><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></span>${ICONS.chevron}</button>`).join('')}</div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => {
      if (e.target === ov || e.target.closest('[data-x]')) return ov.remove();
      const r = e.target.closest('[data-r]'); if (!r) return;
      ov.remove(); rows[+r.dataset.r].run();
    });
  }
  function workoutSheet() {
    const ds = dateToStr(new Date());
    if (currentDay !== todayKey()) { currentDay = todayKey(); try { renderTabs(); } catch {} }
    const s = suggest(ds);
    const opts = s ? s.options : [{ kind: 'walking', name: 'Walk', mins: 30, kcal: 120 }, { kind: 'strength', name: 'Strength training', mins: 40, kcal: 240 }, { kind: 'yoga', name: 'Yoga', mins: 30, kcal: 90 }];
    listSheet({
      ico: icon('run', 'black'), title: 'Log a workout',
      sub: s ? 'Picked for your energy and cycle today' : 'Pick one, or add your own on Fitness',
      rows: [...opts.map(o => ({ ico: icon('burn', 'green'), title: `${o.name} · ${o.mins} min`, sub: `About ${o.kcal} cal`, run: () => logWorkout(ds, o) })),
        { ico: icon('search', 'gray'), title: 'Something else', sub: 'Add any activity on the Fitness page', run: () => go('fitness') }]
    });
  }
  // Every logged start is kept (any past date can be added), and the cycle
  // length becomes the average of the recent gaps, ignoring missed months
  // over 60 days, so predictions follow real cycles, not the onboarding guess.
  // claimedLength keeps what was typed at onboarding, to compare against.
  function periodGaps(hist) {
    return hist.slice(1).map((d, i) => Math.round((new Date(d) - new Date(hist[i])) / 86400000));
  }
  function savePeriods(hist, toast) {
    const pr = EB.getProfile(), c = pr.cycle;
    hist = [...new Set(hist.filter(Boolean))].sort().slice(-24);
    if (c.claimedLength == null) c.claimedLength = +c.cycleLength || 28;
    const gaps = periodGaps(hist).filter(g => g >= 15 && g <= 60).slice(-6);
    const before = +c.cycleLength || 28;
    c.cycleLength = gaps.length ? Math.round(gaps.reduce((x, y) => x + y, 0) / gaps.length) : c.claimedLength;
    Object.assign(c, { history: hist, lastStart: hist[hist.length - 1] || '', tracks: hist.length ? true : c.tracks });
    EB.saveProfile(pr);
    if (c.lastStart) setCycleStart(c.lastStart); else clearCycleStart();
    try { renderCycleCalendar(); } catch {}
    if (toast) EB.toast(c.cycleLength !== before ? `${toast}. Your cycle is now ${c.cycleLength} days on average.` : toast);
  }
  const periodHistory = () => { const c = EB.getProfile().cycle; return [...new Set([...(c.history || []), c.lastStart].filter(Boolean))].sort(); };
  // The link under the calendar used to wipe the cycle; now it adds a start date
  // (a wrong one can be removed from "Your periods").
  window.resetCycle = () => pickPeriodDate();
  // A start within 10 days of one already logged is the same period: the new
  // date replaces it (e.g. predicted 1 Nov, actually started 2 Nov).
  const near = (a, b, days = 10) => Math.abs(new Date(a) - new Date(b)) / 86400000 <= days;
  function logPeriodStart(iso, toast = 'Period logged') {
    window.EBAnalytics && EBAnalytics.track('cycle_log_used', { section: 'period_date' });
    savePeriods([...periodHistory().filter(d => !near(d, iso)), iso], toast);
    window.EBNative && EBNative.haptic('success');
    learnPeriodLength();
  }
  function removePeriodStart(iso) { savePeriods(periodHistory().filter(d => d !== iso), 'Removed'); }
  function pickPeriodDate() {
    if (!window.EBOnboarding || !EBOnboarding.openCalendar) return logPeriodStart(dateToStr(new Date()));
    EBOnboarding.openCalendar(dateToStr(new Date()), iso => { logPeriodStart(iso); renderCyclePage(); });
  }

  function periodSheet() {
    listSheet({
      ico: icon('drop', 'pink'), title: 'Your period', sub: 'Log today or how you’re feeling',
      rows: [
        { ico: icon('drop', 'pink'), title: 'Period started today', sub: 'Updates your cycle and PMS dates', run: () => {
          logPeriodStart(dateToStr(new Date())); repaint(); } },
        { ico: icon('drop', 'pink'), title: 'Add a past period', sub: 'Pick the day it started', run: () => pickPeriodDate() },
        { ico: icon('spark', 'green'), title: 'Log symptoms', sub: 'Cramps, bloating, mood and more', run: () => go('cycle') }
      ]
    });
  }

  // ── Building the pages from the existing single page ──
  let active = 'home';
  function build() {
    const container = document.querySelector('.container');
    if (!container || $('pageFood')) return;
    document.body.classList.add('has-tabs');
    const header = container.querySelector(':scope > header');
    const mk = id => { const d = document.createElement('section'); d.id = id; d.className = 'app-page'; return d; };
    const park = document.createElement('div'); park.id = 'appParking'; park.hidden = true;

    // Home: greeting, PMS badge, week, today, next meal, energy
    const home = mk('pageHome');
    home.innerHTML = '<header class="app-head app-home-head"></header>';
    const homeCal = document.createElement('div'); homeCal.className = 'app-shared app-home-cal';
    const homeBody = document.createElement('div'); homeBody.className = 'app-home-body';
    home.append(homeCal, homeBody);

    // Menstruation
    const cyc = mk('pageCycle');
    cyc.innerHTML = `<header class="app-head"><h1>Menstruation</h1><p class="subtitle app-cycle-sub"></p></header>
      <div class="app-shared"></div><div class="app-cycle-insight"></div><div class="app-cycle-body"></div>`;
    // "PMS week done" lives with the cycle, at the top of the Menstruation sheet.
    cyc.querySelector('.app-cycle-body').before($('survivalBadgeSection'));
    cyc.querySelector('.app-cycle-insight').appendChild($('insightSection'));

    // Nutrition (food)
    const food = mk('pageFood');
    const foodHead = document.createElement('header'); foodHead.className = 'app-head';
    foodHead.innerHTML = '<div class="app-head-row"><h1>Nutrition</h1></div><p class="app-hero" id="foodHero"></p><p class="app-motto" id="foodMotto"></p>';
    const reset = $('resetBtn'); if (reset) foodHead.firstChild.appendChild(reset);
    park.appendChild($('modeSubtitle'));            // targets now live in the day card
    food.appendChild(foodHead);
    const calSlotFood = document.createElement('div'); calSlotFood.className = 'app-shared';
    food.appendChild(calSlotFood);
    // Normal / PMS sits right under the date strip, above everything for the day.
    food.appendChild($('modeToggleBar'));
    if ($('modeNote')) food.appendChild($('modeNote'));
    food.appendChild($('tracker'));
    home.appendChild($('weeklyTrackerSection'));   // the week card lives on Home only
    food.appendChild($('cravingWrap'));
    food.appendChild($('slotSection'));
    const drawers = [...container.querySelectorAll(':scope > .drawer-group')];
    const activityGroup = drawers.find(g => g.querySelector('#activityBlock'));
    // Snack drawer + meal-prep jars: two tiles side by side, each opens a sheet.
    const extras = drawers.find(g => g.querySelector('#bedsideBlock'));
    if (extras) {
      park.appendChild(extras);
      const tiles = document.createElement('div'); tiles.className = 'app-tiles';
      tiles.innerHTML = `
        <button type="button" class="app-tile" data-sheet="bedside"><span class="app-tile-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M10 8h4M10 16h4"/></svg></span><b>Bedside Snack Drawer</b><span>What’s stocked</span></button>
        <button type="button" class="app-tile" data-sheet="prep"><span class="app-tile-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8v3H8zM7 6h10a1 1 0 011 1v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7a1 1 0 011-1zM6 11h12"/></svg></span><b>Meal Prep Jars</b><span>3 recipes · every 3–4 days</span></button>`;
      food.appendChild(tiles);
    }
    const searchBar = document.createElement('button');
    searchBar.type = 'button'; searchBar.className = 'app-food-search'; searchBar.dataset.foodSearch = '';
    searchBar.innerHTML = `${TAB_ICONS.search}<span>Search food to log</span>`;
    food.appendChild(searchBar);

    // Fitness
    const fit = mk('pageFitness');
    fit.innerHTML = `<header class="app-head"><div class="app-head-row"><h1>Fitness</h1>
        <button type="button" class="reset-btn" data-fit-reset>Reset day</button></div>
        <p class="subtitle app-fit-sub"></p></header>
      <div class="app-shared"></div><div class="app-fit-challenges"></div><div class="app-fit-energy"></div>`;
    if (activityGroup) {
      fit.appendChild(activityGroup);
      const det = activityGroup.querySelector('#activityBlock');
      if (det) {
        det.open = true;
        activityGroup.classList.add('app-log-card');
        const title = document.createElement('p'); title.className = 'app-card-label app-log-title'; title.textContent = 'Log a workout';
        det.before(title);
        const body = det.querySelector('.activity-body');
        // Name + calories first, then the preset chips, then what's logged.
        // (not in the document yet, so look inside the card rather than by id)
        const custom = body.querySelector('.activity-custom'), presets = body.querySelector('#activityPresets');
        if (custom && presets) body.insertBefore(custom, presets);
        // Weekly goals get their own card.
        const goals = document.createElement('div'); goals.className = 'app-card app-goals';
        goals.innerHTML = '<p class="app-card-label">Weekly Goals</p>';
        const divider = body.querySelector('.fitness-divider'), list = body.querySelector('#fitnessList');
        if (divider) goals.appendChild(divider);
        if (list) goals.appendChild(list);
        activityGroup.after(goals);
      }
    }

    // Coloured band at the top of each page (title, hero, week / dates);
    // everything after it sits on a light sheet that overlaps the band.
    const band = (page, els) => { const b = document.createElement('div'); b.className = 'app-band';
      els[0].before(b); els.forEach(e => b.appendChild(e)); };
    band(home, [home.querySelector('.app-home-head')]);
    [cyc, food, fit].forEach(pg => band(pg, [pg.querySelector('.app-head'), pg.querySelector('.app-shared')]));

    if (header) header.style.display = 'none';
    container.append(home, cyc, food, fit, park);

    // Tab bar
    const bar = document.createElement('nav');
    bar.className = 'eb-tabbar';
    bar.setAttribute('aria-label', 'Main');
    bar.innerHTML = `<div class="eb-tabbar-pill">${TABS.map(([id, t]) => `<button type="button" data-tab="${id}">${TAB_ICONS[id]}<span>${t}</span></button>`).join('')}</div>
      <button type="button" class="eb-mira-btn eb-plus-btn" data-quick aria-label="Quick actions" aria-expanded="false"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>`;
    document.body.appendChild(bar);
    bar.addEventListener('click', e => {
      if (e.target.closest('[data-quick]')) return toggleQuick();
      const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab);
    });

    document.addEventListener('click', onPageClick);
    new MutationObserver(markActive).observe(document.body, { childList: true });

    // Keep Home/Fitness/Food header in step with the rest of the app
    const wrap = name => { const orig = window[name]; if (typeof orig !== 'function') return;
      window[name] = function () { const r = orig.apply(this, arguments); repaint(); return r; }; };
    ['switchDay', 'renderTracker', 'renderActivity', 'setMode', 'renderWeeklyTracker'].forEach(wrap);
    // Meals as a timeline: a check per meal in a left gutter, joined by a dashed line.
    const origSlots = window.renderSlotSection;
    if (typeof origSlots === 'function') window.renderSlotSection = function () { const r = origSlots.apply(this, arguments); timeline(); return r; };
    window.checkAndRenderSurvivalBadge = survivalBadge;
    document.addEventListener('eb:profile', repaint);

    buildMini();
    buildWeekMini();
    stripEmoji(document.body);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1) stripEmoji(n); else if (n.nodeType === 3 && EMOJI.test(n.data)) { EMOJI.lastIndex = 0; n.data = n.data.replace(EMOJI, ''); }
      EMOJI.lastIndex = 0;
    }))).observe(document.body, { childList: true, subtree: true });
    survivalBadge();
    go(location.hash.replace('#', '') || 'home', true);
  }

  function timeline() {
    let log = {}; try { log = getSlotLog(selectedDateStr()) || {}; } catch {}
    document.querySelectorAll('#slotSection .slot-card').forEach(card => {
      if (card.querySelector(':scope > .slot-gutter')) return;
      const gutter = document.createElement('span'); gutter.className = 'slot-gutter';
      const check = card.querySelector(':scope > .slot-header > .slot-check');
      if (check) gutter.appendChild(check);
      else {
        const v = log[card.dataset.slot];
        const done = (Array.isArray(v) ? v.length : v) || card.querySelector('.wake-row.on');
        gutter.innerHTML = `<span class="slot-mark${done ? ' done' : ''}" aria-label="${done ? 'Eaten' : 'Not eaten yet'}"></span>`;
      }
      card.prepend(gutter);
    });
  }

  // ── Pinned day summary ──
  // When the day card's middle row (eaten − burned = net) scrolls off the
  // top, a slim copy with the weekday slides in and stays pinned.
  function buildMini() {
    const eq = $('calEquation'); if (!eq || $('trackerMini')) return;
    const mini = document.createElement('div');
    mini.id = 'trackerMini'; mini.className = 'tracker-mini'; mini.setAttribute('aria-hidden', 'true');
    document.body.appendChild(mini);
    new IntersectionObserver(([e]) => {
      const passed = !e.isIntersecting && e.boundingClientRect.top < 0;
      mini.classList.toggle('show', passed && active === 'food');
    }, { threshold: 0 }).observe(eq);
    updateMini();
  }
  // Home: once the week row scrolls off, a slim copy (week, total, bar) stays pinned at the top.
  function buildWeekMini() {
    const sec = $('weeklyTrackerSection'); if (!sec || $('weekMini')) return;
    const mini = document.createElement('div');
    mini.id = 'weekMini'; mini.className = 'week-mini'; mini.setAttribute('aria-hidden', 'true');
    document.body.appendChild(mini);
    new IntersectionObserver(([e]) => {
      mini.classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top < 0 && active === 'home');
    }, { threshold: 0 }).observe(sec);
    updateWeekMini();
  }
  function updateWeekMini() {
    const mini = $('weekMini'), sec = $('weeklyTrackerSection'); if (!mini || !sec) return;
    const q = s => { const el = sec.querySelector(s); return el ? el.textContent.trim() : ''; };
    const fill = sec.querySelector('.week-bar-fill');
    mini.innerHTML = `<div class="week-mini-row"><b>${esc(q('.week-nav-label'))}</b><span><b>${esc(q('.week-card-val'))}</b> ${esc(q('.week-card-sub'))}</span></div>
      <div class="week-mini-bar"><i style="width:${fill ? fill.style.width : '0%'}"></i></div>`;
  }
  // Home: this week's calories (copied from the Nutrition tab's week card), tap to open it.
  // This week at a glance on the Home food card: calories (from the weekly
  // tracker) and workouts (count + calories burned), each opening its tab.
  function weekStatsHTML() {
    const d = weekData(), n = d.reduce((a, x) => a + x.workouts, 0), burned = d.reduce((a, x) => a + x.burned, 0);
    return `<div class="app-week-stats">
      <button type="button" data-go="food"><span>Calories this week</span><b id="homeWeekCal">–</b></button>
      <button type="button" data-go="fitness"><span>Workouts this week</span><b>${n ? `${n} · ${burned.toLocaleString()} cal burned` : 'None yet'}</b></button>
    </div>`;
  }
  function paintHomeWeek() {
    const box = $('homeWeekCal'), sec = $('weeklyTrackerSection'); if (!box) return;
    const q = c => { const el = sec && sec.querySelector(c); return el ? el.textContent.trim() : ''; };
    const val = q('.week-card-val'), sub = q('.week-card-sub').replace(/\s*net$/, '');
    box.innerHTML = val ? `${esc(val)} <small>${esc(sub)}</small>` : 'Nothing yet';
  }
  function updateMini() {
    const mini = $('trackerMini'), eq = $('calEquation'); if (!mini || !eq) return;
    mini.innerHTML = `<span class="tracker-mini-day">${DAY_NAMES[currentDay]}</span><div class="cal-equation">${eq.innerHTML}</div>`;
  }

  let painting = false;
  function repaint() {
    if (painting) return; painting = true;
    try {
      updateMini();
      paintFoodHead(); markPicked(); updateWeekMini(); paintHomeWeek(); applyTint(); pushWidget();
      if (active === 'food') { paintWords(); window.EBDayMode && EBDayMode.paint(); }
      if (active === 'home') renderHome();
      if (active === 'fitness') renderFitnessPage();
      if (active === 'cycle') renderCyclePage();
    } finally { painting = false; }
  }

  // Move the calendar and day tabs into the open page.
  function placeShared(page) {
    const slot = page.id === 'appParking' ? page : page.querySelector('.app-shared'); if (!slot) return;
    // One date picker on every page: the cycle strip. On Nutrition and Fitness,
    // tapping a day of this week picks the day to log (it replaces the Mon–Sun tabs).
    const park = $('appParking');
    slot.appendChild($('cycleSection'));
    const days = document.querySelector('.day-tabs');
    if (days) park.appendChild(days);
    // Moving the strip resets its scroll; repaint so today is centred again.
    if (page.id !== 'appParking') { try { renderCycleCalendar(); } catch {} markPicked(); }
  }

  // Strip ↔ logging day (Nutrition and Fitness)
  const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  function dayKeyFor(ds) { return WEEK.find(k => { try { return dateStrForDay(k) === ds; } catch { return false; } }); }
  function markPicked() {
    const picking = active === 'food' || active === 'fitness';
    let ds = null; try { ds = selectedDateStr(); } catch {}
    document.querySelectorAll('#cycleSection .cycle-day-cell').forEach(c => {
      c.classList.toggle('picked', picking && c.dataset.date === ds);
      c.classList.toggle('in-week', picking && !!dayKeyFor(c.dataset.date));
    });
  }
  document.addEventListener('click', e => {
    if (active !== 'food' && active !== 'fitness') return;
    const cell = e.target.closest('#cycleSection .cycle-day-cell'); if (!cell) return;
    const key = dayKeyFor(cell.dataset.date); if (!key) return;   // other weeks: phase info as before
    e.stopPropagation(); e.preventDefault();
    switchDay(key); markPicked();
  }, true);

  function closeOverlays() {
    if (window.EBAssistant && EBAssistant.isOpen && EBAssistant.isOpen()) EBAssistant.close(true);
    if (window.EBProfile && EBProfile.isOpen && EBProfile.isOpen()) EBProfile.close();
  }
  // Cravings logged on Menstruation open the full craving finder on Nutrition.
  const CRAVE_QUERY = { sweet: 'sweet', salty: 'salty', carbs: 'comfort', chocolate: 'chocolate', spicy: 'spicy', fried: 'fried' };
  function openCraving(c) {
    go('food');
    const inp = $('cravingInput'); if (!inp) return;
    inp.value = CRAVE_QUERY[c] || c;
    try { handleCraving(); } catch {}
    setTimeout(() => window.scrollTo({ top: $('cravingWrap').getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' }), 60);
  }
  function go(tab, initial) {
    if (tab === 'chat') { if (window.EBProfile && EBProfile.isOpen()) EBProfile.close(); if (window.EBAssistant && !EBAssistant.isOpen()) EBAssistant.open(); return markActive(); }
    if (tab === 'profile') { if (window.EBAssistant && EBAssistant.isOpen()) EBAssistant.close(true); if (window.EBProfile && !EBProfile.isOpen()) EBProfile.open(); return markActive(); }
    closeOverlays(); toggleQuick(false);
    if (!PAGES.includes(tab)) tab = 'home';
    if (!initial && tab !== active) window.EBAnalytics && EBAnalytics.track('tab_viewed', { tab });
    active = tab;
    document.body.dataset.tab = tab;
    PAGES.forEach(t => { pageEl(t).hidden = t !== tab; });
    placeShared(pageEl(tab));
    if (tab === 'cycle') { renderCyclePage(); survivalBadge(); }
    if (tab === 'home') { renderHome(); try { renderWeeklyTracker(); } catch {} }
    if (tab === 'fitness') { renderFitnessPage(); try { renderActivity(); } catch {} }
    if (tab === 'food') { try { renderTracker(); renderSlotSection(); } catch {} paintFoodHead(); paintWords(); window.EBDayMode && EBDayMode.paint(); }
    applyTint();
    const mini = $('trackerMini'); if (mini && tab !== 'food') mini.classList.remove('show');
    const wm = $('weekMini'); if (wm && tab !== 'home') wm.classList.remove('show');
    history.replaceState(null, '', '#' + tab);
    if (!initial) window.scrollTo(0, 0);
    markActive();
  }
  // Luna and Profile are overlays: their tab lights up while they're open.
  function markActive() {
    const overlay = document.querySelector('.as-overlay') ? 'chat' : null;
    document.querySelectorAll('.eb-tabbar [data-tab]').forEach(b => {
      const on = b.dataset.tab === (overlay || active);
      b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false');
    });
  }

  function logWorkout(ds, o) {
    const list = getActivities(ds);
    list.push({ name: o.name, cal: o.kcal, ts: Date.now(), suggested: ds });
    setActivities(ds, list);
    window.EBNative && EBNative.haptic();
    renderActivity(); renderTracker(); try { renderWeeklyTracker(); } catch {}
    EB.toast(`${o.name} logged`);
  }

  function onPageClick(e) {
    const t = e.target;
    const ln = t.closest('[data-log-next]');
    if (ln) {
      e.stopPropagation();
      acceptDefault(ln.dataset.logNext, selectedDateStr());
      EB.toast('Logged'); return repaint();
    }
    const cm = t.closest('[data-crave-more]');
    if (cm) { e.preventDefault(); return openCraving(cm.dataset.craveMore); }
    const g = t.closest('[data-go]'); if (g) { e.preventDefault(); return go(g.dataset.go); }
    const en = t.closest('[data-energy]');
    if (en) { setEnergy(selectedDateStr(), +en.dataset.energy); return repaint(); }
    const fi = t.closest('[data-food-idea]');
    if (fi) { if (window.EBMeals) EBMeals.openSearch(fi.dataset.foodIdea); return; }
    const lo = t.closest('[data-log-opt]');
    if (lo && !lo.disabled) {
      const ds = selectedDateStr(), s = suggest(ds); if (!s) return;
      const o = s.options.find(x => x.kind === lo.dataset.logOpt); if (o) logWorkout(ds, o);
      return;
    }
    const fl = t.closest('[data-flow]');
    if (fl) { onFlow(dateToStr(new Date()), fl.dataset.flow); return renderCyclePage(); }
    const mo = t.closest('[data-mood]');
    if (mo) { const ds = dateToStr(new Date()); setDayField(ds, 'mood', toggleIn((dayLog()[ds] || {}).mood, mo.dataset.mood)); return renderCyclePage(); }
    const cr = t.closest('[data-crave]');
    if (cr) { const ds = dateToStr(new Date()); setDayField(ds, 'cravings', toggleIn((dayLog()[ds] || {}).cravings, cr.dataset.crave)); return renderCyclePage(); }
    const wa = t.closest('[data-water]');
    if (wa) { const ds = dateToStr(new Date()), n = +wa.dataset.water; setDayField(ds, 'water', (+(dayLog()[ds] || {}).water === n) ? n - 1 : n); return renderCyclePage(); }
    const sy = t.closest('[data-sym]');
    if (sy) { toggleSym(dateToStr(new Date()), sy.dataset.sym); return renderCyclePage(); }
    if (t.closest('[data-period-log]')) return pickPeriodDate();
    const rm = t.closest('[data-period-remove]');
    if (rm) { if (confirm('Remove this period date?')) { removePeriodStart(rm.dataset.periodRemove); renderCyclePage(); } return; }
    const hb = t.closest('[data-health]');
    if (hb && window.EBHealth) {
      (hb.dataset.health === 'connect' ? EBHealth.connect() : EBHealth.syncIn().then(() => EBHealth.syncOut()))
        .then(() => { EB.toast('Apple Health synced'); repaint(); })
        .catch(e => EB.toast(e && e.message === 'unavailable' ? 'Apple Health isn’t available on this device' : 'Apple Health: ' + ((e && e.message) || e)));
      return;
    }
    if (t.closest('[data-fit-reset]')) {
      const ds = selectedDateStr();
      if (!confirm(`Reset workouts and energy for ${DAY_NAMES[currentDay]}?`)) return;
      setActivities(ds, []); setEnergy(ds, 0);
      renderActivity(); renderTracker(); try { renderWeeklyTracker(); } catch {}
      return;
    }
    const sh = t.closest('[data-sheet]');
    if (sh) {
      const body = sh.dataset.sheet === 'bedside' ? $('bedsideBody') : $('mealPrepBody');
      if (body) openSheet(sh.dataset.sheet === 'bedside' ? 'Bedside Snack Drawer' : 'Meal Prep Jars', body);
      return;
    }
    if (t.closest('[data-food-search]')) {
      if (window.EBMeals) EBMeals.openSearch(); else try { openAddModal(); } catch {}
    }
  }


  // ── Words from meals: "Roasted chana + chaas" → chana, chaas ──
  const STOP = new Set(('and with the for from into over plus side bowl style quick easy light fresh hot cold warm mini home made homemade ' +
    'cup cups tbsp tsp small big large roasted boiled grilled fried baked steamed toasted stuffed spiced plain extra half full your').split(' '));
  const KEEP_S = new Set(['oats', 'greens', 'sprouts', 'chips', 'nuts', 'seeds', 'peas', 'beans', 'lentils', 'hummus', 'chickpeas', 'dates', 'grapes', 'berries']);
  function topWords(names, n) {
    const c = {};
    // "eggs" and "egg" count as one word; a few words are always plural.
    const one = w => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !KEEP_S.has(w)) ? w.slice(0, -1) : w;
    names.forEach(nm => String(nm).toLowerCase().split(/[^a-z]+/).forEach(w => { w = one(w); if (w.length >= 3 && !STOP.has(w)) c[w] = (c[w] || 0) + 1; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
  }

  // Nutrition: this week's plan as a block of words, sized by how often each one appears.
  function wordsHTML() {
    const names = [];
    DAY_ORDER.forEach(k => mealSlots().forEach(sl => { const m = getEffectiveDefaultMeal(sl, k, isPMSMode()); if (m) names.push(m.name); }));
    const words = topWords(names, 14);
    if (words.length < 3) return '';
    const max = words[0][1], min = words[words.length - 1][1];
    const size = n => Math.round(14 + (max === min ? 0.5 : (n - min) / (max - min)) * 22);   // 14–36px
    // Biggest in the middle, smaller ones fanning out to both sides: reads as a poster, not a list.
    const order = [];
    words.forEach((w, i) => { if (i % 2) order.push([w, i]); else order.unshift([w, i]); });
    return `<p class="app-card-label">This week in words</p>
      <p class="app-words-cloud">${order.map(([[w, n], i]) => `<span class="${i === 0 ? 'top' : ''}" style="font-size:${size(n)}px;font-weight:${n === max ? 800 : n > (max + min) / 2 ? 700 : 500}">${esc(w)}</span>`).join(' ')}</p>
      <p class="app-muted">What’s in this week’s plan, sized by how often it comes up.</p>`;
  }
  function paintWords() {
    const el = $('weekWords'); if (!el) return;
    const html = wordsHTML(); el.hidden = !html; if (html) el.innerHTML = html;
  }

  // ── Weekly poster ──
  // Everything eaten on one date: logged meals, wake-up items and older custom meals.
  function dayTotals(ds) {
    const t = { cal: 0, p: 0, c: 0, f: 0, fib: 0 };
    const add = m => { if (!m) return; t.cal += +m.cal || 0; t.p += +m.p || 0; t.c += +m.c || 0; t.f += +m.f || 0; t.fib += +m.fib || 0; };
    const log = getSlotLog(ds), sig = new Set();
    Object.values(log).forEach(v => (Array.isArray(v) ? v : [v]).forEach(m => { if (m && m.cal) { add(m); sig.add((m.name || '') + '|' + (m.cal || 0)); } }));
    try { add(wakeupTotals(ds)); } catch {}
    try { getCustomMeals(ds).forEach(m => { if (!sig.has((m.title || m.name || '') + '|' + (m.cal || 0))) add(m); }); } catch {}
    try { if (window.EBDayMode) add(EBDayMode.estimate(ds)); } catch {}   // ticked Guide meals (estimate)
    return t;
  }
  // The goal decides the poster's headline: deficit, surplus or days at maintenance.
  function goalMode() {
    const p = EB.getProfile();
    try { const n = window.EBPlanner && EBPlanner.numbers(p); if (n) return n.losing ? 'lose' : n.gaining ? 'gain' : 'maintain'; } catch {}
    return p.goal === 'lose' ? 'lose' : p.goal === 'muscle' ? 'gain' : 'maintain';
  }
  function weekData() {
    return DAY_ORDER.map(k => {
      const ds = dateStrForDay(k), acts = getActivities(ds);
      return { ds, info: phaseOf(ds), eat: dayTotals(ds), burned: acts.reduce((a, x) => a + (parseInt(x.cal) || 0), 0), workouts: acts.length };
    });
  }
  // The week in numbers: the headline depends on the goal (deficit, surplus or maintenance).
  function weekSummary(d) {
    const n0 = v => Math.round(v).toLocaleString();
    const logged = d.filter(x => x.eat.cal > 0), days = logged.length;
    const eaten = logged.reduce((a, x) => a + x.eat.cal, 0), burnedLogged = logged.reduce((a, x) => a + x.burned, 0);
    const need = TDEE * days + burnedLogged;        // what the body used on the logged days
    const mode = goalMode();
    let big, label, sub;
    if (!days) { big = '0'; label = 'DAYS LOGGED'; sub = 'Log meals to see your week'; }
    else if (mode === 'maintain') {
      const ok = logged.filter(x => Math.abs(x.eat.cal - x.burned - TDEE) <= TDEE * 0.1).length;
      big = `${ok}/${days}`; label = 'DAYS AT MAINTENANCE'; sub = `Within 10% of ${n0(TDEE)} cal a day`;
    } else {
      const diff = mode === 'lose' ? need - eaten : eaten - need;   // positive = on track
      big = n0(Math.abs(diff));
      label = mode === 'lose' ? (diff >= 0 ? 'CAL DEFICIT' : 'CAL OVER MAINTENANCE') : (diff >= 0 ? 'CAL EXTRA EATEN' : 'CAL SHORT OF YOUR GOAL');
      sub = `About ${(Math.abs(diff) / CAL_PER_KG).toFixed(2)} kg ${mode === 'lose' ? (diff >= 0 ? 'lost' : 'gained') : (diff >= 0 ? 'toward your gain' : 'below plan')} · ${days} day${days === 1 ? '' : 's'} logged`;
    }
    const T = isPMSMode() ? PMS_TARGETS : TARGETS;
    const avg = k => days ? logged.reduce((a, x) => a + x.eat[k], 0) / days : 0;
    const burned = d.reduce((a, x) => a + x.burned, 0), workouts = d.reduce((a, x) => a + x.workouts, 0);
    return { big, label, sub, days, T, avg, burned, workouts };
  }
  // Sunday: the week's summary slides up once, as a sheet.
  function weekSheetHTML(d) {
    const S = weekSummary(d), n0 = v => Math.round(v).toLocaleString();
    const top = Math.max(S.T.cal, ...d.map(x => x.eat.cal));
    return `<div class="wk-sum">
      <p class="wk-big">${esc(S.big)}</p>
      <p class="wk-label">${esc(sentence(S.label))}</p>
      <p class="wk-sub">${esc(S.sub)}</p>
      <p class="wk-k">Daily average</p>
      <div class="wk-macros">${[['Protein', 'p'], ['Carbs', 'c'], ['Fat', 'f'], ['Fibre', 'fib']].map(([nm, k]) => `
        <div><b>${Math.round(S.avg(k))}g</b><small>of ${Math.round(S.T[k])}g</small><span>${nm}</span>
          <i><em style="width:${Math.min(100, S.T[k] ? S.avg(k) / S.T[k] * 100 : 0)}%"></em></i></div>`).join('')}</div>
      <p class="wk-k">Burned in workouts</p>
      <p class="wk-burn"><b>${n0(S.burned)}</b> cal · ${S.workouts} workout${S.workouts === 1 ? '' : 's'}</p>
      <p class="wk-k">Your week by cycle</p>
      <div class="wk-week" role="img" aria-label="Calories each day, coloured by cycle phase">${d.map((x, i) => `
        <div><span class="wk-bar" style="height:${x.eat.cal ? Math.max(8, 72 * x.eat.cal / top) : 4}px;background:${x.info ? PHASE_META[x.info.phase].color : 'var(--card-stroke)'}"></span>
          <b>${'MTWTFSS'[i]}</b><small>${x.info ? `D${x.info.dayNum}` : ''}</small></div>`).join('')}</div>
      <div class="wk-key">${[...new Set(d.filter(x => x.info).map(x => x.info.phase))].map(ph => `<span><i style="background:${PHASE_META[ph].color}"></i>${PHASE_STYLE[ph].word}</span>`).join('')}</div>
      <button type="button" class="eb-btn primary" data-week-share>Share as image</button>
    </div>`;
  }
  function openWeekSheet() {
    const d = weekData();
    const body = document.createElement('div'); body.innerHTML = weekSheetHTML(d);
    body.querySelector('[data-week-share]').addEventListener('click', () => EBNative.share(drawPoster(d)));
    const park = $('appParking'); park.appendChild(body);
    openSheet('Your week', body);
    const ov = [...document.querySelectorAll('.app-sheet-overlay')].pop();
    if (ov) ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-sheet-close]')) body.remove(); });
  }
  const WKEY = 'eb_week_seen';
  function maybeWeekSheet() {
    if (new Date().getDay() !== 0 || active !== 'home' || document.querySelector('.app-sheet-overlay')) return;
    const d = weekData(); if (!d.some(x => x.eat.cal > 0)) return;
    try { if (localStorage.getItem(WKEY) === d[0].ds) return; localStorage.setItem(WKEY, d[0].ds); } catch { return; }
    setTimeout(openWeekSheet, 600);
  }
  function drawPoster(d) {
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const F = (w, px) => `${w} ${px}px -apple-system, "SF Pro Display", "Helvetica Neue", system-ui, sans-serif`;
    const n0 = v => Math.round(v).toLocaleString();
    const today = phaseOf(todayStr()), st = today && PHASE_STYLE[today.phase];
    g.fillStyle = st ? st.deep : '#2e7d32'; g.fillRect(0, 0, W, H);
    if (today) { g.fillStyle = 'rgba(255,255,255,.07)'; g.font = F(900, 900); g.textAlign = 'right'; g.fillText(String(today.dayNum), W + 140, 820); g.textAlign = 'left'; }
    const text = (str, x, y, w, px, a = 1, align = 'left') => { g.globalAlpha = a; g.font = F(w, px); g.textAlign = align; g.fillText(str, x, y); g.globalAlpha = 1; g.textAlign = 'left'; };
    g.fillStyle = '#fff';

    // Header
    const first = firstName();
    const fmt = s => new Date(s + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    text(first ? `${first.toUpperCase()}’S WEEK` : 'YOUR WEEK', 72, 124, 800, 44);
    text(`${fmt(d[0].ds)} – ${fmt(d[6].ds)}`, W - 72, 124, 600, 32, .8, 'right');

    const S = weekSummary(d), { big, label, sub, days, T, avg } = S;
    text(big, 56, 430, 900, big.length > 5 ? 230 : 300);
    text(label, 72, 506, 800, 52);
    text(sub, 72, 562, 600, 32, .85);

    // Macros: daily average on logged days, against the target
    text('DAILY AVERAGE', 72, 664, 700, 26, .7);
    const cols = [['PROTEIN', 'p'], ['CARBS', 'c'], ['FAT', 'f'], ['FIBRE', 'fib']], cw = (W - 144) / 4;
    cols.forEach(([nm, k], i) => {
      const x = 72 + i * cw;
      text(`${Math.round(avg(k))}g`, x, 742, 800, 64);
      text(`of ${Math.round(T[k])}g`, x, 784, 500, 26, .75);
      text(nm, x, 822, 700, 24, .75);
      // thin bar under each macro
      const pct = Math.min(1, T[k] ? avg(k) / T[k] : 0);
      g.globalAlpha = .25; g.fillRect(x, 840, cw - 32, 8); g.globalAlpha = 1; g.fillRect(x, 840, (cw - 32) * pct, 8);
    });

    // Workouts
    const burned = d.reduce((a, x) => a + x.burned, 0), workouts = d.reduce((a, x) => a + x.workouts, 0);
    text('BURNED IN WORKOUTS', 72, 930, 700, 26, .7);
    text(n0(burned), 72, 1010, 900, 84);
    g.font = F(900, 84); const bw = g.measureText(n0(burned)).width;
    text(`cal · ${workouts} workout${workouts === 1 ? '' : 's'}`, 72 + bw + 16, 1010, 600, 36, .85);

    // The week by cycle: colour = phase, height = calories eaten, cycle day underneath
    const base = 1206, gap = 14, colW = (W - 144 - gap * 6) / 7, maxH = 130;
    const top = Math.max(T.cal, ...d.map(x => x.eat.cal));
    d.forEach((x, i) => {
      const X = 72 + i * (colW + gap), h = x.eat.cal ? Math.max(16, maxH * x.eat.cal / top) : 12;
      g.fillStyle = x.info ? PHASE_META[x.info.phase].color : 'rgba(255,255,255,.3)';
      g.beginPath(); g.roundRect ? g.roundRect(X, base - h, colW, h, 10) : g.rect(X, base - h, colW, h); g.fill();
      g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke();
      g.fillStyle = '#fff';
      text('MTWTFSS'[i], X + colW / 2, base + 38, 700, 28, 1, 'center');
      if (x.info) text(`D${x.info.dayNum}`, X + colW / 2, base + 70, 600, 22, .75, 'center');
    });
    // Phase key for the phases in this week
    const seen = [...new Set(d.filter(x => x.info).map(x => x.info.phase))];
    let kx = 72;
    seen.forEach(ph => {
      g.fillStyle = PHASE_META[ph].color; g.beginPath(); g.arc(kx + 9, 1310, 9, 0, Math.PI * 2); g.fill();
      g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = '#fff';
      const nm = PHASE_STYLE[ph].word; text(nm, kx + 26, 1318, 600, 24, .85);
      g.font = F(600, 24); kx += 26 + g.measureText(nm).width + 28;
    });
    text('Menu-fi', W - 72, 1318, 800, 30, 1, 'right');
    return cv.toDataURL('image/png');
  }

  // ── Widget: two weeks of cycle days + today's meals, for the home and lock screen ──
  function pushWidget() {
    if (!window.EBNative || !EBNative.native) return;
    const days = [], start = new Date(); start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const ds = iso(d), info = phaseOf(ds); if (!info) continue;
      const st = PHASE_STYLE[info.phase];
      days.push({ d: ds, day: info.dayNum, label: st.word, color: PHASE_META[info.phase].color, deep: st.deep, periodIn: info.cycleLength - info.dayNum + 1 });
    }
    const ds = todayStr(), log = getSlotLog(ds), tk = todayKey();
    const plain = t => String(t || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    const mode = window.EBDayMode ? EBDayMode.modeFor(ds) : 'plan';
    let meals;
    if (mode === 'guide' && window.EBDayMode) {
      // Guide days: each meal's calorie range, in rough clock windows.
      const WIN = { Breakfast: [7, 10, '7–10am'], 'Mid-morning': [10, 12, '10am–12pm'], Lunch: [12, 15, '12–3pm'], Snack: [15, 18, '3–6pm'], Dinner: [18, 22, '6–10pm'] };
      meals = EBDayMode.guideMeals(ds).map(g => { const w = WIN[g.name] || [0, 24, '']; return {
        slot: g.name, time: w[2], start: w[0], end: w[1], name: `${g.lo}–${g.hi} cal`, detail: `About ${g.p} g protein`, logged: !!g.done }; });
    } else {
      meals = mealSlots().map(sl => {
        const w = slotWindow(sl.time) || { start: 0, end: 24 };
        const v = log[sl.id], items = (Array.isArray(v) ? v : v ? [v] : []).filter(it => it && it.name);
        const m = getEffectiveDefaultMeal(sl, tk, isPMSMode());
        const cal = m && (m.cal || (m.macros && m.macros.cal));
        return { slot: sl.name, time: sl.time, start: w.start, end: w.end, name: plain(items.length ? items[0].name : m ? m.name : sl.name),
          detail: !items.length && cal ? `About ${Math.round(cal)} cal` : null, logged: !!(items.length || getSlotEaten(ds, sl.id)) };
      });
    }
    // Today's workout: what she logged, or the same suggestion Fitness shows.
    const acts = getActivities(ds), burned = acts.reduce((a, x) => a + (parseInt(x.cal) || 0), 0);
    let workout = null;
    if (acts.length) {
      const a = acts[0], more = acts.length > 1 ? ` +${acts.length - 1} more` : '';
      workout = { name: `${plain(a.name || 'Workout')}${a.mins ? ` · ${a.mins} min` : ''}${more}`, detail: burned ? `${burned} cal burned` : null, done: true };
    } else {
      const sg = suggest(ds, 2), o = sg && sg.options[0];
      if (o) workout = { name: `${o.mins} min ${o.name.toLowerCase()}`, detail: `About ${o.kcal} cal`, done: false, guess: !energyFor(ds) };
    }
    EBNative.widget({ name: firstName(), days, mealsDate: ds, meals, workout });
  }

  // ── Food as words, not emoji ──
  // Meal data and older screens still carry emoji; they're taken out as the
  // page renders, so every screen uses the same line icons and plain words.
  const EMOJI = /\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*\s?/gu;
  function stripEmoji(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (EMOJI.test(n.data)) { EMOJI.lastIndex = 0; n.data = n.data.replace(EMOJI, ''); }
      EMOJI.lastIndex = 0;
    }
  }

  // ── Dummy data (for building and testing) ──
  function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function seedDummy() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysAgo = n => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
    const p = EB.getProfile();
    Object.assign(p, {
      name: 'Ashima', birthday: '1996-08-14', goal: 'lose', goals: ['pms', 'energy'],
      weight: { unit: 'kg', current: 68, goal: 62 },
      cycle: { tracks: true, lastStart: iso(daysAgo(12)), cycleLength: 28, periodLength: 5, regular: 'yes', symptoms: ['cramps', 'cravings', 'bloating'], pmsStart: '4-7' },
      activity: { level: 'moderate', types: ['strength', 'yoga', 'walking'] }, trackers: ['apple'],
      food: { diet: 'egg', cuisines: ['north', 'south', 'home'], files: [],
        usual: 'Poha or idli for breakfast, dal rice and sabzi for lunch, makhana in the evening, paneer and roti or khichdi at night. Eggs a few times a week.' },
      nutritionist: { has: 'no', name: '', contact: '' }, sleep: { hours: '7-8', regular: 'mostly' },
      health: { conditions: ['none'], meds: '' }, coach: 'gentle', reminders: ['morning', 'evening'],
      planSource: 'generated', completedAt: new Date().toISOString()
    });
    EB.saveProfile(p);                              // also builds the plan and sets the cycle date
    // This week up to yesterday: planned meals eaten; one day with pizza.
    const tIdx = DAY_ORDER.indexOf(todayKey());
    DAY_ORDER.forEach((day, i) => {
      if (i > tIdx) return;
      const ds = dateStrForDay(day), log = {};
      MEAL_SLOTS.filter(s => ['breakfast', 'lunch', 'snack', 'dinner'].includes(s.id)).forEach(s => {
        if (i === tIdx && s.id !== 'breakfast') return;          // today: breakfast only
        const m = getEffectiveDefaultMeal(s, day, false);
        if (!m) return;
        log[s.id] = [i === tIdx - 2 && s.id === 'snack'
          ? { name: 'Pizza (2 slices)', qty: '2 regular slices', cal: 480, p: 18, c: 54, f: 20, fib: 2 }
          : { ...m }];
        setSlotEaten(ds, s.id, true);
      });
      setSlotLog(ds, log);
      const acts = [];
      if (i === tIdx - 3) acts.push({ name: 'Strength training', cal: 270, ts: Date.now() });
      if (i === tIdx - 1) acts.push({ name: 'Yoga', cal: 75, ts: Date.now() });
      if (acts.length) setActivities(ds, acts);
    });
    setEnergy(iso(today), 3);
    ['renderCycleCalendar', 'renderSlotSection', 'renderTracker', 'renderWeeklyTracker', 'renderActivity', 'renderTabs']
      .forEach(fn => { try { window[fn](); } catch {} });
    go('home');
    EB.toast('Dummy data added');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  window.EBApp = { go, suggest, energyFor, seedDummy };
})();
