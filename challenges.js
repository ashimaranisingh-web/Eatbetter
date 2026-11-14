// ── Challenges ────────────────────────────────────────────────────────
// Progressive habit challenges (10 push-ups today, 20 tomorrow…) with a
// daily reminder, like a "drink water" nudge. Everything lives on the phone
// in one key, eb_challenges. In the iOS app the phone itself delivers the
// reminders (Capacitor LocalNotifications), so there is no server.
//
// The day maths is plain functions (core) so it can be tested in Node:
//   node scripts/test-challenges.mjs
(function () {
  // ── Core: pure day logic ──
  const addDays = (ds, n) => { const d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const weekday = ds => new Date(ds + 'T00:00:00Z').getUTCDay();          // 0 = Sunday
  const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);

  // Rule: start at X, add Y a day, stop growing at the max, for N days. Or a typed list.
  function targets(ch) {
    const p = ch.plan || {};
    if (p.type === 'custom') return (p.list || []).map(Number).filter(n => n > 0);
    const days = Math.max(1, Math.min(365, +p.days || 30));
    const out = [];
    for (let i = 0; i < days; i++) {
      let t = (+p.start || 1) + (+p.step || 0) * i;
      if (+p.max > 0) t = Math.min(t, +p.max);
      out.push(Math.max(1, t));
    }
    return out;
  }
  const isPaused = (ch, ds) => (ch.pauses || []).some(p => ds >= p.from && (!p.to || ds < p.to));
  const isRest = (ch, ds) => (ch.rest || []).includes(weekday(ds));

  // Lighter target on period / PMS days: reps and minutes round to whole
  // numbers, seconds to the nearest 5. Never below 1.
  function adjust(base, f, unit) {
    if (f === 1) return base;
    const v = base * f;
    return unit === 'seconds' ? Math.max(5, Math.round(v / 5) * 5) : Math.max(1, Math.round(v));
  }

  // Where a challenge stands on a date. Past days decide the step:
  //   done → next step · missed → same step again ("repeat") or next ("skip")
  //   rest days and paused days don't count at all.
  // ctx.factor(ds) → 1, 0.8 (PMS) or 0.6 (period) when the challenge is cycle-aware.
  function state(ch, ds, ctx = {}) {
    const list = targets(ch), total = list.length, done = ch.done || {};
    const factor = d => (ch.cycle && ctx.factor ? ctx.factor(d) : 1);
    if (ds < ch.start) return { status: 'upcoming', day: 1, total, base: list[0], target: adjust(list[0], factor(ch.start), ch.unit), factor: factor(ch.start), streak: 0 };
    let step = 0, missedYesterday = false;
    for (let d = ch.start; d < ds && step < total; d = addDays(d, 1)) {
      if (isPaused(ch, d) || isRest(ch, d)) continue;
      if (done[d] != null) { step++; missedYesterday = false; }
      else { missedYesterday = true; if (ch.missed === 'skip') step++; }
    }
    const streak = streakOf(ch, ds);
    if (step >= total) return { status: 'finished', day: total, total, streak };
    const f = factor(ds), base = list[step];
    const out = { day: step + 1, total, base, target: adjust(base, f, ch.unit), factor: f, streak,
      last: step === total - 1, repeat: missedYesterday && ch.missed !== 'skip' };
    if (isPaused(ch, ds)) return { ...out, status: 'paused' };
    if (isRest(ch, ds)) return { ...out, status: 'rest' };
    return { ...out, status: done[ds] != null ? 'done' : 'active' };
  }
  // Days in a row marked done, counting back from today (or yesterday if
  // today isn't done yet). Rest and paused days don't break it.
  function streakOf(ch, ds) {
    const done = ch.done || {};
    let d = done[ds] != null ? ds : addDays(ds, -1), n = 0;
    for (let i = 0; i < 400 && d >= ch.start; i++, d = addDays(d, -1)) {
      if (isPaused(ch, d) || isRest(ch, d)) continue;
      if (done[d] != null) n++; else break;
    }
    return n;
  }
  // The next `days` reminders, assuming each planned day gets done. Re-run
  // whenever something changes, so a missed day reshuffles the plan.
  function project(ch, from, days, ctx) {
    const sim = { ...ch, done: { ...(ch.done || {}) } }, out = [];
    for (let i = 0; i < days; i++) {
      const d = addDays(from, i), st = state(sim, d, ctx);
      if (st.status === 'finished') break;
      if (st.status === 'active') { out.push({ ds: d, ...st }); sim.done[d] = st.target; }
      else if (st.status === 'done') out.push({ ds: d, ...st });
    }
    return out;
  }

  const core = { addDays, weekday, daysBetween, targets, adjust, state, streakOf, project, isRest, isPaused };
  if (typeof window === 'undefined') { module.exports = core; return; }

  // ── Storage ──
  const KEY = 'eb_challenges';
  const blank = () => ({ settings: { combined: true, nudge: true, nudgeTime: '20:30', tz: 'Asia/Kolkata' }, list: [] });
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) return { ...blank(), ...s, settings: { ...blank().settings, ...s.settings } }; } catch {}
    return blank();
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} refresh(); schedule(); }
  // Today in the stored timezone (Asia/Kolkata), so a date never flips early or late.
  function today(tz) {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
    catch { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  }

  // ── Cycle: lighter on period days (60%) and PMS days (80%) ──
  const PMS_LEAD = { '1-3': 3, '4-7': 7, '7+': 10 };
  function cyclePhase(ds) {
    try {
      const cs = getCycleStart(); if (!cs) return null;
      const info = getPhaseForDate(ds, cs); if (!info) return null;
      if (info.phase === 'menstrual') return 'period';
      const lead = PMS_LEAD[EB.getProfile().cycle.pmsStart] || 5;
      if (info.phase === 'luteal' && (info.cycleLength || 28) - info.dayNum < lead) return 'pms';
    } catch {}
    return null;
  }
  const ctx = { factor: ds => ({ period: 0.6, pms: 0.8 })[cyclePhase(ds)] || 1 };

  // ── Words ──
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const amount = (ch, t) => ch.unit === 'seconds' ? `${t}s` : ch.unit === 'minutes' ? `${t} min` : `${t}`;
  const phrase = (ch, t) => ch.unit === 'reps' ? `${t} ${ch.name.toLowerCase()}` : `${amount(ch, t)} ${ch.name.toLowerCase()}`;
  const unitWord = ch => ch.unit === 'reps' ? 'reps' : ch.unit;
  const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const pick = (lines, seed) => lines[hash(seed) % lines.length];
  const LINES = [
    'Small steps, every day. That’s the whole trick.', 'Future you says thank you.', 'Put on one song and knock it out.',
    'Consistency beats intensity. You’ve got this.', 'A few minutes now, a better mood all day.', 'Day by day, it adds up.',
    'Your body loves a routine. Give it one today.', 'One set at a time.', 'Showing up is the win. The reps are a bonus.',
    'You did it yesterday. Let’s go again.', 'Habits are built on ordinary days like this one.', 'Quick and done. Then enjoy your day.'
  ];
  const LIGHT = { period: 'Lighter today for your period. It counts in full.', pms: 'Lighter on PMS days. It counts in full.' };
  const NUDGE = [
    'Still time today. Even a quick set counts.', 'A few minutes before bed? Totally doable.',
    'No pressure. If today isn’t the day, tomorrow is waiting.', 'Your challenge is still here when you’re ready.'
  ];

  // ── Notifications (iOS app) ──
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const LN = native ? cap.registerPlugin('LocalNotifications') : null;
  const BASE = 3000, TOP = 3999;    // ids reserved for challenges (meal reminders use 101–105)
  const at = (ds, hhmm) => { const [y, m, d] = ds.split('-').map(Number); const [h, mi] = (hhmm || '07:30').split(':').map(Number); return new Date(y, m - 1, d, h, mi); };
  // Runs one at a time: each call waits for the previous one, then re-plans from scratch.
  let chain = Promise.resolve();
  function schedule() { if (!LN) return chain; chain = chain.then(plan, plan); return chain; }
  async function plan() {
      try {
        const s = load(), now = new Date(), ds = today(s.settings.tz);
        const pending = await LN.getPending();
        const ours = (pending.notifications || []).filter(n => n.id >= BASE && n.id <= TOP).map(n => ({ id: n.id }));
        if (ours.length) await LN.cancel({ notifications: ours });
        const live = s.list.filter(ch => !ch.archived);
        if (!live.length) return;
        // iPhone keeps at most 64 future notifications per app; meal reminders use a few.
        const perDay = (s.settings.combined ? 1 : live.length) + (s.settings.nudge ? 1 : 0);
        const days = Math.max(3, Math.min(28, Math.floor(56 / perDay)));
        const plans = live.map(ch => ({ ch, by: Object.fromEntries(project(ch, ds, days, ctx).map(x => [x.ds, x])) }));
        const list = [];
        for (let i = 0; i < days; i++) {
          const d = addDays(ds, i);
          const items = plans.map(({ ch, by }) => by[d] && { ch, st: by[d] }).filter(Boolean);
          const todo = items.filter(x => x.st.status === 'active');
          if (!todo.length) continue;
          const light = todo.find(x => x.st.factor < 1) ? LIGHT[cyclePhase(d)] : '';
          if (s.settings.combined) {
            const when = at(d, todo.map(x => x.ch.time || '07:30').sort()[0]);
            if (when > now) list.push({ id: BASE + i * 10, title: todo.length === 1 ? `${todo[0].ch.name} · Day ${todo[0].st.day}` : 'Today’s challenge',
              body: `${todo.map(x => phrase(x.ch, x.st.target)).join(', ')}. ${light || pick(LINES, d)}`, schedule: { at: when, allowWhileIdle: true }, extra: { route: 'challenges' } });
          } else {
            todo.slice(0, 8).forEach((x, k) => {
              const when = at(d, x.ch.time);
              if (when > now) list.push({ id: BASE + i * 10 + k, title: `${x.ch.name} · Day ${x.st.day} of ${x.st.total}`,
                body: `${amount(x.ch, x.st.target)} ${unitWord(x.ch)} today. ${light || pick(LINES, d + x.ch.id)}`, schedule: { at: when, allowWhileIdle: true }, extra: { route: 'challenges' } });
            });
          }
          // One gentle evening follow-up. Marking everything done re-plans and drops it.
          const nudgeAt = at(d, s.settings.nudgeTime);
          if (s.settings.nudge && nudgeAt > now) list.push({ id: BASE + i * 10 + 9, title: 'Still time today',
            body: `${todo.map(x => phrase(x.ch, x.st.target)).join(', ')}. ${pick(NUDGE, d)}`, schedule: { at: nudgeAt, allowWhileIdle: true }, extra: { route: 'challenges' } });
        }
        if (list.length) await LN.schedule({ notifications: list });
      } catch {}
  }
  async function askPermission() {
    if (!LN) return true;
    try { const p = await LN.requestPermissions(); if (p.display === 'granted') return true; } catch {}
    window.EB && EB.toast('Turn on notifications for Menu-fi in Settings to get challenge reminders');
    return false;
  }
  if (LN) {
    try {
      LN.addListener('localNotificationActionPerformed', e => {
        const r = e && e.notification && e.notification.extra && e.notification.extra.route;
        if (r === 'challenges' && window.EBApp) { EBApp.go('fitness'); setTimeout(() => { const c = document.querySelector('.ch-card'); if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 300); }
      });
    } catch {}
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(); });
    document.addEventListener('eb:profile', () => schedule());     // cycle changes move the lighter days
  }

  // ── Today's challenges card (Fitness) ──
  const CHECK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
  function cardHTML() {
    const s = load(), ds = today(s.settings.tz);
    const live = s.list.filter(ch => !ch.archived);
    const finished = s.list.filter(ch => ch.archived);
    if (!live.length) return `<div class="app-card ch-card ch-empty">
        <p class="app-card-label">Daily challenges</p>
        <p class="app-muted">Build a habit a little at a time: 10 push-ups today, 20 tomorrow. I’ll remind you every day${native ? '' : ' in the iPhone app'}.</p>
        <button type="button" class="eb-btn primary sm" data-ch-new>Start a challenge</button>
        ${finished.length ? `<p class="app-muted small">${finished.length} finished. Nicely done.</p>` : ''}
      </div>`;
    const rows = live.map(ch => {
      const st = state(ch, ds, ctx);
      const pct = Math.round(((st.status === 'done' ? st.day : st.day - 1) / st.total) * 100);
      const light = st.factor < 1 && (st.status === 'active' || st.status === 'done')
        ? `<p class="ch-note">Lighter today: ${amount(ch, st.target)} instead of ${amount(ch, st.base)}. ${cyclePhase(ds) === 'period' ? 'Period days' : 'PMS days'} count just the same.</p>` : '';
      const repeat = st.repeat && st.status === 'active' ? '<p class="ch-note">Yesterday’s target is back. No rush, it’s still yours.</p>' : '';
      const right = st.status === 'done' ? `<button type="button" class="ch-done on" data-ch-undo="${ch.id}" aria-label="Mark not done">${CHECK}<span>Done</span></button>`
        : st.status === 'active' ? `<button type="button" class="ch-done" data-ch-done="${ch.id}">Done</button>`
        : `<span class="ch-tag">${st.status === 'rest' ? 'Rest day' : st.status === 'paused' ? 'Paused' : 'Starts ' + new Date(ch.start + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>`;
      return `<li class="ch-row ${st.status}">
        <div class="ch-main">
          <div class="ch-top"><b>${esc(ch.name)}</b><span>Day ${st.day} of ${st.total}${st.streak > 1 ? ` · ${st.streak}-day streak` : ''}</span></div>
          <div class="ch-target">${st.status === 'rest' ? 'Rest and recover' : st.status === 'paused' ? 'On pause' : `<b>${amount(ch, st.target)}</b> ${ch.unit === 'reps' ? 'reps' : ''}`}</div>
          <div class="ch-bar"><i style="width:${pct}%"></i></div>
          ${light}${repeat}
        </div>
        ${right}
      </li>`;
    }).join('');
    const left = live.filter(ch => state(ch, ds, ctx).status === 'active').length;
    return `<div class="app-card ch-card">
        <div class="app-row"><p class="app-card-label">Today’s challenges</p><button type="button" class="app-link" data-ch-manage>Manage</button></div>
        <ul class="ch-list">${rows}</ul>
        <div class="ch-foot"><span class="app-muted small">${left ? `${left} to go today` : 'All done today. Lovely work.'}</span>
          <button type="button" class="app-link" data-ch-new>+ New challenge</button></div>
      </div>`;
  }
  // One line for Home: "Today: 20 push-ups, 15 crunches".
  function homeLine() {
    const s = load(), ds = today(s.settings.tz);
    const items = s.list.filter(ch => !ch.archived).map(ch => ({ ch, st: state(ch, ds, ctx) })).filter(x => x.st.status === 'active' || x.st.status === 'done');
    if (!items.length) return '';
    const todo = items.filter(x => x.st.status === 'active');
    return `<button type="button" class="app-card ch-home" data-go-challenges>
        <span class="ch-home-dot${todo.length ? '' : ' done'}">${todo.length ? '' : CHECK}</span>
        <span><small>${todo.length ? 'Today’s challenge' : 'Challenges done'}</small><b>${(todo.length ? todo : items).map(x => phrase(x.ch, x.st.target)).join(', ')}</b></span>
      </button>`;
  }
  function refresh() {
    const slot = document.querySelector('#pageFitness .app-fit-challenges');
    if (slot) slot.innerHTML = cardHTML();
    const home = document.querySelector('#pageHome .ch-home-slot');
    if (home) home.innerHTML = homeLine();
  }

  // ── Sheets ──
  function sheet(title, inner, onClick) {
    const ov = document.createElement('div');
    ov.className = 'eb-cal-overlay app-sheet-overlay';
    ov.innerHTML = `<div class="eb-cal app-lsheet ch-sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="ch-sheet-head"><b>${esc(title)}</b><button type="button" class="eb-icon-btn" data-ch-x aria-label="Close"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
      <div class="ch-sheet-body">${inner}</div></div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-ch-x]')) return close(); onClick && onClick(e, ov, close); });
    return { ov, close };
  }
  const PRESETS = [['Push-ups', 'reps', 10, 5], ['Crunches', 'reps', 15, 5], ['Squats', 'reps', 15, 5], ['Pull-ups', 'reps', 2, 1], ['Plank', 'seconds', 20, 10], ['Skipping', 'minutes', 3, 1]];
  const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'], WDN = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

  function editSheet(id) {
    const s = load();
    const old = id && s.list.find(c => c.id === id);
    const ch = old ? JSON.parse(JSON.stringify(old)) : { id: 'c' + Date.now().toString(36), name: '', unit: 'reps', start: today(s.settings.tz), time: '07:30',
      plan: { type: 'rule', start: 10, step: 10, max: '', days: 30, list: [] }, rest: [], missed: 'repeat', cycle: true, pauses: [], done: {} };
    ch.plan = { type: 'rule', start: 10, step: 10, max: '', days: 30, list: [], ...ch.plan };
    const seg = (k, opts, v) => `<div class="eb-seg">${opts.map(([val, t]) => `<button type="button" class="eb-seg-btn${v === val ? ' on' : ''}" data-ch-set="${k}" data-v="${val}">${t}</button>`).join('')}</div>`;
    const num = (k, v, label, ph = '') => `<label class="ch-field"><span>${label}</span><input class="eb-input" inputmode="numeric" data-ch-in="${k}" value="${esc(v)}" placeholder="${ph}"></label>`;
    const body = () => {
      const list = targets(ch), u = ch.unit;
      return `
      <div class="ch-chips">${PRESETS.map(([n]) => `<button type="button" class="eb-chip${ch.name === n ? ' on' : ''}" data-ch-preset="${n}">${n}</button>`).join('')}</div>
      <label class="ch-field"><span>Exercise</span><input class="eb-input" data-ch-in="name" value="${esc(ch.name)}" placeholder="e.g. Push-ups"></label>
      <div class="ch-field"><span>Count in</span>${seg('unit', [['reps', 'Reps'], ['seconds', 'Seconds'], ['minutes', 'Minutes']], u)}</div>
      <div class="ch-field"><span>Targets</span>${seg('plan.type', [['rule', 'Add each day'], ['custom', 'My own list']], ch.plan.type)}</div>
      ${ch.plan.type === 'rule' ? `<div class="ch-grid">
          ${num('plan.start', ch.plan.start, 'Start at')}${num('plan.step', ch.plan.step, 'Add each day')}
          ${num('plan.max', ch.plan.max, 'Stop growing at', 'No limit')}${num('plan.days', ch.plan.days, 'Number of days')}</div>`
        : `<label class="ch-field"><span>One target per day, separated by commas</span><textarea class="eb-input eb-textarea" rows="2" data-ch-in="plan.list" placeholder="10, 20, 30, 30, 40">${esc((ch.plan.list || []).join(', '))}</textarea></label>`}
      <div class="ch-preview"><p>${list.length ? `${list.length} days · ${amount(ch, list[0])} → ${amount(ch, list[list.length - 1])} ${u === 'reps' ? 'reps' : ''}` : 'Add your targets to see the plan'}</p>
        <div class="ch-days">${list.slice(0, 120).map((t, i) => `<span><small>D${i + 1}</small>${amount(ch, t)}</span>`).join('')}</div></div>
      <div class="ch-grid">
        <label class="ch-field"><span>Start date</span><input type="date" class="eb-input" data-ch-in="start" value="${ch.start}"></label>
        <label class="ch-field"><span>Remind me at</span><input type="time" class="eb-input" data-ch-in="time" value="${ch.time}"></label></div>
      <div class="ch-field"><span>Rest days</span><div class="ch-wd">${WD.map((w, i) => `<button type="button" class="eb-chip${ch.rest.includes(i) ? ' on' : ''}" data-ch-rest="${i}" aria-label="${WDN[i]}">${w}</button>`).join('')}</div></div>
      <div class="ch-field"><span>If I miss a day</span>${seg('missed', [['repeat', 'Repeat it'], ['skip', 'Move on']], ch.missed)}
        <small>${ch.missed === 'skip' ? 'The plan follows the calendar. Day 5 is day 5, done or not.' : 'The missed target comes back the next day, so nothing is skipped.'}</small></div>
      <button type="button" class="ch-toggle${ch.cycle ? ' on' : ''}" data-ch-cycle role="switch" aria-checked="${ch.cycle}">
        <span><b>Lighter on period and PMS days</b><small>60% of the target on period days, 80% on PMS days. Still counts as a full day.</small></span><i></i></button>
      <button type="button" class="eb-btn primary" data-ch-save ${ch.name.trim() && list.length ? '' : 'disabled'}>${old ? 'Save changes' : 'Start challenge'}</button>
      ${old ? '<button type="button" class="eb-btn secondary ch-del" data-ch-delete>Delete challenge</button>' : ''}`;
    };
    const { ov, close } = sheet(old ? 'Edit challenge' : 'New challenge', body(), async (e, ov, close) => {
      const t = e.target;
      const paint = () => { const b = ov.querySelector('.ch-sheet-body'), y = b.scrollTop; b.innerHTML = body(); b.scrollTop = y; };
      const pr = t.closest('[data-ch-preset]');
      if (pr) { const [n, u, st, step] = PRESETS.find(x => x[0] === pr.dataset.chPreset); Object.assign(ch, { name: n, unit: u }); Object.assign(ch.plan, { start: st, step }); return paint(); }
      const sg = t.closest('[data-ch-set]');
      if (sg) { const k = sg.dataset.chSet; if (k === 'plan.type') ch.plan.type = sg.dataset.v; else ch[k] = sg.dataset.v; return paint(); }
      const rd = t.closest('[data-ch-rest]');
      if (rd) { const i = +rd.dataset.chRest; ch.rest = ch.rest.includes(i) ? ch.rest.filter(x => x !== i) : [...ch.rest, i]; return paint(); }
      if (t.closest('[data-ch-cycle]')) { ch.cycle = !ch.cycle; return paint(); }
      if (t.closest('[data-ch-delete]')) {
        if (!confirm(`Delete ${ch.name}? Its progress goes too.`)) return;
        const s2 = load(); s2.list = s2.list.filter(c => c.id !== ch.id); save(s2); close(); return;
      }
      if (t.closest('[data-ch-save]')) {
        ch.name = ch.name.trim();
        const s2 = load(), i = s2.list.findIndex(c => c.id === ch.id);
        if (i >= 0) s2.list[i] = ch; else { s2.list.push(ch); window.EBAnalytics && EBAnalytics.track('challenge_started', { preset: PRESETS.some(p => p[0] === ch.name) ? ch.name : 'custom' }); }
        close();
        if (i < 0) await askPermission();
        save(s2);
        window.EB && EB.toast(i >= 0 ? 'Saved' : `${ch.name} starts ${ch.start === today(s2.settings.tz) ? 'today' : 'on ' + new Date(ch.start + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`);
      }
    });
    ov.addEventListener('input', e => {
      const k = e.target.dataset.chIn; if (!k) return;
      const v = e.target.value;
      if (k === 'plan.list') ch.plan.list = v.split(/[^0-9.]+/).map(Number).filter(n => n > 0);
      else if (k.startsWith('plan.')) ch.plan[k.slice(5)] = v.replace(/[^0-9]/g, '');
      else ch[k] = v;
      // Live preview without losing the cursor: repaint just the preview and the save button.
      const b = ov.querySelector('.ch-sheet-body'), list = targets(ch);
      const tmp = document.createElement('div'); tmp.innerHTML = body();
      b.querySelector('.ch-preview').replaceWith(tmp.querySelector('.ch-preview'));
      const btn = b.querySelector('[data-ch-save]'); btn.disabled = !(ch.name.trim() && list.length);
    });
  }

  function manageSheet() {
    const body = () => {
      const s = load(), ds = today(s.settings.tz);
      return `${s.list.map(ch => { const st = state(ch, ds, ctx); return `<div class="ch-mrow">
          <span><b>${esc(ch.name)}</b><small>${ch.archived ? 'Finished' : st.status === 'paused' ? `Paused · day ${st.day} of ${st.total}` : `Day ${st.day} of ${st.total} · ${ch.missed === 'skip' ? 'moves on' : 'repeats'} missed days`}</small></span>
          ${ch.archived ? '' : `<button type="button" class="app-opt-btn ghost" data-ch-pause="${ch.id}">${st.status === 'paused' ? 'Resume' : 'Pause'}</button>`}
          <button type="button" class="app-opt-btn ghost" data-ch-edit="${ch.id}">Edit</button></div>`; }).join('') || '<p class="app-muted">No challenges yet.</p>'}
        <p class="ch-sec">Reminders</p>
        <button type="button" class="ch-toggle${s.settings.combined ? ' on' : ''}" data-ch-opt="combined" role="switch" aria-checked="${s.settings.combined}">
          <span><b>One reminder for everything</b><small>${s.settings.combined ? '“Today: 20 push-ups, 15 crunches” at your earliest time' : 'A separate reminder for each challenge'}</small></span><i></i></button>
        <button type="button" class="ch-toggle${s.settings.nudge ? ' on' : ''}" data-ch-opt="nudge" role="switch" aria-checked="${s.settings.nudge}">
          <span><b>Evening nudge if not done</b><small>One gentle reminder. Tap Done in the app and it won’t come.</small></span><i></i></button>
        ${s.settings.nudge ? `<label class="ch-field"><span>Nudge at</span><input type="time" class="eb-input" data-ch-nudge value="${s.settings.nudgeTime}"></label>` : ''}
        ${native ? '' : '<p class="app-muted small">Reminders arrive through the iPhone app. Here you can track and tick off your challenges.</p>'}`;
    };
    const { ov } = sheet('Your challenges', body(), (e, ov, close) => {
      const t = e.target, paint = () => { ov.querySelector('.ch-sheet-body').innerHTML = body(); };
      const ed = t.closest('[data-ch-edit]'); if (ed) { close(); return editSheet(ed.dataset.chEdit); }
      const pa = t.closest('[data-ch-pause]');
      if (pa) {
        const s = load(), ch = s.list.find(c => c.id === pa.dataset.chPause), ds = today(s.settings.tz);
        ch.pauses = ch.pauses || [];
        const open = ch.pauses.find(p => !p.to);
        if (open) open.to = ds; else ch.pauses.push({ from: ds, to: null });
        // A pause started and ended on the same day leaves nothing behind.
        ch.pauses = ch.pauses.filter(p => !p.to || p.to > p.from);
        save(s); return paint();
      }
      const op = t.closest('[data-ch-opt]');
      if (op) { const s = load(); s.settings[op.dataset.chOpt] = !s.settings[op.dataset.chOpt]; save(s); return paint(); }
    });
    ov.addEventListener('change', e => { if (e.target.matches('[data-ch-nudge]')) { const s = load(); s.settings.nudgeTime = e.target.value || '20:30'; save(s); } });
  }

  // A small celebration when the last day is done.
  function celebrate(ch) {
    const n = targets(ch).length;
    const { ov } = sheet('', `<div class="ch-party" aria-live="polite">
        <div class="ch-confetti">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
        <b>${esc(ch.name)}: done!</b>
        <p>${n} days of showing up. That’s a habit now.</p>
        <button type="button" class="eb-btn primary" data-ch-x>Lovely</button></div>`);
    ov.querySelector('.ch-sheet').classList.add('ch-party-sheet');
  }

  // ── Taps ──
  document.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('[data-ch-new]')) return editSheet();
    if (t.closest('[data-ch-manage]')) return manageSheet();
    if (t.closest('[data-go-challenges]')) { if (window.EBApp) EBApp.go('fitness'); return; }
    const dn = t.closest('[data-ch-done]');
    if (dn) {
      const s = load(), ds = today(s.settings.tz), ch = s.list.find(c => c.id === dn.dataset.chDone); if (!ch) return;
      const st = state(ch, ds, ctx); if (st.status !== 'active') return;
      ch.done = { ...(ch.done || {}), [ds]: st.target };
      if (st.last) { ch.archived = true; ch.finishedAt = ds; }
      save(s);
      if (st.last) celebrate(ch); else window.EB && EB.toast(pick(['Done. Nice one.', 'Ticked off. Well done.', 'That’s today sorted.', 'Another day in the bank.'], ds + ch.id));
      return;
    }
    const un = t.closest('[data-ch-undo]');
    if (un) { const s = load(), ds = today(s.settings.tz), ch = s.list.find(c => c.id === un.dataset.chUndo); if (!ch) return; delete ch.done[ds]; save(s); }
  });

  window.EBChallenges = { ...core, load, cardHTML, homeLine, refresh, schedule, ctx, today };
  // Top up the reminder schedule on launch (it covers up to ~4 weeks ahead).
  setTimeout(schedule, 1500);
})();
