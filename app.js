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
  const TABS = [['home', 'Home'], ['cycle', 'Menstruation'], ['food', 'Nutrition'], ['fitness', 'Fitness'], ['profile', 'Account']];
  const PAGES = ['home', 'cycle', 'food', 'fitness'];
  const pageEl = t => $('page' + t[0].toUpperCase() + t.slice(1));
  // Luna (chat) sits apart from the tabs as a round button, like an assistant key.
  const MIRA_ICON = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8z"/></svg>';

  // ── Energy check-in ──
  // Three levels now. Older check-ins saved 4 ("High"); they read as High.
  const ENERGY = [{ v: 1, t: 'Low' }, { v: 2, t: 'Medium' }, { v: 3, t: 'High' }];
  const lvlOf = v => (v >= 3 ? 3 : v || 0);
  const EKEY = 'eb_energy';
  function energyLog() { try { return JSON.parse(localStorage.getItem(EKEY) || '{}'); } catch { return {}; } }
  function energyFor(ds) { return energyLog()[ds] || 0; }
  function setEnergy(ds, v) {
    const log = energyLog(); if (v) log[ds] = v; else delete log[ds];
    try { localStorage.setItem(EKEY, JSON.stringify(log)); } catch {}
  }
  // ── Time today: how long she has to cook / eat ──
  // Energy can be high while time is short, so meal ideas use both.
  const TIME = [{ v: 1, t: 'Under 10 min' }, { v: 2, t: '10–30 min' }, { v: 3, t: '30+ min' }];
  const TKEY = 'eb_time';
  function timeLog() { try { return JSON.parse(localStorage.getItem(TKEY) || '{}'); } catch { return {}; } }
  function timeFor(ds) { return timeLog()[ds] || 0; }
  function setTime(ds, v) {
    const log = timeLog(); if (v) log[ds] = v; else delete log[ds];
    try { localStorage.setItem(TKEY, JSON.stringify(log)); } catch {}
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
    // Short on time: shorter sessions (10 min, or 30 at most).
    const tm = timeFor(ds); if (tm === 1) mins = 10; else if (tm === 2) mins = Math.min(mins, 30);
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
    // Short on time: swap anything that needs cooking for a grab-and-go pick.
    const COOK = /^(khichdi|poha|oats|palak|ginger tea|sprouts)$/i;
    const QUICK = [['Curd', 'Ready in the fridge, protein in a minute'], ['Roasted chana', 'No cooking, protein and fibre'], ['Banana', 'Grab and go'], ['Almonds', 'A handful, nothing to make'], ['Dates', 'Quick energy, no prep']];
    if (timeFor(ds) === 1) {
      const have = new Set(picks.map(p => p[0]));
      picks = picks.map(p => COOK.test(p[0]) ? (QUICK.find(q => !have.has(q[0]) && have.add(q[0])) || p) : p);
    } else if (timeFor(ds) === 3 && energy >= 2 && !picks.some(p => COOK.test(p[0]))) {
      picks = [['Sprouts', 'Time to make something fresh: protein and fibre'], ...picks.slice(0, 4)];
    }
    const all = window.EBMeals ? EBMeals.foods() : [];
    return picks.map(([n, why]) => {
      const f = all.find(x => x.n.toLowerCase().startsWith(n.toLowerCase())) || all.find(x => x.n.toLowerCase().includes(n.toLowerCase()));
      return { n, why, cal: f ? f.cal : null };
    });
  }

  // Energy + Time: always open. The meal idea, workouts and foods update
  // as soon as she taps a different option.
  function energyHTML(ds) {
    const cur = energyFor(ds);
    const s = suggest(ds);
    const foods = foodIdeas(ds);
    const logged = getActivities(ds).filter(a => a.suggested === ds);
    const lv = lvlOf(cur), tm = timeFor(ds);
    // Both pickers stay on screen, so changing either is one tap.
    return `<div class="app-card app-energy-card">
      <p class="app-card-label">Energy and time today</p>
      <div class="eb-seg app-energy" role="radiogroup" aria-label="Energy today">
        ${ENERGY.map(e => `<button type="button" class="eb-seg-btn${lv === e.v ? ' on' : ''}" data-energy="${e.v}" role="radio" aria-checked="${lv === e.v}">${e.t}</button>`).join('')}
      </div>
      <div class="eb-seg app-energy app-time" role="radiogroup" aria-label="Time today">
        ${TIME.map(x => `<button type="button" class="eb-seg-btn${tm === x.v ? ' on' : ''}" data-time="${x.v}" role="radio" aria-checked="${tm === x.v}">${x.t}</button>`).join('')}
      </div>
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
    ovulation:  { deep: '#ad1457', word: 'Ovulation' },
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

  // ── Coach: the Menu-fi character with a motivating line ──
  // Motivation only (her numbers and next meal live in the cards below).
  // A different line each day; tapping the bubble shows the next one.
  let coachTap = 0;
  const COACH_QUOTES = [
    'Small steps every day. That’s the whole secret.',
    'You don’t have to be perfect. You just have to keep going.',
    'Progress, not perfection.',
    'Every meal is a fresh start.',
    'Choose the version of today you’ll be glad about tonight.',
    'One good choice makes the next one easier.',
    'Your body hears everything your mind says. Be kind.',
    'Consistency beats intensity, every single time.',
    'Rest is part of the plan, not a step back.',
    'Strong is built one ordinary day at a time.',
    'You’ve done hard things before. This is one more.',
    'Show up for yourself today. Even a little counts.',
    'Start where you are. Today is enough.',
    'Fuel your body like you love it, because you do.',
    'A slow day is still a step forward.',
    'You’re not starting over. You’re starting stronger.',
    'Look how far you’ve already come.',
    'Make today count. Tomorrow will thank you.',
    'Believe in the woman you’re becoming.',
    'Tiny habits, big change.',
  ];
  function coachLines() {
    // Start on a different line each day, so it never feels stuck.
    const now = new Date(), day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    const k = day % COACH_QUOTES.length;
    return COACH_QUOTES.slice(k).concat(COACH_QUOTES.slice(0, k));
  }
  // Motion: she rises from behind the card once per session, breathes and
  // sways while idle, catches a glint now and then, and hops when tapped while
  // her new line appears word by word. All off with Reduce Motion (noir.css).
  let coachEntered = false, coachSaid = false;
  function coachHTML(ctx) {
    const lines = coachLines();
    const line = lines[coachTap % lines.length];
    const enter = !coachEntered; coachEntered = true;
    const say = coachSaid; coachSaid = false;
    const words = esc(line).split(' ').map((w, i) => `<span style="--i:${i}">${w}</span>`).join(' ');
    return `<div class="app-card app-coach${enter ? ' coach-enter' : ''}${say ? ' coach-say' : ''}" data-coach-next role="button" tabindex="0" aria-label="Coach says: ${esc(line)}. Tap for another.">
        <span class="coach-fig" aria-hidden="true"><img class="coach-img" src="img/coach-bust.png" alt=""><i class="coach-glint"></i></span>
        <div class="coach-bubble"><p>${words}</p></div>
      </div>`;
  }

  // One line under the calendar (and current weight): eaten · burned · left,
  // a thin bar. Going over shows in orange, the same as the week bars and Nutrition.
  // Is "Current weight" on screen above Home's cards? (switched on and a weight saved)
  const weightShown = () => { try { return !!EB.getProfile().showWeight && +getWeight().current > 0; } catch { return false; } };
  let homeSum = '';   // today's line, shown at the top of the week card
  function todaySumHTML(eaten, burned, target, p, pTarget, isToday) {
    const budget = target + burned, left = Math.round(budget - eaten), over = left < 0;
    const pct = budget > 0 ? Math.min(100, Math.round(eaten / budget * 100)) : 0;
    const n = v => Math.round(v).toLocaleString();
    // One answer first (what's left), then where it came from. Over is orange.
    return `<div class="app-sum${over ? ' over' : ''}" role="group" aria-label="${isToday ? 'Today' : 'This day'}: ${over ? `${n(-left)} calories over` : `${n(left)} calories left`}. Eaten ${n(eaten)}, burned ${n(burned)}, target ${n(target)}.">
      <p class="app-sum-big" aria-hidden="true"><b>${n(Math.abs(left))}</b><span>kcal ${over ? 'over' : 'left'} ${isToday ? 'today' : 'this day'}</span></p>
      <div class="app-sum-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <p class="app-sum-line" aria-hidden="true">Target ${n(target)} − eaten ${n(eaten)} + burned ${n(burned)}</p>
    </div>`;
  }

  function renderHome() {
    const page = $('pageHome'); if (!page) return;
    // Home shows today, or the day picked on its strip (homeDs). Days in this
    // week also move the meal log there, so food numbers are that day's.
    const todayDs = dateToStr(new Date());
    if (homeDs === todayDs) homeDs = null;
    const wantKey = homeDs ? dayKeyFor(homeDs) || todayKey() : todayKey();
    if (currentDay !== wantKey) { currentDay = wantKey; try { renderTabs(); } catch {} }
    const ds = homeDs || selectedDateStr();
    const isToday = !homeDs, dayDate = new Date(ds + 'T00:00');
    const p = EB.getProfile();
    const C = calorieDay(currentDay), cons = C.consumed;   // same numbers as Nutrition
    const eaten = C.eaten, burned = C.burned, target = C.target;
    const pTarget = isPMSMode() ? PMS_TARGETS.p : TARGETS.p;
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
        <p class="app-date">${first ? `${esc(first)}’s ` : ''}${dayDate.toLocaleDateString(undefined, { weekday: 'long' })} · ${dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${isToday ? '' : ` <button type="button" class="app-back-today" data-home-today>Today</button>`}</p>
      </div>`;
    // Under the calendar: the cycle day, set big, and how she might feel.
    const heroHTML = st ? `<div class="app-card app-hero-card" style="--phase:${meta.color}">
        <h1 class="hero-cycle" aria-label="Day ${info.dayNum} of your cycle, ${esc(meta.label === 'PMS' ? 'luteal phase (PMS)' : meta.label)}">
          <span class="hero-num" aria-hidden="true">${info.dayNum}</span>
          <span class="hero-stack" aria-hidden="true"><span class="hero-kicker">Day of your cycle${info.phase === 'luteal' ? ' · luteal' : ''}</span><span class="hero-phase">${st.word}</span></span>
        </h1>
        <p class="app-hero-feel">${PHASE_LINE[info.phase] || ''}</p>
      </div>` : `<button type="button" class="app-card app-today-setup" data-go="cycle">Add your last period date to see your phase</button>`;
    const chLine = isToday && window.EBChallenges ? EBChallenges.homeLine() : '';
    // The week card is a live element (Nutrition's code keeps it up to date):
    // lift it out before Home is redrawn, then put it back in its slot.
    const weekSec = $('weeklyTrackerSection'), homeBody = page.querySelector('.app-home-body');
    if (weekSec && homeBody.contains(weekSec)) homeBody.after(weekSec);
    // Order: context (cycle) → do (today's checklist) → adjust (energy) → review (the week).
    const coach = isToday ? coachHTML({
      first, phase: info ? info.phase : 'none', eaten, target, left: Math.round(left),
      next: nm && !nm.missed ? nm.name : '', allDone: !nm,
      energy: energyFor(ds), challengeDone: !!(chLine && /ch-home-dot done/.test(chLine)),
    }) : '';
    page.querySelector('.app-home-body').innerHTML = `
      ${coach}
      ${weightShown() && typeof currentWeightHTML === 'function' ? currentWeightHTML().replace('cycle-weight', 'cycle-weight app-home-weight') : ''}
      ${(homeSum = todaySumHTML(eaten, burned, target, cons.p, pTarget, isToday), weekCardHTML(eaten, target))}
      ${heroHTML}
      <div class="app-card app-shortcuts app-todaylist">
        <p class="app-card-label">${isToday ? 'Today' : dayDate.toLocaleDateString(undefined, { weekday: 'long' })}</p>
        ${!isToday ? dayFoodHTML(ds, target) : nm ? `<div class="app-today-next" data-go="food" role="button" tabindex="0" aria-label="${nm.now ? 'Now' : 'Up next'}: ${esc(nm.name)}">
            <div class="app-next-text">
              <span class="app-meta">${nm.now ? 'Now' : 'Up next'} · ${esc(nm.slot)} · ${esc(nm.time)}</span>
              <b class="app-next-name">${esc(nm.name)}</b>
              ${nm.missed ? `<span class="app-tolog-line" data-go="food">${nm.missed} earlier meal${nm.missed > 1 ? 's' : ''} to log</span>` : ''}
            </div>
            <button type="button" class="app-tick" data-log-next="${nm.slotId}" role="checkbox" aria-checked="false" aria-label="Mark ${esc(nm.slot)} eaten"></button>
          </div>`
          : `<div class="app-today-next" data-go="food" role="button" tabindex="0" aria-label="All meals logged. Open Nutrition">
              <div class="app-next-text"><span class="app-meta">All meals logged</span><b class="app-next-name">Done for today</b></div>
              <button type="button" class="app-opt-btn" data-go="food">Nutrition</button>
            </div>`}
        ${chLine ? `<div class="ch-home-slot">${chLine}</div>` : ''}
        ${workoutRowHTML(ds)}
      </div>
      ${energyHTML(ds)}
`;
    if (weekSec && $('appParking') && weekSec.parentElement !== $('appParking')) $('appParking').appendChild(weekSec);
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
  function setFlow(ds, v) {
    const cur = (dayLog()[ds] || {}).flow;
    if (cur === v) return;
    setDayField(ds, 'flow', v || null);
    if (v && v !== 'spotting' && !periodHistory().some(st => st <= ds && near(st, ds))) logPeriodStart(ds, 'Period started. Your cycle is updated');
    else learnPeriodLength();
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

  // ── The day's log: opened from a button, edited as a draft, kept on Save ──
  let cycleDate = null, logDraft = null;   // cycleDate: the day picked on the strip (null = today)
  const viewDs = () => cycleDate || dateToStr(new Date());
  function draftFor(ds) {
    const d = dayLog()[ds] || {};
    return { ds, flow: d.flow || null, syms: (symLog()[ds] || []).slice(), mood: (d.mood || []).slice(), cravings: (d.cravings || []).slice(), water: +d.water || 0 };
  }
  function logSummary(ds) {
    const d = dayLog()[ds] || {}, syms = (symLog()[ds] || []).filter(v => v !== 'none');
    const nm = (list, k) => (list.find(x => x[0] === k) || [, k])[1];
    const bits = [];
    if (d.flow) bits.push(nm(FLOW, d.flow) + ' flow');
    if (syms.length) bits.push(syms.map(v => nm(SYMPTOMS, v)).join(', '));
    if ((d.mood || []).length) bits.push(d.mood.map(v => nm(MOODS, v)).join(', '));
    if ((d.cravings || []).length) bits.push('craving ' + d.cravings.map(v => nm(CRAVINGS, v).toLowerCase()).join(', '));
    if (+d.water) bits.push(`${d.water} glass${+d.water === 1 ? '' : 'es'} of water`);
    return bits.join(' · ');
  }
  function logCardHTML(ds, phase) {
    const isToday = ds === dateToStr(new Date());
    const when = isToday ? 'Today' : fmtDay(new Date(ds + 'T00:00'));
    const sum = logSummary(ds);
    // One row that expands into the log, like a disclosure.
    const head = isToday ? 'today’s log' : `log for ${when}`;
    const chev = up => `<svg class="app-logrow-chev${up ? ' up' : ''}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;
    if (!logDraft || logDraft.ds !== ds) return `<button type="button" class="app-card app-logrow" data-cyclog-open aria-expanded="false">
        <span class="app-logrow-text"><b>${sum ? head.charAt(0).toUpperCase() + head.slice(1) : 'Add ' + head}</b>${sum ? `<small>${esc(sum)}</small>` : ''}</span>${chev(false)}
      </button>`;
    const d = logDraft, water = d.water;
    const tips = d.syms.filter(v => SYM_TIPS[v]);
    const symName = v => (SYMPTOMS.find(x => x[0] === v) || [, v])[1];
    const crave = d.cravings.filter(c => CRAVE_SWAP[c]);
    return `<div class="app-card app-daylog">
      <button type="button" class="app-logrow app-logrow-open" data-cyclog-cancel aria-expanded="true">
        <span class="app-logrow-text"><b>${sum ? head.charAt(0).toUpperCase() + head.slice(1) : 'Add ' + head}</b></span>${chev(true)}
      </button>
      <div class="app-daylog-sec"><p>Flow</p>${chipRow(FLOW, d.flow, 'data-flow')}</div>
      <div class="app-daylog-sec"><p>Symptoms</p>${chipRow(SYMPTOMS.filter(([v]) => v !== 'cravings'), d.syms, 'data-sym')}
        ${tips.length ? `<div class="app-tips">${tips.map((v, i) => `<details class="app-tip"${i === 0 ? ' open' : ''}>
            <summary>For ${symName(v).toLowerCase()}</summary>
            ${SYM_TIPS[v].map(([tag, t]) => `<p><span class="app-tag ${tag === 'Ease off' || tag === 'Note' ? 'off' : ''}">${tag}</span>${t}</p>`).join('')}
          </details>`).join('')}</div>` : ''}</div>
      <div class="app-daylog-sec"><p>Mood</p>${chipRow(MOODS, d.mood, 'data-mood')}</div>
      <div class="app-daylog-sec"><p>Cravings</p>${chipRow(CRAVINGS, d.cravings, 'data-crave')}
        ${crave.length ? `<div class="app-swaps">${crave.map(c => `<div class="app-swap"><span>Craving ${c}? Try</span>
          ${CRAVE_SWAP[c].map(f => `<button type="button" class="app-opt-btn" data-food-idea="${esc(f)}">${f}</button>`).join('')}
          <button type="button" class="app-swap-more" data-crave-more="${c}">More ideas</button></div>`).join('')}</div>` : ''}</div>
      <div class="app-daylog-actions">
        <button type="button" class="eb-btn primary" data-cyclog-save>Save</button>
        <button type="button" class="eb-link" data-cyclog-cancel>Cancel</button>
      </div>
    </div>`;
  }
  function saveLog() {
    const d = logDraft; if (!d) return;
    window.EBAnalytics && EBAnalytics.track('cycle_log_used', { section: 'save' });
    setFlow(d.ds, d.flow);
    const sl = symLog(); if (d.syms.length) sl[d.ds] = d.syms; else delete sl[d.ds];
    try { localStorage.setItem(SKEY, JSON.stringify(sl)); } catch {}
    setDayField(d.ds, 'mood', d.mood); setDayField(d.ds, 'cravings', d.cravings); setDayField(d.ds, 'water', d.water || null);
    const when = d.ds === dateToStr(new Date()) ? 'today' : fmtDay(new Date(d.ds + 'T00:00'));
    logDraft = null;
    EB.toast(`Saved for ${when}`);
    try { renderCycleCalendar(); } catch {}
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
      ['Varies by', gaps.length >= 2 ? `${Math.max(...gaps) - Math.min(...gaps)} days` : '—', gaps.length >= 2 ? (Math.max(...gaps) - Math.min(...gaps) <= 7 ? 'regular' : 'irregular') : 'after 3 periods']
    ];
    return `<div class="app-stats3">${stats.map(([k, v, n]) => `<div><span>${k}</span><b>${v}</b><small>${n}</small></div>`).join('')}</div>
      ${out.length ? `<ul class="app-insights">${out.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}`;
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
  function periodLogHTML(p, patterns) {
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
    const today = dateToStr(new Date());
    const rows = hist.slice().reverse().map((d, i, arr) => {
      const nextStart = i === 0 ? null : arr[i - 1];
      const len = nextStart ? Math.round((new Date(nextStart) - new Date(d)) / 86400000)
                            : Math.round((new Date(today) - new Date(d)) / 86400000) + 1;
      const per = flowDays(d) || +p.cycle.periodLength || 5;
      const missed = len > 60;
      return `<li>
        <div class="app-hist-top"><span>${fmtDay(new Date(d + 'T00:00'))}${nextStart ? '' : ' · now'}</span>
          <em>${nextStart ? (missed ? `${len} days · long gap` : `${len} days`) : `Day ${len}`}</em>
          <button type="button" class="app-x" data-period-remove="${d}" aria-label="Remove ${d}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 7L7 17M7 7l10 10"/></svg></button></div>
        <div class="app-hist-bar${nextStart ? '' : ' now'}"><i style="width:${Math.min(100, per / Math.max(len, per) * 100)}%"></i></div>
      </li>`;
    }).join('');
    // Part of the one "Your cycle" card: averages, then past periods folded away.
    return `<details class="cyc-history"${historyOpen ? ' open' : ''} data-cyc-history>
        <summary>Previous cycles${hist.length ? ` <span>${hist.length} period${hist.length === 1 ? '' : 's'}</span>` : ''}</summary>
        <div class="cyc-history-body">
          ${patterns || ''}
          <p class="app-muted">${verdict}${spread}</p>
          ${rows ? `<ul class="app-period-list">${rows}</ul>` : ''}
        </div>
      </details>`;
  }

  // What to expect in each phase: mood, energy, libido, body.
  const EXPECT = {
    menstrual: 'Tired or low at first, and cramps are common. Mood usually lifts as bleeding eases. Libido tends to be low.',
    follicular: 'Energy, focus and confidence climb. Skin is often at its clearest. Libido starts to rise.',
    ovulation: 'Your most confident, social days, and libido is usually at its highest. Some feel a twinge on one side. This is your most fertile window.',
    luteal: 'Calm and steady at first. In the last week, irritability, low mood, bloating, sore breasts and cravings are common. Libido often dips.'
  };
  const PHASE_NAME = { menstrual: 'Period', follicular: 'Follicular', ovulation: 'Ovulation', luteal: 'Luteal (PMS)' };
  // Runs of the same phase from a date: the one it's in, then the next three.
  function phaseRuns(ds) {
    const runs = []; let d = ds, info = phaseOf(d); if (!info) return runs;
    let start = d; while (phaseOf(addDays(start, -1)) && phaseOf(addDays(start, -1)).phase === info.phase && runs.length === 0 && addDays(start, -1) >= addDays(ds, -40)) start = addDays(start, -1);
    for (let guard = 0; guard < 120 && runs.length < 4; guard++) {
      const ph = phaseOf(d); if (!ph) break;
      let end = d; while (phaseOf(addDays(end, 1)) && phaseOf(addDays(end, 1)).phase === ph.phase) end = addDays(end, 1);
      runs.push({ phase: ph.phase, start: runs.length ? d : start, end });
      d = addDays(end, 1);
    }
    return runs;
  }
  function phaseDetail(k, diet, open) {
    const g = phaseGuide(diet).find(x => x.k === k); if (!g) return '';
    const eat = (PHASE_NUTRIENTS[k] || []).map(([n, , ex]) => `<b>${n}</b> (${ex})`).join(', ');
    return `<p class="cyc-body">${g.body}</p>
      <dl class="cyc-guide">
        <div><dt>Expect</dt><dd>${EXPECT[k]}</dd></div>
        <div><dt>Eat</dt><dd>${eat}</dd></div>
        <div><dt>Move</dt><dd>${g.move}</dd></div>
      </dl>
      ${open ? `<p class="cyc-sub">Meals for this phase</p>
      <ul class="app-food-list">${phaseMeals(k, diet).map(([slot, m, cal]) => `<li><span><b>${esc(m)}</b><small>${slot} · about ${cal} cal</small></span>
        <button type="button" class="app-opt-btn" data-food-idea="${esc(m)}" data-idea-cal="${cal}" data-idea-slot="${slot.toLowerCase()}">Add</button></li>`).join('')}</ul>` : ''}`;
  }

  let nowOpen = false;  // the current-phase section, folded until she opens it
  let historyOpen = true;   // "Previous cycles" opens by default; stays as she leaves it
  document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('[data-cyc-history]')) historyOpen = e.target.open; }, true);
  document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('[data-cyc-now]')) nowOpen = e.target.open; }, true);
  function renderCyclePage() {
    const page = $('pageCycle'); if (!page) return;
    const p = EB.getProfile(), diet = p.food.diet || 'veg';
    const ds = viewDs(), isToday = ds === dateToStr(new Date());
    const info = phaseOf(ds), meta = info && PHASE_META[info.phase];
    const sub = page.querySelector('.app-cycle-sub');
    const body = page.querySelector('.app-cycle-body');
    const runs = info ? phaseRuns(ds) : [];
    const cur = runs[0], short = d => fmtDay(new Date(d + 'T00:00'));
    const left = cur ? Math.round((new Date(cur.end) - new Date(ds)) / 86400000) + 1 : 0;
    sub.innerHTML = meta
      ? `<span class="app-hero-line"><b>Day ${info.dayNum}</b> · ${PHASE_NAME[info.phase]}${isToday ? '' : ` · ${short(ds)}`}</span>`
      : '<span class="app-hero-sub">Add your last period date to start</span>';
    // "13–15 Nov", or "29 Nov – 3 Dec" across months.
    const span = r => { const a = new Date(r.start + 'T00:00'), z = new Date(r.end + 'T00:00'), m = { month: 'short' };
      return a.getMonth() === z.getMonth() ? `${a.getDate()}–${z.getDate()} ${z.toLocaleDateString(undefined, m)}`
        : `${a.getDate()} ${a.toLocaleDateString(undefined, m)} – ${z.getDate()} ${z.toLocaleDateString(undefined, m)}`; };
    const fertile = r => r.phase === 'ovulation' ? ` · most fertile ${short(addDays(r.start, -2)).replace(/^\w+ /, '')}–${short(addDays(r.end, 0)).replace(/^\w+ /, '')}` : '';
    // PMS symptoms start a set number of days before the period (from onboarding).
    const lead = { '1-3': 3, '4-7': 7, '7+': 10 }[p.cycle.pmsStart] || 5;
    const nextPeriod = runs.find((r, i) => i > 0 && r.phase === 'menstrual');
    const pmsFrom = r => r.phase === 'luteal' && nextPeriod ? ` · PMS likely from ${short(addDays(nextPeriod.start, -lead))}` : '';
    body.innerHTML = `
      ${logCardHTML(ds, info && info.phase)}
      <div class="app-card app-cycle-card">
        ${periodLogHTML(p, patternsHTML(p))}
        <p class="app-card-label cyc-now-label">Your cycle</p>
        ${info ? cycleBar(info) : ''}
        ${cur ? `<details class="cyc-now" style="--phase:${PHASE_META[cur.phase].color}"${nowOpen ? ' open' : ''} data-cyc-now>
            <summary class="cyc-now-head"><i></i><span><b>${PHASE_NAME[cur.phase]} <em class="cyc-now-tag">Now</em></b><small>${span(cur)}</small></span></summary>
            <div class="cyc-next-body">${phaseDetail(cur.phase, diet, true)}</div>
          </details>
          <ul class="cyc-next">${runs.slice(1).map(r => `<li><details>
              <summary><i style="background:${PHASE_META[r.phase].color}"></i><span><b>${PHASE_NAME[r.phase]}</b><small>${span(r)}</small></span></summary>
              <div class="cyc-next-body">${phaseDetail(r.phase, diet, false)}</div></details></li>`).join('')}</ul>`
          : '<p class="app-muted">Add the first day of your last period and I’ll map your cycle.</p>'}
        <p class="app-muted small">General guidance, not medical advice.</p>
      </div>`;
    // The strip shows which day this page is about.
    document.querySelectorAll('#cycleSection .cycle-day-cell').forEach(c => c.classList.toggle('picked', active === 'cycle' && c.dataset.date === ds));
  }
  // On Menstruation, tapping a date shows (and logs) that day.
  document.addEventListener('click', e => {
    if (active !== 'cycle') return;
    const cell = e.target.closest('#cycleSection .cycle-day-cell'); if (!cell || !cell.dataset.date) return;
    e.stopPropagation(); e.preventDefault();
    const ds = cell.dataset.date;
    cycleDate = ds === dateToStr(new Date()) ? null : ds;
    if (logDraft && logDraft.ds !== ds) logDraft = null;
    renderCyclePage();
  }, true);

  // ── Fitness ──
  function healthHTML() {
    const H = window.EBHealth;
    const row = (sub, btn) => `<div class="app-card app-health"><div class="app-health-row">${icon('heart', 'pink')}
      <div class="app-health-text"><b>Sync Apple Health</b>${sub ? `<span>${sub}</span>` : ''}</div>${btn}</div></div>`;
    if (H && H.native) {
      return H.isConnected()
        ? row('Connected · workouts, weight and periods sync in', '<button type="button" class="app-opt-btn" data-health="sync">Sync</button>')
        : row('Bring in workouts, weight and period days', '<button type="button" class="app-opt-btn" data-health="connect">Connect</button>');
    }
    return row('', '');
  }
  function renderFitnessPage() {
    const page = $('pageFitness'); if (!page) return;
    const chs = page.querySelector('.app-fit-challenges');
    if (chs && window.EBChallenges) chs.innerHTML = EBChallenges.cardHTML();
    const h = page.querySelector('.app-fit-health'); if (h) h.innerHTML = healthHTML();
    const bn = page.querySelector('.app-fit-burned'); if (bn) bn.innerHTML = burnedHTML();
  }
  // Fitness: what was burned on the picked day, and where each number came from.
  function burnedHTML() {
    let ds = ''; try { ds = selectedDateStr(); } catch {}
    const acts = getActivities(ds); if (!acts.length) return '';
    const total = acts.reduce((a, x) => a + (parseInt(x.cal) || 0), 0);
    const src = a => a.hk === 'daily' ? 'Apple Health · steps and movement' : a.hk ? 'Apple Health · workout' : a.suggested ? 'Logged from a suggestion' : 'Logged by you';
    const isToday = ds === dateToStr(new Date());
    return `<div class="app-card app-burned" id="burnedCard">
      <div class="app-row"><p class="app-card-label">Burned ${isToday ? 'today' : 'this day'}</p><b class="app-burned-total">${total.toLocaleString()} cal</b></div>
      <ul class="app-burned-list">${acts.map(a => `<li><span><b>${esc(String(a.name || 'Activity').replace(/<[^>]*>/g, ''))}</b><small>${src(a)}</small></span><em>${(parseInt(a.cal) || 0).toLocaleString()} cal</em></li>`).join('')}</ul>
    </div>`;
  }
  // Nutrition: tapping "Burned" opens Fitness at that list.
  document.addEventListener('click', e => {
    const t = e.target.closest('#calEquation .cal-term'); if (!t || !t.querySelector('.burned')) return;
    go('fitness');
    setTimeout(() => { const c = $('burnedCard'); if (!c) return; c.scrollIntoView({ block: 'center', behavior: 'smooth' }); c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1200); }, 80);
  });
  // Nutrition day card: just eaten − burned = net; the arrow opens the deficit line and macros.
  let macrosOpen = false;
  function trackerFold() {
    const tr = $('tracker'), eq = $('calEquation'); if (!tr || !eq) return;
    let b = $('macrosToggle');
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'macrosToggle'; b.className = 'app-macros-toggle'; }
    if (eq.nextElementSibling !== b) eq.after(b);
    b.setAttribute('aria-expanded', macrosOpen);
    b.setAttribute('aria-label', macrosOpen ? 'Hide macros' : 'Show macros');
    b.innerHTML = `<span>${macrosOpen ? 'Hide macros' : 'Macros'}</span><i aria-hidden="true">▾</i>`;
    tr.classList.toggle('macros-open', macrosOpen);
  }
  document.addEventListener('click', e => { if (e.target.closest('#macrosToggle')) { macrosOpen = !macrosOpen; trackerFold(); } });

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
    applyGoalEdits(); try { renderFitness(); } catch {}   // your own weekly goal ranges, if you edited them
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
    foodHead.innerHTML = '<div class="app-head-row"><h1>Nutrition</h1></div>';
    const reset = $('resetBtn'); if (reset) foodHead.firstChild.appendChild(reset);
    park.appendChild($('modeSubtitle'));            // targets now live in the day card
    food.appendChild(foodHead);
    const calSlotFood = document.createElement('div'); calSlotFood.className = 'app-shared';
    food.appendChild(calSlotFood);
    // Normal / PMS is the page's main control: right under the dates, full width,
    // with the line explaining why it's on. Everything below follows it.
    // The switch and the day's numbers share one grey block: the mode, and what it does to the day.
    const modeCard = document.createElement('div'); modeCard.className = 'app-modecard';
    modeCard.appendChild($('modeToggleBar'));
    modeCard.appendChild($('tracker'));
    food.appendChild(modeCard);
    if ($('modeNote')) food.appendChild($('modeNote'));
    home.appendChild($('weeklyTrackerSection'));   // the week card lives on Home only
    food.appendChild($('cravingWrap'));
    // The craving finder reads as its own thing, not a second search bar.
    const cw = $('cravingWrap'), ci = $('cravingInput');
    if (cw && !cw.querySelector('.craving-label')) {
      const lb = document.createElement('p'); lb.className = 'craving-label'; lb.textContent = 'Craving something?';
      cw.prepend(lb);
      if (ci) { ci.placeholder = 'Sweet, salty, spicy, crunchy…'; ci.setAttribute('aria-label', 'What are you craving?'); }
    }
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
    // Groceries: To buy + Stocked. Shown on every kind of day, so it sits apart from the tiles.
    const groc = document.createElement('button');
    groc.type = 'button'; groc.className = 'app-card app-grocery'; groc.dataset.grocery = '';
    const paintGroc = () => {
      const c = window.EBGrocery ? EBGrocery.counts() : { buy: 0, stock: 0 };
      groc.innerHTML = `<span class="app-tile-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.2 10.2a2 2 0 002 1.6h7.6a2 2 0 002-1.5L20.5 8H6.2"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg></span>
        <span class="app-grocery-t"><b>Groceries</b><span>${c.buy ? `${c.buy} to buy` : 'Nothing to buy'} · ${c.stock} stocked</span></span><i aria-hidden="true">›</i>`;
    };
    paintGroc(); setTimeout(paintGroc, 0); window.addEventListener('eb:grocery', paintGroc); window.addEventListener('eb:synced', paintGroc);
    groc.addEventListener('click', () => window.EBGrocery && EBGrocery.open());
    food.insertBefore(groc, food.querySelector('.app-tiles') || null);
    const searchBar = document.createElement('button');
    searchBar.type = 'button'; searchBar.className = 'app-food-search'; searchBar.dataset.foodSearch = '';
    searchBar.innerHTML = `${TAB_ICONS.search}<span>Search food to log</span>`;
    food.appendChild(searchBar);
    // Wrap up my day: the last thing on the page.
    const wrapBtn = document.createElement('button');
    wrapBtn.type = 'button'; wrapBtn.id = 'wrapBtn'; wrapBtn.className = 'app-card app-wrapup'; wrapBtn.dataset.wrapup = '';
    wrapBtn.innerHTML = '<span><b>Ready to wrap up?</b><small></small></span>';
    wrapBtn.className = 'app-wrapup';   // a quiet text action, no card
    food.appendChild(wrapBtn);

    // Fitness
    const fit = mk('pageFitness');
    fit.innerHTML = `<header class="app-head"><div class="app-head-row"><h1>Fitness</h1></div></header>
      <div class="app-shared"></div>`;
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
        // What's logged today (incl. Apple Health) sits above Common workouts.
        const logged = body.querySelector('#activityList');
        if (custom && logged) custom.after(logged);
        // Weekly goals get their own card.
        const goals = document.createElement('div'); goals.className = 'app-card app-goals';
        goals.innerHTML = '<div class="ch-head"><p class="app-card-label">Weekly Goals</p><button type="button" class="ch-manage" data-goals-manage>Manage</button></div>';
        const divider = body.querySelector('.fitness-divider'), list = body.querySelector('#fitnessList');
        if (divider) goals.appendChild(divider);
        if (list) goals.appendChild(list);
        activityGroup.after(goals);
        const ch = document.createElement('div'); ch.className = 'app-fit-challenges';
        const hl = document.createElement('div'); hl.className = 'app-fit-health';
        const bn = document.createElement('div'); bn.className = 'app-fit-burned';
        activityGroup.before(ch); ch.after(bn); activityGroup.after(hl);   // Apple Health right under Log a workout
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
    // Four tabs only: adding food, workouts and periods happens on each page.
    bar.innerHTML = `<div class="eb-tabbar-pill">${TABS.map(([id, t]) => `<button type="button" data-tab="${id}">${TAB_ICONS[id]}<span>${t}</span></button>`).join('')}</div>`;
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
    if (typeof origSlots === 'function') window.renderSlotSection = function () { const r = origSlots.apply(this, arguments); mealList(); return r; };
    window.checkAndRenderSurvivalBadge = survivalBadge;
    // Replace / Add and the old "Add a meal" sheet now open the page's own search.
    const origReplace = window.enterReplaceMode, origAdd = window.openAddMeal;
    window.enterReplaceMode = slotId => window.EBFoodLog ? EBFoodLog.focusSearch(slotId, '', { replace: true }) : origReplace && origReplace(slotId);
    window.openAddMeal = () => window.EBFoodLog ? EBFoodLog.focusSearch() : origAdd && origAdd();
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

  // Tapping a done mark unticks it straight away; a toast offers Undo.
  function undoToast(msg, undo) {
    let el = $('appUndo');
    if (!el) { el = document.createElement('div'); el.id = 'appUndo'; el.className = 'app-undo'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.innerHTML = `<span>${esc(msg)}</span><button type="button">Undo</button>`;
    el.classList.add('show');
    clearTimeout(undoToast.t); undoToast.t = setTimeout(() => el.classList.remove('show'), 5000);
    el.querySelector('button').onclick = () => { el.classList.remove('show'); undo(); };
  }
  const repaintMeals = () => { ['renderSlotSection', 'renderTracker', 'renderWeeklyTracker'].forEach(fn => { try { window[fn](); } catch {} }); window.EBDayMode && EBDayMode.paint(); };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-slot-unmark]'); if (!b) return;
    const card = b.closest('.slot-card'), slot = b.dataset.slotUnmark, ds = selectedDateStr();
    const name = slot ? slot.charAt(0).toUpperCase() + slot.slice(1) : 'Meal';
    if (card && card.querySelector('.wake-row')) {
      const before = (() => { try { return getWakeupItems(ds); } catch { return []; } })();
      try { setWakeupItems(ds, []); localStorage.removeItem('wakeup_checked_' + ds); } catch {}
      repaintMeals();
      return undoToast('Wake up unticked', () => { try { setWakeupItems(ds, before); } catch {} repaintMeals(); });
    }
    const log = getSlotLog(ds), before = log[slot], wasEaten = (() => { try { return getSlotEaten(ds, slot); } catch { return false; } })();
    delete log[slot]; setSlotLog(ds, log);
    try { setSlotEaten(ds, slot, false); } catch {}
    repaintMeals();
    undoToast(`${name} unticked`, () => {
      const l = getSlotLog(ds); if (before !== undefined) l[slot] = before; setSlotLog(ds, l);
      try { if (wasEaten) setSlotEaten(ds, slot, true); } catch {}
      repaintMeals();
    });
  });

  // ⋯ menus on meal cards close when she taps anywhere else.
  document.addEventListener('click', e => {
    document.querySelectorAll('#slotSection .slot-more[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); });
  });

  // ── Meals as one grouped list (Apple Reminders / Health "Today") ──
  // Each meal is a small section header with its rows: a circle to tick, the food,
  // calories and protein. Tap a row for details and actions; swipe left for quick ones.
  const r1n = v => Math.round((+v || 0) * 10) / 10;
  const plainName = t => String(t || '').replace(/<[^>]*>/g, '');
  const TICK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const ML_SHOW = 2, mlOpen = new Set();   // meals she's opened with "Show N more"
  const TAGS = { worth: 'Worth it', skip: 'Skip' };
  const WHYS = { hungry: 'Hungry', craving: 'Craving', bored: 'Bored', stressed: 'Stressed', social: 'Social', notime: 'No time' };
  function mlRow({ done, name, cal, p, sub, tick, open, swipe }) {
    return `<div class="ml-row-wrap">${swipe ? `<div class="ml-swipe">${swipe}</div>` : ''}
      <div class="ml-row${done ? ' done' : ''}">
        <button type="button" class="ml-main" ${open || ''}><span class="ml-name">${esc(name)}</span>${sub && sub.trim() ? `<span class="ml-sub">${sub}</span>` : ''}</button>
        <span class="ml-cal">${Math.round(+cal || 0)} cal</span>
        <button type="button" class="ml-tick${done ? ' on' : ''}" ${tick} role="checkbox" aria-checked="${!!done}" aria-label="${done ? 'Eaten. Tap to undo' : 'Mark eaten'}">${done ? TICK : ''}</button>
      </div></div>`;
  }
  function mealList() {
    const el = $('slotSection'); if (!el) return;
    let ds; try { ds = selectedDateStr(); } catch { return; }
    const log = getSlotLog(ds), pms = isPMSMode(), slots = pms ? PMS_MEAL_SLOTS : MEAL_SLOTS;
    const html = slots.map(slot => {
      const head = (right) => `<p class="ml-head"><span>${esc(slot.name)}${slot.time ? ` · ${esc(slot.time)}` : ''}</span>${right ? `<em>${right}</em>` : ''}</p>`;
      // Wake up: tick each item
      if (slot.fixed) {
        const picked = getWakeupItems(ds);
        return `<section class="ml-sec" data-slot="${slot.id}">${head('')}<div class="ml-group">${WAKEUP_ITEMS.map(it =>
          mlRow({ done: picked.includes(it.id), name: it.name, cal: it.cal, p: it.p, sub: esc(it.unit), tick: `data-ml-wake="${it.id}"` })).join('')}</div></section>`;
      }
      let items = log[slot.id]; items = !items ? [] : Array.isArray(items) ? items : [items];
      const target = slot.targetCal ? `~${Math.round(slot.targetCal)} cal` : '';
      const rows = [];
      const planned = !items.length && slot.defaultMeal && !replaceModeSlots.has(slot.id);
      if (planned) {
        const d = getEffectiveDefaultMeal(slot, currentDay, pms);
        if (d) rows.push(mlRow({ done: false, name: plainName(d.name), cal: d.cal, p: d.p, tick: `data-ml-accept="${slot.id}"`, open: `data-ml-info="${slot.id}:plan"`,
          swipe: `${d.items ? `<button type="button" data-ml-part="${slot.id}">Ate part</button>` : ''}<button type="button" class="alt" data-ml-replace="${slot.id}">Replace</button>` }));
        // Same placement as the original cards: quiet actions along the bottom
        if (d) rows.push(`<div class="ml-acts">${d.items ? `<button type="button" data-ml-part="${slot.id}">${partialMode.has(slot.id) ? 'Cancel' : 'Ate part of this'}</button>` : ''}<button type="button" data-ml-replace="${slot.id}">Replace / Add</button></div>`);
        if (d && d.items && partialMode.has(slot.id)) {
          const skipped = partialSkips[slot.id] || [], kept = d.items.filter((_, i) => !skipped.includes(i));
          const eff = kept.reduce((a, it) => a + (it.cal || 0), 0);
          rows.push(`<div class="ml-partial"><p>Tap what you skipped</p><div class="ml-partial-items">${d.items.map((it, i) =>
            `<button type="button" class="${skipped.includes(i) ? 'skipped' : ''}" onclick="togglePartialItem('${slot.id}', ${i})">${esc(it.n)} <small>${it.cal} cal</small></button>`).join('')}</div>
            <button type="button" class="eb-btn primary" onclick="logPartial('${slot.id}', '${ds}')">${kept.length ? `Log what I ate · ${Math.round(eff)} cal` : 'Skipped the whole meal'}</button>
            <button type="button" class="eb-link" onclick="togglePartialMode('${slot.id}')">Cancel</button></div>`);
        }
      }
      const plannedOnly = items.length && slot.defaultMeal && isPlannedOnly(slot, ds);
      // Long meals show the first 2 foods; "Show N more" opens the rest.
      const more = items.length - ML_SHOW, folded = more > 0 && !mlOpen.has(slot.id);
      items.forEach((m, i) => (folded && i >= ML_SHOW) || rows.push(mlRow({ done: true, name: plainName(m.name), cal: m.cal, p: m.p,
        sub: `${m.qty ? esc(plainName(m.qty)) : ''}${m.tag && TAGS[m.tag] ? ` <em class="ml-tag ml-tag-${m.tag}">${TAGS[m.tag]}</em>` : ''}`,
        tick: plannedOnly ? `data-ml-unplan="${slot.id}"` : `data-ml-del="${slot.id}:${i}"`,
        open: `data-ml-edit="${slot.id}:${i}" aria-haspopup="dialog"`, swipe: `<button type="button" class="alt" data-ml-replace="${slot.id}">Replace</button><button type="button" class="del" ${plannedOnly ? `data-ml-unplan="${slot.id}"` : `data-ml-del="${slot.id}:${i}"`}>${plannedOnly ? 'Undo' : 'Delete'}</button>` })));
      if (more > 0) rows.push(`<button type="button" class="ml-more" data-ml-more="${slot.id}" aria-expanded="${!folded}">${folded ? `Show ${more} more` : 'Show less'}</button>`);
      // Coffee / protein: build from parts
      if (BUILDERS[slot.id]) {
        const last = getLastBuild(slot.id); let lastT = 0;
        if (last && last.length) BUILDERS[slot.id].items.forEach(it => { if (last.includes(it.id)) lastT += it.cal; });
        // Repeat on the left, Build on the right: one row, easy to reach
        rows.push(`<div class="ml-acts${lastT > 0 ? '' : ' ml-acts-one'}">${lastT > 0 ? `<button type="button" class="ml-repeat" onclick="repeatLastBuild('${slot.id}', '${ds}')">↻ Repeat · ${lastT} cal</button>` : ''}<button type="button" class="ml-build" onclick="openBuilder('${slot.id}', '${ds}')">+ ${slot.id === 'protein' ? 'Build shake' : 'Build coffee'}</button></div>`);
      } else if (planned) {
        /* planned card already offers "Replace / Add" along the bottom */
      } else if (items.length && slot.defaultMeal && !plannedOnly) {
        // Swapped for something else: go back to the plan on the left, add more on the right
        rows.push(`<div class="ml-acts"><button type="button" data-ml-restore="${slot.id}">↺ Back to planned meal</button><button type="button" data-ml-add="${slot.id}">+ Add food</button></div>`);
      } else rows.push(`<div class="ml-acts ml-acts-one"><button type="button" data-ml-add="${slot.id}">+ Add food</button></div>`);
      // Header: what this meal adds up to (kcal and protein), or its target before anything's logged.
      const eaten = items.reduce((a, m) => a + (+m.cal || 0), 0), prot = items.reduce((a, m) => a + (+m.p || 0), 0);
      return `<section class="ml-sec" data-slot="${slot.id}">${head(items.length ? `<b>${Math.round(eaten).toLocaleString()} kcal</b> · ${Math.round(prot)} g protein` : target)}<div class="ml-group">${rows.join('')}</div></section>`;
    }).join('');
    // "Craving something?" lives under Coffee on plan days: lift it out before
    // the list is redrawn so it isn't thrown away, then put it back.
    const crave = $('craveLink'); if (crave && el.contains(crave)) el.after(crave);
    el.innerHTML = `<div class="ml">${html}${reviewHTML(ds)}</div>`;
    const coffee = el.querySelector('.ml-sec[data-slot="coffee"]');
    if (crave && coffee && ($('pageFood') || {}).dataset?.dayview === 'plan') coffee.after(crave);
  }
  // Details sheet for a meal row (what's in it + actions)
  function mealInfo(key) {
    const [slotId, which] = key.split(':'); let ds; try { ds = selectedDateStr(); } catch { return; }
    const pms = isPMSMode(), slot = (pms ? PMS_MEAL_SLOTS : MEAL_SLOTS).find(s => s.id === slotId); if (!slot) return;
    const log = getSlotLog(ds); let items = log[slotId]; items = !items ? [] : Array.isArray(items) ? items : [items];
    const isPlan = which === 'plan', m = isPlan ? getEffectiveDefaultMeal(slot, currentDay, pms) : items[+which]; if (!m) return;
    const plannedOnly = !isPlan && slot.defaultMeal && isPlannedOnly(slot, ds);
    const what = m.qty ? String(m.qty).replace(/<br\s*\/?>/g, '\n') : (m.items ? m.items.map(it => `${it.n} · ${it.cal} cal`).join('\n') : '');
    const acts = [
      isPlan && `<button type="button" data-mi="accept">Mark eaten</button>`,
      isPlan && m.items && `<button type="button" data-mi="part">Ate part of this</button>`,
      `<button type="button" data-mi="replace">Replace / Add</button>`,
      !isPlan && slot.defaultMeal && !plannedOnly && `<button type="button" data-mi="restore">Back to planned meal</button>`,
      !isPlan && `<button type="button" class="del" data-mi="${plannedOnly ? 'unplan' : 'del'}">${plannedOnly ? 'Mark not eaten' : 'Remove'}</button>`
    ].filter(Boolean).join('');
    const ov = document.createElement('div'); ov.className = 'eb-cal-overlay app-sheet-overlay';
    ov.innerHTML = `<div class="eb-cal app-sheet ml-info" role="dialog" aria-modal="true" aria-label="${esc(plainName(m.name))}">
      <div class="app-sheet-head"><b>${esc(plainName(m.name))}</b><button type="button" class="eb-icon-btn" data-sheet-close aria-label="Close">${ICONS.close}</button></div>
      <div class="ml-info-num"><b>${Math.round(+m.cal || 0)}</b><span>cal · ${r1n(m.p)} g protein${m.c != null ? ` · ${r1n(m.c)} g carbs · ${r1n(m.f)} g fat` : ''}</span></div>
      ${what ? `<div class="ml-info-what"><p>What’s in it</p><span>${esc(what).replace(/\n/g, '<br>')}</span></div>` : ''}
      <div class="ml-info-acts">${acts}</div></div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.addEventListener('click', e => {
      if (e.target === ov || e.target.closest('[data-sheet-close]')) return close();
      const a = e.target.closest('[data-mi]'); if (!a) return; close();
      const k = a.dataset.mi;
      if (k === 'accept') acceptDefault(slotId, ds);
      if (k === 'part') togglePartialMode(slotId);
      if (k === 'replace') window.enterReplaceMode(slotId);
      if (k === 'restore') restoreDefault(slotId, ds);
      if (k === 'unplan') restoreDefault(slotId, ds);
      if (k === 'del') delItem(slotId, +which, ds);
    });
  }
  function delItem(slotId, i, ds) {
    const before = JSON.parse(JSON.stringify(getSlotLog(ds)[slotId] || null));
    const nm = (Array.isArray(before) ? before[i] : before) || {};
    removeSlotMeal(slotId, i, ds);
    undoToast(`${plainName(nm.name || 'Item')} removed`, () => { const l = getSlotLog(ds); l[slotId] = before; setSlotLog(ds, l); repaintMeals(); });
  }
  // ── Edit a logged food (bottom sheet) ──
  // Quantity (− / + or type it), unit, live kcal + protein, a tag and why,
  // then Save, Remove or Move to another meal. Totals update straight away.
  const UNIT_NAMES = { g: 'grams', piece: 'pieces', katori: 'katori / bowl', cup: 'cup', serving: 'serving', ml: 'ml', spoon: 'spoon', pack: 'pack' };
  function editSheet(slotId, i) {
    let ds; try { ds = selectedDateStr(); } catch { return; }
    const slots = (isPMSMode() ? PMS_MEAL_SLOTS : MEAL_SLOTS).filter(x => ['breakfast', 'lunch', 'snack', 'dinner'].includes(x.id));
    const log = getSlotLog(ds), arr = Array.isArray(log[slotId]) ? log[slotId] : log[slotId] ? [log[slotId]] : [];
    const m = arr[i]; if (!m) return;
    const FL = window.EBFoodLog;
    // Foods from the food list scale by amount and unit; anything else (plan
    // meals, the assistant, typed numbers) scales by servings of what was logged.
    const food = FL && FL.food && m.ref && m.src !== 'you' && m.amt != null ? FL.food(m.ref) : null;
    const byAmount = !!(food && food.units[m.unit]);
    const base = m.base || { cal: +m.cal || 0, p: +m.p || 0, c: +m.c || 0, f: +m.f || 0, fib: +m.fib || 0 };
    const e = { amt: byAmount ? +m.amt : (+m.mult || 1), unit: byAmount ? m.unit : 'serving', slot: slotId, tag: m.tag || '', why: m.why || '', name: plainName(m.name) };
    const units = byAmount ? [...new Set(['g', 'piece', 'katori', 'cup', e.unit])].filter(u => food.units[u]) : ['serving'];
    const calc = () => byAmount ? FL.totals(food, e.amt, e.unit)
      : { cal: Math.round(base.cal * e.amt), p: r1n(base.p * e.amt), c: r1n(base.c * e.amt), f: r1n(base.f * e.amt), fib: r1n(base.fib * e.amt) };
    const step = dir => byAmount ? FL.stepOf(e.unit, e.amt, dir) : Math.max(0.5, Math.round((e.amt + dir * 0.5) * 2) / 2);
    // Radio buttons in two columns, like the meal picker when adding a food.
    const radios = (list, sel, attr, label) => `<div class="fl-radio" role="radiogroup" aria-label="${label}">${list.map(([k, t]) =>
      `<button type="button" class="fl-radio-opt${sel === k ? ' on' : ''}" ${attr}="${k}" role="radio" aria-checked="${sel === k}"><i aria-hidden="true"></i>${esc(t)}</button>`).join('')}</div>`;
    const macros = t => `<b>${Math.round(t.cal)}</b><span>kcal</span><ul class="ml-edit-macros"><li><b>${r1n(t.p)} g</b>protein</li><li><b>${r1n(t.c)} g</b>carbs</li><li><b>${r1n(t.f)} g</b>fat</li><li><b>${r1n(t.fib)} g</b>fibre</li></ul>`;
    const ov = document.createElement('div'); ov.className = 'eb-cal-overlay app-sheet-overlay';
    const paint = () => {
      const t = calc();
      ov.innerHTML = `<div class="eb-cal app-sheet ml-edit" role="dialog" aria-modal="true" aria-labelledby="mlEditT">
        <div class="app-sheet-head"><b class="sr-only" id="mlEditT">Edit ${esc(e.name)}</b><input class="ml-edit-name" type="text" value="${esc(e.name)}" data-me-name aria-label="Food name" autocomplete="off" enterkeyhint="done"><button type="button" class="eb-icon-btn" data-sheet-close aria-label="Close">${ICONS.close}</button></div>
        <div class="ml-edit-live" aria-live="polite">${macros(t)}</div>
        <p class="ml-edit-label">Quantity</p>
        <div class="ml-edit-qty">
          <button type="button" class="ml-step" data-me-step="-1" aria-label="Less">−</button>
          <input class="eb-input" type="number" inputmode="decimal" min="0" step="any" value="${e.amt}" data-me-amt aria-label="Quantity">
          <button type="button" class="ml-step" data-me-step="1" aria-label="More">+</button>
        </div>
        ${units.length > 1 ? `<div class="eb-seg ml-edit-units" role="radiogroup" aria-label="Unit">${units.map(u => `<button type="button" class="eb-seg-btn${e.unit === u ? ' on' : ''}" data-me-unit="${u}" role="radio" aria-checked="${e.unit === u}">${UNIT_NAMES[u] || u}</button>`).join('')}</div>`
          : `<p class="ml-edit-unit">${byAmount ? esc(UNIT_NAMES[e.unit] || e.unit) : `${e.amt === 1 ? 'serving' : 'servings'} of ${esc(plainName(m.qty || m.name))}`}</p>`}
        <p class="ml-edit-label">Meal</p>
        ${radios(slots.map(x => [x.id, x.name]), e.slot, 'data-me-slot', 'Meal')}
        <p class="ml-edit-label">How was it?</p>
        ${radios(Object.entries(TAGS), e.tag, 'data-me-tag', 'How was it')}
        <p class="ml-edit-label">Why you ate it <span>(optional)</span></p>
        ${radios(Object.entries(WHYS), e.why, 'data-me-why', 'Why you ate it')}
        <div class="ml-edit-acts">
          <button type="button" class="eb-btn primary" data-me-save>Save</button>
          <button type="button" class="eb-link del" data-me-del>Remove item</button>
        </div></div>`;
    };
    // Only the live numbers change while typing, so the keyboard stays open.
    const live = () => { const l = ov.querySelector('.ml-edit-live'); if (l) l.innerHTML = macros(calc()); };
    paint(); document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.addEventListener('input', ev => {
      if (ev.target.matches('[data-me-amt]')) { e.amt = Math.max(0, +ev.target.value || 0); live(); }
      if (ev.target.matches('[data-me-name]')) e.name = ev.target.value;   // e.g. "All India" → "Mother Dairy Paneer"
    });
    ov.addEventListener('click', ev => {
      const at = sel => ev.target.closest(sel); let n;
      if (ev.target === ov || at('[data-sheet-close]')) return close();
      if ((n = at('[data-me-step]'))) { e.amt = step(+n.dataset.meStep); ov.querySelector('[data-me-amt]').value = e.amt; return live(); }
      if ((n = at('[data-me-unit]'))) {
        // Keep roughly the same portion when switching (200 g → 1.5 katori).
        const grams = e.amt * (food.units[e.unit] || 1); e.unit = n.dataset.meUnit;
        const v = grams / (food.units[e.unit] || 1);
        e.amt = e.unit === 'g' || e.unit === 'ml' ? Math.round(v) : Math.max(0.5, Math.round(v * 2) / 2);
        return paint();
      }
      if ((n = at('[data-me-slot]'))) { e.slot = n.dataset.meSlot; return paint(); }
      if ((n = at('[data-me-tag]'))) { e.tag = e.tag === n.dataset.meTag ? '' : n.dataset.meTag; return paint(); }
      if ((n = at('[data-me-why]'))) { e.why = e.why === n.dataset.meWhy ? '' : n.dataset.meWhy; return paint(); }
      if (at('[data-me-del]')) { close(); return delItem(slotId, i, ds); }
      if (at('[data-me-save]')) {
        if (!(e.amt > 0)) { const inp = ov.querySelector('[data-me-amt]'); inp.focus(); return; }
        const l = getSlotLog(ds), list = Array.isArray(l[slotId]) ? l[slotId] : l[slotId] ? [l[slotId]] : [];
        const cur = list[i]; if (!cur) return close();
        const tagged = (cur.tag || '') !== e.tag;
        if (e.name.trim() && e.name.trim() !== plainName(cur.name)) cur.name = esc(e.name.trim());
        Object.assign(cur, calc());
        if (byAmount) Object.assign(cur, { qty: FL.qtyLabel(food, e.amt, e.unit), amt: e.amt, unit: e.unit });
        else { cur.base = base; cur.mult = e.amt; }
        if (e.tag) cur.tag = e.tag; else delete cur.tag;
        if (e.why) cur.why = e.why; else delete cur.why;
        if (e.slot !== slotId) {
          list.splice(i, 1); if (list.length) l[slotId] = list; else delete l[slotId];
          if (!Array.isArray(l[e.slot])) l[e.slot] = l[e.slot] ? [l[e.slot]] : [];
          l[e.slot].push(cur);
        } else l[slotId] = list;
        setSlotLog(ds, l);
        window.EBAnalytics && EBAnalytics.track('food_edited');
        if (tagged && e.tag) window.EBAnalytics && EBAnalytics.track('food_tagged');
        close(); repaintMeals();
        EB.toast && EB.toast(e.slot !== slotId ? `Moved to ${(slots.find(x => x.id === e.slot) || {}).name || 'another meal'}` : 'Saved');
      }
    });
    setTimeout(() => { const b = ov.querySelector('[data-sheet-close]'); if (b) b.focus(); }, 50);
  }

  // ── End-of-day review (under the meals) ──
  // Built from the tags: could-skip foods and their kcal, what to have more of
  // tomorrow, and one pattern from the last 7 days.
  function reviewHTML(ds, inWrap) {
    const slots = isPMSMode() ? PMS_MEAL_SLOTS : MEAL_SLOTS;
    const items = d => { const l = getSlotLog(d), out = [];
      Object.keys(l).forEach(k => (Array.isArray(l[k]) ? l[k] : l[k] ? [l[k]] : []).forEach(m => m && m.name && out.push({ slot: k, m }))); return out; };
    const today = items(ds);
    const tagged = today.filter(x => x.m.tag);
    const evening = ds !== dateToStr(new Date()) || new Date().getHours() >= 18;
    if (!tagged.length) {
      if (inWrap) return '';
      if (!evening || today.length < 2) return '';
      return `<div class="ml-review ml-review-empty"><p class="ml-head"><span>Today’s review</span></p>
        <p>Tap a food above and mark it <b>Worth it</b> or <b>Skip</b>. Your review shows up here.</p></div>`;
    }
    const skip = tagged.filter(x => x.m.tag === 'skip');
    const skipCal = Math.round(skip.reduce((a, x) => a + (+x.m.cal || 0), 0));
    const lines = [];
    if (skip.length) lines.push(['Skip next time', `${skip.map(x => esc(plainName(x.m.name))).join(', ')} · <b>${skipCal.toLocaleString()} kcal</b>`]);
    // Tomorrow: protein gap first, then the foods she wants more of.
    let p = 0; try { p = computeConsumed(currentDay).p; } catch {}
    const pT = isPMSMode() ? PMS_TARGETS.p : TARGETS.p, gap = Math.round(pT - p);
    const tmr = [];
    if (gap >= 10) tmr.push(`Protein was <b>${gap} g short</b>. Add curd, eggs, paneer or dal to a meal.`);
    if (tmr.length) lines.push(['Tomorrow', tmr.join(' ')]);
    // Pattern: the last 7 days of "could skip" foods.
    const week = [];
    for (let k = 0; k < 7; k++) { const d = new Date(ds + 'T00:00'); d.setDate(d.getDate() - k); items(dateToStr(d)).forEach(x => x.m.tag === 'skip' && week.push(x)); }
    const hourOf = x => x.m.at ? new Date(x.m.at).getHours() : ((slotWindow((slots.find(s => s.id === x.slot) || {}).time) || {}).start ?? 12);
    let pattern = '';
    if (week.length >= 3) {
      const late = week.filter(x => hourOf(x) >= 19).length;
      const whys = {}; week.forEach(x => x.m.why && (whys[x.m.why] = (whys[x.m.why] || 0) + 1));
      const topWhy = Object.entries(whys).sort((a, b) => b[1] - a[1])[0];
      if (late / week.length >= 0.5) pattern = `Most foods you’d skip this week were after 7 p.m.`;
      else if (topWhy && topWhy[1] / week.length >= 0.5) pattern = `Most foods you’d skip this week were ${topWhy[0] === 'notime' ? 'when you were short on time' : topWhy[0] === 'social' ? 'with other people' : `when you felt ${WHYS[topWhy[0]].toLowerCase()}`}.`;
      else { const bySlot = {}; week.forEach(x => bySlot[x.slot] = (bySlot[x.slot] || 0) + 1);
        const top = Object.entries(bySlot).sort((a, b) => b[1] - a[1])[0], nm = (slots.find(s => s.id === top[0]) || {}).name;
        if (nm && top[1] / week.length >= 0.5) pattern = `Most foods you’d skip this week were at ${esc(nm.toLowerCase())}.`; }
    }
    if (pattern) lines.push(['Pattern', pattern]);
    if (!lines.length) lines.push(['Nice', 'Everything you tagged today was worth it.']);
    if (inWrap) return `<section class="wrap-sec"><p class="wrap-label">Review</p><dl class="wrap-review">${lines.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></section>`;
    return `<div class="ml-review"><p class="ml-head"><span>Today’s review</span></p>
      <dl>${lines.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></div>`;
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('#slotSection [data-ml-wake], #slotSection [data-ml-accept], #slotSection [data-ml-unplan], #slotSection [data-ml-del], #slotSection [data-ml-info], #slotSection [data-ml-add], #slotSection [data-ml-replace], #slotSection [data-ml-part], #slotSection [data-ml-restore], #slotSection [data-ml-edit], #slotSection [data-ml-more]');
    if (!t) return;
    let ds; try { ds = selectedDateStr(); } catch { return; }
    const d = t.dataset;
    try { window.EBNative && EBNative.haptic && EBNative.haptic('light'); } catch {}
    if (d.mlWake) return toggleWakeupItem(ds, d.mlWake);
    if (d.mlAccept) return acceptDefault(d.mlAccept, ds);
    if (d.mlUnplan) { const sid = d.mlUnplan; return undoToast('Marked not eaten', () => acceptDefault(sid, ds)), restoreDefault(sid, ds); }
    if (d.mlDel) { const [sid, i] = d.mlDel.split(':'); return delItem(sid, +i, ds); }
    if (d.mlInfo) return mealInfo(d.mlInfo);
    if (d.mlEdit) { const [sid, i] = d.mlEdit.split(':'); return editSheet(sid, +i); }
    if (d.mlMore) { mlOpen.has(d.mlMore) ? mlOpen.delete(d.mlMore) : mlOpen.add(d.mlMore); return mealList(); }
    if (d.mlRestore) return restoreDefault(d.mlRestore, ds);
    if (d.mlAdd) return window.EBFoodLog ? EBFoodLog.focusSearch(d.mlAdd) : null;
    if (d.mlReplace) return window.enterReplaceMode(d.mlReplace);
    if (d.mlPart) return togglePartialMode(d.mlPart);
  });
  // Swipe a row left to reveal its quick actions
  let sw = null;
  document.addEventListener('touchstart', e => {
    const row = e.target.closest && e.target.closest('#slotSection .ml-row'); if (!row || !row.parentElement.querySelector('.ml-swipe')) return;
    document.querySelectorAll('#slotSection .ml-row.open').forEach(r => { if (r !== row) { r.classList.remove('open'); r.style.transform = ''; } });
    sw = { row, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, w: row.parentElement.querySelector('.ml-swipe').offsetWidth, open: row.classList.contains('open') };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!sw) return; const dx = e.touches[0].clientX - sw.x, dy = e.touches[0].clientY - sw.y;
    if (Math.abs(dy) > Math.abs(dx) && !sw.moving) { sw = null; return; }
    sw.moving = true; sw.dx = Math.max(-sw.w, Math.min(0, dx + (sw.open ? -sw.w : 0)));
    sw.row.style.transition = 'none'; sw.row.style.transform = `translateX(${sw.dx}px)`;
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!sw) return; const open = sw.dx < -sw.w / 2;
    sw.row.style.transition = ''; sw.row.style.transform = open ? `translateX(${-sw.w}px)` : '';
    sw.row.classList.toggle('open', open); sw = null;
  });

  function timeline() {
    let log = {}; try { log = getSlotLog(selectedDateStr()) || {}; } catch {}
    document.querySelectorAll('#slotSection .slot-card').forEach(card => {
      if (card.querySelector(':scope > .slot-gutter')) return;
      const gutter = document.createElement('span'); gutter.className = 'slot-gutter';
      const check = card.querySelector(':scope > .slot-header > .slot-check');
      // Cards that tick each item (Wake up) get no card-level tick: one tick per thing.
      if (!check && card.querySelector('.wake-row')) return;
      if (check) gutter.appendChild(check);
      else {
        const v = log[card.dataset.slot];
        const done = (Array.isArray(v) ? v.length : v) || card.querySelector('.wake-row.on');
        gutter.innerHTML = done
          ? `<button type="button" class="slot-mark done" data-slot-unmark="${esc(card.dataset.slot || '')}" aria-label="Eaten. Tap to undo"></button>`
          : `<span class="slot-mark" aria-label="Not eaten yet"></span>`;
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
  // Today, this week and workouts as three equal stats. "This week" opens the
  // week card (‹ Week 3 of 6 ›, bar, Details) inside the same card.
  let homeWeekOpen = false;
  // 7,700 cal of deficit ≈ 1 kg of body fat, however long that takes.
  function fatLine(gap) {
    const pace = gap > 0 ? ` At ${gap.toLocaleString()} a day, that’s about <b>1 kg every ${Math.round(CAL_PER_KG / gap)} days</b>.` : '';
    return `1 kg of fat is about <b>${CAL_PER_KG.toLocaleString()} cal</b> of deficit in total.${pace}`;
  }
  // Today's workout in the quick card: what she logged, or the day's suggestion.
  // ── Home on another day (picked on the strip) ──
  let homeDs = null;
  const dayCal = ds => { try { if (typeof getDayCalories === 'function') return Math.round(getDayCalories(ds)); } catch {}
    const log = getSlotLog(ds) || {}; return Math.round(Object.values(log).flat().reduce((a, m) => a + (+(m && m.cal) || 0), 0)); };
  function dayFoodHTML(ds, target) {
    const past = ds < dateToStr(new Date()), cal = dayCal(ds);
    const log = getSlotLog(ds) || {}, meals = Object.values(log).filter(v => Array.isArray(v) ? v.length : v).length;
    const title = past ? (cal ? `${cal.toLocaleString()} of ${target.toLocaleString()} cal` : 'Nothing logged') : 'Not here yet';
    const sub = past ? (cal ? `${meals} meal${meals === 1 ? '' : 's'} logged` : 'Add what you ate in Nutrition') : 'Your meals for this day are in Nutrition';
    return `<div class="app-today-next" data-go="food" role="button" tabindex="0">
        <div class="app-next-text"><span class="app-meta">Food</span><b class="app-next-name">${title}</b><span class="app-quick-sub">${sub}</span></div>
        <button type="button" class="app-opt-btn" data-go="food">${past ? 'Open' : 'See plan'}</button>
      </div>`;
  }
  // Tapping a day on Home's strip shows that day on Home (no popup).
  document.addEventListener('click', e => {
    if (active !== 'home') return;
    const cell = e.target.closest('#cycleSection .cycle-day-cell'); if (!cell || !cell.dataset.date) return;
    e.stopPropagation(); e.preventDefault();
    homeDs = cell.dataset.date === dateToStr(new Date()) ? null : cell.dataset.date;
    renderHome(); markHomePicked();
  }, true);
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-home-today]')) return;
    homeDs = null; renderHome(); markHomePicked();
  });
  function markHomePicked() {
    if (active !== 'home') return;
    const ds = homeDs || dateToStr(new Date());
    document.querySelectorAll('#cycleSection .cycle-day-cell').forEach(c => c.classList.toggle('picked', c.dataset.date === ds));
  }

  function workoutRowHTML(ds) {
    const acts = getActivities(ds), isToday = ds === dateToStr(new Date());
    const when = isToday ? 'Workout today' : 'Workout';
    if (acts.length) {
      const cal = acts.reduce((a, x) => a + (parseInt(x.cal) || 0), 0);
      return `<div class="app-quick-row" data-go="fitness" role="button" tabindex="0">
        <div class="app-next-text"><span class="app-meta">${when} · done</span><b class="app-next-name">${esc(acts.map(a => a.name).join(', '))}</b>
          <span class="app-quick-sub">${cal.toLocaleString()} cal burned</span></div>
        <span class="app-quick-done" aria-label="Done"></span></div>`;
    }
    if (ds < dateToStr(new Date())) return `<div class="app-quick-row" data-go="fitness" role="button" tabindex="0">
        <div class="app-next-text"><span class="app-meta">Workout</span><b class="app-next-name">No workout logged</b></div></div>`;
    const sg = suggest(ds, 2), o = sg && sg.options[0]; if (!o) return '';
    return `<div class="app-quick-row" data-go="fitness" role="button" tabindex="0">
        <div class="app-next-text"><span class="app-meta">${when}</span><b class="app-next-name">${o.mins} min ${esc(o.name.toLowerCase())}</b>
          <span class="app-quick-sub">About ${o.kcal} cal${energyFor(ds) ? '' : ' · suggested'}</span></div>
        <button type="button" class="app-tick" data-log-opt="${o.kind}" role="checkbox" aria-checked="false" aria-label="Log ${o.mins} min ${esc(o.name.toLowerCase())}"></button></div>`;
  }
  function weekCardHTML(eaten, target) {
    const d = weekData(), S = weekSummary(d);
    const lose = /DEFICIT/.test(S.label);
    const T = (isPMSMode() ? PMS_TARGETS : TARGETS).cal;
    const range = (() => { const a = new Date(d[0].ds + 'T00:00'), z = new Date(d[6].ds + 'T00:00');
      return `${a.getDate()}–${z.getDate()} ${z.toLocaleDateString(undefined, { month: 'short' })}`; })();
    const today = dateToStr(new Date());
    const top = Math.max(T, ...d.map(x => x.eat.cal)) || 1;
    const days = d.map(x => {
      const dt = new Date(x.ds + 'T00:00'), c = Math.round(x.eat.cal), future = x.ds > today;
      const diff = c ? T - c : 0;
      return `<li class="${x.ds === today ? 'today' : ''}${future ? ' future' : ''}">
        <span class="wk-d">${dt.toLocaleDateString(undefined, { weekday: 'short' })}</span>
        <span class="wk-bar"><i style="width:${Math.min(100, c / top * 100)}%" class="${c > T ? 'over' : ''}"></i><b style="left:${T / top * 100}%"></b></span>
        <span class="wk-n">${future ? '' : c ? c.toLocaleString() : '–'}</span>
        <span class="wk-diff ${diff < 0 ? 'over' : ''}">${!c || future ? '' : x.ds === today ? 'so far' : diff >= 0 ? `−${diff.toLocaleString()}` : `+${(-diff).toLocaleString()}`}</span>
      </li>`;
    }).join('');
    // The week's food so far vs its allocation (target × 7 + what workouts burned).
    // The marker shows where intake should be by now, and moves through the week.
    const gap = TDEE - T, burnedWk = d.reduce((a, x) => a + x.burned, 0);
    const ate = Math.round(d.reduce((a, x) => a + x.eat.cal, 0));
    const alloc = Math.round(T * 7 + burnedWk);
    const idx = Math.max(0, d.findIndex(x => x.ds === today)), now = new Date();
    const expected = Math.round(T * (idx + (now.getHours() + now.getMinutes() / 60) / 24) + burnedWk);
    const pct = v => alloc ? Math.min(100, v / alloc * 100) : 0;
    // Two lines and the bar: what she ate, what she should have by now (the marker).
    const head = `<div class="app-budget" role="img" aria-label="${ate.toLocaleString()} of ${alloc.toLocaleString()} calories consumed this week. Should have consumed about ${expected.toLocaleString()} by now.">
        <p class="app-budget-line"><b>${ate.toLocaleString()}</b> of ${alloc.toLocaleString()} cal consumed</p>
        <div class="app-budget-bar"><i class="${ate > expected + T * 0.1 ? 'over' : ''}" style="width:${pct(ate)}%"></i><b class="app-budget-mark" style="left:${pct(expected)}%"><span class="${pct(expected) > 80 ? 'end' : pct(expected) < 20 ? 'start' : ''}">${expected.toLocaleString()} by now</span></b></div>
      </div>`;
    const note = gap > 0 ? `<p class="app-week-insight">${fatLine(gap)}</p>` : '';
    // When she'd reach 1 kg at this week's real pace (finished days, workouts included).
    const fin = d.filter(x => x.ds < today && x.eat.cal > 0);
    const real = fin.reduce((a, x) => a + (TDEE + x.burned - x.eat.cal), 0), avg = fin.length ? real / fin.length : 0;
    // Days until 1 kg at this week's real pace.
    let kgVal = fin.length ? 'No deficit yet' : 'After a full day';
    if (avg > 0) {
      if (real >= CAL_PER_KG) kgVal = 'Done this week';
      else { const n = Math.ceil((CAL_PER_KG - real) / avg); kgVal = `${n} day${n === 1 ? '' : 's'}`; }
    }
    // The week as seven small bars (height = calories against the daily target),
    // today highlighted, over days grey, days ahead empty. One verdict line under it.
    const minis = d.map(x => {
      const dt = new Date(x.ds + 'T00:00'), c = Math.round(x.eat.cal), future = x.ds > today, isT = x.ds === today;
      // Stacked: green up to the target (where she'd have stopped), orange only for the extra.
      const sc = v => Math.round(v / (T * 1.25) * 100);
      const ok = future || !c ? 0 : Math.min(100, sc(Math.min(c, T))), extra = future || c <= T ? 0 : Math.min(100 - ok, sc(c - T));
      // Tap a day to see what she ate (the number sits above its bar).
      const day = dt.toLocaleDateString(undefined, { weekday: 'long' });
      return `<li class="${isT ? 'today' : ''}${future ? ' future' : ''}${c > T ? ' over' : ''}"><button type="button" class="wkm" data-wkm ${future ? 'disabled' : ''} aria-label="${day}: ${future ? 'not yet' : `${c.toLocaleString()} cal eaten${c > T ? `, ${(c - T).toLocaleString()} over` : ''}`}" aria-pressed="false"><b class="wkm-n" aria-hidden="true">${future ? '' : c.toLocaleString()}</b><span class="wkm-bar"><i class="wkm-ok${extra ? ' cut' : ''}" style="height:${ok}%"></i>${extra ? `<i class="wkm-x" style="bottom:${ok}%;height:${extra}%"></i>` : ''}</span><span class="wkm-d">${dt.toLocaleDateString(undefined, { weekday: 'narrow' })}</span></button></li>`;
    }).join('');
    const diffWk = expected - ate;
    const verdict = !ate ? 'Log your meals and your week shows up here.'
      : diffWk >= 0 ? `<b>On track this week</b> · ${diffWk.toLocaleString()} cal under`
      : `<b>${(-diffWk).toLocaleString()} cal over so far</b> · easy to even out over the next few days`;
    return `<div class="app-card app-weekcard">
      <div class="app-row app-week-row"><p class="app-card-label">Calories</p><span class="app-muted small">${range}</span></div>
      ${homeSum}
      <ul class="app-wkmini" aria-label="Calories each day this week, against your ${T.toLocaleString()} target">${minis}</ul>
      <p class="app-wk-verdict">${verdict}</p>
      ${homeWeekOpen ? `${head}<div class="app-week-lines">
        <button type="button" data-go="food"><span>1 kg in</span><b>${kgVal}</b></button>
        <button type="button" data-go="fitness"><span>Burned this week</span><b>${burnedWk.toLocaleString()} cal</b></button>
      </div>
      <ul class="app-weekdays" aria-label="Calories by day, target ${T.toLocaleString()}">${days}</ul>${note}` : ''}
      <button type="button" class="app-week-more" data-home-week aria-expanded="${homeWeekOpen}">${homeWeekOpen ? 'Show less' : 'Show more'} <i aria-hidden="true">▾</i></button>
    </div>`;
  }
  // Week bars: one tap shows that day's number, a second tap (or another day) hides it.
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-wkm]'); if (!b) return;
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.closest('.app-wkmini').querySelectorAll('[data-wkm]').forEach(x => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', String(on));
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-home-week]'); if (!b) return;
    homeWeekOpen = !homeWeekOpen;
    const card = document.querySelector('#pageHome .app-weekcard');
    if (card) { const tmp = document.createElement('div'); tmp.innerHTML = weekCardHTML(Math.round(computeConsumed(currentDay).cal), isPMSMode() ? PMS_TARGETS.cal : TARGETS.cal); card.replaceWith(tmp.firstElementChild); }
  });
  function paintHomeWeek() {
    const box = $('homeWeekCal'), sec = $('weeklyTrackerSection'); if (!box) return;
    const q = c => { const el = sec && sec.querySelector(c); return el ? el.textContent.trim() : ''; };
    const val = q('.week-card-val'), sub = q('.week-card-sub').replace(/\s*net$/, '');
    box.textContent = val || '0';
    const sb = $('homeWeekSub'); if (sb) sb.textContent = sub ? `${sub} cal` : '';
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
      paintFoodHead(); paintWrapBtn(); markPicked(); markHomePicked(); presetToggle(); trackerFold(); try { const bn = document.querySelector('#pageFitness .app-fit-burned'); if (bn) bn.innerHTML = burnedHTML(); } catch {} updateWeekMini(); paintHomeWeek(); applyTint(); pushWidget();
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
    if (window.EBDayMode && EBDayMode.closeSubpages) EBDayMode.closeSubpages();
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
    if (tab !== 'home' && active === 'home' && homeDs) { homeDs = null; currentDay = todayKey(); try { renderTabs(); } catch {} }
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
  // Fitness: "Log a workout" shows just name + cal; common workouts open on demand.
  function presetToggle() {
    const box = $('activityPresets'); if (!box) return;
    // Order: name/cal row → the workout chips (always shown) → what's logged today
    const custom = box.parentElement.querySelector('.activity-custom'), logged = $('activityList');
    if (custom && custom.nextElementSibling !== box) custom.after(box);
    if (logged && box.nextElementSibling !== logged) box.after(logged);
    $('presetsToggle')?.remove();
    box.hidden = false;
  }

  function markActive() {
    const overlay = document.querySelector('.as-overlay') ? 'chat' : (window.EBProfile && EBProfile.isOpen && EBProfile.isOpen()) ? 'profile' : null;
    document.querySelectorAll('.eb-tabbar [data-tab]').forEach(b => {
      const on = b.dataset.tab === (overlay || active);
      b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false');
    });
  }

  function logWorkout(ds, o) {
    window.EBAnalytics && EBAnalytics.track('workout_logged', { source: 'suggested', kind: o.kind || '' });
    const list = getActivities(ds);
    list.push({ name: o.name, cal: o.kcal, ts: Date.now(), suggested: ds });
    setActivities(ds, list);
    window.EBNative && EBNative.haptic();
    renderActivity(); renderTracker(); try { renderWeeklyTracker(); } catch {}
    EB.toast(`${o.name} logged`);
  }

  function onPageClick(e) {
    const t = e.target;
    if (t.closest('[data-coach-next]')) { coachTap++; coachSaid = true; try { window.EBNative && EBNative.haptic('light'); } catch {} return renderHome(); }
    const ln = t.closest('[data-log-next]');
    if (ln) {
      e.stopPropagation();
      acceptDefault(ln.dataset.logNext, selectedDateStr());
      EB.toast('Logged'); return repaint();
    }
    const lo = t.closest('[data-log-opt]');
    if (lo && !lo.disabled) {
      e.stopPropagation();
      const ds = selectedDateStr(), s = suggest(ds) || suggest(ds, 2); if (!s) return;
      const o = s.options.find(x => x.kind === lo.dataset.logOpt); if (o) { logWorkout(ds, o); repaint(); }
      return;
    }
    const cm = t.closest('[data-crave-more]');
    if (cm) { e.preventDefault(); return openCraving(cm.dataset.craveMore); }
    const g = t.closest('[data-go]'); if (g) { e.preventDefault(); return go(g.dataset.go); }
    const en = t.closest('[data-energy]');
    if (en) { setEnergy(selectedDateStr(), +en.dataset.energy); window.EBAnalytics && EBAnalytics.track('energy_logged'); return repaint(); }
    const tb = t.closest('[data-time]');
    if (tb) { setTime(selectedDateStr(), +tb.dataset.time); window.EBAnalytics && EBAnalytics.track('time_logged'); return repaint(); }
    const fi = t.closest('[data-food-idea]');
    if (fi) { if (window.EBFoodLog) { go('food'); EBFoodLog.focusSearch(fi.dataset.ideaSlot || null, fi.dataset.foodIdea, { cal: +fi.dataset.ideaCal || null }); } else if (window.EBMeals) EBMeals.openSearch(fi.dataset.foodIdea); return; }
    if (t.closest('[data-cyclog-open]')) { logDraft = draftFor(viewDs()); return renderCyclePage(); }
    if (t.closest('[data-cyclog-cancel]')) { logDraft = null; return renderCyclePage(); }
    if (t.closest('[data-cyclog-save]')) { saveLog(); return renderCyclePage(); }
    if (logDraft) {
      const d = logDraft;
      const fl = t.closest('[data-flow]'); if (fl) { d.flow = d.flow === fl.dataset.flow ? null : fl.dataset.flow; return renderCyclePage(); }
      const mo = t.closest('[data-mood]'); if (mo) { d.mood = toggleIn(d.mood, mo.dataset.mood); return renderCyclePage(); }
      const cr = t.closest('[data-crave]'); if (cr) { d.cravings = toggleIn(d.cravings, cr.dataset.crave); return renderCyclePage(); }
      const wa = t.closest('[data-water]'); if (wa) { const n = +wa.dataset.water; d.water = d.water === n ? n - 1 : n; return renderCyclePage(); }
      const sy = t.closest('[data-sym]');
      if (sy) { const v = sy.dataset.sym; d.syms = d.syms.includes(v) ? d.syms.filter(x => x !== v) : v === 'none' ? ['none'] : d.syms.filter(x => x !== 'none').concat(v); return renderCyclePage(); }
    }
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
      if (window.EBFoodLog) { go('food'); EBFoodLog.focusSearch(); } else if (window.EBMeals) EBMeals.openSearch();
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
    return p.goal === 'lose' ? 'lose' : (p.goal === 'gain' || p.goal === 'muscle') ? 'gain' : 'maintain';
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
  // ── Weekly goals: edit how often, or hide one. Saved in mealPlan_fitnessGoals (backed up). ──
  const GOALS_KEY = 'mealPlan_fitnessGoals';
  const goalNote = (g, n) => String(n || '').replace(/^\d+–\d+× week/, g.min === g.max ? `${g.min}× week` : `${g.min}–${g.max}× week`);
  function applyGoalEdits() {
    if (typeof FITNESS_GOALS === 'undefined') return;
    let saved = {}; try { saved = JSON.parse(localStorage.getItem(GOALS_KEY) || '{}'); } catch {}
    FITNESS_GOALS.forEach(g => {
      if (!g._orig) g._orig = { min: g.min, max: g.max, note: g.note };
      const e = saved[g.key] || {};
      g.min = e.min || g._orig.min; g.max = Math.max(g.min, e.max || g._orig.max);
      g.hidden = !!e.hidden; g.note = goalNote(g, g._orig.note);
    });
  }
  function openGoalsSheet() {
    if (document.querySelector('.goals-sheet')) return;
    let saved = {}; try { saved = JSON.parse(localStorage.getItem(GOALS_KEY) || '{}'); } catch {}
    const draft = {}; FITNESS_GOALS.forEach(g => { draft[g.key] = { min: g.min, max: g.max, hidden: !!g.hidden }; });
    const ov = document.createElement('div'); ov.className = 'eb-cal-overlay app-sheet-overlay';
    const rowHTML = g => { const d = draft[g.key]; return `<div class="goal-edit${d.hidden ? ' off' : ''}" data-goal="${g.key}">
        <div class="goal-edit-top"><b>${esc(g.name)}</b><button type="button" class="pf-switch${d.hidden ? '' : ' on'}" data-goal-show role="switch" aria-checked="${!d.hidden}" aria-label="Show ${esc(g.name)}"></button></div>
        <div class="goal-edit-range">
          <span class="goal-step"><button type="button" data-goal-step="min:-1" aria-label="Fewer, at least">−</button><b>${d.min}</b><button type="button" data-goal-step="min:1" aria-label="More, at least">+</button></span>
          <span>to</span><span class="goal-step"><button type="button" data-goal-step="max:-1" aria-label="Fewer, at most">−</button><b>${d.max}</b><button type="button" data-goal-step="max:1" aria-label="More, at most">+</button></span>
          <span>times a week</span>
        </div></div>`; };
    const paint = () => { ov.querySelector('.goals-list').innerHTML = FITNESS_GOALS.map(rowHTML).join(''); };
    ov.innerHTML = `<div class="eb-cal app-sheet goals-sheet" role="dialog" aria-modal="true" aria-label="Weekly goals">
      <div class="app-sheet-head"><b>Weekly goals</b><button type="button" class="eb-icon-btn" data-goals-x aria-label="Close">${ICONS.close}</button></div>
      <div class="app-sheet-body"><div class="goals-list"></div>
        <div class="eb-cta-row"><button type="button" class="eb-btn secondary" data-goals-x>Cancel</button><button type="button" class="eb-btn primary" data-goals-save>Save</button></div></div></div>`;
    document.body.appendChild(ov); paint();
    ov.addEventListener('click', e => {
      const t = e.target;
      if (t === ov || t.closest('[data-goals-x]')) return ov.remove();
      const row = t.closest('[data-goal]'), d = row && draft[row.dataset.goal];
      if (t.closest('[data-goal-show]') && d) { d.hidden = !d.hidden; return paint(); }
      const st = t.closest('[data-goal-step]');
      if (st && d) {
        const [k, n] = st.dataset.goalStep.split(':');
        d[k] = Math.min(7, Math.max(1, d[k] + +n));
        if (k === 'min' && d.max < d.min) d.max = d.min;
        if (k === 'max' && d.min > d.max) d.min = d.max;
        return paint();
      }
      if (t.closest('[data-goals-save]')) {
        try { localStorage.setItem(GOALS_KEY, JSON.stringify(draft)); } catch {}
        applyGoalEdits(); ov.remove();
        try { renderFitness(); } catch {}
      }
    });
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-goals-manage]')) openGoalsSheet(); });

  // ── Wrap up my day: the day and the week so far, and where this pace lands by Sunday ──
  // Deficit per logged day = maintenance + what workouts burned − what she ate (7,700 cal ≈ 1 kg).
  // Expected weight = latest weight − average daily deficit × days left this week ÷ 7,700.
  const WRAP_KEY = 'mealPlan_wrapped';
  function wrapData() {
    let ds = dateToStr(new Date()); try { ds = selectedDateStr(); } catch {}
    const d = weekData(), idx = Math.max(0, d.findIndex(x => x.ds === ds));
    const T = isPMSMode() ? PMS_TARGETS : TARGETS;
    const day = d[idx], logged = d.slice(0, idx + 1).filter(x => x.eat.cal > 0);
    const def = x => TDEE + x.burned - x.eat.cal;
    const total = logged.reduce((a, x) => a + def(x), 0), avg = logged.length ? total / logged.length : 0;
    const left = d.length - 1 - idx;
    const w = (typeof getWeight === 'function' && getWeight()) || {}, unit = w.unit || 'kg', cur = +w.current || null;
    const toUnit = kg => unit === 'lb' ? kg * 2.20462 : kg;
    const soFarKg = total / CAL_PER_KG, aheadKg = avg * left / CAL_PER_KG;
    const sunday = new Date(d[d.length - 1].ds + 'T00:00');
    return { ds, day, T, logged, total, avg, left, unit, cur, soFar: toUnit(soFarKg),
             expected: cur != null ? cur - toUnit(aheadKg) : null, sunday, dayDef: day.eat.cal ? def(day) : null };
  }
  function wrapHTML(W) {
    const n0 = v => Math.round(v).toLocaleString(), kg = v => (Math.round(v * 10) / 10).toLocaleString();
    const gap = v => v >= 0 ? `${n0(v)} cal deficit` : `${n0(-v)} cal over maintenance`;
    const e = W.day.eat, isToday = W.ds === dateToStr(new Date());
    const when = isToday ? 'Today' : new Date(W.ds + 'T00:00').toLocaleDateString(undefined, { weekday: 'long' });
    const sun = W.sunday.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    const days = W.logged.length;
    const pace = !days ? 'Log your meals and this fills in.'
      : W.left === 0 ? 'That’s the week. Next week starts fresh tomorrow.'
      : `If you keep this pace for the ${W.left} day${W.left === 1 ? '' : 's'} left.`;
    return `<div class="wrap">
      ${reviewHTML(W.ds, true)}
      <section class="wrap-sec">
        <p class="wrap-label">${when}</p>
        <p class="wrap-big">${n0(e.cal)} <span>of ${n0(W.T.cal)} cal</span></p>
        <ul class="wrap-rows">
          <li><span>Burned</span><b>${n0(W.day.burned)} cal</b></li>
          <li><span>Against maintenance</span><b>${W.dayDef == null ? 'Nothing logged' : gap(W.dayDef)}</b></li>
          <li><span>Protein</span><b>${n0(e.p)} / ${n0(W.T.p)} g</b></li>
          <li><span>Carbs · Fat · Fibre</span><b>${n0(e.c)} · ${n0(e.f)} · ${n0(e.fib)} g</b></li>
        </ul>
      </section>
      <section class="wrap-sec">
        <p class="wrap-label">This week so far</p>
        <ul class="wrap-rows">
          <li><span>Days logged</span><b>${days} of ${7 - W.left}</b></li>
          <li><span>Total</span><b>${days ? gap(W.total) : '–'}</b></li>
          <li><span>Average a day</span><b>${days ? gap(W.avg) : '–'}</b></li>
          <li><span>That’s about</span><b>${days ? `${kg(Math.abs(W.soFar))} ${W.unit} ${W.soFar >= 0 ? 'lost' : 'gained'}` : '–'}</b></li>
        </ul>
      </section>
      <section class="wrap-sec wrap-hero">
        <p class="wrap-label">Expected by ${sun}</p>
        ${W.expected != null && days
          ? `<p class="wrap-big">${kg(W.expected)} <span>${W.unit}</span></p><p class="wrap-note">${pace} Today you’re at ${kg(W.cur)} ${W.unit}.</p>`
          : `<p class="wrap-note">${W.cur == null ? 'Add your weight in Account to see this.' : pace}</p>`}
      </section>
      <p class="wrap-fine">An estimate from your logs and 7,700 cal per kg. Water and your cycle move the scale too, especially around your period.</p>
      <div class="eb-cta-row">
        <button type="button" class="eb-btn secondary" data-wrap-reopen>Open day</button>
        <button type="button" class="eb-btn primary" data-wrap-done>Done</button>
      </div>
    </div>`;
  }
  function openWrapUp() {
    if (document.querySelector('.wrap-sheet')) return;
    const W = wrapData();
    const ov = document.createElement('div'); ov.className = 'eb-cal-overlay app-sheet-overlay';
    ov.innerHTML = `<div class="eb-cal app-sheet wrap-sheet" role="dialog" aria-modal="true" aria-label="Your day">
      <div class="app-sheet-head"><b>Your day, wrapped</b><button type="button" class="eb-icon-btn" data-wrap-done aria-label="Close">${ICONS.close}</button></div>
      <div class="app-sheet-body">${wrapHTML(W)}</div></div>`;
    document.body.appendChild(ov);
    try { const m = JSON.parse(localStorage.getItem(WRAP_KEY) || '{}'); m[W.ds] = 1; localStorage.setItem(WRAP_KEY, JSON.stringify(m)); } catch {}
    try { window.EBAnalytics && EBAnalytics.track('day_wrapped'); } catch {}
    ov.addEventListener('click', e => {
      // Open day: un-wrap it, to keep logging (the card asks "Ready to wrap up?" again).
      if (e.target.closest('[data-wrap-reopen]')) {
        try { const m = JSON.parse(localStorage.getItem(WRAP_KEY) || '{}'); delete m[W.ds]; localStorage.setItem(WRAP_KEY, JSON.stringify(m)); } catch {}
        ov.remove(); paintWrapBtn(); return;
      }
      if (e.target === ov || e.target.closest('[data-wrap-done]')) { ov.remove(); paintWrapBtn(); }
    });
  }
  function paintWrapBtn() {
    const b = $('wrapBtn'); if (!b) return;
    let ds = dateToStr(new Date()); try { ds = selectedDateStr(); } catch {}
    let done = false; try { done = !!JSON.parse(localStorage.getItem(WRAP_KEY) || '{}')[ds]; } catch {}
    b.querySelector('b').textContent = done ? 'See your day’s summary' : 'Ready to wrap up?';
    b.querySelector('small').textContent = done ? 'Wrapped. Open it again any time.' : 'Your day, your week so far, and where you’ll be by Sunday';
    b.dataset.wrapped = done ? '1' : '';
  }
  // First time for a day: confirm, since wrapping counts the day as finished in the weekly estimate.
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-wrapup]'); if (!b) return;
    if (b.dataset.wrapped) return openWrapUp();
    const W = wrapData(), cal = Math.round(W.day.eat.cal), isToday = W.ds === dateToStr(new Date());
    EB.ask({ title: 'Ready to wrap up?', ok: 'Wrap up', cancel: 'Not yet',
      body: `${cal ? `You’ve logged ${cal.toLocaleString()} cal ${isToday ? 'today' : 'this day'}.` : 'Nothing is logged for this day yet.'} Wrapping up counts it as a finished day in your week’s numbers.` })
      .then(yes => yes && openWrapUp());
  });

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
    g.fillStyle = st ? st.deep : '#ad1457'; g.fillRect(0, 0, W, H);
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
    let challenge = null; try { challenge = window.EBChallenges && EBChallenges.widgetLine ? EBChallenges.widgetLine() : null; } catch {}
    EBNative.widget({ name: firstName(), days, mealsDate: ds, meals, workout, challenge });
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
  // Fresh data from the cloud (sync.js): redraw everything in place, no reload.
  document.addEventListener('eb:synced', () => {
    ['renderCycleCalendar', 'renderSlotSection', 'renderTracker', 'renderWeeklyTracker', 'renderActivity', 'renderTabs']
      .forEach(fn => { try { window[fn](); } catch {} });
    try { window.EBDayMode && EBDayMode.refresh(); } catch {}
    try { repaint(); } catch {}
  });
})();
