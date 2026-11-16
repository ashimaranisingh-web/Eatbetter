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
    { v: 'muscle', t: 'Build muscle', syn: ['muscle', 'tone', 'strong', 'gain', 'bulk'] }
  ];
  const EXTRA_GOALS = [
    { v: 'pms', t: 'Ease PMS symptoms', syn: ['pms', 'period', 'cramp'] },
    { v: 'hormones', t: 'Manage PCOS or hormones', syn: ['pcos', 'pcod', 'hormone', 'thyroid'] },
    { v: 'energy', t: 'More steady energy', syn: ['energy', 'tired', 'energetic'] },
    { v: 'gut', t: 'Better digestion', syn: ['gut', 'digest', 'bloat', 'acidity'] },
    { v: 'protein', t: 'Eat more protein', syn: ['protein'] },
    { v: 'training', t: 'Train better', syn: ['train', 'workout', 'performance', 'sport'] },
    { v: 'relationship', t: 'A calmer relationship with food', syn: ['relationship', 'guilt', 'binge', 'emotional'] },
    { v: 'healthier', t: 'Eat healthier overall', syn: ['healthier', 'healthy', 'clean'] },
    { v: 'learn', t: 'Learn about nutrition', syn: ['learn', 'nutrition', 'understand'] }
  ];
  const COACHES = [
    { v: 'cheer', t: 'Cheerleader', d: '“Lunch logged! You’re smashing it.”', syn: ['cheer', 'hype', 'excited', 'motivat'] },
    { v: 'gentle', t: 'Gentle & kind', d: '“A heavier day is fine. Tomorrow’s a fresh plate.”', syn: ['gentle', 'kind', 'soft', 'nice'] },
    { v: 'straight', t: 'Straight talker', d: '“You’re 300 over. Keep dinner light.”', syn: ['straight', 'direct', 'honest', 'blunt', 'strict'] },
    { v: 'mindful', t: 'Mindful guide', d: '“How did that meal make you feel?”', syn: ['mindful', 'calm', 'guide', 'aware'] }
  ];
  const REMINDERS = [
    { v: 'morning', t: 'Morning meals', d: '8:00 am · see what’s on your plate', syn: ['morning', 'meals', 'menu', 'breakfast'] },
    { v: 'meals', t: 'Before meals', d: '12:45 pm and 7:30 pm', syn: ['before meals', 'meal', 'lunch', 'dinner'] },
    { v: 'evening', t: 'Evening log', d: '9:00 pm · log anything you ate', syn: ['evening', 'night', 'log'] },
    { v: 'pms', t: 'PMS heads-up', d: 'The day before PMS usually starts', syn: ['pms', 'period', 'heads up'] }
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
    { v: 'dance', t: 'Dance', syn: ['danc', 'zumba'] }, { v: 'sports', t: 'Sports', syn: ['sport', 'tennis', 'badminton', 'football', 'cricket', 'basketball'] },
    { v: 'other', t: 'Other', syn: [] }
  ];
  const MORE_ACTIVE = [{ v: 'yes', t: 'Yes' }, { v: 'maybe', t: 'Maybe' }, { v: 'no', t: 'I’m happy' }];
  const CYCLE_TYPES = [
    { v: 'regular', t: 'Regular' }, { v: 'irregular', t: 'Irregular' }, { v: 'pcos', t: 'PCOS / PCOD' },
    { v: 'thyroid', t: 'Thyroid' }, { v: 'unsure', t: 'Not sure' }
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
  const CUISINES = [
    { v: 'north', t: 'North Indian', syn: ['north indian', 'punjabi', 'roti', 'dal'] },
    { v: 'south', t: 'South Indian', syn: ['south indian', 'dosa', 'idli', 'sambar'] },
    { v: 'home', t: 'Homemade', syn: ['home', 'homemade', 'ghar'] },
    { v: 'continental', t: 'Continental', syn: ['continental', 'western', 'sandwich', 'pasta'] },
    { v: 'salads', t: 'Salads & bowls', syn: ['salad', 'bowl'] },
    { v: 'mexican', t: 'Mexican', syn: ['mexican', 'burrito', 'taco', 'quesadilla'] },
    { v: 'asian', t: 'Asian', syn: ['asian', 'chinese', 'thai', 'japanese', 'noodle'] },
    { v: 'mediterranean', t: 'Mediterranean', syn: ['mediterranean', 'hummus', 'greek'] },
    { v: 'prep', t: 'Meal prep', syn: ['meal prep', 'prep', 'batch'] }
  ];
  const TRACK_MODES = [
    { v: 'plan', t: 'Follow a meal plan', d: 'A week of meals built for you. Tick each one as you eat it.' },
    { v: 'log', t: 'Log what I eat', d: 'Search any food or scan a pack, and add it.' },
    { v: 'guide', t: 'Just give me targets', d: 'Calories and protein for each meal. Nothing to log.' }
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
  function checkRows(path, list, value) {
    const sel = value || [];
    return `<div class="eb-rows" role="group">${list.map(o =>
      `<button type="button" class="eb-row${sel.includes(o.v) ? ' on' : ''}" data-path="${path}" data-value="${esc(o.v)}" data-multi
        role="checkbox" aria-checked="${sel.includes(o.v)}">
        <span class="eb-row-text"><span class="eb-row-title">${esc(o.t)}</span>${o.d ? `<span class="eb-row-desc">${esc(o.d)}</span>` : ''}</span>
        <span class="eb-check" aria-hidden="true">${ICONS.check}</span></button>`).join('')}</div>`;
  }
  function cards(path, list, value) {
    return `<div class="eb-cards" role="radiogroup">${list.map(o =>
      `<button type="button" class="eb-card${value === o.v ? ' on' : ''}" data-path="${path}" data-value="${esc(o.v)}"
        role="radio" aria-checked="${value === o.v}">
        <span class="eb-card-title">${esc(o.t)}</span><span class="eb-card-quote">${esc(o.d)}</span></button>`).join('')}</div>`;
  }
  // Content screens: a short list with a marker (number or colour dot).
  function infoList(items) {
    return `<ul class="ob-info">${items.map(it => `<li>
      <span class="ob-info-mark"${it.color ? ` style="background:${it.color}"` : ''}>${it.n || ''}</span>
      <span><b>${titleCase(it.t)}</b>${it.d ? `<span>${it.d}</span>` : ''}</span></li>`).join('')}</ul>`;
  }
  function datePicker(path, value) {
    const shown = value ? EB.fmtDate(value, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'Select a date';
    return `<button type="button" class="eb-input eb-date-btn${value ? '' : ' empty'}" data-date-open="${path}" aria-haspopup="dialog">
      <span>${shown}</span>${ICONS.chevron}</button>`;
  }
  // Calendar sheet with Save, replacing the browser's date dropdown.
  function openCalendar(value, onSave) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let picked = value || '';
    let view = value ? new Date(value.slice(0, 7) + '-01T00:00') : new Date(today.getFullYear(), today.getMonth(), 1);
    const wrap = document.createElement('div');
    wrap.className = 'eb-cal-overlay';
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    function paint() {
      const y = view.getFullYear(), m = view.getMonth();
      const lead = (new Date(y, m, 1).getDay() + 6) % 7;       // Monday first
      const days = new Date(y, m + 1, 0).getDate();
      const cells = [];
      for (let i = 0; i < lead; i++) cells.push('<span></span>');
      for (let d = 1; d <= days; d++) {
        const ds = iso(new Date(y, m, d));
        const future = new Date(y, m, d) > today;
        cells.push(`<button type="button" class="eb-cal-day${ds === picked ? ' on' : ''}${ds === iso(today) ? ' today' : ''}" data-day="${ds}" ${future ? 'disabled' : ''}>${d}</button>`);
      }
      const nextDisabled = y > today.getFullYear() || (y === today.getFullYear() && m >= today.getMonth());
      wrap.innerHTML = `<div class="eb-cal" role="dialog" aria-modal="true" aria-label="Choose a date">
        <div class="eb-cal-head">
          <button type="button" class="eb-icon-btn" data-cal="prev" aria-label="Previous month">${ICONS.back}</button>
          <b>${view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b>
          <button type="button" class="eb-icon-btn eb-cal-next" data-cal="next" aria-label="Next month" ${nextDisabled ? 'disabled' : ''}>${ICONS.chevron}</button>
        </div>
        <div class="eb-cal-grid eb-cal-wd">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(w => `<span>${w}</span>`).join('')}</div>
        <div class="eb-cal-grid">${cells.join('')}</div>
        <div class="eb-cal-foot">
          <button type="button" class="eb-btn secondary" data-cal="cancel">Cancel</button>
          <button type="button" class="eb-btn primary" data-cal="save" ${picked ? '' : 'disabled'}>Save</button>
        </div>
      </div>`;
    }
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) return close();
      const day = e.target.closest('[data-day]');
      if (day && !day.disabled) { picked = day.dataset.day; return paint(); }
      const a = e.target.closest('[data-cal]'); if (!a || a.disabled) return;
      if (a.dataset.cal === 'prev') { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); paint(); }
      if (a.dataset.cal === 'next') { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); paint(); }
      if (a.dataset.cal === 'cancel') close();
      if (a.dataset.cal === 'save' && picked) { close(); onSave(picked); }
    });
    paint();
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
  // Headers are Title Case: every word capitalised except short joining
  // words mid-sentence. Tags inside a label (the grey "optional" notes) are left alone.
  const MINOR = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'by', 'with', 'as', 'per', 'via']);
  function titleCase(str) {
    let first = true;
    return String(str).split(/(<[^>]+>[^<]*<\/[^>]+>)/).map(part => part.startsWith('<') ? part :
      part.replace(/[A-Za-z][\w’'-]*/g, (w, i, all) => {
        const after = all.slice(0, i).trim();
        const start = first || /[.?!:]$/.test(after);
        first = false;
        if (/[A-Z].*[A-Z]/.test(w)) return w;            // PMS, PCOS, kg stays as typed
        const last = !/[A-Za-z]/.test(all.slice(i + w.length));
        if (!start && !last && MINOR.has(w.toLowerCase())) return w.toLowerCase();
        return w.charAt(0).toUpperCase() + w.slice(1);
      })).join('');
  }
  let fieldSeq = 0;
  const field = (lbl, html, extra = '') => {
    const id = 'ebf' + (++fieldSeq);
    return `<div class="eb-field ${extra}" role="group" aria-labelledby="${id}"><p class="eb-label" id="${id}">${titleCase(lbl)}</p>${html}</div>`;
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

  function bodyValid(p) {
    const h = +p.body.height, a = +p.body.age;
    return h >= 120 && h <= 220 && a >= 13 && a <= 90;
  }

  // ── Your numbers ──
  // Shown after activity: a short "working it out" loader, then how BMI,
  // BMR, maintenance and the deficit are calculated, with the deficit
  // adjustable in 50 cal steps and a nudge back if it gets too steep.
  let numbersSeen = false;
  const BMI_WORDS = { underweight: 'Underweight', healthy: 'Healthy', overweight: 'Overweight', obese: 'Obese' };
  const fmt = n => Math.round(n).toLocaleString();
  function numbersView(p) {
    const n = window.EBPlanner && EBPlanner.numbers(p);
    if (!n) return '<p class="eb-hint">Add your weight first.</p>';
    const u = p.weight.unit, w = v => `${Math.round((u === 'lb' ? v * 2.20462 : v) * 10) / 10} ${u}`;
    const done = n.weeks ? (() => { const d = new Date(); d.setDate(d.getDate() + n.weeks * 7);
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); })() : '';
    const rows = [
      n.bmi != null && { k: 'BMI', v: `${n.bmi}`, tag: n.bmiCat,
        d: `${({ underweight: 'Under 18.5 is underweight.', healthy: 'Between 18.5 and 22.9 is healthy.', overweight: '23 to 27.4 is overweight.', obese: '27.5 and above is obese.' })[n.bmiCat] || ''} For your height, a healthy weight is about ${w(18.5 * (n.cm / 100) ** 2)} to ${w(22.9 * (n.cm / 100) ** 2)}. These are the ranges for South Asian women, lower than the usual ones because health risks start at a lower weight.` },
      n.bmr && { k: 'Calories at rest (BMR)', v: fmt(n.bmr),
        d: `What your body burns doing nothing. 10 × weight + 6.25 × height − 5 × age − 161 (the Mifflin-St Jeor formula for women).` },
      { k: 'Maintenance', v: fmt(n.tdee), maint: true,
        d: n.overridden
          ? `Your own number. The formula says ${fmt(n.tdeeCalc)}. <button type="button" class="eb-link" data-action="calcMaint">Use ${fmt(n.tdeeCalc)}</button>`
          : (n.bmr ? `BMR × ${n.factor} because you’re ${n.actLabel}. Eat this much and your weight stays the same.`
                   : `About ${Math.round(n.tdee / n.kg)} cal per kg for someone ${n.actLabel}. Add height and age for a sharper number.`)
            + ' Know your real number? Adjust it with − and +.' }
    ].filter(Boolean);
    const step = n.losing ? 50 : n.gaining ? -50 : 0;
    const label = n.losing ? 'Daily deficit' : 'Daily surplus';
    const amount = Math.abs(n.deficit);
    const rec = Math.abs(n.recommended);
    const warn = {
      steep: `That’s more than 25% under maintenance. Cutting this hard usually costs muscle and energy, and can delay or skip your period. I recommend ${fmt(rec)} cal.`,
      below: `This puts you under your BMR of ${fmt(n.bmr || n.floor)} cal. Please don’t go this low without a nutritionist. I recommend ${fmt(rec)} cal.`,
      slow: `Gentle is fine. You’ll lose weight slowly, and it’s easier to keep up.`
    }[n.warn] || '';
    return `
      <div class="ob-calc${numbersSeen ? ' seen' : ''}">
        <div class="ob-calc-load" aria-hidden="${numbersSeen}">
          <div class="ob-calc-spin"></div>
          <p>Working out your numbers</p>
          <ul><li>Calculating your BMI</li><li>Finding your calories at rest</li><li>Adding your activity</li><li>Setting a safe daily target</li></ul>
        </div>
        <div class="ob-calc-out">
          <div class="ob-nums">${rows.map(x => `<div class="ob-num">
            <div class="ob-num-top"><span>${x.k}</span>${x.maint ? `<div class="eb-stepper">
                <button type="button" class="eb-step-btn" data-step="plan.maintenance" data-delta="-50" data-min="${n.floor}" data-max="4500" data-from="${n.tdee}" aria-label="Lower maintenance">−</button>
                <span class="eb-step-val" aria-live="polite"><b>${x.v}</b> cal</span>
                <button type="button" class="eb-step-btn" data-step="plan.maintenance" data-delta="50" data-min="${n.floor}" data-max="4500" data-from="${n.tdee}" aria-label="Raise maintenance">+</button>
              </div>` : `<b>${x.v}${x.tag ? ` <em class="ob-num-tag ${x.tag}">${BMI_WORDS[x.tag]}</em>` : ''}</b>`}</div>
            <p>${x.d}</p></div>`).join('')}</div>
          ${step ? `<div class="ob-num ob-num-deficit">
            <div class="ob-num-top"><span>${label}</span>
              <div class="eb-stepper">
                <button type="button" class="eb-step-btn" data-step="plan.deficit" data-delta="${-step}" data-min="${n.losing ? 0 : -500}" data-max="${n.losing ? Math.max(0, n.tdee - 1200) : 0}" data-from="${n.deficit}" aria-label="Less">−</button>
                <span class="eb-step-val" aria-live="polite"><b>${fmt(amount)}</b> cal</span>
                <button type="button" class="eb-step-btn" data-step="plan.deficit" data-delta="${step}" data-min="${n.losing ? 0 : -500}" data-max="${n.losing ? Math.max(0, n.tdee - 1200) : 0}" data-from="${n.deficit}" aria-label="More">+</button>
              </div></div>
            <p>${amount === rec ? 'Recommended for you: about 20% under maintenance, never below your BMR.' : `Recommended: ${fmt(rec)} cal.`}
              ${amount !== rec ? `<button type="button" class="eb-link" data-action="recDeficit">Use ${fmt(rec)}</button>` : ''}</p>
            ${warn ? `<p class="ob-num-warn ${n.warn}">${warn}</p>` : ''}
          </div>` : ''}
          <div class="ob-num-result">
            <span>Your daily target</span><b>${fmt(n.target)} cal</b>
            <p>${n.perWeekKg ? `About ${w(Math.abs(n.perWeekKg))} ${n.losing ? 'lost' : 'gained'} a week${n.weeks ? `, reaching ${w(n.goalKg)} around ${done}` : ''}. ` : 'Your weight should stay steady. '}
            ${p.cycle.tracks === false ? '' : 'On PMS days I add about 150 cal, because your body burns a little more before your period.'}</p>
          </div>
          <p class="eb-privacy">An estimate to start from, not medical advice. It updates as you log your weight.</p>
        </div>
      </div>`;
  }

  // ── Steps ──
  // Question steps edit the draft. `info` steps are content screens between
  // questions (no answers, not shown on the review or profile pages).
  const firstName = p => (p.name || '').trim().split(/\s+/)[0];
  const pmsExtra = () => { try { return PMS_TARGETS.cal - TARGETS.cal; } catch { return 150; } };
  const phaseColor = k => { try { return PHASE_META[k].color; } catch { return 'var(--accent)'; } };

  // Example foods for the cycle screen, matched to what the person eats.
  const ironFoods = p => ({
    vegan: 'palak, rajma, tofu and dates', veg: 'palak, rajma, chana and dates', jain: 'chana, moong, sesame and dates',
    egg: 'eggs, palak, rajma and dates', pescatarian: 'fish, eggs, palak and rajma', nonveg: 'chicken, eggs, palak and rajma'
  })[p.food.diet] || 'palak, rajma and dates';
  const proteinFoods = p => ({
    vegan: 'tofu, soya and dal', veg: 'paneer, curd and dal', jain: 'paneer, curd and moong',
    egg: 'eggs, paneer and dal', pescatarian: 'fish, eggs and paneer', nonveg: 'chicken, eggs and paneer'
  })[p.food.diet] || 'paneer, eggs and dal';

  // Height is asked in feet and inches and kept in cm (for BMI and calories).
  function toFtIn(cm) {
    const t = Math.round((+cm || 0) / 2.54); if (!t) return { ft: '', inch: '' };
    return { ft: Math.floor(t / 12), inch: t % 12 };
  }

  // Under "How do you want to track food?": what that choice needs.
  function trackSection(p) {
    if (p.trackMode === 'plan') return `
      ${field('How do you eat?', chips('food.diet', DIETS, p.food.diet))}
      ${field('Food you enjoy', chips('food.cuisines', CUISINES, p.food.cuisines, { multi: true }), 'eb-field-gap')}
      ${field('What do you eat on a usual day?', `<p class="eb-field-note">Your meal plan is built around these.</p><div class="eb-textarea-wrap">
        <textarea class="eb-input eb-textarea ob-usual" data-path="food.usual" rows="5" placeholder="e.g. poha and chai for breakfast, dal rice and sabzi for lunch, makhana in the evening, paneer and roti at night">${esc(p.food.usual)}</textarea>
        <button type="button" class="eb-mic" data-dictate aria-label="Dictate" aria-pressed="false">${ICONS.mic}</button></div>`)}`;
    if (p.trackMode === 'log') return `<ul class="ob-how">
      <li><span class="ob-how-ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></span><span><b>Search any food</b>Type what you ate, like “2 roti” or “1 katori dal”, and add it.</span></li>
      <li><span class="ob-how-ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2M8 8v8M11 8v8M14 8v8M17 8v8"/></svg></span><span><b>Scan a pack</b>Point the camera at the barcode and the nutrition comes up.</span></li>
      <li><span class="ob-how-ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/></svg></span><span><b>Read a label</b>No barcode? Photograph the nutrition label instead.</span></li></ul>`;
    const t = window.EBPlanner && EBPlanner.targetsFor ? EBPlanner.targetsFor(p) : null, n = window.EBPlanner && EBPlanner.numbers(p);
    if (!t || !n) return '<p class="eb-hint">Add your weight and height first to see your targets.</p>';
    const step = n.losing ? 50 : n.gaining ? -50 : 0;
    return `<div class="ob-targets"><p class="ob-targets-big"><b>${fmt(t.normal.cal)}</b> cal a day</p>
      <p class="ob-targets-sub">${t.normal.p} g protein · ${t.normal.c} g carbs · ${t.normal.f} g fat. PMS days get about ${fmt(t.pms.cal - t.normal.cal)} more.</p>
      ${step ? `<div class="ob-targets-adj"><span>${n.losing ? 'Daily deficit' : 'Daily surplus'}</span><div class="eb-stepper">
        <button type="button" class="eb-step-btn" data-step="plan.deficit" data-delta="${-step}" data-min="${n.losing ? 0 : -500}" data-max="${n.losing ? Math.max(0, n.tdee - 1200) : 0}" data-from="${n.deficit}" aria-label="Less">−</button>
        <span class="eb-step-val"><b>${fmt(Math.abs(n.deficit))}</b> cal</span>
        <button type="button" class="eb-step-btn" data-step="plan.deficit" data-delta="${step}" data-min="${n.losing ? 0 : -500}" data-max="${n.losing ? Math.max(0, n.tdee - 1200) : 0}" data-from="${n.deficit}" aria-label="More">+</button></div></div>` : ''}
      <p class="eb-field-note">You’ll see a target for each meal. Tick a meal when you’ve had it.</p></div>`;
  }

  // "Why Menu-fi": three steps, each with a small animated icon.
  function whyCarousel() {
    const steps = [
      { ico: `<svg viewBox="0 0 48 48" width="44" height="44"><g class="why-ring"><circle cx="24" cy="24" r="17" fill="none" stroke="#ef5350" stroke-width="5" stroke-dasharray="19 88" stroke-linecap="round"/><circle cx="24" cy="24" r="17" fill="none" stroke="#42a5f5" stroke-width="5" stroke-dasharray="25 82" stroke-dashoffset="-24" stroke-linecap="round"/><circle cx="24" cy="24" r="17" fill="none" stroke="#43a047" stroke-width="5" stroke-dasharray="10 97" stroke-dashoffset="-53" stroke-linecap="round"/><circle cx="24" cy="24" r="17" fill="none" stroke="#ffd600" stroke-width="5" stroke-dasharray="36 71" stroke-dashoffset="-67" stroke-linecap="round"/></g></svg>`,
        t: 'Your body changes every month', d: 'Energy, hunger, mood and cravings shift through your cycle, sometimes within days.' },
      { ico: `<svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="12" width="30" height="27" rx="4"/><path d="M9 20h30M17 8v7M31 8v7"/><path class="why-tick" d="M18 29l4 4 8-8"/></svg>`,
        t: 'Life doesn’t pause for it', d: 'Work, stress and busy days keep going. Month after month, it helps to have someone guiding you.' },
      { ico: `<svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path class="why-spark" d="M24 6v6M24 36v6M6 24h6M36 24h6M11.5 11.5l4 4M32.5 32.5l4 4M36.5 11.5l-4 4M15.5 32.5l-4 4"/><circle cx="24" cy="24" r="6"/></svg>`,
        t: 'Menu-fi plans around your phase', d: 'We track your cycle and suggest meals and workouts that suit the phase you’re in. That’s why we ask about your cycle next.' }
    ];
    return `<ol class="ob-why">${steps.map((x, i) => `<li style="--i:${i}"><span class="ob-why-ico">${x.ico}</span><span><b>${x.t}</b><span>${x.d}</span></span></li>`).join('')}</ol>`;
  }

  // Cycle: every period date entered (newest = last period), length worked out from the gaps.
  function cycleDates(p) {
    return [...new Set([...(p.cycle._extra || []), p.cycle.lastStart].filter(Boolean))].sort();
  }
  function cycleGaps(all) {
    return all.slice(1).map((d, i) => Math.round((new Date(d) - new Date(all[i])) / 86400000)).filter(g => g >= 15 && g <= 60).slice(-6);
  }
  function syncCycle(p) {
    const all = cycleDates(p);
    p.cycle.lastStart = all[all.length - 1] || '';
    p.cycle._extra = all.slice(0, -1);
    p.cycle.history = all;
    const gaps = cycleGaps(all);
    if (gaps.length && !p.cycle.lengthSet) p.cycle.cycleLength = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    p.cycle.claimedLength = +p.cycle.cycleLength || 28;
  }
  function cycleView(p) {
    const all = cycleDates(p), gaps = cycleGaps(all), extra = all.slice(0, -1).reverse();
    const varies = ['irregular', 'pcos', 'thyroid', 'unsure'].includes(p.cycle.condition);
    const short = d => EB.fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' });
    return `
      ${field('Is your cycle regular?', chips('cycle.condition', CYCLE_TYPES, p.cycle.condition))}
      ${varies ? `<p class="ob-note">Cycles like yours vary, so dates start as estimates and get more accurate with every period you log.</p>` : ''}
      ${field('First day of your last period', datePicker('cycle.lastStart', p.cycle.lastStart), 'eb-field-gap')}
      ${extra.length ? `<ul class="ob-dates">${extra.map(d => `<li><span>${short(d)}</span><button type="button" class="eb-icon-btn" data-action="removePeriod" data-d="${d}" aria-label="Remove ${short(d)}">✕</button></li>`).join('')}</ul>` : ''}
      ${p.cycle.lastStart ? `<button type="button" class="eb-link ob-add-date" data-action="addPeriod">+ Add an earlier period</button>` : ''}
      ${field('How many days does your period last?', stepper('cycle.periodLength', p.cycle.periodLength, 1, 12, 'days'), 'eb-field-gap')}
      ${gaps.length
        ? field('Your cycle length', `${stepper('cycle.cycleLength', p.cycle.cycleLength, 15, 60, 'days')}<p class="ob-note">${p.cycle.lengthSet ? 'Set by you.' : `Worked out from your ${all.length} dates.`} Change it if you know it’s different.</p>`, 'eb-field-gap')
        : field('How long is your cycle?', `${stepper('cycle.cycleLength', p.cycle.cycleLength, 15, 60, 'days')}<p class="ob-note">Not sure? Leave it at 28. Add earlier periods above, or log 3 periods in the app, and we’ll work out your real length.</p>`, 'eb-field-gap')}`;
  }

  const STEPS = [
    {
      id: 'name', short: 'Name', title: 'First, what should we call you?', optional: true, profile: false,
      render: p => `<input class="eb-input eb-input-lg" data-path="name" value="${esc(p.name)}" placeholder="Your first name" autocomplete="given-name" aria-label="Your name" enterkeyhint="next">`,
      valid: () => true,
      touched: p => !!p.name.trim(),
      summary: p => p.name
    },
    {
      // Everyone (test and public): what's recorded, why, and what never is.
      id: 'tester', info: true, profile: false, cta: 'Got it',
      footLink: { label: 'Not now', action: 'declineStats' },
      eyebrow: 'Before you start',
      title: p => firstName(p) ? `Thanks for trying Menu-fi, ${esc(firstName(p))}` : 'Thanks for trying Menu-fi',
      render: () => `
        <p class="ob-lead">Menu-fi is new and still growing. While you use it, the app records <b>which features you use</b>, like opening Nutrition, logging a meal or scanning a barcode, and links that to the email you sign in with. It also records <b>screen replays with every word hidden</b>, so I can see where you tap and scroll, not what’s on the screen.</p>
        <p class="ob-tester-sub">Why I’m asking, and how it helps</p>
        <ul class="ob-how">
          <li><span class="ob-how-ico">1</span><span><b>See what really gets used</b>The feedback form tells me what you think. This shows what you actually did. Together they show where Menu-fi helps and where it gets in the way.</span></li>
          <li><span class="ob-how-ico">2</span><span><b>Follow up with you</b>If something looks confusing, say you never opened Guide or stopped logging after day two, I can ask you about it directly.</span></li>
          <li><span class="ob-how-ico">3</span><span><b>Fix the right things first</b>I’m building Menu-fi myself, so this tells me what to fix before more women use it.</span></li>
        </ul>
        <div class="ob-never"><b>Never recorded</b><span>Your period dates, symptoms, weight, what you eat, or anything from Apple Health. Replays blank out all text, numbers and photos, and anything you type.</span></div>
        <p class="eb-privacy">It’s your choice. You can turn this on or off any time in Account, and ask me to delete what was recorded.</p>`,
      onNext: () => { try { window.EBAnalytics && EBAnalytics.acceptTesterNotice && EBAnalytics.acceptTesterNotice(); } catch {} }
    },
    {
      // Pick a goal → the other options fold away and the weights appear here.
      id: 'goal', short: 'Main Goal', title: p => firstName(p) ? `What’s your main goal, ${esc(firstName(p))}?` : 'What’s your main goal?',
      render: p => {
        if (!p.goal) return rows('goal', GOALS, p.goal);
        const maintain = p.goal === 'maintain';
        return `<div class="ob-picked"><span>${esc(label(GOALS, p.goal))}</span><button type="button" class="eb-link" data-action="goalChange">Change</button></div>
          ${segmented('weight.unit', [{ v: 'kg', t: 'kg' }, { v: 'lb', t: 'lb' }], p.weight.unit)}
          <div class="eb-pair">
            ${field('Current weight', `<div class="eb-num"><input class="eb-input" data-path="weight.current" inputmode="decimal" placeholder="0" value="${esc(p.weight.current)}" aria-label="Current weight"><span>${p.weight.unit}</span></div>`)}
            ${maintain ? '' : field('Goal weight', `<div class="eb-num"><input class="eb-input" data-path="weight.goal" inputmode="decimal" placeholder="0" value="${esc(p.weight.goal)}" aria-label="Goal weight"><span>${p.weight.unit}</span></div>`)}
          </div>
          ${maintain ? '' : `<p class="eb-hint" data-live="weightHint">${weightHint(p)}</p>`}
          ${maintain ? field('Anything else you’d like help with?', checkRows('goals', EXTRA_GOALS, p.goals), 'eb-field-gap') : ''}`;
      },
      live: { weightHint },
      onChange: p => { if (p.goal === 'maintain') p.weight.goal = p.weight.current; },
      valid: p => !!p.goal && weightValid(p),
      summary: p => [label(GOALS, p.goal), p.weight.current && `${p.weight.current}${p.goal === 'maintain' ? '' : ` → ${p.weight.goal || '—'}`} ${p.weight.unit}`].filter(Boolean).join(' · ')
    },
    {
      id: 'weight', short: 'Body', title: 'About you',
      render: p => { const h = toFtIn(p.body.height); return `
        <p class="eb-field-note">Used to work out your BMI and how many calories your body needs.</p>
        ${field('Height', `<div class="eb-pair">
          <div class="eb-num"><input class="eb-input" data-ftin="ft" inputmode="numeric" placeholder="5" value="${h.ft}" aria-label="Height, feet"><span>ft</span></div>
          <div class="eb-num"><input class="eb-input" data-ftin="in" inputmode="numeric" placeholder="4" value="${h.inch}" aria-label="Height, inches"><span>in</span></div></div>`)}
        ${field('Age', `<div class="eb-num"><input class="eb-input" data-path="body.age" inputmode="numeric" placeholder="0" value="${esc(p.body.age)}" aria-label="Age in years"><span>yrs</span></div>`)}`; },
      valid: p => bodyValid(p),
      summary: p => [p.body.height && (() => { const h = toFtIn(p.body.height); return `${h.ft}′${h.inch}″`; })(), p.body.age && `${p.body.age} yrs`].filter(Boolean).join(' · ')
    },
    {
      // Options as rows; the section under them changes with the choice.
      id: 'track', short: 'Tracking', profile: false, title: 'How do you want to track food?',
      render: p => `${rows('trackMode', TRACK_MODES, p.trackMode)}
        ${p.trackMode ? `<div class="ob-section">${trackSection(p)}</div>` : ''}
        ${p.trackMode ? `<div class="ob-section">${field('Have a diet plan? <span class="eb-label-note">PDF, Excel or photo</span>', fileBlock(p))}</div>` : ''}`,
      valid: p => !!p.trackMode && (p.trackMode !== 'plan' || !!p.food.diet),
      summary: p => [label(TRACK_MODES, p.trackMode), p.food.diet && label(DIETS, p.food.diet)].filter(Boolean).join(' · ')
    },
    {
      id: 'why', info: true, eyebrow: 'Why Menu-fi', title: 'Made for a body that changes every month',
      render: () => whyCarousel()
    },
    {
      id: 'cycle', short: 'Cycle', title: 'Tell us a little about your cycle',
      render: p => cycleView(p),
      onChange: p => { p.cycle.tracks = true; p.cycle.regular = p.cycle.condition === 'regular' ? 'yes' : p.cycle.condition ? 'no' : ''; syncCycle(p); },
      valid: p => !!p.cycle.condition && !!p.cycle.lastStart,
      summary: p => p.cycle.lastStart ? [label(CYCLE_TYPES, p.cycle.condition), `${p.cycle.cycleLength}-day cycle`, `${p.cycle.periodLength}-day period`].filter(Boolean).join(' · ') : ''
    },
    {
      id: 'symptoms', short: 'Symptoms', title: 'What do you usually feel around your period?', optional: true,
      render: p => `
        ${chips('cycle.symptoms', SYMPTOMS, p.cycle.symptoms, { multi: true })}
        ${field('When does PMS usually start?', chips('cycle.pmsStart', PMS_START, p.cycle.pmsStart), 'eb-field-gap')}`,
      valid: () => true,
      touched: p => !!(p.cycle.pmsStart || p.cycle.symptoms.length),
      summary: p => [labels(SYMPTOMS, p.cycle.symptoms), p.cycle.pmsStart && `PMS ${label(PMS_START, p.cycle.pmsStart).toLowerCase()}`].filter(Boolean).join(' · ')
    },
    {
      // Required: tracking lives in the account, not on the phone.
      id: 'account', short: 'Account', profile: false,
      when: () => !!(window.EBSync && EBSync.enabled()),
      title: 'Save everything to your email',
      render: () => `<p class="ob-lead">Your plan, meals and cycle are saved to your account, so nothing is lost if you change phones. Menu-fi needs an account to track.</p>
        ${EBSync.signedIn() ? `<p class="ob-done-line">${ICONS.check}<span>Saved to ${esc(EBSync.email())}</span></p>`
          : `<button type="button" class="eb-btn secondary" data-action="signIn">Continue with email</button>`}
        <p class="eb-privacy">Private to you. We never share it.</p>`,
      valid: () => !!(window.EBSync && EBSync.signedIn()),
      summary: () => window.EBSync && EBSync.signedIn() ? EBSync.email() : ''
    },
    {
      id: 'activity', short: 'Activity', eyebrow: 'Fitness', title: 'How active are you?',
      render: p => `
        ${rows('activity.level', LEVELS, p.activity.level)}
        ${field('What do you do?', chips('activity.types', ACT_TYPES, p.activity.types, { multi: true }), 'eb-field-gap')}
        ${(p.activity.types || []).includes('other') ? `<input class="eb-input" data-path="activity.other" value="${esc(p.activity.other)}" placeholder="What else do you do?" aria-label="Other activity">` : ''}
        ${field('Would you like to be more active?', segmented('activity.wantMore', MORE_ACTIVE, p.activity.wantMore), 'eb-field-gap')}`,
      valid: p => !!p.activity.level,
      summary: p => [label(LEVELS, p.activity.level), labels(ACT_TYPES.filter(a => a.v !== 'other'), p.activity.types), p.activity.other].filter(Boolean).join(' · ')
    },
    {
      id: 'appleHealth', short: 'Apple Health', profile: false, optional: true, skipLabel: 'Not now',
      when: () => !!(window.EBHealth && EBHealth.native),
      title: 'Connect Apple Health',
      render: p => `<p class="ob-lead">Your weight, periods, workouts and daily steps come in by themselves, so there’s less to type. Meals you log go back to Health.</p>
        ${EBHealth.isConnected() ? `<p class="eb-hint">${ICONS.check} Connected</p>`
          : `<button type="button" class="eb-btn secondary" data-action="connectHealth">Connect Apple Health</button>`}`,
      valid: () => true,
      touched: () => !!(window.EBHealth && EBHealth.isConnected()),
      summary: () => window.EBHealth && EBHealth.isConnected() ? 'Connected' : ''
    },
    {
      id: 'numbers', short: 'Calories', title: 'Your numbers, explained',
      render: p => numbersView(p),
      onShow: () => { if (!numbersSeen) setTimeout(() => { numbersSeen = true; }, 2600); },
      valid: () => true,
      summary: p => { const n = window.EBPlanner && EBPlanner.numbers(p);
        return n ? `${fmt(n.target)} cal a day${n.deficit > 0 ? ` · ${fmt(n.deficit)} deficit` : n.deficit < 0 ? ` · ${fmt(-n.deficit)} surplus` : ''}` : ''; }
    },
    {
      id: 'food', short: 'Food', title: 'How do you eat?', ob: false,
      render: p => p.trackMode === 'guide' ? chips('food.diet', DIETS, p.food.diet) : `
        ${chips('food.diet', DIETS, p.food.diet)}
        ${field('What do you usually eat?', chips('food.cuisines', CUISINES, p.food.cuisines, { multi: true }), 'eb-field-gap')}
        ${field('What do you eat on a usual day?', `<p class="eb-field-note">This lets me build your meal plan around food you already like.</p>${textarea('food.usual', p.food.usual, 'e.g. poha and chai, dal-roti-sabzi, fruit, paneer and rice')}`)}
        ${field('Have a diet plan? <span class="eb-label-note">PDF, Excel or photo</span>', fileBlock(p))}`,
      valid: p => !!p.food.diet,
      summary: p => [label(DIETS, p.food.diet), labels(CUISINES, p.food.cuisines),
        p.food.files.length ? `${p.food.files.length} plan${p.food.files.length > 1 ? 's' : ''} uploaded` : '']
        .filter(Boolean).join(' · ')
    },
    {
      id: 'goals', short: 'Other Goals', later: true, title: 'Anything else you’d like help with?', optional: true, skipLabel: 'No other goals',
      render: p => checkRows('goals', EXTRA_GOALS, p.goals),
      valid: () => true,
      touched: p => p.goals.length > 0,
      summary: p => labels(EXTRA_GOALS, p.goals)
    },
    {
      id: 'nutritionist', later: true, short: 'Nutritionist', title: 'Do you see a nutritionist?', optional: true,
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
      id: 'sleep', later: true, short: 'Sleep', title: 'How do you sleep?', optional: true,
      render: p => `
        ${field('Hours a night', chips('sleep.hours', SLEEP_HOURS, p.sleep.hours))}
        ${field('Same bedtime most nights?', segmented('sleep.regular', SLEEP_REG, p.sleep.regular))}`,
      valid: () => true,
      touched: p => !!(p.sleep.hours || p.sleep.regular),
      summary: p => [label(SLEEP_HOURS, p.sleep.hours), p.sleep.regular && `Regular: ${label(SLEEP_REG, p.sleep.regular)}`]
        .filter(Boolean).join(' · ')
    },
    {
      id: 'health', later: true, short: 'Health', title: 'Any health conditions?', optional: true,
      render: p => `
        ${chips('health.conditions', CONDITIONS, p.health.conditions, { multi: true })}
        ${field('Medicines or supplements', textarea('health.meds', p.health.meds, 'e.g. thyroxine 50mcg, vitamin D, iron'), 'eb-field-gap')}
        <p class="eb-privacy">Used only to tailor suggestions. Stays on this device unless you turn on backup.</p>`,
      valid: () => true,
      touched: p => !!(p.health.conditions.length || p.health.meds.trim()),
      summary: p => [labels(CONDITIONS, p.health.conditions), p.health.meds.trim()].filter(Boolean).join(' · ')
    },
    {
      id: 'coach', later: true, short: 'Coach Style', title: 'How should I talk to you?', optional: true,
      render: p => cards('coach', COACHES, p.coach),
      valid: () => true,
      touched: p => !!p.coach,
      summary: p => label(COACHES, p.coach)
    },
    {
      id: 'reminders', later: true, short: 'Reminders', title: 'When should we remind you?', optional: true, skipLabel: 'Set up later',
      render: p => `
        ${checkRows('reminders', REMINDERS.filter(r => r.v !== 'pms' || p.cycle.tracks !== false), p.reminders)}
        ${window.EBHealth && EBHealth.native ? '' : '<p class="eb-privacy">Reminders arrive through the iPhone app.</p>'}`,
      valid: () => true,
      touched: p => p.reminders.length > 0,
      summary: p => labels(REMINDERS, p.reminders)
    }
  ];
  const titleOf = (step, p) => titleCase(typeof step.title === 'function' ? step.title(p) : step.title);

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
      const dp = e.target.closest('[data-date-open]');
      if (dp) {
        const path = dp.dataset.dateOpen;
        return openCalendar(getAt(p, path), v => { setAt(p, path, v); changed(true); });
      }
      const st = e.target.closest('[data-step]');
      if (st) {
        const path = st.dataset.step;
        const cur = st.dataset.from != null ? +st.dataset.from : (+getAt(p, path) || 0);
        const n = Math.min(+st.dataset.max, Math.max(+st.dataset.min, cur + +st.dataset.delta));
        setAt(p, path, n);
        if (path === 'cycle.cycleLength') p.cycle.lengthSet = true;
        return changed(true);
      }
      const act = e.target.closest('[data-action]');
      if (act && act.dataset.action === 'recDeficit') { p.plan.deficit = null; return changed(true); }
      if (act && act.dataset.action === 'calcMaint') { p.plan.maintenance = null; return changed(true); }
      if (act && act.dataset.action === 'noPeriods') { p.cycle.tracks = false; onNoPeriods && onNoPeriods(); }
      if (act && act.dataset.action === 'connectHealth') {
        EBHealth.connect()
          .then(() => {
            if (!p.trackers.includes('apple')) p.trackers = p.trackers.filter(t => t !== 'none').concat('apple');
            // Fill blanks in this draft with what Health just synced.
            const synced = EB.getProfile();
            if (!p.weight.current && synced.weight.current) { p.weight.current = synced.weight.current; p.weight.unit = p.weight._unit = synced.weight.unit; }
            if (!p.cycle.lastStart && synced.cycle.lastStart) Object.assign(p.cycle, { lastStart: synced.cycle.lastStart, cycleLength: synced.cycle.cycleLength, tracks: true });
            changed(true);
          })
          .catch(e => EB.toast(e && e.message === 'unavailable' ? 'Apple Health isn’t available on this device' : 'Apple Health: ' + ((e && e.message) || e)));
      }
      if (act && act.dataset.action === 'signIn' && window.EBSync) {
        // Keep her answers if signing in reloads the app.
        try { const keep = JSON.parse(JSON.stringify(p)); delete keep.weight._unit; delete keep.cycle._extra; EB.saveProfile(keep, { sync: false }); } catch {}
        EBSync.openSignIn(() => changed(true));
      }
      if (act && act.dataset.action === 'goalChange') { p.goal = ''; return changed(true); }
      if (act && act.dataset.action === 'addPeriod') return openCalendar(null, v => { p.cycle._extra = (p.cycle._extra || []).concat(v); changed(true); });
      if (act && act.dataset.action === 'removePeriod') { p.cycle._extra = (p.cycle._extra || []).filter(d => d !== act.dataset.d); return changed(true); }
      if (act && act.dataset.action === 'removeFile') {
        const id = act.dataset.id;
        p.food.files = p.food.files.filter(f => f.id !== id);
        EB.deleteFile(id);
        changed(true);
      }
    });
    root.addEventListener('input', (e) => {
      const el = e.target;
      if (el.dataset.ftin) {
        const box = el.closest('.eb-pair'), ft = +(box.querySelector('[data-ftin="ft"]').value) || 0, inch = +(box.querySelector('[data-ftin="in"]').value) || 0;
        p.body.height = ft || inch ? String(Math.round((ft * 12 + inch) * 2.54)) : '';
        return changed(false);
      }
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
  const visible = () => STEPS.filter(s => !s.later && s.ob !== false && (!s.when || s.when(draft)));

  function open() {
    if (!EB.getProfile().completedAt) window.EBAnalytics && EBAnalytics.track('onboarding_started');
    draft = EB.getProfile();
    draft.weight._unit = draft.weight.unit;
    draft.cycle._extra = (draft.cycle.history || []).filter(d => d && d !== draft.cycle.lastStart);
    // Redoing onboarding starts from how she tracks today; a first run asks.
    if (!draft.trackMode && draft.completedAt && window.EBDayMode) draft.trackMode = EBDayMode.currentMode();
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
  function themeBtn() { return '<span class="eb-icon-btn" aria-hidden="true"></span>'; }
  function themeBtnOld() {
    const light = document.documentElement.dataset.theme === 'light';
    return `<button type="button" class="eb-icon-btn" data-ob="theme" aria-label="Switch to ${light ? 'dark' : 'light'} mode">${light ? ICONS.moon : ICONS.sun}</button>`;
  }

  // Menu-fi mark: three drops meeting in the middle — Me, Nu, Fi.
  const LOGO = `<svg class="ob-logo" viewBox="-40 -40 80 80" aria-hidden="true"><g class="ob-logo-spin">
    ${[0, 120, 240].map((r, i) => `<path class="ob-petal" style="--r:${r}deg;--i:${i}" d="M0 1C-13 -10 -14 -33 0 -34C14 -33 13 -10 0 1Z"/>`).join('')}
  </g></svg>`;

  // Splash → welcome: the mark springs in and turns (2s), the name rises,
  // then the tagline (1s later), then the buttons.
  function renderWelcome() {
    el.classList.add('ob-splash');
    el.innerHTML = `
      <div class="ob-splash-mark">
        ${LOGO}
        <p class="ob-splash-name">Menu-fi</p>
        <p class="ob-splash-meaning"><span style="--i:0"><b>Me</b>nstruation</span><span style="--i:1"><b>Nu</b>trition</span><span style="--i:2"><b>Fi</b>tness</span></p>
      </div>
      <div class="ob-body ob-welcome">
        <h1 class="ob-title ob-splash-tag" id="obTitle">Built for the busy ladies trying to stay fit through it all.</h1>
      </div>
      <div class="ob-foot ob-splash-cta">
        <button type="button" class="eb-btn primary" data-ob="start">Get started</button>
      </div>`;
    el.onclick = (e) => {
      const a = e.target.closest('[data-ob]'); if (!a) return;
      if (a.dataset.ob === 'theme') { EB.toggleTheme(); renderWelcome(); }
      if (a.dataset.ob === 'start') { idx = 0; renderStep(); }
      if (a.dataset.ob === 'voice') startVoice();
      // For building and testing: fill the app with sample data and skip onboarding.
      if (a.dataset.ob === 'dummy' && window.EBApp) { close(); EBApp.seedDummy(); }
    };
  }

  function renderStep() {
    el.classList.remove('ob-splash');
    const steps = visible();
    if (idx >= steps.length) return renderReview();
    const step = steps[idx];
    const pct = Math.round((idx / steps.length) * 100);
    el.innerHTML = `
      <div class="ob-top">
        <button type="button" class="eb-icon-btn" data-ob="back" aria-label="Back">${ICONS.back}</button>
        <div class="ob-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${idx}" aria-label="Step ${idx + 1} of ${steps.length}"><span style="width:${Math.max(pct, 4)}%"></span></div>
        ${EB.getProfile().completedAt ? themeBtn() : '<button type="button" class="ob-skip" data-ob="skip">Skip</button>'}
      </div>
      <div class="ob-body${step.info ? ' ob-content' : ''}">
        ${step.eyebrow ? `<p class="ob-eyebrow">${step.eyebrow}</p>` : ''}
        <h1 class="ob-title" id="obTitle" tabindex="-1">${titleOf(step, draft)}</h1>
        <div class="ob-fields">${step.render(draft)}</div>
      </div>
      <div class="ob-foot">
        <button type="button" class="eb-btn" data-ob="next"></button>
        ${step.footLink ? `<button type="button" class="eb-link center" data-ob="footLink">${step.footLink.label}</button>` : ''}
      </div>`;
    const fields = el.querySelector('.ob-fields');
    const refresh = () => updateNext(step);
    bindStep(fields, step, draft, {
      rerender: () => { fields.innerHTML = step.render(draft); bindAgain(); refresh(); },
      refresh,
      onNoPeriods: () => { idx = visible().indexOf(step) + 1; renderStep(); }
    });
    function bindAgain() { // re-attach dictation after repaint (delegated handlers survive)
      fields.querySelectorAll('[data-dictate]').forEach(btn => EB.attachDictation(btn, btn.parentElement.querySelector('textarea')));
    }
    refresh();
    step.onShow && step.onShow(draft);
    // Where people drop off in setup (step id only, never answers).
    if (!EB.getProfile().completedAt) { try { window.EBAnalytics && EBAnalytics.track('onboarding_step', { step: step.id }); } catch {} }
    const next = () => {
      const btn = el.querySelector('[data-ob="next"]');
      if (btn.disabled) return;
      step.onNext && step.onNext(draft);
      if (reviewReturn) return renderReview();
      idx++; renderStep();
    };
    el.onclick = (e) => {
      const a = e.target.closest('[data-ob]'); if (!a) return;
      if (a.dataset.ob === 'theme') { EB.toggleTheme(); a.outerHTML = themeBtn(); }
      if (a.dataset.ob === 'back') { if (reviewReturn) return renderReview(); idx--; idx < 0 ? renderWelcome() : renderStep(); }
      if (a.dataset.ob === 'next') next();
      if (a.dataset.ob === 'skip') { window.EBExplore && EBExplore.start(); close(); location.reload(); return; }
      if (a.dataset.ob === 'footLink' && step.footLink.action === 'declineStats') {
        try { window.EBAnalytics && EBAnalytics.setConsent(false); } catch {}
        idx++; return renderStep();
      }
      if (a.dataset.ob === 'footLink' && step.footLink.action === 'noPeriods') {
        draft.cycle.tracks = false;
        idx = visible().indexOf(step) + 1; renderStep();
      }
    };
    // Enter in a one-line field moves on (the name screen has nothing else).
    fields.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'date') { e.preventDefault(); next(); }
    });
    const first = step.id === 'name' && fields.querySelector('input');
    if (first) first.focus(); else el.querySelector('#obTitle').focus({ preventScroll: true });
    el.querySelector('.ob-body').scrollTop = 0;
  }
  // Optional + untouched → the one button reads "Skip" (or the step's own
  // wording, like "No other goals") instead of a separate skip link.
  function updateNext(step) {
    const btn = el.querySelector('[data-ob="next"]');
    if (step.info) { btn.textContent = step.cta || 'Continue'; btn.className = 'eb-btn primary'; btn.disabled = false; return; }
    const untouched = step.optional && !(step.touched ? step.touched(draft) : step.valid(draft));
    const ok = step.valid(draft);
    btn.textContent = reviewReturn ? 'Done' : untouched ? (step.skipLabel || 'Skip') : 'Continue';
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
        <h1 class="ob-title" id="obTitle" tabindex="-1">Look Right?</h1>
        <div class="eb-list">${steps.map((s, i) => {
          if (s.info) return '';
          const sum = s.summary(draft);
          return `<button type="button" class="eb-list-row" data-edit="${i}">
            <span class="eb-row-text"><span class="eb-list-label">${s.short}</span>
            <span class="eb-list-value${sum ? '' : ' muted'}">${esc(sum || 'Skipped')}</span></span>${ICONS.chevron}</button>`;
        }).join('')}</div>
      </div>
      <div class="ob-foot"><button type="button" class="eb-btn primary" data-ob="continue">Continue</button></div>`;
    el.onclick = (e) => {
      const ed = e.target.closest('[data-edit]');
      if (ed) { idx = +ed.dataset.edit; reviewReturn = true; return renderStep(); }
      const a = e.target.closest('[data-ob]'); if (!a) return;
      if (a.dataset.ob === 'theme') { EB.toggleTheme(); a.outerHTML = themeBtn(); }
      if (a.dataset.ob === 'back') { idx = steps.length - 1; renderStep(); }
      if (a.dataset.ob === 'continue') renderFinal();
    };
    el.querySelector('#obTitle').focus({ preventScroll: true });
  }

  // Next period: last start + cycle length, rolled forward past today.
  function nextPeriod(p) {
    if (p.cycle.tracks === false || !p.cycle.lastStart) return null;
    const [y, m, d] = p.cycle.lastStart.split('-').map(Number);
    const next = new Date(y, m - 1, d);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const len = +p.cycle.cycleLength || 28;
    do next.setDate(next.getDate() + len); while (next <= today);
    return next;
  }

  // "Last step": what the plan will actually do, in three lines.
  function renderFinal() {
    const name = firstName(draft);
    let target = '1,550', protein = 120;
    try { target = TARGETS.cal.toLocaleString(); protein = TARGETS.p; } catch {}
    const np = nextPeriod(draft);
    const how = { plan: 'A week of meals built for you. Tick each one as you eat it.',
      log: 'Search any food or scan a pack to log it.', guide: 'Targets for each meal. Nothing to log.' }[draft.trackMode];
    const items = [
      { icon: ICONS.check, t: `${target} calories and ${protein} g protein a day` },
      how && { icon: ICONS.check, t: how },
      np && { icon: ICONS.check, t: `Next period around ${np.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}. PMS meals switch on before it.` },
      draft.reminders.length
        ? { icon: ICONS.check, t: `Reminders: ${labels(REMINDERS, draft.reminders).replace(/(^|, )\w/g, m => m.toLowerCase()).replace(/\bpMS\b/g, 'PMS')}` }
        : null,
      draft.coach && { icon: ICONS.check, t: `Your coach: ${label(COACHES, draft.coach).toLowerCase()}` }
    ].filter(Boolean).slice(0, 3);
    el.innerHTML = `
      <div class="ob-top">
        <button type="button" class="eb-icon-btn" data-ob="back" aria-label="Back">${ICONS.back}</button>
        <span></span>${themeBtn()}
      </div>
      <div class="ob-body ob-final">
        <div class="ob-final-art" aria-hidden="true"><svg viewBox="0 0 80 80" width="88" height="88"><circle class="ob-final-ring" cx="40" cy="40" r="34" fill="none" stroke-width="6"/><path class="ob-final-tick" d="M26 41l9 9 19-20" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <h1 class="ob-title" id="obTitle" tabindex="-1">${name ? `Your Plan Is Ready, ${esc(name)}` : 'Your Plan Is Ready'}</h1>
        <ul class="ob-benefits">${items.map((i, k) => `<li style="--i:${k}">${i.icon}<span>${esc(i.t)}</span></li>`).join('')}</ul>
      </div>
      <div class="ob-foot"><button type="button" class="eb-btn primary" data-ob="finish">${draft.trackMode === 'plan' || !draft.trackMode ? 'Start my plan' : 'Start'}</button></div>`;
    el.onclick = (e) => {
      const a = e.target.closest('[data-ob]'); if (!a) return;
      if (a.dataset.ob === 'theme') { EB.toggleTheme(); a.outerHTML = themeBtn(); }
      if (a.dataset.ob === 'back') renderReview();
      if (a.dataset.ob === 'finish') finish();
    };
    el.querySelector('#obTitle').focus({ preventScroll: true });
  }

  function finish() {
    if (draft.cycle.lastStart || (draft.cycle._extra || []).length) syncCycle(draft);
    delete draft.weight._unit; delete draft.cycle._extra;
    draft.completedAt = draft.completedAt || new Date().toISOString();
    window.EBExplore && EBExplore.end();
    if (!EB.getProfile().completedAt) window.EBAnalytics && EBAnalytics.track('onboarding_completed', { plan_source: draft.planSource });
    EB.saveProfile(draft);                      // builds the plan (planner listens for eb:profile)
    // How she tracks food: from today, unless today already has food logged
    // (then from tomorrow, so nothing she logged is cleared).
    if (draft.trackMode && window.EBDayMode) {
      const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
      put('eb_lastDayMode', draft.trackMode);
      if (!EBDayMode.hasFood(todayStr())) put('dayMode_' + todayStr(), draft.trackMode);
      try { EBDayMode.refresh(); } catch {}
    }
    if (window.EBReminders) EBReminders.apply(draft);
    renderPreparing();
  }

  // Which of the foods typed on "What do you eat on a usual day?" the plan uses.
  function usualMatches(p) {
    const dishes = (window.EBPlanner && EBPlanner.DISHES) || [];
    const plan = window.EBPlanner && EBPlanner.current();
    const inPlan = new Set();
    if (plan) ['normal', 'pms'].forEach(m => Object.values(plan[m] || {}).forEach(day =>
      Object.values(day).forEach(meal => meal && inPlan.add(meal.name))));
    // Split into phrases, drop timing words ("for lunch", "at night", "a few times a week"),
    // then name the foods: dish keywords found in the text, and phrases with none.
    const FILLER = /\b(for|at|in|on|the|a|an|i|usually|mostly|sometimes|often|daily|every|day|days|night|morning|evening|afternoon|breakfast|lunch|dinner|snacks?|few|times?|week|weekends?|eat|have|like|some|bit|of)\b/gi;
    const phrases = (p.food.usual || '').toLowerCase().split(/\s*(?:,|;|\+|&|\/|\.|\bor\b|\band\b|\bwith\b|\n)\s*/i)
      .map(w => w.replace(FILLER, ' ').replace(/\s+/g, ' ').trim()).filter(w => w.length > 1);
    const used = new Set(), missing = [];
    phrases.forEach(w => {
      const keys = dishes.filter(d => inPlan.has(d.name)).flatMap(d => d.k).filter(k => new RegExp(`\\b${k}`, 'i').test(w));
      if (keys.length) keys.forEach(k => used.add(k)); else missing.push(w);
    });
    return { used: [...used], missing: [...new Set(missing)] };
  }

  // After the last step: a short loader while the week is put together,
  // then what the plan is built on, before landing on Home.
  function renderPreparing() {
    const p = draft;
    if (p.trackMode && p.trackMode !== 'plan') {
      el.classList.add('ob-leaving');
      return setTimeout(() => { close(); EB.toast('You’re all set'); }, 220);
    }
    const n = window.EBPlanner && EBPlanner.numbers(p);
    const plan = window.EBPlanner && EBPlanner.current();
    el.classList.remove('ob-splash');
    el.innerHTML = `
      <div class="ob-body ob-prep">
        <div class="ob-calc">
          <div class="ob-calc-load">
            <div class="ob-calc-spin"></div>
            <p>Preparing your meal chart</p>
            <ul><li>Reading the foods you usually eat</li><li>Fitting them to ${n ? fmt(n.target) : 'your'} cal a day</li>
              <li>Balancing protein, carbs and fibre</li>${p.cycle.tracks === false ? '' : '<li>Adjusting meals for each phase of your cycle</li>'}</ul>
          </div>
          <div class="ob-calc-out" id="obPrepOut"></div>
        </div>
      </div>
      <div class="ob-foot ob-prep-foot"><button type="button" class="eb-btn primary" data-ob="done">See my plan</button></div>`;
    const { used, missing } = usualMatches(p);
    const cap = w => w.charAt(0).toUpperCase() + w.slice(1);
    el.querySelector('#obPrepOut').innerHTML = `
      <h1 class="ob-title">Your meal chart is ready</h1>
      ${infoList([
        { n: 1, t: plan ? `7 days, 4 meals a day` : 'Using the starter plan',
          d: plan ? `${n ? fmt(n.target) + ' cal and ' + plan.targets.normal.p + ' g protein a day.' : ''} Portions are sized to hit your target.` : 'Add your weight and diet in Profile and I’ll build one around you.' },
        used.length && { n: 2, t: 'Built around food you like', d: used.map(cap).join(', ') + '.' },
        p.cycle.tracks !== false && { n: used.length ? 3 : 2, t: 'Changes with your cycle',
          d: 'Iron-rich meals on your period, more protein around ovulation, and warmer, comforting food with about 150 extra cal on PMS days.' },
        missing.length && { n: '+', t: 'Not in this week yet', d: missing.map(cap).join(', ') + '. Log them when you eat them and I’ll fit them in.' }
      ].filter(Boolean))}`;
    el.onclick = (e) => {
      if (!e.target.closest('[data-ob="done"]')) return;
      el.classList.add('ob-leaving');
      setTimeout(() => { close(); EB.toast('You’re all set'); }, 220);
    };
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
    { ask: 'First, what should I call you?', free: true,
      parse: (t, p) => { const n = t.trim().replace(/^(it'?s|i'?m|my name is|call me)\s+/i, '').split(/\s+/)[0];
        if (n && n.length > 1) { p.name = n.charAt(0).toUpperCase() + n.slice(1); return p.name; } } },
    { ask: 'What’s your main goal? Lose weight, maintain your weight, or build muscle?',
      parse: (t, p) => { const v = matchOne(t, GOALS); if (v) { p.goal = v; return label(GOALS, v); } } },
    { ask: 'Anything else you’d like help with? Like easing PMS, managing PCOS, more energy, or eating more protein. Or say no.',
      parse: (t, p) => { const v = matchMany(t, EXTRA_GOALS); if (v.length) { p.goals = v; return labels(EXTRA_GOALS, v); }
        if (/^\s*(no|nope|nothing|none)\b/i.test(t)) return 'no other goals'; } },
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
    { ask: 'What kind of food do you usually eat? Like North Indian, South Indian, continental, salads or Mexican.',
      parse: (t, p) => { const v = matchMany(t, CUISINES); if (v.length) { p.food.cuisines = v; return labels(CUISINES, v); } } },
    { ask: 'What do you eat on a usual day? This helps me build your meal plan.', free: true,
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
    { ask: 'Do you take any medicines or supplements?', free: true,
      parse: (t, p) => { if (/^\s*(no|none|nothing|nope)\b/i.test(t)) return 'none'; if (t.trim()) { p.health.meds = t.trim(); return 'noted'; } } },
    { ask: 'How should I talk to you? Cheerleader, gentle and kind, straight talker, or mindful guide?',
      parse: (t, p) => { const v = matchOne(t, COACHES); if (v) { p.coach = v; return label(COACHES, v); } } },
    { ask: 'Last one. Want reminders? Morning meals, before meals, evening log, or a PMS heads-up. Or say later.',
      parse: (t, p) => { if (/\b(later|no|none|nope)\b/i.test(t)) return 'later';
        const v = matchMany(t, REMINDERS); if (v.length) { p.reminders = v; return labels(REMINDERS, v); } } }
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
  window.EBOnboarding = { open, STEPS, titleOf, bindStep, openCalendar, DIETS, CUISINES, isDone: () => !!EB.getProfile().completedAt };

  function boot() { if (!EBOnboarding.isDone() && !(window.EBExplore && EBExplore.isOn())) open(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
