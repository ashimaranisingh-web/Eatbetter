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
  // Me·Nu·Fi: the letters that make up the app's name are pink in the tab labels.
  const TABS = [['home', 'Home'], ['cycle', '<b>Me</b>nstruation'], ['food', '<b>Nu</b>trition'], ['fitness', '<b>Fi</b>tness']];
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
    const log = energyLog(); if (log[ds] === v) delete log[ds]; else if (v) log[ds] = v; else delete log[ds];
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
  function suggest(ds) {
    const energy = energyFor(ds);
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

  function energyHTML(ds) {
    const cur = energyFor(ds);
    const s = suggest(ds);
    const foods = foodIdeas(ds);
    const logged = getActivities(ds).filter(a => a.suggested === ds);
    return `<div class="app-card app-energy-card">
      <p class="app-card-label">How’s your energy?</p>
      <p class="app-muted">${s ? esc(s.why) : 'Tap how you feel and I’ll suggest workouts and foods for your energy and cycle.'}</p>
      <div class="eb-seg app-energy" role="radiogroup" aria-label="Energy">
        ${ENERGY.map(e => `<button type="button" class="eb-seg-btn${cur === e.v ? ' on' : ''}" data-energy="${e.v}" role="radio" aria-checked="${cur === e.v}">${e.t}</button>`).join('')}
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
  function nextMeal() {
    const ds = selectedDateStr(), log = getSlotLog(ds);
    const s = mealSlots().find(sl => !log[sl.id] && !getSlotEaten(ds, sl.id));
    if (!s) return null;
    const m = getEffectiveDefaultMeal(s, currentDay, isPMSMode());
    return m && { slotId: s.id, slot: s.name, time: s.time, name: m.name, cal: m.cal, p: m.p };
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
    const pct = Math.min(100, Math.round(eaten / target * 100));
    const info = phaseOf(ds);
    const meta = info && PHASE_META[info.phase];
    const nm = nextMeal();

    const initial = (p.name || '').trim().charAt(0).toUpperCase();
    page.querySelector('.app-home-head').innerHTML = `
      <div class="app-head-row app-head-top">
        <div><p class="app-date">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1>${greeting(p.name)}</h1></div>
        <button type="button" class="app-avatar" data-go="profile" aria-label="Profile">${p.photo ? `<img src="${p.photo}" alt="">` : initial ? esc(initial) : TAB_ICONS.profile}</button>
      </div>`;
    page.querySelector('.app-home-body').innerHTML = `
      ${energyHTML(ds)}
      ${meta ? (() => {
        const g = phaseGuide(p.food.diet).find(x => x.k === info.phase);
        return `<details class="app-card app-expect">
          <summary><span class="app-date-cycle"><i style="background:${meta.color}"></i>Day ${info.dayNum} · ${meta.label === 'PMS' ? 'Luteal (PMS)' : meta.label}</span>
            <span class="app-expect-toggle">What to expect</span></summary>
          <p class="app-expect-text">${esc(g.body)} ${esc(g.move.split('.')[0])}.</p>
          <button type="button" class="app-expect-more" data-go="cycle">More on your cycle</button>
        </details>`;
      })() : ''}
      <div class="app-card app-today">
        <button type="button" class="app-today-row" data-go="food">
          ${icon('eat', 'green')}
          <span class="app-today-text">${big(eaten.toLocaleString(), `of ${target.toLocaleString()} eaten`)}</span>
          <span class="app-today-side">${left < 0 ? `${Math.abs(left).toLocaleString()} over` : `${left.toLocaleString()} left`}</span>
        </button>
        <span class="app-tile2-bar"><i style="width:${pct}%"></i></span>
        ${nm ? `<div class="app-today-next" data-go="food" role="button" tabindex="0" aria-label="Up next: ${esc(nm.name)}">
            <div class="app-next-text">
              <span class="app-meta">Up next · ${esc(nm.slot)} · ${esc(nm.time)}</span>
              <b class="app-next-name">${esc(nm.name)}</b>
              <span class="app-meta">${Math.round(nm.cal)} cal${nm.p ? ` · ${Math.round(nm.p)}g protein` : ''}</span>
            </div>
            <button type="button" class="app-opt-btn" data-log-next="${nm.slotId}">Log it</button>
          </div>`
          : '<div class="app-today-next"><span class="app-meta">All of today’s meals are logged.</span></div>'}
      </div>
      <div class="app-card app-today">
        <button type="button" class="app-today-row" data-go="fitness">
          ${icon('burn', 'black')}
          <span class="app-today-text">${burned ? big(burned.toLocaleString(), 'cal burned') : '<span class="app-tile2-cta">Nothing burned yet</span>'}</span>
        </button>
        ${(() => {
          const s = suggest(ds);
          if (!s) return `<div class="app-today-next"><div class="app-next-text"><span class="app-meta">Today’s workout</span>
            <b class="app-next-name">Tell me your energy</b><span class="app-meta">I’ll pick one for your energy and cycle</span></div>
            <button type="button" class="app-opt-btn" data-scroll-energy>Pick</button></div>`;
          const logged = getActivities(ds).filter(a => a.suggested === ds);
          const o = s.options.find(x => !logged.some(a => a.name === x.name)) || s.options[0];
          const done = logged.find(a => a.name === o.name);
          return `<div class="app-today-next" data-go="fitness" role="button" tabindex="0">
            <div class="app-next-text"><span class="app-meta">Today’s workout</span>
              <b class="app-next-name">${esc(o.name)} · ${o.mins} min</b>
              <span class="app-meta">about ${done ? done.cal : o.kcal} cal${logged.length ? ` · ${logged.length} done today` : ''}</span></div>
            <button type="button" class="app-opt-btn${done ? ' done' : ''}" data-log-opt="${o.kind}" ${done ? 'disabled' : ''}>${done ? 'Logged' : 'Log'}</button>
          </div>`;
        })()}
      </div>`;
  }

  // ── Menstruation ──
  // Ordered so short and long words share rows (three rows on a phone, no gaps).
  const SYMPTOMS = [['cramps', 'Cramps'], ['bloating', 'Bloating'], ['cravings', 'Cravings'], ['acne', 'Acne'],
    ['mood', 'Mood swings'], ['fatigue', 'Fatigue'], ['headache', 'Headache'], ['back', 'Back pain'],
    ['tender', 'Breast tenderness'], ['none', 'Feeling fine']];
  const SKEY = 'eb_symptoms';
  function symLog() { try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch { return {}; } }
  function toggleSym(ds, v) {
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
  function renderCyclePage() {
    const page = $('pageCycle'); if (!page) return;
    const p = EB.getProfile();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const ds = dateToStr(today);
    const info = phaseOf(ds), meta = info && PHASE_META[info.phase];
    const sub = page.querySelector('.app-cycle-sub');
    const body = page.querySelector('.app-cycle-body');
    let next = null, pms = null, until = null;
    const cs = getCycleStart();
    if (cs) {
      const len = +p.cycle.cycleLength || 28;
      next = new Date(cs + 'T00:00'); while (next <= today) next.setDate(next.getDate() + len);
      until = Math.round((next - today) / 86400000);
      const lead = { '1-3': 3, '4-7': 7, '7+': 10 }[p.cycle.pmsStart] || 5;
      pms = new Date(next); pms.setDate(pms.getDate() - lead);
    }
    sub.innerHTML = meta
      ? `<span class="app-hero"><b>Day ${info.dayNum}</b><span>${meta.label === 'PMS' ? 'Luteal (PMS)' : meta.label} phase</span></span>
         ${until != null ? `<span class="app-hero-sub">Next period in ${until} day${until === 1 ? '' : 's'}</span>` : ''}`
      : '<span class="app-hero-sub">Add your last period date to start</span>';
    const syms = symLog()[ds] || [];
    const iron = ({ vegan: 'palak, rajma, tofu, dates', veg: 'palak, rajma, chana, dates', jain: 'chana, moong, sesame, dates',
      egg: 'eggs, palak, rajma, dates', pescatarian: 'fish, eggs, palak, rajma', nonveg: 'chicken, eggs, palak, rajma' })[p.food.diet] || 'palak, rajma, dates';
    const guide = phaseGuide(p.food.diet);
    const tips = syms.filter(v => SYM_TIPS[v]);
    const symName = v => (SYMPTOMS.find(x => x[0] === v) || [, v])[1];
    body.innerHTML = `
      <div class="app-card app-dark">
        <div class="app-row"><p class="app-card-label">Your cycle</p>${meta ? `<span class="app-phase"><i style="background:${meta.color}"></i>${meta.label}</span>` : ''}</div>
        ${next ? `<div class="app-cycle-stats">
            <div><span>Next period</span><b>${fmtDay(next)}</b><small>in ${until} day${until === 1 ? '' : 's'}</small></div>
            <div><span>PMS likely from</span><b>${fmtDay(pms)}</b><small>${p.cycle.cycleLength || 28}-day cycle</small></div>
          </div>` : '<p class="app-muted">Add the first day of your last period and I’ll predict the next one.</p>'}
        <button type="button" class="eb-btn secondary sm" data-period-today>Period started today</button>
      </div>
      <div class="app-card">
        <p class="app-card-label">How are you feeling today?</p>
        <div class="app-syms">${SYMPTOMS.map(([v, t]) => `<button type="button" class="eb-chip${syms.includes(v) ? ' on' : ''}" data-sym="${v}">${t}</button>`).join('')}</div>
        ${tips.length ? `<div class="app-tips">${tips.map((v, i) => `<details class="app-tip"${i === 0 ? ' open' : ''}>
            <summary>For ${symName(v).toLowerCase()}</summary>
            ${SYM_TIPS[v].map(([tag, t]) => `<p><span class="app-tag ${tag === 'Ease off' || tag === 'Note' ? 'off' : ''}">${tag}</span>${t}</p>`).join('')}
          </details>`).join('')}</div>`
          : syms.includes('none') ? '<p class="app-muted">Lovely. Keep doing what you’re doing.</p>'
          : '<p class="app-muted">Tap what you feel and I’ll suggest what to eat and do.</p>'}
      </div>
      <div class="app-card">
        <p class="app-card-label">Through your cycle</p>
        <div class="app-phases">${guide.map(g => `<details class="app-phase-row${info && info.phase === g.k ? ' now' : ''}"${info && info.phase === g.k ? ' open' : ''}>
          <summary><i style="background:${(PHASE_META[g.k] || {}).color}"></i><b>${g.n} <span>${g.d}</span></b>${info && info.phase === g.k ? '<em>Now</em>' : ''}</summary>
          <p class="app-phase-body">${g.body}</p>
          <p><span class="app-tag">Eat</span>${g.eat}</p>
          <p><span class="app-tag">Move</span>${g.move}</p>
          <p><span class="app-tag">Tip</span>${g.tip}</p>
        </details>`).join('')}</div>
        <p class="app-muted small">General guidance, not medical advice.</p>
      </div>`;
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
    const burned = getActivities(ds).reduce((a, x) => a + (parseInt(x.cal) || 0), 0);
    let week = 0;
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(d => { try { week += getActivities(dateStrForDay(d)).length; } catch {} });
    page.querySelector('.app-fit-sub').innerHTML =
      `<span class="app-hero"><b>${burned.toLocaleString()}</b><span>cal burned · ${DAY_NAMES[currentDay]}</span></span>
       <span class="app-hero-sub">${week ? `${week} workout${week === 1 ? '' : 's'} logged this week` : 'No workouts logged this week yet'}</span>`;
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
    const h = $('foodHero'); if (h) h.innerHTML = foodHero();
  }
  function motto() {
    const ds = selectedDateStr();
    const eaten = computeConsumed(currentDay).cal;
    const target = isPMSMode() ? PMS_TARGETS.cal : TARGETS.cal;
    const junk = dayJunk(ds);
    if (!eaten) return pickLine(['New day, fresh plate. Start with a good breakfast.', 'Your meals are planned. Just follow along today.', 'Small, steady choices add up. Let’s start.'], ds);
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
  function periodSheet() {
    listSheet({
      ico: icon('drop', 'pink'), title: 'Your period', sub: 'Log today or how you’re feeling',
      rows: [
        { ico: icon('drop', 'pink'), title: 'Period started today', sub: 'Updates your cycle and PMS dates', run: () => {
          const iso = dateToStr(new Date());
          const pr = EB.getProfile(); pr.cycle.lastStart = iso; pr.cycle.tracks = true; EB.saveProfile(pr);
          setCycleStart(iso); try { renderCycleCalendar(); } catch {} EB.toast('Period logged'); repaint(); } },
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
    home.appendChild($('survivalBadgeSection'));
    home.appendChild($('weeklyTrackerSection'));
    const homeBody = document.createElement('div'); homeBody.className = 'app-home-body';
    home.appendChild(homeBody);

    // Menstruation
    const cyc = mk('pageCycle');
    cyc.innerHTML = `<header class="app-head"><h1>Menstruation</h1><p class="subtitle app-cycle-sub"></p></header>
      <div class="app-shared"></div><div class="app-cycle-insight"></div><div class="app-cycle-body"></div>`;
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
    food.appendChild($('tracker'));
    food.appendChild($('modeToggleBar'));
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
        <button type="button" class="app-tile" data-sheet="bedside"><span class="app-tile-emoji">🗄️</span><b>Bedside Snack Drawer</b><span>What’s stocked</span></button>
        <button type="button" class="app-tile" data-sheet="prep"><span class="app-tile-emoji">🫙</span><b>Meal Prep Jars</b><span>3 recipes · every 3–4 days</span></button>`;
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
      <div class="app-shared"></div><div class="app-fit-energy"></div>`;
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
    ['switchDay', 'renderTracker', 'renderActivity', 'setMode'].forEach(wrap);
    window.checkAndRenderSurvivalBadge = survivalBadge;
    document.addEventListener('eb:profile', repaint);

    buildMini();
    survivalBadge();
    go(location.hash.replace('#', '') || 'home', true);
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
  function updateMini() {
    const mini = $('trackerMini'), eq = $('calEquation'); if (!mini || !eq) return;
    mini.innerHTML = `<span class="tracker-mini-day">${DAY_NAMES[currentDay]}</span><div class="cal-equation">${eq.innerHTML}</div>`;
  }

  let painting = false;
  function repaint() {
    if (painting) return; painting = true;
    try {
      updateMini();
      paintFoodHead();
      if (active === 'home') renderHome();
      if (active === 'fitness') renderFitnessPage();
      if (active === 'cycle') renderCyclePage();
    } finally { painting = false; }
  }

  // Move the calendar and day tabs into the open page.
  function placeShared(page) {
    const slot = page.id === 'appParking' ? page : page.querySelector('.app-shared'); if (!slot) return;
    // One date picker per page: the cycle strip on Menstruation, the Mon–Sun
    // day tabs (which pick the day to log) on Nutrition and Fitness.
    const park = $('appParking');
    (page.id === 'pageCycle' || page === park ? slot : park).appendChild($('cycleSection'));
    const days = document.querySelector('.day-tabs');
    if (days) (page.id === 'pageCycle' ? park : slot).appendChild(days);
    // Moving the strip resets its scroll; repaint so today is centred again.
    if (page.id !== 'appParking') { try { renderCycleCalendar(); } catch {} }
  }

  function closeOverlays() {
    if (window.EBAssistant && EBAssistant.isOpen && EBAssistant.isOpen()) EBAssistant.close(true);
    if (window.EBProfile && EBProfile.isOpen && EBProfile.isOpen()) EBProfile.close();
  }
  function go(tab, initial) {
    if (tab === 'chat') { if (window.EBProfile && EBProfile.isOpen()) EBProfile.close(); if (window.EBAssistant && !EBAssistant.isOpen()) EBAssistant.open(); return markActive(); }
    if (tab === 'profile') { if (window.EBAssistant && EBAssistant.isOpen()) EBAssistant.close(true); if (window.EBProfile && !EBProfile.isOpen()) EBProfile.open(); return markActive(); }
    closeOverlays(); toggleQuick(false);
    if (!PAGES.includes(tab)) tab = 'home';
    active = tab;
    document.body.dataset.tab = tab;
    PAGES.forEach(t => { pageEl(t).hidden = t !== tab; });
    placeShared(tab === 'home' ? $('appParking') : pageEl(tab));
    if (tab === 'cycle') renderCyclePage();
    if (tab === 'home') { renderHome(); try { renderWeeklyTracker(); } catch {} survivalBadge(); }
    if (tab === 'fitness') { renderFitnessPage(); try { renderActivity(); } catch {} }
    if (tab === 'food') { try { renderTracker(); renderSlotSection(); } catch {} paintFoodHead(); }
    const mini = $('trackerMini'); if (mini && tab !== 'food') mini.classList.remove('show');
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
    const g = t.closest('[data-go]'); if (g) { e.preventDefault(); return go(g.dataset.go); }
    if (t.closest('[data-scroll-energy]')) { const c = document.querySelector('#pageHome .app-energy-card'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
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
    const sy = t.closest('[data-sym]');
    if (sy) { toggleSym(dateToStr(new Date()), sy.dataset.sym); return renderCyclePage(); }
    if (t.closest('[data-period-today]')) {
      if (!confirm('Mark today as the first day of your period?')) return;
      const iso = dateToStr(new Date());
      const pr = EB.getProfile(); pr.cycle.lastStart = iso; pr.cycle.tracks = true; EB.saveProfile(pr);
      setCycleStart(iso); try { renderCycleCalendar(); } catch {}
      renderCyclePage(); EB.toast('Period logged'); return;
    }
    const hb = t.closest('[data-health]');
    if (hb && window.EBHealth) {
      (hb.dataset.health === 'connect' ? EBHealth.connect() : EBHealth.syncIn().then(() => EBHealth.syncOut()))
        .then(() => { EB.toast('Apple Health synced'); repaint(); })
        .catch(() => EB.toast('Apple Health isn’t available on this device'));
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
