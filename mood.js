// Mood faces: double-tap a day on the cycle strip, draw a face inside a ready-made
// circle in that day's phase colour, and it replaces the dot under the date. There is one strip,
// moved between Home, Cycle, Nutrition and Fitness, so a face saved anywhere
// shows everywhere. Faces are kept per date in eb_moodfaces (backed up with
// the rest of the cycle log by sync.js).
(function () {
  const KEY = 'eb_moodfaces';
  const GREY = '#8e8e93';
  const DOUBLE_MS = 300;          // second tap within this long = double tap

  // ── Storage: { 'YYYY-MM-DD': [stroke, …] }, a stroke is {c:[cx,cy,r]} or {p:[[x,y],…]}, 0–100 units ──
  const all = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const get = ds => all()[ds] || null;
  function save(ds, strokes) {
    const a = all();
    if (strokes && strokes.length) a[ds] = strokes; else delete a[ds];
    try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {}
  }

  // The day's phase colour, the same as its dot.
  function colorFor(ds) {
    try {
      const start = getCycleStart(); if (!start) return GREY;
      const info = getPhaseForDate(ds, start);
      return (info && PHASE_META[info.phase] && PHASE_META[info.phase].color) || GREY;
    } catch { return GREY; }
  }

  // ── Drawing as SVG: smooth curves through the midpoints of each pair of points ──
  function pathD(pts) {
    if (pts.length === 1) return `M${pts[0][0]} ${pts[0][1]}h.01`;
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i], [nx, ny] = pts[i + 1];
      d += `Q${x} ${y} ${r1((x + nx) / 2)} ${r1((y + ny) / 2)}`;
    }
    const l = pts[pts.length - 1];
    return d + `L${l[0]} ${l[1]}`;
  }
  const r1 = n => Math.round(n * 10) / 10;
  function strokeSVG(s) {
    return s.c ? `<circle cx="${s.c[0]}" cy="${s.c[1]}" r="${s.c[2]}"/>`
      : `<path d="${pathD(s.p)}${s.f ? 'Z" fill="currentColor' : ''}"/>`;
  }
  // Every face sits in the same circle; people only draw the features.
  const OUTLINE = '<circle cx="50" cy="50" r="42"/>';
  const features = strokes => (strokes || []).filter(s => s.p);       // older saves had their own circle
  function faceSVG(strokes, color, cls, width) {
    return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true" fill="none" color="${color}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${OUTLINE}${features(strokes).map(strokeSVG).join('')}</svg>`;
  }

  // What the strip shows under a date: the face if there is one, else the phase dot.
  function cellMark(ds, dotClass) {
    const f = features(get(ds));
    return f.length ? faceSVG(f, colorFor(ds), 'cycle-face', 6) : `<span class="cycle-dot ${dotClass}"></span>`;
  }

  // ── Smoothing: a light moving average takes the wobble out of a finger stroke ──
  function smooth(pts) {
    if (pts.length < 4) return pts;
    return pts.map((p, i) => {
      if (i === 0 || i === pts.length - 1) return p;
      const a = pts[i - 1], b = pts[i + 1];
      return [r1((a[0] + 2 * p[0] + b[0]) / 4), r1((a[1] + 2 * p[1] + b[1]) / 4)];
    });
  }

  // ── Filling: double tap inside a closed shape ──
  const isTap = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return Math.max(...xs) - Math.min(...xs) < 3 && Math.max(...ys) - Math.min(...ys) < 3; };
  // A shape counts as closed when its ends meet, relative to its size.
  function closed(pts) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const a = pts[0], b = pts[pts.length - 1];
    return size > 6 && Math.hypot(a[0] - b[0], a[1] - b[1]) < size * 0.35;
  }
  // Ray casting: count how many edges a line to the right of the point crosses.
  function inside([x, y], pts) {
    let hit = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  }
  // The smallest closed shape around the point, so a filled eye inside a bigger shape works.
  function shapeAt(p, strokes) {
    const area = s => { const xs = s.p.map(q => q[0]), ys = s.p.map(q => q[1]); return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)); };
    return strokes.filter(s => s.p && s.p.length > 3 && closed(s.p) && inside(p, s.p)).sort((a, b) => area(a) - area(b))[0] || null;
  }

  // ── The sheet ──
  const X = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function open(ds) {
    if (document.querySelector('.mood-sheet')) return;
    const color = colorFor(ds);
    const [y, m, d] = ds.split('-').map(Number);
    const when = new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    let strokes = features(get(ds)).slice();
    const ov = document.createElement('div');
    ov.className = 'eb-cal-overlay app-sheet-overlay';
    ov.innerHTML = `<div class="eb-cal app-sheet mood-sheet" role="dialog" aria-modal="true" aria-label="Your mood on ${when}">
      <div class="mood-head"><div><b>How are you feeling?</b><span>${when}</span></div><button type="button" class="eb-icon-btn" data-mood-x aria-label="Close">${X}</button></div>
      <div class="mood-pad"><svg viewBox="0 0 100 100" fill="none" color="${color}" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${OUTLINE}<g class="mood-done"></g><path class="mood-live"/></svg><span class="mood-empty">Draw your face<small>Double tap inside a shape to fill it</small></span></div>
      <div class="mood-tools"><button type="button" class="eb-link" data-mood-undo>Undo</button><button type="button" class="eb-link" data-mood-clear>Clear face</button></div>
      <div class="eb-cta-row">
        <button type="button" class="eb-btn secondary" data-mood-x>Cancel</button>
        <button type="button" class="eb-btn primary" data-mood-save>Save</button>
      </div></div>`;
    document.body.appendChild(ov);
    const pad = ov.querySelector('.mood-pad'), svg = pad.querySelector('svg');
    const done = svg.querySelector('.mood-done'), live = svg.querySelector('.mood-live');
    const paint = () => {
      done.innerHTML = strokes.map(strokeSVG).join('');
      pad.classList.toggle('has-face', strokes.length > 0);
      ov.querySelector('[data-mood-undo]').disabled = !strokes.length;
      ov.querySelector('[data-mood-clear]').disabled = !strokes.length;
    };
    paint();

    let pts = null;
    const at = e => { const b = svg.getBoundingClientRect(); return [r1((e.clientX - b.left) / b.width * 100), r1((e.clientY - b.top) / b.height * 100)]; };
    pad.addEventListener('pointerdown', e => { e.preventDefault(); pad.setPointerCapture(e.pointerId); pts = [at(e)]; live.setAttribute('d', pathD(pts)); pad.classList.add('has-face'); });
    pad.addEventListener('pointermove', e => {
      if (!pts) return;
      const p = at(e), l = pts[pts.length - 1];
      if (Math.hypot(p[0] - l[0], p[1] - l[1]) < 1.2) return;     // skip jitter between frames
      pts.push(p); live.setAttribute('d', pathD(pts));
    });
    let lastTap = null;   // { at, p } of the previous tap, to spot a double tap
    const end = () => {
      if (!pts) return;
      const now = Date.now(), p = pts[0];
      if (isTap(pts)) {
        const dbl = lastTap && now - lastTap.at < 350 && Math.hypot(p[0] - lastTap.p[0], p[1] - lastTap.p[1]) < 5;
        const shape = dbl && shapeAt(p, strokes);
        if (shape) {
          strokes.pop();                 // the first tap left a dot; the double tap means fill instead
          shape.f = !shape.f;            // double tap again to empty it
          lastTap = null; pts = null; live.removeAttribute('d'); return paint();
        }
        lastTap = { at: now, p };
      } else lastTap = null;
      strokes.push({ p: smooth(pts) });
      pts = null; live.removeAttribute('d'); paint();
    };
    pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);

    const close = () => ov.remove();
    ov.addEventListener('click', e => {
      if (e.target === ov || e.target.closest('[data-mood-x]')) return close();
      if (e.target.closest('[data-mood-undo]')) { strokes.pop(); return paint(); }
      if (e.target.closest('[data-mood-clear]')) { strokes = []; return paint(); }
      if (e.target.closest('[data-mood-save]')) {
        save(ds, strokes); close();
        try { renderCycleCalendar(); } catch {}
        try { window.EBAnalytics && EBAnalytics.track('mood_face_saved'); } catch {}
      }
    });
  }

  // ── Double tap on any date of the strip ──
  // Taps on the strip already do things (phase popup, pick the day to log), so a
  // first tap waits a moment: a second tap opens the face sheet instead, otherwise
  // the original tap goes through as before.
  let pending = null, replaying = false;
  window.addEventListener('click', e => {
    if (replaying) return;
    const cell = e.target.closest && e.target.closest('#cycleSection .cycle-day-cell');
    if (!cell || !cell.dataset.date) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (pending && pending.ds === cell.dataset.date) {
      clearTimeout(pending.t); pending = null; open(cell.dataset.date); return;
    }
    if (pending) clearTimeout(pending.t);
    const ds = cell.dataset.date;
    pending = { ds, t: setTimeout(() => {
      pending = null;
      const again = document.querySelector(`#cycleSection .cycle-day-cell[data-date="${ds}"]`);
      if (!again) return;
      replaying = true; try { again.click(); } finally { replaying = false; }
    }, DOUBLE_MS) };
  }, true);
  // Some browsers send a dblclick even when the clicks were swallowed above.
  window.addEventListener('dblclick', e => {
    const cell = e.target.closest && e.target.closest('#cycleSection .cycle-day-cell');
    if (!cell || !cell.dataset.date) return;
    if (pending) { clearTimeout(pending.t); pending = null; }
    open(cell.dataset.date);
  }, true);

  window.EBMood = { cellMark, open, get };
})();
