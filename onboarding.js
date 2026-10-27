// ── Onboarding ────────────────────────────────────────────────────────
// STEPS is shared with the profile page: each step renders its own fields
// and edits a draft profile in place, so onboarding and "edit from profile"
// are the same screens.
(function () {
  const { esc, ICONS } = EB;

  // ── Options ──
  const GOALS = [
    { v: 'lose', t: 'Lose weight', syn: ['lose', 'loose', 'weight loss', 'fat', 'slim', 'cut'] },
    { v: 'maintain', t: 'Maintain my weight', syn: ['maintain', 'same', 'stay'] },
    { v: 'muscle', t: 'Build muscle', syn: ['muscle', 'tone', 'strong', 'gain', 'bulk'] },
    { v: 'hormones', t: 'Manage PCOS or hormones', syn: ['pcos', 'pcod', 'hormone', 'thyroid'] },
    { v: 'pms', t: 'Ease PMS symptoms', syn: ['pms', 'period', 'cramp'] },
    { v: 'healthier', t: 'Eat healthier', syn: ['health', 'healthy', 'better', 'clean'] }
  ];
  const SYMPTOMS = [
    { v: 'cramps', t: 'Cramps', syn: ['cramp'] },
    { v: 'bloating', t: 'Bloating', syn: ['bloat'] },
    { v: 'cravings', t: 'Cravings', syn: ['craving', 'crave', 'sugar'] },
    { v: 'mood', t: 'Mood swings', syn: ['mood', 'irritab', 'anxious', 'sad', 'cry'] },
    { v: 'fatigue', t: 'Fatigue', syn: ['fatigue', 'tired', 'low energy', 'exhaust'] },
    { v: 'headache', t: 'Headaches', syn: ['headache', 'migraine'] },
    { v: 'acne', t: 'Acne', syn: ['acne', 'pimple', 'breakout', 'skin'] },
    { v: 'breast', t: 'Breast tenderness', syn: ['breast', 'tender', 'chest'] },
    { v: 'back', t: 'Back pain', syn: ['back'] },
    { v: 'heavy', t: 'Heavy flow', syn: ['heavy', 'flow'] },
    { v: 'nausea', t: 'Nausea', syn: ['nausea', 'nauseous', 'vomit'] },
    { v: 'sleep', t: 'Poor sleep', syn: ['sleep', 'insomnia'] }
  ];
  const PMS_START = [
    { v: '1-3', t: '1–3 days before', syn: ['one', 'two', 'three', '1', '2', '3', 'couple', 'day before'] },
    { v: '4-7', t: '4–7 days before', syn: ['four', 'five', 'six', 'seven', '4', '5', '6', '7', 'week before', 'a week'] },
    { v: '7+', t: 'Over a week before', syn: ['more than a week', 'two weeks', 'over a week', '10', 'ten'] },
    { v: 'none', t: 'I don’t get PMS', syn: ['don\'t get', 'dont get', 'no pms', 'never'] },
    { v: 'unsure', t: 'Not sure', syn: ['not sure', 'don\'t know', 'dont know', 'unsure'] }
  ];
  const REGULAR = [
    { v: 'yes', t: 'Yes', syn: ['yes', 'yeah', 'yep', 'similar', 'same', 'regular'] },
    { v: 'no', t: 'No', syn: ['no', 'nope', 'different', 'irregular', 'varies'] },
    { v: 'unsure', t: 'Not sure', syn: ['not sure', 'don\'t know', 'unsure', 'maybe'] }
  ];
  const LEVELS = [
    { v: 'sedentary', t: 'Mostly sitting', d: 'Desk job, little exercise', syn: ['sedentary', 'sitting', 'desk', 'not active', 'not very', 'none', 'little'] },
    { v: 'light', t: 'Lightly active', d: 'Walks, 1–2 workouts a week', syn: ['light', 'lightly', 'walk', 'once', 'twice', 'bit'] },
    { v: 'moderate', t: 'Moderately active', d: '3–4 workouts a week', syn: ['moderate', 'three', 'four', '3', '4', 'regular'] },
    { v: 'very', t: 'Very active', d: '5+ workouts or an on-your-feet job', syn: ['very', 'daily', 'every day', 'athlete', 'five', 'six', '5', '6'] }
  ];
  const ACT_TYPES = [
    { v: 'walking', t: 'Walking', syn: ['walk'] }, { v: 'running', t: 'Running', syn: ['run', 'jog'] },
    { v: 'strength', t: 'Strength', syn: ['strength', 'weight', 'gym', 'lift'] }, { v: 'yoga', t: 'Yoga', syn: ['yoga'] },
    { v: 'pilates', t: 'Pilates', syn: ['pilates'] }, { v: 'cycling', t: 'Cycling', syn: ['cycl', 'bike', 'spin'] },
    { v: 'swimming', t: 'Swimming', syn: ['swim'] }, { v: 'hiit', t: 'HIIT', syn: ['hiit', 'crossfit', 'interval'] },
    { v: 'dance', t: 'Dance', syn: ['danc', 'zumba'] }, { v: 'sports', t: 'Sports', syn: ['sport', 'tennis', 'badminton', 'football', 'cricket', 'basketball'] }
  ];
  const TRACKERS = [
    { v: 'apple', t: 'Apple Watch / Health', syn: ['apple', 'watch', 'iphone', 'health app'] },
    { v: 'fitbit', t: 'Fitbit', syn: ['fitbit'] }, { v: 'garmin', t: 'Garmin', syn: ['garmin'] },
    { v: 'oura', t: 'Oura', syn: ['oura', 'ring'] }, { v: 'whoop', t: 'Whoop', syn: ['whoop'] },
    { v: 'googlefit', t: 'Google Fit', syn: ['google'] }, { v: 'samsung', t: 'Samsung Health', syn: ['samsung', 'galaxy'] },
    { v: 'other', t: 'Other', syn: ['other', 'mi band', 'amazfit', 'noise', 'boat'] },
    { v: 'none', t: 'None', syn: ['none', 'no', 'nothing', 'don\'t'], only: true }
  ];
  const DIETS = [
    { v: 'veg', t: 'Vegetarian', syn: ['vegetarian', 'veg'] },
    { v: 'egg', t: 'Eggetarian', syn: ['egg'] },
    { v: 'nonveg', t: 'Non-vegetarian', syn: ['non veg', 'non-veg', 'nonveg', 'non vegetarian', 'meat', 'chicken', 'everything'] },
    { v: 'vegan', t: 'Vegan', syn: ['vegan'] },
    { v: 'jain', t: 'Jain', syn: ['jain'] },
    { v: 'pescatarian', t: 'Pescatarian', syn: ['pescatarian', 'fish', 'seafood'] }
  ];
  const YESNO = [
    { v: 'yes', t: 'Yes', syn: ['yes', 'yeah', 'yep', 'i do', 'sure'] },
    { v: 'no', t: 'No', syn: ['no', 'nope', 'don\'t', 'not'] }
  ];
  const SLEEP_HOURS = [
    { v: '<5', t: 'Under 5 h' }, { v: '5-6', t: '5–6 h' }, { v: '6-7', t: '6–7 h' },
    { v: '7-8', t: '7–8 h' }, { v: '8+', t: '8+ h' }
  ];
  const SLEEP_REG = [
    { v: 'yes', t: 'Yes', syn: ['yes', 'yeah', 'same', 'regular', 'fixed'] },
    { v: 'mostly', t: 'Mostly', syn: ['mostly', 'usually', 'kind of', 'sort of'] },
    { v: 'no', t: 'No', syn: ['no', 'not', 'varies', 'irregular', 'all over'] }
  ];
  const CONDITIONS = [
    { v: 'pcos', t: 'PCOS / PCOD', syn: ['pcos', 'pcod', 'polycystic'] },
    { v: 'thyroid', t: 'Thyroid', syn: ['thyroid', 'hypothyroid', 'hyperthyroid'] },
    { v: 'diabetes', t: 'Diabetes / prediabetes', syn: ['diabet', 'sugar'] },
    { v: 'insulin', t: 'Insulin resistance', syn: ['insulin'] },
    { v: 'bp', t: 'High blood pressure', syn: ['blood pressure', 'bp', 'hypertension'] },
    { v: 'cholesterol', t: 'High cholesterol', syn: ['cholesterol'] },
    { v: 'anemia', t: 'Anemia', syn: ['anemi', 'anaemi', 'iron'] },
    { v: 'endo', t: 'Endometriosis', syn: ['endometriosis'] },
    { v: 'gut', t: 'IBS / gut issues', syn: ['ibs', 'gut', 'acidity', 'digest'] },
    { v: 'allergy', t: 'Food allergy', syn: ['allerg', 'intoleran', 'lactose', 'gluten'] },
    { v: 'none', t: 'None', syn: ['none', 'no', 'nothing'], only: true }
  ];
  const label = (list, v) => (list.find(o => o.v === v) || {}).t || '';
  const labels = (list, vs) => (vs || []).map(v => label(list, v)).filter(Boolean).join(', ');

  // ── Path helpers (data-path="cycle.symptoms") ──
  const getAt = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  function setAt(o, path, val) {
    const ks = path.split('.'); const last = ks.pop();
    ks.reduce((a, k) => a[k], o)[last] = val;
  }

  // ── Control markup ──
  function chips(path, list, value, { multi = false } = {}) {
    const sel = multi ? (value || []) : [value];
    return `<div class="eb-chips" role="${multi ? 'group' : 'radiogroup'}">${list.map(o =>
      `<button type="button" class="eb-chip${sel.includes(o.v) ? ' on' : ''}" data-path="${path}" data-value="${esc(o.v)}"
        ${multi ? 'data-multi' : ''} ${o.only ? 'data-only' : ''} role="${multi ? 'checkbox' : 'radio'}"
        aria-checked="${sel.includes(o.v)}">${esc(o.t)}</button>`).join('')}</div>`;
  }
  function segmented(path, list, value) {
    return `<div class="eb-seg" role="radiogroup">${list.map(o =>
      `<button type="button" class="eb-seg-btn${value === o.v ? ' on' : ''}" data-path="${path}" data-value="${esc(o.v)}"
        role="radio" aria-checked="${value === o.v}">${esc(o.t)}</button>`).join('')}</div>`;
  }
  function rows(path, list, value) {
    return `<div class="eb-rows" role="radiogroup">${list.map(o =>
      `<button type="button" class="eb-row${value === o.v ? ' on' : ''}" data-path="${path}" data-value="${esc(o.v)}"
        role="radio" aria-checked="${value === o.v}">
        <span class="eb-row-text"><span class="eb-row-title">${esc(o.t)}</span>${o.d ? `<span class="eb-row-desc">${esc(o.d)}</span>` : ''}</span>
        <span class="eb-radio" aria-hidden="true"></span></button>`).join('')}</div>`;
  }
  function stepper(path, value, min, max, unit) {
    return `<div class="eb-stepper">
      <button type="button" class="eb-step-btn" data-step="${path}" data-delta="-1" data-min="${min}" data-max="${max}" aria-label="Decrease">−</button>
      <span class="eb-step-val" aria-live="polite"><b>${value}</b> ${unit}</span>
      <button type="button" class="eb-step-btn" data-step="${path}" data-delta="1" data-min="${min}" data-max="${max}" aria-label="Increase">+</button>
    </div>`;
  }
  function textarea(path, value, placeholder) {
    return `<div class="eb-textarea-wrap">
      <textarea class="eb-input eb-textarea" data-path="${path}" rows="3" placeholder="${esc(placeholder)}">${esc(value)}</textarea>
      <button type="button" class="eb-mic" data-dictate aria-label="Dictate" aria-pressed="false">${ICONS.mic}</button>
    </div>`;
  }
  let fieldSeq = 0;
  const field = (lbl, html, extra = '') => {
    const id = 'ebf' + (++fieldSeq);
    return `<div class="eb-field ${extra}" role="group" aria-labelledby="${id}"><p class="eb-label" id="${id}">${lbl}</p>${html}</div>`;
  };

  function weightHint(p) {
    const c = parseFloat(p.weight.current), g = parseFloat(p.weight.goal), u = p.weight.unit;
    if (!(c > 0 && g > 0)) return '';
    const diff = Math.round(Math.abs(c - g) * 10) / 10;
    if (diff === 0) return 'Plan set to maintain.';
    const perWeek = u === 'kg' ? 0.5 : 1.1;
    const weeks = Math.ceil(diff / perWeek);
    return `${g < c ? '−' : '+'}${diff} ${u} · about ${weeks} week${weeks === 1 ? '' : 's'} at a steady pace`;
  }
  function weightValid(p) {
    const lim = p.weight.unit === 'kg' ? [30, 300] : [66, 660];
    const ok = v => { const n = parseFloat(v); return n >= lim[0] && n <= lim[1]; };
    return ok(p.weight.current) && ok(p.weight.goal);
  }

  // ── Steps ──
  const STEPS = [
    {
      id: 'goal', short: 'Goal', title: 'What’s your main goal?',
      render: p => rows('goal', GOALS, p.goal),
      valid: p => !!p.goal,
      summary: p => label(GOALS, p.goal)
    },
    {
      id: 'weight', short: 'Weight', title: 'Your weight',
      render: p => `
        ${segmented('weight.unit', [{ v: 'kg', t: 'kg' }, { v: 'lb', t: 'lb' }], p.weight.unit)}
        <div class="eb-pair">
          ${field('Current', `<div class="eb-num"><input class="eb-input" data-path="weight.current" inputmode="decimal" placeholder="0" value="${esc(p.weight.current)}" aria-label="Current weight"><span>${p.weight.unit}</span></div>`)}
          ${field('Goal', `<div class="eb-num"><input class="eb-input" data-path="weight.goal" inputmode="decimal" placeholder="0" value="${esc(p.weight.goal)}" aria-label="Goal weight"><span>${p.weight.unit}</span></div>`)}
        </div>
        <p class="eb-hint" data-live="weightHint">${weightHint(p)}</p>`,
      live: { weightHint },
      valid: weightValid,
      summary: p => p.weight.current ? `${p.weight.current} → ${p.weight.goal || '—'} ${p.weight.unit}` : ''
    },
    {
      id: 'cycle', short: 'Cycle', title: 'Your cycle', optional: true,
      render: p => `
        ${field('First day of your last period', `<input type="date" class="eb-input" data-path="cycle.lastStart" aria-label="First day of your last period" max="${EB.todayISO()}" value="${esc(p.cycle.lastStart)}">`)}
        ${field('Cycle length', stepper('cycle.cycleLength', p.cycle.cycleLength, 15, 60, 'days'))}
        ${field('Period lasts', stepper('cycle.periodLength', p.cycle.periodLength, 1, 12, 'days'))}
        <button type="button" class="eb-link" data-action="noPeriods">I don’t get periods</button>`,
      valid: p => !!p.cycle.lastStart,
      touched: p => !!p.cycle.lastStart,
      onChange: p => { p.cycle.tracks = true; },
      summary: p => p.cycle.tracks === false ? 'Not tracking'
        : p.cycle.lastStart ? `${p.cycle.cycleLength}-day cycle · ${p.cycle.periodLength}-day period` : ''
    },
    {
      id: 'symptoms', short: 'Period & PMS', title: 'Your period & PMS', optional: true,
      when: p => p.cycle.tracks !== false,
      render: p => `
        ${field('Is it similar every month?', segmented('cycle.regular', REGULAR, p.cycle.regular))}
        ${p.cycle.regular === 'yes' ? field('What do you usually get?', chips('cycle.symptoms', SYMPTOMS, p.cycle.symptoms, { multi: true })) : ''}
        ${field('When does PMS start?', chips('cycle.pmsStart', PMS_START, p.cycle.pmsStart))}`,
      valid: () => true,
      touched: p => !!(p.cycle.regular || p.cycle.pmsStart || p.cycle.symptoms.length),
      summary: p => [({ yes: 'Regular', no: 'Irregular' })[p.cycle.regular],
        labels(SYMPTOMS, p.cycle.symptoms), p.cycle.pmsStart && `PMS ${label(PMS_START, p.cycle.pmsStart).toLowerCase()}`]
        .filter(Boolean).join(' · ')
    },
    {
      id: 'activity', short: 'Activity', title: 'How active are you?',
      render: p => `
        ${rows('activity.level', LEVELS, p.activity.level)}
        ${field('What do you do?', chips('activity.types', ACT_TYPES, p.activity.types, { multi: true }), 'eb-field-gap')}
        ${field('Do you use a fitness tracker?', chips('trackers', TRACKERS, p.trackers, { multi: true }))}`,
      valid: p => !!p.activity.level,
      summary: p => [label(LEVELS, p.activity.level), labels(ACT_TYPES, p.activity.types), labels(TRACKERS, p.trackers)]
        .filter(Boolean).join(' · ')
    },
    {
      id: 'food', short: 'Food', title: 'How do you eat?',
      render: p => `
        ${chips('food.diet', DIETS, p.food.diet)}
        ${field('What do you eat on a usual day?', textarea('food.usual', p.food.usual, 'e.g. poha and chai, dal-roti, fruit, paneer and rice'), 'eb-field-gap')}
        ${field('Have a diet plan? <span class="eb-label-note">PDF, Excel or photo</span>', fileBlock(p))}`,
      valid: p => !!p.food.diet,
      summary: p => [label(DIETS, p.food.diet), p.food.files.length ? `${p.food.files.length} plan${p.food.files.length > 1 ? 's' : ''} uploaded` : '']
        .filter(Boolean).join(' · ')
    },
    {
      id: 'nutritionist', short: 'Nutritionist', title: 'Do you see a nutritionist?', optional: true,
      render: p => `
        ${segmented('nutritionist.has', YESNO, p.nutritionist.has)}
        ${p.nutritionist.has === 'yes' ? `
          ${field('Name <span class="eb-label-note">optional</span>', `<input class="eb-input" data-path="nutritionist.name" value="${esc(p.nutritionist.name)}" autocomplete="off">`, 'eb-field-gap')}
          ${field('Phone or email <span class="eb-label-note">optional</span>', `<input class="eb-input" data-path="nutritionist.contact" value="${esc(p.nutritionist.contact)}" autocomplete="off">`)}` : ''}`,
      valid: p => !!p.nutritionist.has,
      touched: p => !!p.nutritionist.has,
      summary: p => p.nutritionist.has === 'yes' ? (p.nutritionist.name || 'Yes') : p.nutritionist.has === 'no' ? 'No' : ''
    },
    {
      id: 'sleep', short: 'Sleep', title: 'How do you sleep?', optional: true,
      render: p => `
        ${field('Hours a night', chips('sleep.hours', SLEEP_HOURS, p.sleep.hours))}
        ${field('Same bedtime most nights?', segmented('sleep.regular', SLEEP_REG, p.sleep.regular))}`,
      valid: () => true,
      touched: p => !!(p.sleep.hours || p.sleep.regular),
      summary: p => [label(SLEEP_HOURS, p.sleep.hours), p.sleep.regular && `Regular: ${label(SLEEP_REG, p.sleep.regular)}`]
        .filter(Boolean).join(' · ')
    },
    {
      id: 'health', short: 'Health', title: 'Any health conditions?', optional: true,
      render: p => `
        ${chips('health.conditions', CONDITIONS, p.health.conditions, { multi: true })}
        ${field('Medicines or supplements', textarea('health.meds', p.health.meds, 'e.g. thyroxine 50mcg, vitamin D, iron'), 'eb-field-gap')}
        <p class="eb-privacy">Used only to tailor suggestions. Stays on this device.</p>`,
      valid: () => true,
      touched: p => !!(p.health.conditions.length || p.health.meds.trim()),
      summary: p => [labels(CONDITIONS, p.health.conditions), p.health.meds.trim()].filter(Boolean).join(' · ')
    }
  ];

  // ── Diet-plan upload ──
  function fileBlock(p) {
    return `<div class="eb-files">
      ${p.food.files.map(f => `<div class="eb-file">
        <span class="eb-file-ic">${ICONS.file}</span>
        <span class="eb-file-name">${esc(f.name)}<span class="eb-file-size">${EB.fmtBytes(f.size)}</span></span>
        <button type="button" class="eb-icon-btn sm" data-action="removeFile" data-id="${f.id}" aria-label="Remove ${esc(f.name)}">${ICONS.close}</button>
      </div>`).join('')}
      <label class="eb-drop">
        <input type="file" data-action="addFile" accept=".pdf,.xls,.xlsx,.csv,.doc,.docx,image/*" multiple hidden>
        ${ICONS.upload}<span>Upload</span>
      </label>
    </div>`;
  }
  async function addFiles(fileList, p) {
    for (const f of fileList) {
      if (f.size > 15 * 1048576) { EB.toast(`${f.name} is over 15 MB`); continue; }
      const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      try {
        await EB.putFile(id, f);
        p.food.files.push({ id, name: f.name, size: f.size, type: f.type, addedAt: Date.now() });
      } catch { EB.toast('Couldn’t save that file'); }
    }
  }

  // ── Binding: one delegated handler per rendered step ──
  // rerender() repaints the step (chips can reveal follow-up questions);
  // text inputs only refresh validity so the caret isn't lost.
  function bindStep(root, step, p, { rerender, refresh, onNoPeriods }) {
    const changed = (repaint) => { step.onChange && step.onChange(p); repaint ? rerender() : refresh(); };
    root.addEventListener('click', (e) => {
      const opt = e.target.closest('[data-path][data-value]');
      if (opt && root.contains(opt)) {
        const path = opt.dataset.path, v = opt.dataset.value;
        if (opt.hasAttribute('data-multi')) {
          let arr = (getAt(p, path) || []).slice();
          if (arr.includes(v)) arr = arr.filter(x => x !== v);
          else if (opt.hasAttribute('data-only')) arr = [v];
          else arr = arr.filter(x => !root.querySelector(`[data-path="${path}"][data-value="${x}"][data-only]`)).concat(v);
          setAt(p, path, arr);
        } else {
          setAt(p, path, getAt(p, path) === v && opt.classList.contains('eb-chip') ? '' : v);
          if (path === 'weight.unit') convertUnit(p, v);
        }
        return changed(true);
      }
      const st = e.target.closest('[data-step]');
      if (st) {
        const path = st.dataset.step;
        const n = Math.min(+st.dataset.max, Math.max(+st.dataset.min, (+getAt(p, path) || 0) + +st.dataset.delta));
        setAt(p, path, n);
        return changed(true);
      }
      const act = e.target.closest('[data-action]');
      if (act && act.dataset.action === 'noPeriods') { p.cycle.tracks = false; onNoPeriods && onNoPeriods(); }
      if (act && act.dataset.action === 'removeFile') {
        const id = act.dataset.id;
        p.food.files = p.food.files.filter(f => f.id !== id);
        EB.deleteFile(id);
        changed(true);
      }
    });
    root.addEventListener('input', (e) => {
      const el = e.target;
      if (!el.dataset.path) return;
      setAt(p, el.dataset.path, el.value);
      if (step.live) Object.entries(step.live).forEach(([k, fn]) => {
        const out = root.querySelector(`[data-live="${k}"]`); if (out) out.textContent = fn(p);
      });
      changed(false);
    });
    root.addEventListener('change', async (e) => {
      const el = e.target;
      if (el.dataset.action === 'addFile') { await addFiles(el.files, p); changed(true); }
      else if (el.type === 'date') changed(false);
    });
    // Maintain → goal defaults to current weight
    root.addEventListener('focusout', (e) => {
      if (e.target.dataset.path === 'weight.current' && p.goal === 'maintain' && !p.weight.goal && p.weight.current) {
        p.weight.goal = p.weight.current; rerender();
      }
    });
    root.querySelectorAll('[data-dictate]').forEach(btn => EB.attachDictation(btn, btn.parentElement.querySelector('textarea')));
  }
  // weight._unit remembers the unit the numbers are currently in, so
  // tapping kg/lb converts the values instead of just relabelling them.
  function convertUnit(p, to) {
    if ((p.weight._unit || 'kg') === to) return;
    const conv = v => { const n = parseFloat(v); if (!(n > 0)) return v; return Math.round((to === 'lb' ? n * 2.20462 : n / 2.20462) * 10) / 10; };
    p.weight.current = conv(p.weight.current); p.weight.goal = conv(p.weight.goal);
    p.weight._unit = to;
  }

  // ── Onboarding flow ──
  let draft, idx, el, reviewReturn;
  const visible = () => STEPS.filter(s => !s.when || s.when(draft));

  function open() {
    draft = EB.getProfile();
    draft.weight._unit = draft.weight.unit;
    idx = -1; reviewReturn = false;
    el = document.createElement('div');
    el.className = 'ob';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'obTitle');
    document.body.appendChild(el);
    document.documentElement.classList.add('eb-locked');
    renderWelcome();
  }
  function close() {
    EB.voice.hush(); EB.voice.abort();
    el && el.remove(); el = null;
    document.documentElement.classList.remove('eb-locked');
  }
  function themeBtn() {
    const light = document.documentElement.dataset.theme === 'light';
    return `<button type="button" class="eb-icon-btn" data-ob="theme" aria-label="Switch to ${light ? 'dark' : 'light'} mode">${light ? ICONS.moon : ICONS.sun}</button>`;
  }

  function renderWelcome() {
    el.innerHTML = `
      <div class="ob-top"><span></span>${themeBtn()}</div>
      <div class="ob-body ob-welcome">
        <div class="ob-mark" aria-hidden="true">E</div>
        <h1 class="ob-title" id="obTitle">Let’s build your plan</h1>
        <p class="ob-sub">9 quick questions · about 2 minutes</p>
      </div>
      <div class="ob-foot">
        <button type="button" class="eb-btn primary" data-ob="start">Get started</button>
        ${EB.voice.canListen ? `<button type="button" class="eb-btn ghost" data-ob="voice">${ICONS.mic}<span>Answer by voice</span></button>` : ''}
        <p class="eb-privacy center">Your answers stay on this device.</p>
      </div>`;
    el.onclick = (e) => {
      const a = e.target.closest('[data-ob]'); if (!a) return;
      if (a.dataset.ob === 'theme') { EB.toggleTheme(); renderWelcome(); }
      if (a.dataset.ob === 'start') { idx = 0; renderStep(); }
      if (a.dataset.ob === 'voice') startVoice();
    };
  }

  function renderStep() {
    const steps = visible();
    if (idx >= steps.length) return renderReview();
    const step = steps[idx];
    const pct = Math.round((idx / steps.length) * 100);
    el.innerHTML = `
      <div class="ob-top">
        <button type="button" class="eb-icon-btn" data-ob="back" aria-label="Back">${ICONS.back}</button>
        <div class="ob-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${idx}" aria-label="Step ${idx + 1} of ${steps.length}"><span style="width:${Math.max(pct, 4)}%"></span></div>
        ${themeBtn()}
      </div>
      <div class="ob-body">
        <h1 class="ob-title" id="obTitle" tabindex="-1">${step.title}</h1>
        <div class="ob-fields">${step.render(draft)}</div>
      </div>
      <div class="ob-foot"><button type="button" class="eb-btn" data-ob="next"></button></div>`;
    const fields = el.querySelector('.ob-fields');
    const refresh = () => updateNext(step);
    bindStep(fields, step, draft, {
      rerender: () => { fields.innerHTML = step.render(draft); bindAgain(); refresh(); },
      refresh,
      onNoPeriods: () => { idx++; renderStep(); }
    });
    function bindAgain() { // re-attach dictation after repaint (delegated handlers survive)
      fields.querySelectorAll('[data-dictate]').forEach(btn => EB.attachDictation(btn, btn.parentElement.querySelector('textarea')));
    }
    refresh();
    el.onclick = (e) => {
      const a = e.target.closest('[data-ob]'); if (!a) return;
      if (a.dataset.ob === 'theme') { EB.toggleTheme(); a.outerHTML = themeBtn(); }
      if (a.dataset.ob === 'back') { if (reviewReturn) return renderReview(); idx--; idx < 0 ? renderWelcome() : renderStep(); }
      if (a.dataset.ob === 'next') {
        if (a.disabled) return;
        if (reviewReturn) return renderReview();
        idx++; renderStep();
      }
    };
    el.querySelector('#obTitle').focus({ preventScroll: true });
    el.querySelector('.ob-body').scrollTop = 0;
  }
  // Optional + untouched → the one button reads "Skip" (no separate skip link).
  function updateNext(step) {
    const btn = el.querySelector('[data-ob="next"]');
    const untouched = step.optional && !(step.touched ? step.touched(draft) : step.valid(draft));
    const ok = step.valid(draft);
    btn.textContent = reviewReturn ? 'Done' : untouched ? 'Skip' : 'Continue';
    btn.className = 'eb-btn ' + (untouched ? 'secondary' : 'primary');
    btn.disabled = !untouched && !ok;
  }

  function renderReview() {
    reviewReturn = false;
    const steps = visible();
    el.innerHTML = `
      <div class="ob-top">
        <button type="button" class="eb-icon-btn" data-ob="back" aria-label="Back">${ICONS.back}</button>
        <div class="ob-progress" aria-hidden="true"><span style="width:100%"></span></div>
        ${themeBtn()}
      </div>
      <div class="ob-body">
        <h1 class="ob-title" id="obTitle" tabindex="-1">Look right?</h1>
        <div class="eb-list">${steps.map((s, i) => {
          const sum = s.summary(draft);
          return `<button type="button" class="eb-list-row" data-edit="${i}">
            <span class="eb-row-text"><span class="eb-list-label">${s.short}</span>
            <span class="eb-list-value${sum ? '' : ' muted'}">${esc(sum || 'Skipped')}</span></span>${ICONS.chevron}</button>`;
        }).join('')}</div>
      </div>
      <div class="ob-foot"><button type="button" class="eb-btn primary" data-ob="finish">Start my plan</button></div>`;
    el.onclick = (e) => {
      const ed = e.target.closest('[data-edit]');
      if (ed) { idx = +ed.dataset.edit; reviewReturn = true; return renderStep(); }
      const a = e.target.closest('[data-ob]'); if (!a) return;
      if (a.dataset.ob === 'theme') { EB.toggleTheme(); a.outerHTML = themeBtn(); }
      if (a.dataset.ob === 'back') { idx = steps.length - 1; renderStep(); }
      if (a.dataset.ob === 'finish') finish();
    };
    el.querySelector('#obTitle').focus({ preventScroll: true });
  }

  function finish() {
    delete draft.weight._unit;
    draft.completedAt = draft.completedAt || new Date().toISOString();
    EB.saveProfile(draft);
    el.classList.add('ob-leaving');
    setTimeout(() => { close(); EB.toast('You’re all set'); }, 220);
  }

  // ── Voice mode ──────────────────────────────────────────────────────
  // Questions are read aloud one by one; each answer is parsed locally (no
  // network) and written into the same draft. Unclear answers are re-asked
  // once, then skipped. Ends on the review screen so everything heard can
  // be checked and corrected by touch.
  const NUM_WORDS = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
    eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19,
    twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90, hundred:100, a:1, an:1, half:0.5 };
  function parseNum(text) {
    const t = text.toLowerCase().replace(/,/g, '');
    const d = t.match(/\d+(\.\d+)?/);
    if (d) return parseFloat(d[0]);
    let total = 0, cur = 0, found = false;
    for (const w of t.split(/[\s-]+/)) {
      if (w === 'point') break;
      if (!(w in NUM_WORDS) || w === 'a' || w === 'an') continue;
      found = true;
      const n = NUM_WORDS[w];
      if (n === 100) cur = (cur || 1) * 100; else cur += n;
    }
    total += cur;
    return found ? total : null;
  }
  function hasAny(t, words) { return words.some(w => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(t)); }
  function matchOne(t, list) {
    // Longest synonym wins so "non veg" beats "veg".
    let best = null, len = 0;
    for (const o of list) for (const s of [o.t.toLowerCase(), ...(o.syn || [])]) {
      if (s.length > len && hasAny(t, [s])) { best = o.v; len = s.length; }
    }
    return best;
  }
  function matchMany(t, list) {
    const only = list.find(o => o.only);
    const hits = list.filter(o => !o.only && [o.t.toLowerCase(), ...(o.syn || [])].some(s => hasAny(t, [s]))).map(o => o.v);
    if (!hits.length && only && hasAny(t, only.syn)) return [only.v];
    return hits;
  }
  const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const WEEKDAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  function iso(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function parseDate(text) {
    const t = text.toLowerCase(); const now = new Date(); now.setHours(0,0,0,0);
    if (/\btoday\b/.test(t)) return iso(now);
    if (/\byesterday\b/.test(t)) { now.setDate(now.getDate() - 1); return iso(now); }
    const ago = t.match(/(\w+)\s+(day|week)s?\s+ago/);
    if (ago) { const n = parseNum(ago[1]) || 1; now.setDate(now.getDate() - n * (ago[2] === 'week' ? 7 : 1)); return iso(now); }
    const wd = WEEKDAYS.findIndex(w => t.includes(w));
    if (wd >= 0) { let back = (now.getDay() - wd + 7) % 7 || 7; now.setDate(now.getDate() - back); return iso(now); }
    const mi = MONTHS.findIndex(m => new RegExp(`\\b${m}`).test(t));
    const day = parseNum(t.replace(/(\d+)(st|nd|rd|th)/g, '$1').replace(/\b(twenty|thirty)[\s-](first|second|third)\b/, (m, a, b) => `${NUM_WORDS[a] + {first:1,second:2,third:3}[b]}`)
      .replace(/\b(first|second|third)\b/, m => ({first:1,second:2,third:3})[m]));
    if (mi >= 0 && day >= 1 && day <= 31) {
      const d = new Date(now.getFullYear(), mi, day);
      if (d > now) d.setFullYear(d.getFullYear() - 1);
      return iso(d);
    }
    return null;
  }
  const isSkip = t => /\b(skip|pass|prefer not|rather not|next)\b/i.test(t);

  const VOICE_QS = [
    { ask: 'What’s your main goal? For example, lose weight, maintain, build muscle, manage PCOS, ease PMS, or eat healthier.',
      parse: (t, p) => { const v = matchOne(t, GOALS); if (v) { p.goal = v; return label(GOALS, v); } } },
    { ask: 'What do you weigh right now?',
      parse: (t, p) => { const n = parseNum(t); if (n > 20) { p.weight.unit = /pound|lb/i.test(t) ? 'lb' : 'kg'; p.weight._unit = p.weight.unit; p.weight.current = n; return `${n} ${p.weight.unit === 'kg' ? 'kilos' : 'pounds'}`; } } },
    { ask: 'And your goal weight?',
      parse: (t, p) => { if (/same|maintain/i.test(t)) { p.weight.goal = p.weight.current; return 'same as now'; }
        const n = parseNum(t); if (n > 20) { p.weight.goal = n; return `${n}`; } } },
    { ask: 'Now your cycle. You can say skip, or “I don’t get periods”. When did your last period start?',
      parse: (t, p) => { if (/don'?t (get|have)|no period|menopause/i.test(t)) { p.cycle.tracks = false; return 'not tracking periods'; }
        const d = parseDate(t); if (d) { p.cycle.lastStart = d; p.cycle.tracks = true; return EB.fmtDate(d, { day: 'numeric', month: 'long' }); } } },
    { when: p => p.cycle.tracks !== false, ask: 'How many days is your cycle, usually?',
      parse: (t, p) => { if (/not sure|don'?t know/i.test(t)) return 'keeping 28 days'; const n = parseNum(t); if (n >= 15 && n <= 60) { p.cycle.cycleLength = n; p.cycle.tracks = true; return `${n} days`; } } },
    { when: p => p.cycle.tracks !== false, ask: 'How many days does your period last?',
      parse: (t, p) => { const n = parseNum(t); if (n >= 1 && n <= 12) { p.cycle.periodLength = n; return `${n} days`; } } },
    { when: p => p.cycle.tracks !== false, ask: 'Is your period similar every month?',
      parse: (t, p) => { const v = matchOne(t, REGULAR); if (v) { p.cycle.regular = v; return label(REGULAR, v); } } },
    { when: p => p.cycle.tracks !== false && p.cycle.regular === 'yes', ask: 'What symptoms do you usually get? Like cramps, bloating, cravings or mood swings.',
      parse: (t, p) => { const v = matchMany(t, SYMPTOMS); if (v.length) { p.cycle.symptoms = v; return labels(SYMPTOMS, v); }
        if (/none|nothing|no symptoms/i.test(t)) return 'none'; } },
    { when: p => p.cycle.tracks !== false, ask: 'How many days before your period does PMS usually start?',
      parse: (t, p) => { const v = matchOne(t, PMS_START.slice(3)) || (() => { const n = parseNum(t); if (n == null) return null; return n <= 3 ? '1-3' : n <= 7 ? '4-7' : '7+'; })() || matchOne(t, PMS_START);
        if (v) { p.cycle.pmsStart = v; return label(PMS_START, v); } } },
    { ask: 'How active are you? Mostly sitting, lightly active, moderately active, or very active?',
      parse: (t, p) => { const v = matchOne(t, LEVELS); if (v) { p.activity.level = v; return label(LEVELS, v); } } },
    { ask: 'What kind of exercise do you do?',
      parse: (t, p) => { const v = matchMany(t, ACT_TYPES); if (v.length) { p.activity.types = v; return labels(ACT_TYPES, v); } if (/none|nothing/i.test(t)) return 'none'; } },
    { ask: 'Do you use a fitness tracker, like an Apple Watch, Fitbit or Oura?',
      parse: (t, p) => { const v = matchMany(t, TRACKERS); if (v.length) { p.trackers = v; return labels(TRACKERS, v); } if (/^\s*no/i.test(t)) { p.trackers = ['none']; return 'none'; } } },
    { ask: 'Are you vegetarian, eggetarian, non-vegetarian, vegan, Jain or pescatarian?',
      parse: (t, p) => { const v = matchOne(t, DIETS); if (v) { p.food.diet = v; return label(DIETS, v); } } },
    { ask: 'What do you eat on a usual day?', free: true,
      parse: (t, p) => { if (t.trim().length > 2) { p.food.usual = t.trim(); return 'noted'; } } },
    { ask: 'Do you see a nutritionist?',
      parse: (t, p) => { const v = matchOne(t, YESNO); if (v) { p.nutritionist.has = v; return label(YESNO, v); } } },
    { when: p => p.nutritionist.has === 'yes', ask: 'What’s their name? You can say skip.', free: true,
      parse: (t, p) => { if (t.trim()) { p.nutritionist.name = t.trim().replace(/^(it'?s|her name is|his name is|their name is)\s+/i, ''); return p.nutritionist.name; } } },
    { ask: 'How many hours do you sleep most nights?',
      parse: (t, p) => { const n = parseNum(t); if (n == null) return; p.sleep.hours = n < 5 ? '<5' : n < 6 ? '5-6' : n < 7 ? '6-7' : n < 8 ? '7-8' : '8+'; return label(SLEEP_HOURS, p.sleep.hours); } },
    { ask: 'Do you go to bed around the same time most nights?',
      parse: (t, p) => { const v = matchOne(t, SLEEP_REG); if (v) { p.sleep.regular = v; return label(SLEEP_REG, v); } } },
    { ask: 'Any health conditions, like PCOS, thyroid or diabetes? You can say none, or skip.',
      parse: (t, p) => { const v = matchMany(t, CONDITIONS); if (v.length) { p.health.conditions = v; return labels(CONDITIONS, v); } } },
    { ask: 'Last one. Do you take any medicines or supplements?', free: true,
      parse: (t, p) => { if (/^\s*(no|none|nothing|nope)\b/i.test(t)) return 'none'; if (t.trim()) { p.health.meds = t.trim(); return 'noted'; } } }
  ];

  let vIdx, vRunning, vMisses;
  function startVoice() {
    vIdx = 0; vRunning = true; vMisses = 0;
    renderVoiceShell();
    askCurrent();
  }
  function renderVoiceShell() {
    el.innerHTML = `
      <div class="ob-top">
        <button type="button" class="eb-icon-btn" data-ob="exit" aria-label="Stop voice mode">${ICONS.close}</button>
        <div class="ob-progress"><span id="vProg" style="width:4%"></span></div>
        ${themeBtn()}
      </div>
      <div class="ob-body ob-voice">
        <p class="ob-voice-q" id="vQ" aria-live="polite"></p>
        <p class="ob-voice-heard" id="vHeard" aria-live="polite"></p>
        <button type="button" class="ob-orb" id="vOrb" aria-label="Tap to answer">${ICONS.mic}</button>
        <p class="ob-voice-state" id="vState"></p>
      </div>
      <div class="ob-foot ob-voice-foot">
        <button type="button" class="eb-btn secondary" data-ob="vskip">Skip</button>
        <button type="button" class="eb-btn secondary" data-ob="type">Type instead</button>
      </div>`;
    el.onclick = (e) => {
      if (e.target.closest('#vOrb')) { if (EB.voice._listening) EB.voice.stop(); else listenCurrent(); return; }
      const a = e.target.closest('[data-ob]'); if (!a) return;
      if (a.dataset.ob === 'theme') { EB.toggleTheme(); a.outerHTML = themeBtn(); }
      if (a.dataset.ob === 'exit') { stopVoice(); renderWelcome(); }
      if (a.dataset.ob === 'vskip') { EB.voice.abort(); nextQ(); }
      if (a.dataset.ob === 'type') { stopVoice(); idx = 0; renderStep(); }
    };
  }
  function stopVoice() { vRunning = false; EB.voice.hush(); EB.voice.abort(); }
  const vQs = () => VOICE_QS.filter(q => !q.when || q.when(draft));
  function setState(s, cls) {
    const st = el && el.querySelector('#vState'); if (st) st.textContent = s;
    const orb = el && el.querySelector('#vOrb'); if (orb) orb.className = 'ob-orb ' + (cls || '');
  }
  async function askCurrent(prefix) {
    if (!vRunning || !el) return;
    const qs = vQs();
    if (vIdx >= qs.length) { stopVoice(); await EB.voice.speak('That’s everything. Have a look and fix anything I got wrong.'); return renderReview(); }
    const q = qs[vIdx];
    // Screen shows just the question; the spoken version keeps the examples.
    const qs2 = q.ask.match(/[^.?]*\?/g);
    el.querySelector('#vQ').textContent = qs2 ? qs2[qs2.length - 1].trim() : q.ask;
    el.querySelector('#vHeard').textContent = '';
    el.querySelector('#vProg').style.width = Math.max(4, Math.round(vIdx / qs.length * 100)) + '%';
    setState('', 'speaking');
    await EB.voice.speak((prefix ? prefix + ' ' : '') + q.ask);
    listenCurrent();
  }
  async function listenCurrent() {
    if (!vRunning || !el) return;
    const q = vQs()[vIdx];
    const heard = el.querySelector('#vHeard');
    setState('Listening…', 'listening');
    EB.voice._listening = true;
    let text = '';
    try {
      text = await EB.voice.listen({ onInterim: t => { heard.textContent = t; } });
    } catch (err) {
      EB.voice._listening = false;
      setState(EB.micErrorMessage(err), '');
      return;
    }
    EB.voice._listening = false;
    if (!vRunning || !el) return;
    if (!text) { setState('Tap the mic to answer', ''); return; }
    heard.textContent = text;
    if (/\b(go back|back)\b/i.test(text) && text.split(' ').length <= 3) { vIdx = Math.max(0, vIdx - 1); return askCurrent(); }
    if (/\brepeat\b/i.test(text) && text.split(' ').length <= 3) return askCurrent();
    if (/\b(stop|cancel)\b/i.test(text) && text.split(' ').length <= 2) { stopVoice(); idx = 0; return renderStep(); }
    if (isSkip(text)) return nextQ();
    const got = q.parse(text, draft);
    if (got) { setState('Got it — ' + got, 'done'); vMisses = 0; await EB.voice.speak('Got it.'); return nextQ(); }
    vMisses++;
    if (vMisses >= 2) { vMisses = 0; return nextQ('Let’s skip that one.'); }
    askCurrent('Sorry, I didn’t catch that.');
  }
  function nextQ(prefix) { vIdx++; askCurrent(prefix); }

  // ── Public ──
  window.EBOnboarding = { open, STEPS, bindStep, isDone: () => !!EB.getProfile().completedAt };

  function boot() { if (!EBOnboarding.isDone()) open(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
