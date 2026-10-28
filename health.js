// ── Apple Health ──────────────────────────────────────────────────────
// Only active inside the iOS app (Capacitor + the native HealthPlugin in
// ios/App/App). On the website every call is a no-op.
//
// Reads: weight, period days, workouts.  Writes: each day's eaten calories
// and macros (replaced in place, so re-logging a day never double-counts).
(function () {
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform() && cap.getPlatform() === 'ios');
  const Health = native ? cap.registerPlugin('Health') : null;
  const KEY = 'eb_health';

  function state() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
  }
  function setState(patch) {
    try { localStorage.setItem(KEY, JSON.stringify({ ...state(), ...patch })); } catch {}
  }
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  async function isAvailable() {
    if (!Health) return false;
    try { return (await Health.isAvailable()).available; } catch { return false; }
  }

  // Shows Apple's permission sheet. iOS never says which reads were
  // allowed, so "connected" means the sheet was answered, not granted.
  async function connect() {
    if (!(await isAvailable())) throw new Error('unavailable');
    await Health.requestAuthorization();
    setState({ connected: true });
    await syncIn();
    await syncOut();
  }
  function disconnect() { setState({ connected: false }); }
  const isConnected = () => !!state().connected;

  // ── Health → app ──
  async function syncIn() {
    if (!Health || !isConnected()) return;
    const p = EB.getProfile();
    let changed = false;

    try {
      const { kg } = await Health.latestWeight();
      if (kg) {
        const val = p.weight.unit === 'lb' ? Math.round(kg * 2.20462 * 10) / 10 : Math.round(kg * 10) / 10;
        if (+p.weight.current !== val) { p.weight.current = val; changed = true; }
      }
    } catch {}

    if (p.cycle.tracks !== false) {
      try {
        const { starts } = await Health.periodStarts({ days: 200 });
        if (starts && starts.length) {
          const last = starts[starts.length - 1];
          if (p.cycle.lastStart !== last) { p.cycle.lastStart = last; p.cycle.tracks = true; changed = true; }
          // Average of recent gaps, ignoring missed months (gap > 60 days)
          const gaps = starts.slice(1).map((s, i) => (new Date(s) - new Date(starts[i])) / 86400000).filter(g => g >= 15 && g <= 60);
          if (gaps.length) {
            const avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
            if (p.cycle.cycleLength !== avg) { p.cycle.cycleLength = avg; changed = true; }
          }
        }
      } catch {}
    }
    if (changed) EB.saveProfile(p);

    // Workouts from the last 7 days become burned-calorie entries on their day.
    try {
      const since = new Date(); since.setDate(since.getDate() - 7);
      const { workouts } = await Health.workouts({ since: iso(since) });
      let added = false;
      (workouts || []).forEach(w => {
        if (!(w.kcal > 0)) return;
        const list = getActivities(w.date);
        if (list.some(a => a.hk === w.id)) return;
        list.push({ name: w.name, cal: Math.round(w.kcal), ts: Date.parse(w.start) || Date.now(), hk: w.id });
        setActivities(w.date, list);
        added = true;
      });
      if (added) { renderActivity(); renderTracker(); renderWeeklyTracker(); }
    } catch {}
    setState({ lastSync: Date.now() });
  }

  // ── App → Health ── the selected day's totals, debounced
  let outTimer;
  function syncOut() {
    if (!Health || !isConnected()) return Promise.resolve();
    clearTimeout(outTimer);
    return new Promise(resolve => {
      outTimer = setTimeout(async () => {
        try {
          const t = computeConsumed(currentDay);
          await Health.saveDailyNutrition({ date: selectedDateStr(), cal: t.cal, p: t.p, c: t.c, f: t.f, fib: t.fib });
        } catch {}
        resolve();
      }, 800);
    });
  }

  // Any change to the day's log repaints the tracker — hook that.
  if (native) {
    const orig = window.renderTracker;
    if (typeof orig === 'function') {
      window.renderTracker = function () { const r = orig.apply(this, arguments); syncOut(); return r; };
    }
    const resync = () => { if (document.visibilityState === 'visible') syncIn(); };
    document.addEventListener('visibilitychange', resync);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', resync); else resync();
  }

  window.EBHealth = { native, isAvailable, connect, disconnect, isConnected, syncIn, syncOut };
})();
