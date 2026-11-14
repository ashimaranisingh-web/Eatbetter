// ── Log mode: search any food, pick an amount, add it to a meal ───────
// Foods come from four places, in this order of trust for the person:
//   your own foods (mealPlan_customIngredients, shared with Plan mode),
//   Menu-fi's home-cooked dishes (assistant.js, per serving),
//   USDA FoodData Central and IFCT 2017 (fooddb.js, per 100 g).
// Entries go into the same per-day log as Plan (slots_<date>), with a few
// extra fields (src, ref, amt, unit, est) that older code simply ignores.
// Recent foods (eb_food_recent) and favourites (eb_food_fav) sync.
// Barcode scan: the camera (iPhone app) or typed digits (website) → Open Food
// Facts → saved in eb_food_scanned (synced) so the same pack is instant next time.
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plain = s => String(s || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const r1 = n => Math.round((+n || 0) * 10) / 10;

  const SRC = { usda: 'USDA FoodData Central', ifct: 'IFCT 2017 (NIN)', mf: 'Home recipe (Menu-fi)', plan: 'Your meal plan', own: 'Your own food', you: 'Your numbers', off: 'Open Food Facts', label: 'Your pack label', shared: 'Menu-fi pack labels' };
  const SLOTS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['snack', 'Snack'], ['dinner', 'Dinner']];
  const SLOT_NAME = Object.fromEntries(SLOTS);
  const PLURAL = { pack: 'packs', piece: 'pieces', katori: 'katori', spoon: 'spoons', cup: 'cups', serving: 'servings', g: 'g', ml: 'ml' };
  const RECENT = 'eb_food_recent', FAV = 'eb_food_fav', SCANNED = 'eb_food_scanned';
  const QUEUE = 'eb_label_queue';   // label shares waiting for internet or sign-in (this phone only)

  // Spelling-tolerant matching for Hindi words written in English letters:
  // chawal = chaawal = chaval, moong = mung, makhan = makkhan, pyaz = pyaaz.
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/([bcdgjkpt])h/g, '$1').replace(/aa/g, 'a').replace(/ee/g, 'i').replace(/oo/g, 'u')
      .replace(/w/g, 'v').replace(/z/g, 'j').replace(/([a-z])\1+/g, '$1')
      .replace(/\s+/g, ' ').trim();
  }

  // ── The food list ─────────────────────────────────────────────────
  // Each food: nut = numbers for `per` base units; units = base units in one
  // of each unit (base is grams, or "1 serving" when grams are unknown).
  function servingUnit(serving, g) {
    const s = String(serving || '').toLowerCase(), u = { g: 1 };
    const n = parseFloat(s) || 1;
    if (/bowl|katori/.test(s)) u.katori = g / n;
    else if (/cup|glass|mug/.test(s)) u.cup = g / n;
    else if (/tbsp|spoon/.test(s)) u.spoon = g / n;
    else if (/^\d+\s*g\b/.test(s)) {}
    else if (/plate|serving|portion|drink|scoop|bar|slice|can|bottle|pack/.test(s)) u.serving = g;
    else u.piece = g / n;
    return u;
  }
  // Plan's own entries read like "Carb — roti / paratha / rice (150 cal)".
  const tidy = n => String(n).replace(/^carb\s*[—–-]\s*/i, '').replace(/\s*\(\d+\s*cal\)\s*$/i, '').replace(/^\w/, c => c.toUpperCase());
  // Open Food Facts India (offindia.js, ~1 MB): loaded once the app is idle,
  // so startup stays fast. Instant, offline barcode lookups + packaged search.
  let offIdx = null;
  const title = s => s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : s;
  function offRow(r) {
    const [code, name0, brand, cal, p, c, f, fib, sug, na, pack, serving, qty, drink] = r;
    let name = title(String(name0).replace(/\b\d+(\.\d+)?\s*(g|gm|gms|grm|kg|ml|l|ltr)\b\.?/gi, '').replace(/\b(pc|pcs|pkt)\b\.?/gi, '').replace(/\s+/g, ' ').trim());
    if (brand && !name.toLowerCase().includes(String(brand).toLowerCase())) name = `${title(brand)} ${name}`;
    const u = drink ? 'ml' : 'g', units = { [u]: 1 };
    const mp = String(qty || '').match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(g|ml)\b/i);
    let multi = false, pn = null, pk = pack;
    if (mp && +mp[1] > 1) { units.piece = +mp[2]; pn = 'single pack'; multi = true; if (!(pk > 0)) pk = +mp[1] * +mp[2]; }
    if (pk > 0 && pk <= 5000) units.pack = pk;
    if (serving > 0 && serving !== pk && serving !== units.piece) units.serving = serving;
    name = name.replace(/^\w/, c => c.toUpperCase());
    return { id: 'p:' + code, code, n: name || 'Packaged food', brand: brand || '', k: (brand || '') + ' ' + code, per: 100, units, src: 'off', bundled: true, pn, multi,
      serving: units.serving ? `1 serving (${serving} ${u})` : null,
      nut: { cal, p: p || 0, c: c || 0, f: f || 0, fib: fib || 0, sug: sug == null ? null : sug, na: na == null ? null : na } };
  }
  let offList = null;
  function offFoods() {   // built once (10k+ products), then reused by every catalog rebuild
    if (offList || !window.EB_OFF_INDIA) return offList || [];
    offList = window.EB_OFF_INDIA.map(r => { const f = offRow(r); f.nn = norm(f.n); f.words = norm(f.n + ' ' + f.k).split(' '); return f; });
    return offList;
  }
  function offIndia(code) {
    if (!offIdx) { if (!window.EB_OFF_INDIA) return null; offIdx = new Map(window.EB_OFF_INDIA.map(r => [r[0], r])); }
    for (const c of [code, code.length === 12 ? '0' + code : null, code.length === 13 && code[0] === '0' ? code.slice(1) : null]) {
      const r = c && offIdx.get(c); if (r) return offRow(r);
    }
    return null;
  }
  function loadOffIndia() {
    if (window.EB_OFF_INDIA || document.getElementById('offIndiaJs')) return;
    const sc = document.createElement('script'); sc.id = 'offIndiaJs'; sc.src = 'offindia.js'; sc.async = true;
    sc.onload = () => { cache = null; offIdx = null; offList = null; };
    document.head.appendChild(sc);
  }
  (window.requestIdleCallback || (fn => setTimeout(fn, 2500)))(loadOffIndia);

  let cache = null, cacheSig = '';
  function catalog() {
    let own = []; try { own = getCustomIngredients(); } catch {}
    const scanned = get(SCANNED, {});
    const sig = JSON.stringify(own).length + ':' + own.length + ':' + JSON.stringify(scanned).length;
    if (cache && sig === cacheSig) return cache;
    const out = [], seen = new Map();
    const push = f => {
      const key = f.n.toLowerCase(), words = norm(f.n + ' ' + (f.k || '')).split(' ');
      // Same name twice: keep the first (more personal) one, but pool the search words.
      if (seen.has(key)) { const a = seen.get(key); words.forEach(w => a.words.includes(w) || a.words.push(w)); return; }
      f.nn = norm(f.n); f.words = words;
      seen.set(key, f); out.push(f);
    };
    own.forEach(i => push({ id: 'c:' + (i.id || i.name), n: i.name, k: '', per: 1, units: { serving: 1 }, serving: i.unit || '1 serving',
      nut: { cal: +i.cal || 0, p: +i.p || 0, c: +i.c || 0, f: +i.f || 0, fib: +i.fib || 0 }, src: 'own' }));
    Object.entries(scanned).forEach(([code, f]) => f && f.nut && push({ ...f, id: 'b:' + code, k: (f.brand || '') + ' ' + code }));
    try {
      (window.EBAssistant ? EBAssistant.foods() : []).forEach(f => {
        const g = +f.g || 0, units = g ? servingUnit(f.serving, g) : { serving: 1 };
        // "1 roti" → the piece is called a roti ("2 roti", not "2 pieces")
        const pn = units.piece && (String(f.serving).match(/^\d+\s+([a-z]+)$/i) || [])[1];
        push({ id: 'm:' + norm(f.n).replace(/ /g, '-'), n: tidy(f.n), k: (f.k || []).join(' '), per: g || 1, units, serving: f.serving,
          pn: pn && !/^pieces?$/i.test(pn) ? pn.toLowerCase().replace(/s$/, '') : null,
          nut: { cal: +f.cal || 0, p: +f.p || 0, c: +f.c || 0, f: +f.f || 0, fib: +f.fib || 0 }, src: f.k && f.k.length > 1 || !/\(|—/.test(f.n) ? 'mf' : 'plan' });
      });
    } catch {}
    (window.EB_FOODDB || []).forEach(([id, n, k, cal, p, c, f, fib, units, src, desc]) =>
      push({ id, n, k, per: 100, units, nut: { cal, p, c, f, fib }, src, desc }));
    offFoods().forEach(f => { const key = f.n.toLowerCase(); if (!seen.has(key)) { seen.set(key, f); out.push(f); } });
    cache = out; cacheSig = sig;
    return out;
  }
  const temp = {};   // online results and closest matches, until she adds one
  const byId = id => temp[id] || catalog().find(f => f.id === id) || (id && id.slice(0, 2) === 'p:' ? offIndia(id.slice(2)) : null);

  function defaultUnit(f) {
    const u = f.units;
    return u.piece ? 'piece' : u.katori ? 'katori' : u.serving ? 'serving' : u.pack && u.pack <= 250 ? 'pack' : u.ml ? 'cup' : u.spoon && !u.cup ? 'spoon' : u.cup ? 'cup' : 'g';
  }
  const defaultAmt = unit => unit === 'g' || unit === 'ml' ? 100 : 1;
  function totals(f, amt, unit) {
    const k = (amt * (f.units[unit] || 0)) / f.per;
    const n = f.nut;
    const t = { cal: Math.round(n.cal * k), p: r1(n.p * k), c: r1(n.c * k), f: r1(n.f * k), fib: r1(n.fib * k) };
    if (n.sug != null) t.sug = r1(n.sug * k);
    if (n.na != null) t.na = Math.round(n.na * k);
    return t;
  }
  function qtyLabel(f, amt, unit) {
    if (unit === 'serving') return amt === 1 ? f.serving || '1 serving' : `${amt} × ${f.serving || 'serving'}`;
    if (unit === 'g' || unit === 'ml') return `${amt} ${unit}`;
    if (unit === 'piece' && f.pn) return `${amt} ${f.per === 100 && amt !== 1 && !/s$/.test(f.pn) ? f.pn + 's' : f.pn}`;
    if (unit === 'pack' && f.multi) return `${amt} whole pack${amt === 1 ? '' : 's'}`;
    return `${amt} ${amt === 1 ? unit : PLURAL[unit] || unit}`;
  }
  const unitText = (f, u) => {
    const w = x => `${Math.round(x * 10) / 10} ${f.units.ml ? 'ml' : 'g'}`;
    if (u === 'serving') return (f.serving || 'serving').replace(/^1\s+/, '');
    if (u === 'piece' && f.per === 100) return `${f.pn || 'piece'} (${w(f.units.piece)})`;
    if (u === 'piece' && f.pn) return f.pn;
    if (u === 'pack') return `${f.multi ? 'whole pack' : 'pack'} (${w(f.units.pack)})`;
    return u;
  };

  // "2 roti", "100g rice", "1 katori dal", "half cup milk", "2 tbsp ghee"
  const UNIT_WORDS = { g: 'g', gm: 'g', gms: 'g', gram: 'g', grams: 'g', ml: 'ml', piece: 'piece', pieces: 'piece', pc: 'piece', pcs: 'piece',
    katori: 'katori', katoris: 'katori', bowl: 'katori', bowls: 'katori', spoon: 'spoon', spoons: 'spoon', tbsp: 'spoon', tablespoon: 'spoon',
    cup: 'cup', cups: 'cup', glass: 'cup', glasses: 'cup', serving: 'serving', servings: 'serving', plate: 'serving' };
  function parse(raw) {
    let s = String(raw || '').toLowerCase().replace(/½/g, ' 0.5 ').replace(/\bhalf\b/g, '0.5').replace(/\b1\/2\b/g, '0.5').replace(/\bquarter\b/g, '0.25').trim();
    let amt = null, unit = null;
    const m = s.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?\b\s*(?:of\s+)?/);
    if (m) {
      amt = parseFloat(m[1]);
      if (m[2] && UNIT_WORDS[m[2]]) { unit = UNIT_WORDS[m[2]]; s = s.slice(m[0].length); }
      else s = s.slice(m[1].length);
    }
    return { q: norm(s), amt, unit };
  }

  // "1 bowl grandma kadhi" → "Grandma kadhi" (the name without the amount)
  function foodWords(raw) {
    const m = String(raw || '').trim().match(/^(?:\d+(?:\.\d+)?|half|½)\s*([a-z]+)?\s+(.*)$/i);
    const rest = m ? (m[1] && UNIT_WORDS[m[1].toLowerCase()] ? m[2] : (m[1] ? m[1] + ' ' : '') + m[2]) : String(raw || '').trim();
    return rest.replace(/^of\s+/i, '').replace(/^\w/, c => c.toUpperCase());
  }
  function search(q) {
    if (!q) return [];
    const ws = q.split(' ').filter(Boolean), favs = get(FAV, []), rec = get(RECENT, []).map(r => r.id);
    const rank = { own: 0, off: 0, label: 0, shared: 0, mf: 1, plan: 2, usda: 3, ifct: 3 };
    return catalog().map(f => {
      // Very short words ("gi" from ghee) must match a whole word, or "gin" turns up.
      const hit = ws.every(w => f.words.some(t => w.length < 3 ? t === w : t.startsWith(w) || (w.length > 3 && t.startsWith(w.replace(/s$/, '')))));
      if (!hit) return null;
      // Exact name, then an exact word (makkhan → Butter), then a name that starts with it.
      let s = f.nn === q ? 0 : ws.every(w => f.words.includes(w)) ? 1 : f.nn.startsWith(q) ? 2 : 3;
      if (favs.includes(f.id)) s -= 1.5; else if (rec.includes(f.id)) s -= 1;
      return [f, s * 10 + (f.bundled ? 3.5 : rank[f.src]) + (/\braw\b|\bdry\b/.test(f.nn) ? 2 : 0) + f.n.length / 100];
    }).filter(Boolean).sort((a, b) => a[1] - b[1])
      .filter((x, i, arr) => !x[0].bundled || arr.slice(0, i).filter(y => y[0].bundled).length < 8)
      .slice(0, 30).map(x => x[0]);
  }

  // ── State (kept between repaints so typing is never lost) ─────────
  const st = { d: '', slot: null, raw: '', open: null, amt: 1, unit: 'g', fix: null, create: null, edit: null, scan: null, label: null, online: null };
  function defaultSlot() {
    const h = new Date().getHours();
    return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner';
  }
  function openFood(f, pre) {
    st.open = f.id; st.fix = null; st.edit = null;
    const p = pre || {};
    st.unit = p.unit && f.units[p.unit] ? p.unit : defaultUnit(f);
    st.amt = p.amt != null && p.unit && f.units[p.unit] ? p.amt : defaultAmt(st.unit);
  }

  // ── Markup ────────────────────────────────────────────────────────
  const STAR = on => `<svg viewBox="0 0 24 24" width="20" height="20" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>`;
  const macro = t => `${t.p} g protein · ${t.c} g carbs · ${t.f} g fat${t.fib ? ` · ${t.fib} g fibre` : ''}`;

  function rowHTML(f, sub) {
    const fav = get(FAV, []).includes(f.id), open = st.open === f.id;
    const u = defaultUnit(f), t = totals(f, defaultAmt(u), u);
    return `<li class="fl-item${open ? ' open' : ''}">
      <div class="fl-line">
        <button type="button" class="fl-row" data-fl-open="${esc(f.id)}" aria-expanded="${open}">
          <span><b>${esc(f.n)}</b><small>${esc(sub || `${qtyLabel(f, defaultAmt(u), u)} · ${t.cal} cal`)}</small></span>
        </button>
        <button type="button" class="fl-star${fav ? ' on' : ''}" data-fl-fav="${esc(f.id)}" aria-pressed="${fav}" aria-label="${fav ? 'Remove from' : 'Save to'} favourites">${STAR(fav)}</button>
      </div>
      ${open ? detailHTML(f) : ''}
    </li>`;
  }

  function amountHTML(f, amt, unit) {
    const units = Object.keys(f.units);
    return `<div class="fl-amt">
        <div class="eb-stepper">
          <button type="button" class="eb-step-btn" data-fl-step="-1" aria-label="Less">−</button>
          <input class="fl-amt-in" type="number" inputmode="decimal" min="0" step="any" value="${amt}" data-fl-amt aria-label="Amount">
          <button type="button" class="eb-step-btn" data-fl-step="1" aria-label="More">+</button>
        </div>
        ${units.length > 1 ? `<select class="eb-input fl-unit" data-fl-unit aria-label="Unit">${units.map(u => `<option value="${u}"${u === unit ? ' selected' : ''}>${esc(unitText(f, u))}</option>`).join('')}</select>`
          : `<span class="fl-unit-one">${esc(unitText(f, unit))}</span>`}
      </div>`;
  }
  function totalHTML(f, t) {
    const per = f.units[st.unit] && st.unit !== 'g' && st.unit !== 'ml' && st.unit !== 'pack' && !(st.unit === 'serving' && /^(off|shared|label)$/.test(f.src)) ? `1 ${unitText(f, st.unit)} ≈ ${Math.round(f.units[st.unit])} ${f.units.ml ? 'ml' : 'g'}. ` : '';
    const shared = f.src === 'shared' && !st.fix ? (f.confirmed ? `Confirmed by ${f.votes} people’s labels. ` : 'From one person’s label, so check it against your pack. ') : '';
    const off = f.src === 'off' && !st.fix ? (f.id && f.id.slice(0, 2) === 'o:' && st.scan && st.scan.status === 'similar' ? 'Closest match, not your exact pack, so check it against the label. ' : 'Shared by volunteers, so check it against the pack. ') : '';
    const extra = [t.sug != null ? `${t.sug} g sugar` : '', t.na != null ? `${t.na} mg sodium` : ''].filter(Boolean).join(' · ');
    const disputed = f.src === 'shared' && f.flags && !st.fix ? 'Some people said these numbers don’t match their pack. ' : '';
    return `<p class="fl-total"><b>About ${t.cal} cal</b><span>${macro(t)}</span>${extra ? `<span class="fl-extra">${extra}</span>` : ''}</p>
      ${phaseNote(t)}
      <p class="fl-src">Estimate. ${st.fix ? 'Your numbers.' : `Source: ${SRC[f.src]}.`} ${disputed}${shared}${off}${f.per === 100 ? per : ''}</p>`;
  }
  // Gentle, phase-aware notes (luteal / PMS days only). Never "bad food".
  function phaseNote(t) {
    let ph = null; try { const i = getPhaseForDate(st.d || todayStr(), getCycleStart()); ph = i && i.phase; } catch {}
    let pms = false; try { pms = isPMSMode(); } catch {}
    if (ph !== 'luteal' && !pms) return '';
    const notes = [];
    if (t.na != null && t.na >= 400) notes.push('Quite salty. In this phase, less salt can mean less bloating, and water helps.');
    if (t.sug != null && t.sug >= 15) notes.push('Quite sweet. Having it with some protein keeps cravings steadier.');
    return notes.length ? `<p class="fl-phase-note">${notes.join(' ')}</p>` : '';
  }
  function fixHTML(t) {
    const v = st.fix || t;
    return `<div class="fl-fix">${[['cal', 'Calories'], ['p', 'Protein g'], ['c', 'Carbs g'], ['f', 'Fat g']].map(([k, l]) =>
      `<label><span>${l}</span><input class="eb-input" type="number" inputmode="decimal" min="0" step="any" value="${v[k]}" data-fl-fixin="${k}"></label>`).join('')}</div>`;
  }
  function detailHTML(f) {
    const t = totals(f, st.amt, st.unit);
    return `<div class="fl-detail">
      ${amountHTML(f, st.amt, st.unit)}
      <div class="fl-live">${totalHTML(f, st.fix ? { ...t, ...st.fix } : t)}</div>
      ${st.fix ? fixHTML(t) : `<button type="button" class="eb-link fl-fixlink" data-fl-fix>Numbers look off? Correct them</button>`}
      ${f.src === 'shared' && f.code && !st.fix ? `<button type="button" class="eb-link fl-fixlink" data-fl-flag="${esc(f.code)}">Different on your pack? Report it and read the label</button>` : ''}
      ${slotRadio(st.slot, 'data-fl-slot')}
      <button type="button" class="eb-btn primary fl-add" data-fl-add>Add to ${SLOT_NAME[st.slot]}</button>
    </div>`;
  }

  function createHTML() {
    const c = st.create;
    return `<div class="fl-create">
      <p class="fl-create-title">Create my own food</p>
      <p class="fl-src">It’s saved to your foods, so you can find it next time and in Plan mode too.</p>
      <label><span>Name</span><input class="eb-input" type="text" value="${esc(c.name)}" data-fl-cr="name" autocomplete="off"></label>
      <label><span>One serving is</span><input class="eb-input" type="text" value="${esc(c.unit)}" placeholder="1 bowl, 2 pieces, 1 glass" data-fl-cr="unit" autocomplete="off"></label>
      <div class="fl-fix">${[['cal', 'Calories'], ['p', 'Protein g'], ['c', 'Carbs g'], ['f', 'Fat g']].map(([k, l]) =>
        `<label><span>${l}</span><input class="eb-input" type="number" inputmode="decimal" min="0" step="any" value="${esc(c[k])}" data-fl-cr="${k}"></label>`).join('')}</div>
      <p class="fl-src">Use the label on the pack, or your best guess. You can change it later.</p>
      <p class="fl-err" id="flErr" role="alert"></p>
      ${slotRadio(st.slot, 'data-fl-slot')}
      <button type="button" class="eb-btn primary" data-fl-save-own>Save and add to ${SLOT_NAME[st.slot]}</button>
      <button type="button" class="eb-link" data-fl-cancel>Cancel</button>
    </div>`;
  }

  // Which meal: radio options shown with the food, once one is picked.
  function slotRadio(sel, attr) {
    return `<div class="fl-radio" role="radiogroup" aria-label="Which meal">${SLOTS.map(([v, t]) =>
      `<button type="button" class="fl-radio-opt${sel === v ? ' on' : ''}" ${attr}="${v}" role="radio" aria-checked="${sel === v}"><i aria-hidden="true"></i>${t}</button>`).join('')}</div>`;
  }
  let compact = false;   // Plan / Guide days: just the bar until she types or scans
  function resultsHTML() {
    if (compact) {
      if (!st.raw.trim() && !st.scan && !st.create && !st.label) return '';
      return resultsBody();
    }
    return resultsBody();
  }
  function onlineHTML() {
    const o = st.online; if (!o) return '';
    if (o.status === 'loading') return `<p class="fl-label">Packaged foods</p><p class="fl-hint" role="status">Searching packaged foods…</p>`;
    if (o.status === 'error') return `<p class="fl-label">Packaged foods</p><p class="fl-hint">Couldn’t reach the packaged-food database. ${native() ? 'Check your internet and try again.' : 'This works in the iPhone app.'}</p>`;
    if (!o.ids.length) return `<p class="fl-label">Packaged foods</p><p class="fl-hint">No packaged foods found for “${esc(o.q)}”.${native() ? ' Got the pack? Scan it or photograph its label.' : ''}</p>`;
    return `<p class="fl-label">Packaged foods · Open Food Facts</p><ul class="fl-list">${o.ids.map(id => byId(id)).filter(Boolean).map(f =>
      rowHTML(f, `${f.brand ? esc(f.brand) + ' · ' : ''}${f.nut.cal} cal per 100 ${f.units.ml ? 'ml' : 'g'}`)).join('')}</ul>`;
  }
  function resultsBody() {
    if (st.label) return labelHTML();
    if (st.create) return createHTML();
    if (st.scan) return scanHTML();
    const { q } = parse(st.raw);
    if (!q) {
      const favs = get(FAV, []).map(byId).filter(Boolean);
      const rec = get(RECENT, []).map(r => [byId(r.id), r]).filter(x => x[0] && !get(FAV, []).includes(x[0].id)).slice(0, 8);
      const shown = new Set([...favs.map(f => f.id), ...rec.map(([f]) => f.id)]);
      const packs = [];
      Object.entries(get(SCANNED, {})).sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).forEach(([k, v]) => {
        const f = v && byId(v.ref || 'b:' + k);
        if (f && !shown.has(f.id) && packs.length < 6) { shown.add(f.id); packs.push(f); }
      });
      if (!favs.length && !rec.length && !packs.length) return `<p class="fl-hint">Type what you ate, like “2 roti”, “1 katori dal”, “aloo” or “100 g paneer”, or scan a pack. Foods you add show up here next time.</p>`;
      return (favs.length ? `<p class="fl-label">Favourites</p><ul class="fl-list">${favs.map(f => rowHTML(f)).join('')}</ul>` : '')
        + (rec.length ? `<p class="fl-label">Recent</p><ul class="fl-list">${rec.map(([f, r]) => rowHTML(f, `${qtyLabel(f, r.amt, r.unit)} · ${totals(f, r.amt, r.unit).cal} cal`)).join('')}</ul>` : '')
        + (packs.length ? `<p class="fl-label">Packs you’ve scanned</p><ul class="fl-list">${packs.map(f => rowHTML(f)).join('')}</ul>` : '');
    }
    const list = search(q);
    const online = st.online && st.online.q === q ? onlineHTML()
      : (q.length >= 3 ? `<button type="button" class="eb-link fl-make" data-fl-online>Search packaged foods for “${esc(foodWords(st.raw))}”</button>` : '');
    const make = `${online}<button type="button" class="eb-link fl-make" data-fl-create>Can’t find it? Create my own food</button>`;
    if (!list.length) return `<p class="fl-hint">Nothing in the built-in list for “${esc(st.raw.trim())}”. Try a simpler word, like “dal” instead of “dal tadka”, search packaged foods, or add it yourself.</p>
      ${online}
      <button type="button" class="eb-btn secondary fl-make-btn" data-fl-create>Create “${esc(foodWords(st.raw))}” as my own food</button>`;
    return `<ul class="fl-list">${list.map(f => rowHTML(f)).join('')}</ul>${make}`;
  }

  // ── Reading a nutrition label (text from the phone's camera) ─────
  // rows: one string per line of the panel, cells joined by " | ".
  // Indian labels: "Nutritional information per 100 g | per serve (30 g)".
  function parseLabel(rows) {
    const L = (rows || []).map(r => String(r).toLowerCase()
      .replace(/(\d),(\d)/g, '$1.$2').replace(/\bkca[il1]\b/g, 'kcal').replace(/\bkj\b/g, 'kj')
      .replace(/(\d)\s*o\b/g, '$10').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const all = L.join(' \n ');
    // Which column is per 100 g? Compare where "100 g" and "per serve" appear in the header.
    let col = 0;
    const head = L.find(r => /100\s*(g|gm|ml)/.test(r) && /(serv|pack|piece|portion|biscuit|bar|cup)/.test(r));
    if (head) col = head.search(/100\s*(g|gm|ml)/) < head.search(/(serv|pack|piece|portion|biscuit|bar|cup)/) ? 0 : 1;
    const nums = (text) => {
      const out = [], re = /(\d+(?:\.\d+)?)\s*(%|kcal|kj|mg|mcg|µg|g|ml)?/g; let m;
      while ((m = re.exec(text))) { if (m[2] === '%' || m[2] === 'mg' || m[2] === 'mcg' || m[2] === 'µg') continue; out.push({ v: +m[1], u: m[2] || '' }); }
      return out;
    };
    const after = (row, re) => { const m = row.match(re); return m ? row.slice(m.index + m[0].length) : ''; };
    const pick = (list) => list.length ? (list[col] || list[0]).v : null;
    const find = (re, not) => L.find(r => re.test(r) && !(not && not.test(r)));
    const value = (re, not) => { const r = find(re, not); return r ? pick(nums(after(r, re)).filter(n => n.u !== 'kcal' && n.u !== 'kj')) : null; };

    // Energy: prefer kcal; kJ only if that's all there is.
    let cal = null;
    for (const r of L.filter(r => /energy|calori|kcal/.test(r) && !/from fat/.test(r))) {
      const n = nums(after(r, /energy|calories|calorie|kcal/));
      const kcal = n.filter(x => x.u === 'kcal'), kj = n.filter(x => x.u === 'kj'), bare = n.filter(x => !x.u);
      if (kcal.length) { cal = pick(kcal); break; }
      if (/kcal|calori/.test(r) && bare.length) { cal = pick(bare); break; }
      if (kj.length && cal == null) cal = Math.round(pick(kj) / 4.184);
      else if (/kj/.test(r) && bare.length && cal == null) cal = Math.round(pick(bare) / 4.184);
      else if (bare.length && cal == null) { const v = pick(bare); cal = v > 900 ? Math.round(v / 4.184) : v; }
    }
    const p = value(/protein/);
    const c = value(/carbohydrates?|carbs?\b/, /sugar|of which|fib/);
    const f = value(/total fat|\bfat\b/, /saturated|trans|mono|poly|unsat|from fat/);
    const fib = value(/fib(re|er)/);
    const sug = value(/total sugars?|\bsugars?\b/, /added|alcohol|free from|no added/) ?? value(/added sugars?/);
    // Sodium is printed in mg (sometimes salt in g: sodium = salt ÷ 2.5).
    let na = null;
    const naRow = find(/sodium/);
    if (naRow) {
      const all2 = [], re2 = /(\d+(?:\.\d+)?)\s*(%|mg|g)?/g; let m2; const t2 = after(naRow, /sodium/);
      while ((m2 = re2.exec(t2))) { if (m2[2] !== '%') all2.push({ v: +m2[1], u: m2[2] || '' }); }
      const v = all2.length ? (all2[col] || all2[0]) : null;
      if (v) na = Math.round(v.u === 'g' ? v.v * 1000 : v.v);
    } else {
      const salt = value(/\bsalt\b/);
      if (salt != null) na = Math.round(salt / 2.5 * 1000);
    }
    const sv = all.match(/(?:per\s*)?serv(?:ing|e)(?:\s*size)?[^0-9\n]{0,14}(\d+(?:\.\d+)?)\s*(g|gm|ml)\b/);
    const pk = all.match(/net\s*(?:wt|weight|quantity|qty|contents?|vol(?:ume)?)\.?[^0-9\n]{0,12}(\d+(?:\.\d+)?)\s*(kg|g|gm|ml|l|ltr)\b/);
    const liquid = /100\s*ml/.test(all) || (pk && /ml|l|ltr/.test(pk[2]));
    const pack = pk ? (+pk[1]) * (/^(kg|l|ltr)$/.test(pk[2]) ? 1000 : 1) : null;
    const out = { cal, p, c, f, fib, sug, na, serving: sv ? +sv[1] : null, pack, liquid: !!liquid, worked: false };
    if (out.cal == null && p != null && c != null && f != null) { out.cal = Math.round(4 * p + 4 * c + 9 * f); out.worked = true; }
    // Pieces: "per serve (2 biscuits, 20 g)", "1 bar (40 g)"; multipacks: "4 x 70 g".
    const PIECE = '(biscuits?|cookies?|pieces?|pcs|bars?|sachets?|cubes?|slices?|cakes?|wafers?|candies|candy|chocolates?|packets?|pouches?|scoops?|tablets?|rusks?|khakhras?|nuggets?|cups?|sticks?)';
    const pc = all.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + PIECE + '\\b[^0-9\\n]{0,10}(\\d+(?:\\.\\d+)?)\\s*(g|gm|ml)\\b'))
      || all.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*(g|gm|ml)\\b\\s*\\)?\\s*[(/=,-]?\\s*(?:approx\\.?\\s*)?(\\d+(?:\\.\\d+)?)\\s*' + PIECE + '\\b'));
    if (pc) {
      const [count, word, grams] = /\d/.test(pc[2]) || /^(g|gm|ml)$/.test(pc[2]) ? [+pc[3], pc[4], +pc[1]] : [+pc[1], pc[2], +pc[3]];
      if (count > 0 && grams > 0) { out.pieceG = Math.round(grams / count * 10) / 10; out.pieceName = word.replace(/ies$/, 'y').replace(/(?<!s)s$/, '').replace(/^pcs?$/, 'piece'); }
    }
    const mp = all.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(g|gm|ml)\b/);
    if (mp && +mp[1] > 1) { out.pieceG = +mp[2]; out.pieceName = 'single pack'; out.multi = true; if (!out.pack) out.pack = +mp[1] * +mp[2]; }
    // Per-serve-only labels: convert to per 100 g using the serve size.
    const has100 = /(per\s*)?100\s*(g|gm|ml)\b/.test(all);
    out.basis = has100 ? '100' : 'unknown';
    if (!has100 && out.serving) {
      const k = 100 / out.serving;
      ['cal', 'p', 'c', 'f', 'fib', 'sug'].forEach(x => { if (out[x] != null) out[x] = Math.round(out[x] * k * 10) / 10; });
      if (out.na != null) out.na = Math.round(out.na * k);
      if (out.cal != null) out.cal = Math.round(out.cal);
      out.basis = '100'; out.converted = out.serving;
    }
    out.found = ['cal', 'p', 'c', 'f'].filter(k => out[k] != null).length;
    return out;
  }

  // ── Barcode scan ──────────────────────────────────────────────────
  const BARCODE = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/></svg>`;
  const native = () => !!(window.EBNative && EBNative.native);

  // Open Food Facts product → a food in the same shape as everything else.
  function fromOFF(p) {
    const n = (p && p.nutriments) || {};
    const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
    let kcal = num(n['energy-kcal_100g']);
    if (kcal == null && num(n['energy-kj_100g']) != null) kcal = num(n['energy-kj_100g']) / 4.184;
    if (kcal == null && num(n.energy_100g) != null) kcal = num(n.energy_100g) / 4.184;
    if (kcal == null) return null;
    const brand = String(p.brands || '').split(',')[0].trim();
    let name = String(p.product_name || p.generic_name || '').replace(/\b\d+(\.\d+)?\s*(g|gm|gms|grm|gram|grams|kg|ml|l|ltr)\b\.?/gi, '')
      .replace(/\b(pc|pcs|pkt)\b\.?/gi, '').replace(/\s+/g, ' ').trim();
    if (!name) name = brand || 'Scanned product';
    else if (brand && !name.toLowerCase().includes(brand.toLowerCase())) name = `${brand} ${name}`;
    const qtxt = String(p.quantity || '') + ' ' + String(p.serving_size || '');
    const cats = Array.isArray(p.categories_tags) ? p.categories_tags.join(' ') : String(p.categories_tags || '');
    const liquid = /\d\s*(ml|l|ltr|cl|fl\.?\s?oz)\b/i.test(qtxt) || /en:(beverages|drinks|waters|juices|sodas|soft-drinks|milks)\b/.test(cats);
    const units = liquid ? { ml: 1 } : { g: 1 };
    let pack = num(p.product_quantity); const sq = num(p.serving_quantity);
    const mp = String(p.quantity || '').match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(g|ml)\b/i);
    let multi = false, pn = null;
    if (mp && +mp[1] > 1) { units.piece = +mp[2]; pn = 'single pack'; multi = true; if (!(pack > 0)) pack = +mp[1] * +mp[2]; }
    if (pack > 0 && pack <= 5000) units.pack = pack;
    if (sq > 0 && sq !== pack && sq !== units.piece) units.serving = sq;
    let na = num(n.sodium_100g); if (na == null && num(n.salt_100g) != null) na = num(n.salt_100g) / 2.5;
    return { n: name, brand, code: p.code || null, india: (p.countries_tags || []).includes('en:india'), per: 100, units, src: 'off', pn, multi,
      serving: units.serving ? `1 serving (${Math.round(sq)} ${liquid ? 'ml' : 'g'})` : null,
      nut: { cal: Math.round(kcal), p: r1(num(n.proteins_100g)), c: r1(num(n.carbohydrates_100g)), f: r1(num(n.fat_100g)), fib: r1(num(n.fiber_100g)),
        sug: num(n.sugars_100g) == null ? null : r1(num(n.sugars_100g)), na: na == null ? null : Math.round(na * 1000) } };
  }
  function remember_scan(code, food) {
    const all = get(SCANNED, {}); all[code] = { ...food, at: Date.now() };
    const keys = Object.keys(all).sort((a, b) => (all[b].at || 0) - (all[a].at || 0));
    keys.slice(200).forEach(k => delete all[k]);   // keep it small
    put(SCANNED, all); cache = null;
  }
  function showFound(code) {
    const known = get(SCANNED, {})[code];
    const f = byId(known && known.ref ? known.ref : 'b:' + code); if (!f) return false;
    st.scan = { status: 'found', code, id: f.id }; openFood(f);
    return true;
  }
  const getJSON = (url) => window.EBNative && EBNative.getJSON ? EBNative.getJSON(url) : fetch(url).then(r => r.json());
  const OFF_FIELDS = 'code,product_name,generic_name,brands,quantity,product_quantity,serving_size,serving_quantity,nutriments,countries_tags,categories_tags';
  // The same pack can be printed as 12 or 13 digits (UPC-A vs EAN-13).
  const variants = code => [...new Set([code, code.length === 12 ? '0' + code : null, code.length === 13 && code[0] === '0' ? code.slice(1) : null].filter(Boolean))];

  async function offProduct(code) {
    for (const c of variants(code)) {
      try {
        const j = await getJSON(`https://world.openfoodfacts.org/api/v2/product/${c}.json?fields=${OFF_FIELDS}`);
        if (j && j.status === 1 && j.product) return { ...j.product, code: j.product.code || c };
      } catch (e) { if (!e.status || e.status >= 500) throw e; }
    }
    return null;
  }
  // Product name for a barcode Open Food Facts doesn't know (UPCitemdb, 100 free lookups a day).
  async function barcodeName(code) {
    try {
      const j = await getJSON(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`);
      const it = j && j.items && j.items[0]; if (!it) return null;
      const t = String(it.title || '').replace(/\(.*?\)/g, ' ').replace(/\+.*$/, '').replace(/\b(free|shipping|pack of \d+|combo)\b.*$/i, '').trim();
      return [it.brand, t].filter(Boolean).join(' ').trim() || null;
    } catch { return null; }
  }
  // Packaged foods by name, best first: same words, same brand, sold in India, has calories.
  async function searchPackaged(q, brand) {
    const j = await getJSON(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=30&fields=${OFF_FIELDS}`);
    const words = norm(q.replace(/\b\d+(\.\d+)?\s*(g|gm|kg|ml|l|ltr)\b/gi, '')).split(' ').filter(w => w.length > 2);
    const b = norm(brand || '');
    const seen = new Set();
    return (j && j.hits || []).map(p => {
      const f = fromOFF({ ...p, brands: Array.isArray(p.brands) ? p.brands.join(', ') : p.brands });
      if (!f) return null;
      const key = norm(f.n) + ':' + f.nut.cal; if (seen.has(key)) return null; seen.add(key);
      const hay = norm(f.n + ' ' + (f.brand || ''));
      const hit = words.filter(w => hay.includes(w)).length;
      if (words.length && hit < Math.ceil(words.length / 2)) return null;
      const score = hit * 2 + (f.india ? 1.5 : 0) + (b && hay.includes(b.split(' ')[0]) ? 2 : 0);
      return [f, score];
    }).filter(Boolean).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([f]) => f);
  }
  function holdTemp(f) { const id = 'o:' + (f.code || norm(f.n).replace(/ /g, '-')); temp[id] = { ...f, id }; return id; }
  // Adding an online result saves it locally (and links the scanned barcode to it).
  function persistTemp(f, scannedCode) {
    if (!f || f.id.slice(0, 2) !== 'o:') return f;
    const code = f.code || ('p' + Date.now());
    const { id, nn, words, ...food } = f;
    remember_scan(code, food);
    if (scannedCode && scannedCode !== code) remember_scan(scannedCode, { ref: 'b:' + code });
    return byId('b:' + code) || f;
  }

  // A row from Menu-fi's shared pack database → a food.
  function fromShared(r) {
    if (!r || r.cal == null) return null;
    // Disputed: more "wrong numbers" reports than labels backing it. Skip it.
    if ((r.flags || 0) >= Math.max(2, (r.confirmations || 1) + 1)) return null;
    const u = r.per_unit === 'ml' ? 'ml' : 'g', units = { [u]: 1 };
    if (+r.pack > 0) units.pack = +r.pack;
    if (+r.serving > 0 && +r.serving !== +r.pack) units.serving = +r.serving;
    return { n: r.name, code: r.barcode, per: 100, units, src: 'shared', confirmed: (r.confirmations || 1) >= 2 && !(r.flags > 0), votes: r.confirmations || 1, flags: r.flags || 0,
      serving: units.serving ? `1 serving (${+r.serving} ${u})` : null,
      nut: { cal: Math.round(+r.cal), p: r1(r.protein), c: r1(r.carbs), f: r1(r.fat), fib: r1(r.fibre),
        sug: r.sugar == null ? null : r1(r.sugar), na: r.sodium == null ? null : Math.round(+r.sodium) } };
  }

  async function lookup(raw) {
    const code = String(raw || '').replace(/\D/g, '');
    if (code.length < 8) { st.scan = { status: 'enter', code, err: 'A barcode has 8 to 13 numbers.' }; return paintResults(); }
    Object.assign(st, { raw: '', create: null, open: null, fix: null, label: null, online: null });
    const s = $('flSearch'); if (s) s.value = '';
    if (showFound(code)) { track('found_saved'); return paintResults(); }
    st.scan = { status: 'loading', code, msg: 'Looking it up…' }; paintResults();
    const still = () => st.scan && st.scan.code === code;
    // Menu-fi's shared pack labels first: read from real packs by other people.
    // Waits at most 0.6 s for it when the pack is also in the bundled list.
    const bundledFirst = offIndia(code);
    try {
      const ask = window.EBSync && EBSync.lookupProduct ? EBSync.lookupProduct(code) : Promise.resolve(null);
      const row = bundledFirst ? await Promise.race([ask, new Promise(r => setTimeout(() => r(null), 600))]) : await ask;
      const sh = fromShared(row);
      if (!still()) return;
      if (sh) { remember_scan(code, sh); showFound(code); track('found_shared'); return paintResults(); }
    } catch {}
    // Open Food Facts India, bundled in the app: instant and works offline.
    const bundled = offIndia(code);
    if (bundled) { st.scan = { status: 'found', code, id: bundled.id }; openFood(bundled); track('found_bundled'); return paintResults(); }
    let p = null;
    try { p = await offProduct(code); }
    catch { if (!still()) return; st.scan = { status: 'error', code }; track('error'); return paintResults(); }
    if (!still()) return;
    const food = p && fromOFF(p);
    if (food) { remember_scan(code, food); showFound(code); track('found'); return paintResults(); }
    // Not this exact pack: find it by name and offer the closest matches.
    let name = '';
    if (p) {
      const pn = String(p.product_name || p.generic_name || '').trim(), br = String(p.brands || '').split(',')[0].trim();
      name = br && !pn.toLowerCase().includes(br.toLowerCase()) ? `${br} ${pn}`.trim() : pn || br;
    }
    if (!name) { st.scan = { status: 'loading', code, msg: 'Not in the main database. Checking other sources…' }; paintResults(); name = await barcodeName(code) || ''; }
    if (!still()) return;
    let cands = [];
    if (name) {
      st.scan = { status: 'loading', code, msg: `Finding “${name}”…` }; paintResults();
      try { cands = await searchPackaged(name, p && p.brands); } catch {}
      if (!still()) return;
    }
    st.scan = cands.length ? { status: 'similar', code, name, ids: cands.map(holdTemp) } : { status: 'missing', code, name, known: !!p };
    track(cands.length ? 'similar' : 'missing');
    paintResults();
  }
  // Photo of the nutrition panel → the "add from label" form, filled in.
  async function readLabel(source) {
    const sc = st.scan, base = { code: sc && sc.code || null, name: (sc && sc.name) || foodWords(st.raw) || '' };
    try {
      const r = await EBNative.readLabel(source);
      if (!r || r.cancelled) return;
      const v = parseLabel(r.rows || []);
      st.label = { ...base, cal: v.cal ?? '', p: v.p ?? '', c: v.c ?? '', f: v.f ?? '', fib: v.fib ?? '', sug: v.sug ?? '', na: v.na ?? '',
        pack: v.pack ?? '', serving: v.serving ?? '', pieceG: v.pieceG ?? '', pieceName: v.pieceName || '', multi: !!v.multi,
        basis: v.basis === '100' ? '100' : 'unknown', converted: v.converted || null, liquid: v.liquid, read: v.found, worked: v.worked, img: r.image || null };
      window.EBAnalytics && EBAnalytics.track('label_read', { found: v.found });
    } catch (e) {
      if (/DENIED/i.test(e && (e.code || e.message))) { st.scan = { status: 'denied', code: base.code }; return paintResults(); }
      st.label = { ...base, cal: '', p: '', c: '', f: '', fib: '', sug: '', na: '', pack: '', serving: '', pieceG: '', pieceName: '', basis: '100', liquid: false, read: 0 };
    }
    st.scan = null; st.create = null; st.open = null;
    paintResults();
  }
  function labelHTML() {
    const L = st.label, u = L.liquid ? 'ml' : 'g';
    const msg = L.read >= 4 ? 'Read from your photo. Check each number against the pack before saving.'
      : L.read > 0 ? 'Some numbers couldn’t be read. Fill in the empty ones from the pack.'
      : L.read === 0 ? 'The photo couldn’t be read. Type the numbers from the pack, or try a sharper, straight-on photo.'
      : 'Type the numbers from the pack’s nutrition table.';
    const field = (k, l, type = 'number') => `<label><span>${l}</span><input class="eb-input" type="${type}" ${type === 'number' ? 'inputmode="decimal" min="0" step="any"' : 'autocomplete="off"'} value="${esc(L[k])}" data-fl-lb="${k}"></label>`;
    const per = L.basis === 'serve' ? 'per serving' : `per 100 ${u}`;
    return `<div class="fl-create">
      <div class="fl-scan-head"><p class="fl-label">From the pack label</p><button type="button" class="fl-scan-x" data-fl-lbx aria-label="Close">×</button></div>
      ${L.img ? `<button type="button" class="fl-photo" data-fl-photo aria-label="Show the photo bigger"><img src="${L.img}" alt="Your photo of the nutrition label"></button>` : ''}
      <p class="fl-src">${msg}${L.worked ? ' Calories were worked out from protein, carbs and fat.' : ''}${L.converted ? ` This label only showed per serve (${L.converted} ${u}), so the numbers were converted to per 100 ${u}.` : ''}</p>
      <label><span>Name</span><input class="eb-input" type="text" value="${esc(L.name)}" data-fl-lb="name" autocomplete="off" placeholder="e.g. Maggi masala noodles"></label>
      <div class="eb-seg fl-slots-sm" role="radiogroup" aria-label="Solid or drink">
        <button type="button" class="eb-seg-btn${L.liquid ? '' : ' on'}" data-fl-lbu="g" role="radio" aria-checked="${!L.liquid}">Food (g)</button>
        <button type="button" class="eb-seg-btn${L.liquid ? ' on' : ''}" data-fl-lbu="ml" role="radio" aria-checked="${!!L.liquid}">Drink (ml)</button></div>
      <p class="fl-src fl-q">${L.basis === 'unknown' ? '<b>Check:</b> are the numbers on this label ' : 'The numbers are '}</p>
      <div class="eb-seg fl-slots-sm" role="radiogroup" aria-label="Numbers are per">
        <button type="button" class="eb-seg-btn${L.basis === 'serve' ? '' : ' on'}" data-fl-lbb="100" role="radio" aria-checked="${L.basis !== 'serve'}">Per 100 ${u}</button>
        <button type="button" class="eb-seg-btn${L.basis === 'serve' ? ' on' : ''}" data-fl-lbb="serve" role="radio" aria-checked="${L.basis === 'serve'}">Per serving</button></div>
      <div class="fl-fix">${field('cal', `Calories ${per}`)}${field('p', 'Protein g')}${field('c', 'Carbs g')}${field('f', 'Fat g')}${field('fib', 'Fibre g')}${field('sug', 'Sugar g')}${field('na', 'Sodium mg')}${field('serving', `Serving ${u}${L.basis === 'serve' ? '' : ' (optional)'}`)}${field('pack', `Pack size ${u}`)}${field('pieceG', `One piece ${u} (optional)`)}${field('pieceName', 'Piece is called', 'text')}</div>
      <p class="fl-err" id="flErr" role="alert"></p>
      ${L.code ? `<p class="fl-src">${window.EBSync && EBSync.signedIn && EBSync.signedIn() ? 'Saving also shares this pack’s barcode and numbers with other Menu-fi users, so their scan finds it. Nothing about you is shared.' : 'Once you sign in, this pack is shared with other Menu-fi users so their scan finds it. Nothing about you is shared.'}</p>` : ''}
      <button type="button" class="eb-btn primary" data-fl-lbsave>Save, then pick how much</button>
      ${native() ? `<button type="button" class="eb-link" data-fl-label="camera">Retake the photo</button>` : ''}
    </div>`;
  }
  function saveLabel() {
    const L = st.label, err = $('flErr'), n = k => (L[k] === '' || L[k] == null || isNaN(+L[k])) ? null : +L[k];
    if (!String(L.name).trim()) { err.textContent = 'Give it a name first.'; return; }
    if (n('cal') == null) { err.textContent = 'Add the calories from the label.'; return; }
    if (L.basis === 'serve' && !(n('serving') > 0)) { err.textContent = 'Add the serving size, so the numbers can be worked out per 100.'; return; }
    // Everything is stored per 100 g/ml; per-serving labels are converted here.
    const k = L.basis === 'serve' ? 100 / n('serving') : 1, sc = key => n(key) == null ? null : n(key) * k;
    const u = L.liquid ? 'ml' : 'g', units = { [u]: 1 };
    if (n('pieceG') > 0) units.piece = n('pieceG');
    if (n('pack') > 0) units.pack = n('pack');
    if (n('serving') > 0 && n('serving') !== n('pack') && n('serving') !== n('pieceG')) units.serving = n('serving');
    const food = { n: String(L.name).trim().replace(/^\w/, c => c.toUpperCase()), per: 100, units, src: 'label', code: L.code || null,
      pn: units.piece ? (String(L.pieceName || '').trim().toLowerCase() || 'piece') : null, multi: !!(L.multi && units.piece),
      serving: units.serving ? `1 serving (${n('serving')} ${u})` : null,
      nut: { cal: Math.round(sc('cal')), p: r1(sc('p')), c: r1(sc('c')), f: r1(sc('f')), fib: r1(sc('fib')),
        sug: sc('sug') == null ? null : r1(sc('sug')), na: sc('na') == null ? null : Math.round(sc('na')) } };
    const key = L.code || ('label' + Date.now());
    remember_scan(key, food);
    // Share it (barcode + numbers only). Queued, so no internet or no sign-in yet doesn't lose it.
    if (L.code) {
      queueShare(L.code, { name: food.n, per: u, cal: food.nut.cal, p: food.nut.p, c: food.nut.c, f: food.nut.f, fib: food.nut.fib,
        sug: food.nut.sug, na: food.nut.na, pack: n('pack'), serving: n('serving') });
      flushShares();
    }
    window.EBAnalytics && EBAnalytics.track('label_saved', { barcode: !!L.code, converted: L.basis === 'serve' || !!L.converted });
    st.label = null;
    showFound(key);
    paintResults();
    EB.toast && EB.toast(`${food.n} saved. Now pick how much.`);
  }

  // ── Sharing queue: label shares wait here for internet and sign-in ──
  function queueShare(code, data) {
    put(QUEUE, get(QUEUE, []).filter(x => x.code !== code).concat({ code, data, at: Date.now() }).slice(-50));
  }
  let flushing = false;
  async function flushShares() {
    if (flushing || navigator.onLine === false || !(window.EBSync && EBSync.signedIn && EBSync.signedIn())) return;
    const q = get(QUEUE, []); if (!q.length) return;
    flushing = true;
    const left = [];
    for (const it of q) {
      try { await EBSync.submitLabel(it.code, it.data); window.EBAnalytics && EBAnalytics.track('label_shared'); }
      catch (e) {
        // The database said no (bad values): drop it. Anything else (network): try later.
        if (!/^(P0001|23514|22P02)$/.test(String(e && e.code || ''))) left.push(it);
      }
    }
    put(QUEUE, left.concat(get(QUEUE, []).filter(x => !q.some(y => y.code === x.code))));
    flushing = false;
  }
  window.addEventListener('online', flushShares);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') flushShares(); });
  setTimeout(flushShares, 6000);

  const track = result => window.EBAnalytics && EBAnalytics.track('barcode_scanned', { result });
  async function startScan() {
    st.create = null; st.edit = null;
    if (!native()) { st.scan = { status: 'enter', code: '' }; paintResults(); const i = $('flCode'); if (i) i.focus(); return; }
    try {
      const r = await EBNative.scanBarcode();
      if (r && r.code) return lookup(r.code);
    } catch (e) {
      const code = e && (e.code || e.message);
      st.scan = { status: /DENIED/i.test(code) ? 'denied' : /NO_CAMERA/i.test(code) ? 'enter' : 'error', code: '' };
      paintResults();
    }
  }
  function scanHTML() {
    const sc = st.scan, close = `<button type="button" class="fl-scan-x" data-fl-scanx aria-label="Close">×</button>`;
    const head = t => `<div class="fl-scan-head"><p class="fl-label">${t}</p>${close}</div>`;
    if (sc.status === 'enter') return `<div class="fl-scanbox">${head('Barcode')}
        <label class="fl-create"><span class="fl-src">Type the numbers printed under the barcode.${native() ? '' : ' Scanning with the camera works in the iPhone app.'}</span>
        <input class="eb-input" id="flCode" type="text" inputmode="numeric" autocomplete="off" maxlength="14" value="${esc(sc.code)}" placeholder="8901234567890"></label>
        ${sc.err ? `<p class="fl-err">${esc(sc.err)}</p>` : ''}
        <button type="button" class="eb-btn primary fl-add" data-fl-lookup>Look it up</button></div>`;
    const labelBtns = (primary) => native()
      ? `<button type="button" class="eb-btn ${primary ? 'primary fl-add' : 'secondary fl-make-btn'}" data-fl-label="camera">Photograph the nutrition label</button>
         <button type="button" class="eb-link fl-make" data-fl-label="photos">Use a photo you already took</button>
         <button type="button" class="eb-link fl-make" data-fl-labeltype>Type the numbers instead</button>`
      : `<button type="button" class="eb-btn ${primary ? 'primary fl-add' : 'secondary fl-make-btn'}" data-fl-labeltype>Add it from the pack label</button>`;
    if (sc.status === 'loading') return `<div class="fl-scanbox">${head('Barcode')}<p class="fl-hint" role="status">${esc(sc.msg || 'Looking it up…')}</p></div>`;
    if (sc.status === 'similar') return `<div class="fl-scanbox">${head('Closest matches')}
        <p class="fl-hint">This exact pack has no nutrition in the database${sc.name ? ` (“${esc(sc.name)}”)` : ''}. These look like it. Pick one and check the numbers against your pack.</p>
        <ul class="fl-list">${sc.ids.map(id => byId(id)).filter(Boolean).map(f => rowHTML(f, `${f.brand ? esc(f.brand) + ' · ' : ''}${f.nut.cal} cal per 100 ${f.units.ml ? 'ml' : 'g'}`)).join('')}</ul>
        ${labelBtns(false)}</div>`;
    if (sc.status === 'found') {
      const f = byId(sc.id);
      return `<div class="fl-scanbox">${head('Scanned')}<ul class="fl-list">${f ? rowHTML(f) : ''}</ul>
        <button type="button" class="eb-link fl-make" data-fl-scan>Scan another</button></div>`;
    }
    if (sc.status === 'denied') return `<div class="fl-scanbox">${head('Barcode')}
        <p class="fl-hint">Camera access is off for Menu-fi. Turn it on in the iPhone Settings app → Menu-fi → Camera, or type the numbers instead.</p>
        <button type="button" class="eb-btn secondary fl-make-btn" data-fl-type>Type the barcode</button></div>`;
    if (sc.status === 'error') return `<div class="fl-scanbox">${head('Barcode')}
        <p class="fl-hint">Couldn’t reach the food database. Check your internet and try again, or read the pack label instead.</p>
        <button type="button" class="eb-btn secondary fl-make-btn" data-fl-retry>Try again</button>
        ${labelBtns(false)}</div>`;
    return `<div class="fl-scanbox">${head('Barcode')}
        <p class="fl-hint">${sc.name ? `Found “${esc(sc.name)}”, but no nutrition for it anywhere yet.` : 'This pack isn’t in any food database yet.'} Read the label once and the next scan finds it.</p>
        ${labelBtns(true)}</div>`;
  }

  // Logged today, grouped by meal, each entry editable.
  function entries(d) {
    let log = {}; try { log = getSlotLog(d); } catch {}
    const out = [];
    Object.keys(log).forEach(slot => (Array.isArray(log[slot]) ? log[slot] : log[slot] ? [log[slot]] : [])
      .forEach((m, i) => m && m.name && out.push({ slot, i, m })));
    return out;
  }
  function entryHTML({ slot, i, m }) {
    const key = slot + ':' + i, ed = st.edit && st.edit.key === key;
    const src = m.src ? SRC[m.src] || m.src : '';
    return `<li class="fl-entry${ed ? ' open' : ''}">
      <div class="fl-line">
        <button type="button" class="fl-row" data-fl-edit="${esc(key)}" aria-expanded="${ed}">
          <span><b>${m.name}</b><small>${m.qty ? esc(plain(m.qty)) + ' · ' : ''}Estimate${src ? ` · ${esc(src)}` : ''}</small></span>
          <em>${Math.round(m.cal || 0)} cal</em>
        </button>
        <button type="button" class="fl-del" data-fl-del="${esc(key)}" aria-label="Remove ${esc(plain(m.name))}">×</button>
      </div>
      ${ed ? editHTML(m) : ''}
    </li>`;
  }
  function editHTML(m) {
    const e = st.edit, f = e.food;
    return `<div class="fl-detail">
      ${slotRadio(e.slot, 'data-fl-eslot')}
      ${f && !e.fix ? amountHTML(f, e.amt, e.unit) + `<div class="fl-live">${totalHTML(f, totals(f, e.amt, e.unit))}</div>
          <button type="button" class="eb-link fl-fixlink" data-fl-efix>Numbers look off? Correct them</button>`
        : `<div class="fl-fix">${[['cal', 'Calories'], ['p', 'Protein g'], ['c', 'Carbs g'], ['f', 'Fat g']].map(([k, l]) =>
          `<label><span>${l}</span><input class="eb-input" type="number" inputmode="decimal" min="0" step="any" value="${e.fix[k]}" data-fl-efixin="${k}"></label>`).join('')}</div>
          <p class="fl-src">Estimate. Change any number to match your portion or the pack label.</p>`}
      <button type="button" class="eb-btn primary" data-fl-esave>Save</button>
      <button type="button" class="eb-link" data-fl-ecancel>Cancel</button>
    </div>`;
  }
  function loggedHTML(d) {
    const all = entries(d);
    if (!all.length) return `<p class="app-log-empty">Nothing logged yet today.</p>`;
    const order = SLOTS.map(s => s[0]).concat([...new Set(all.map(e => e.slot))].filter(s => !SLOT_NAME[s]));
    return `<div class="fl-logged">${order.map(slot => {
      const rows = all.filter(e => e.slot === slot); if (!rows.length) return '';
      const cal = rows.reduce((s, e) => s + (+e.m.cal || 0), 0);
      return `<div class="fl-meal"><p class="fl-label"><span>${esc(SLOT_NAME[slot] || slot)}</span><span>${Math.round(cal)} cal</span></p>
        <ul class="fl-list">${rows.map(entryHTML).join('')}</ul></div>`;
    }).join('')}</div>`;
  }

  function html(d, opts) {
    if (st.d !== d) { Object.assign(st, { d, raw: '', open: null, fix: null, create: null, edit: null, scan: null }); }
    if (!st.slot) st.slot = defaultSlot();
    compact = !!(opts && opts.compact);
    const bar = `<label class="fl-search">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="flSearch" type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
          placeholder="Search food, e.g. 2 roti" value="${esc(st.raw)}" aria-label="Search food">
        <button type="button" class="fl-clear" data-fl-clear aria-label="Clear search">×</button>
        <button type="button" class="fl-scan" data-fl-scan aria-label="Scan a barcode">${BARCODE}</button>
      </label>`;
    if (compact) return `<div class="fl fl-compact" id="foodLog">${bar}<div id="flResults" class="fl-results">${resultsHTML()}</div></div>`;
    return `<div class="fl" id="foodLog">
      ${bar}
      <div id="flResults" class="fl-results">${resultsHTML()}</div>
      <p class="fl-label fl-logged-head">Logged today</p>
      ${loggedHTML(d)}
      <p class="app-muted small fl-note">All numbers are estimates from USDA FoodData Central, IFCT 2017 (National Institute of Nutrition), Open Food Facts or typical home recipes. General guidance, not medical advice.</p>
    </div>`;
  }

  // ── Actions ───────────────────────────────────────────────────────
  let focusAfter = false;
  function repaint(keepFocus) {
    focusAfter = !!keepFocus;
    if (window.EBDayMode && EBDayMode.refresh) EBDayMode.refresh(); else if (window.EBDayMode) EBDayMode.paint();
  }
  function paintResults() { const r = $('flResults'); if (r) r.innerHTML = resultsHTML(); }
  function mounted() {
    if (!focusAfter) return; focusAfter = false;
    const s = $('flSearch'); if (s) { s.focus(); try { s.setSelectionRange(s.value.length, s.value.length); } catch {} }
  }
  function remember(id, amt, unit) {
    put(RECENT, [{ id, amt, unit }].concat(get(RECENT, []).filter(r => r.id !== id)).slice(0, 15));
  }
  function addEntry(entry, slot) {
    const d = st.d, log = getSlotLog(d);
    if (!Array.isArray(log[slot])) log[slot] = log[slot] ? [log[slot]] : [];
    log[slot].push(entry);
    setSlotLog(d, log);
    // Lock the day in whatever mode it's in (searching on a Plan day keeps it Plan).
    const mode = window.EBDayMode ? EBDayMode.modeFor(d) : 'log';
    try { localStorage.setItem('dayMode_' + d, JSON.stringify(mode)); } catch {}
  }
  function liveUpdate(box, f, amt, unit, fix) {
    const t = totals(f, amt, unit), live = box && box.querySelector('.fl-live');
    if (live) live.innerHTML = totalHTML(f, fix ? { ...t, ...fix } : t);
  }
  const stepOf = (unit, amt, dir) => {
    const s = unit === 'g' || unit === 'ml' ? (amt >= 100 ? 25 : 10) : 0.5;
    return Math.max(s, Math.round((amt + dir * s) / s) * s);
  };

  document.addEventListener('click', e => {
    const t = e.target, root = t.closest('#foodLog'); if (!root) return;
    const at = sel => t.closest(sel);
    let n;
    if ((n = at('[data-fl-slot]'))) { st.slot = n.dataset.flSlot; return paintResults(); }
    if (at('[data-fl-scan]')) return startScan();
    if ((n = at('[data-fl-label]'))) return readLabel(n.dataset.flLabel);
    if (at('[data-fl-labeltype]')) { const sc = st.scan; st.label = { code: sc && sc.code || null, name: sc && sc.name || foodWords(st.raw), cal: '', p: '', c: '', f: '', fib: '', sug: '', na: '', pack: '', serving: '', pieceG: '', pieceName: '', basis: '100', liquid: false, read: -1 }; st.scan = null; st.create = null; return paintResults(); }
    if (at('[data-fl-lbx]')) { st.label = null; return paintResults(); }
    if ((n = at('[data-fl-lbu]'))) { st.label.liquid = n.dataset.flLbu === 'ml'; return paintResults(); }
    if ((n = at('[data-fl-lbb]'))) { st.label.basis = n.dataset.flLbb; return paintResults(); }
    if ((n = at('[data-fl-photo]'))) { n.classList.toggle('big'); return; }
    if ((n = at('[data-fl-flag]'))) {
      const code = n.dataset.flFlag, f = byId(st.open);
      if (window.EBSync && EBSync.flagProduct) EBSync.flagProduct(code).catch(() => {});
      // Forget the shared copy on this phone and read the real label instead.
      const all = get(SCANNED, {}); delete all[code]; put(SCANNED, all); cache = null;
      window.EBAnalytics && EBAnalytics.track('shared_flagged');
      EB.toast && EB.toast('Thanks. Read the label to fix it for everyone.');
      st.open = null; st.scan = { status: 'missing', code, name: f ? f.n : '' };
      if (native()) return readLabel('camera');
      return paintResults();
    }
    if (at('[data-fl-lbsave]')) return saveLabel();
    if (at('[data-fl-online]')) {
      const q = parse(st.raw).q, words = foodWords(st.raw);
      st.online = { q, status: 'loading', ids: [] }; paintResults();
      searchPackaged(words).then(list => { if (st.online && st.online.q === q) { st.online = { q, status: 'done', ids: list.map(holdTemp) }; paintResults(); } })
        .catch(() => { if (st.online && st.online.q === q) { st.online = { q, status: 'error', ids: [] }; paintResults(); } });
      return;
    }
    if (at('[data-fl-scanx]')) { st.scan = null; st.open = null; return paintResults(); }
    if (at('[data-fl-lookup]')) return lookup(($('flCode') || {}).value);
    if (at('[data-fl-retry]')) return lookup(st.scan && st.scan.code);
    if (at('[data-fl-type]')) { st.scan = { status: 'enter', code: '' }; paintResults(); const i = $('flCode'); if (i) i.focus(); return; }
    if (at('[data-fl-clear]')) {
      st.raw = ''; st.open = null; st.create = null;
      const s = $('flSearch'); s.value = ''; paintResults(); s.focus(); return;
    }
    if ((n = at('[data-fl-fav]'))) {
      let id = n.dataset.flFav;
      if (id.slice(0, 2) === 'o:') { const kept = persistTemp(byId(id)); if (st.open === id) st.open = kept.id; id = kept.id; }
      const favs = get(FAV, []);
      put(FAV, favs.includes(id) ? favs.filter(x => x !== id) : [id].concat(favs).slice(0, 40));
      return paintResults();
    }
    if ((n = at('[data-fl-open]'))) {
      const f = byId(n.dataset.flOpen); if (!f) return;
      if (st.open === f.id) { st.open = null; return paintResults(); }
      const p = parse(st.raw), rec = get(RECENT, []).find(r => r.id === f.id);
      openFood(f, p.amt != null ? { amt: p.amt, unit: p.unit || defaultUnit(f) } : rec);
      if (p.amt != null && !p.unit) st.amt = p.amt;
      st.edit = null; paintResults();
      const li = $('flResults').querySelector('.fl-item.open'); if (li) li.scrollIntoView({ block: 'nearest' });
      return;
    }
    if ((n = at('[data-fl-step]'))) {
      const box = n.closest('.fl-detail'), inp = box.querySelector('[data-fl-amt]');
      const ed = n.closest('.fl-entry');
      const cur = ed ? st.edit : st, f = ed ? st.edit.food : byId(st.open);
      cur.amt = stepOf(cur.unit, +inp.value || 0, +n.dataset.flStep); inp.value = cur.amt;
      if (!ed) st.fix = null;
      return liveUpdate(box, f, cur.amt, cur.unit, ed ? null : st.fix);
    }
    if (at('[data-fl-fix]')) { const f = byId(st.open); st.fix = totals(f, st.amt, st.unit); return paintResults(); }
    if (at('[data-fl-add]')) {
      let f = byId(st.open); if (!f || !(st.amt > 0)) return;
      if (f.id.slice(0, 2) === 'o:') f = persistTemp(f, st.scan && st.scan.status === 'similar' ? st.scan.code : null);
      const tot = st.fix ? { ...totals(f, st.amt, st.unit), ...st.fix } : totals(f, st.amt, st.unit);
      addEntry({ name: esc(f.n), qty: qtyLabel(f, st.amt, st.unit), ...tot, src: st.fix ? 'you' : f.src, est: true, ref: f.id, amt: st.amt, unit: st.unit }, st.slot);
      remember(f.id, st.amt, st.unit);
      window.EBAnalytics && EBAnalytics.track('food_logged', { mode: 'log', source: f.src, corrected: !!st.fix });
      EB.toast && EB.toast(`${f.n} added to ${SLOT_NAME[st.slot]}`);
      Object.assign(st, { raw: '', open: null, fix: null, scan: null, online: null });
      return repaint();
    }
    if (at('[data-fl-create]')) {
      const fromScan = st.scan && st.scan.code ? st.scan : null;
      st.create = { name: fromScan ? (fromScan.name || '') : foodWords(st.raw), unit: '1 serving', cal: '', p: '', c: '', f: '', code: fromScan ? fromScan.code : null };
      st.scan = null;
      paintResults(); const nm = $('flResults').querySelector('[data-fl-cr="name"]'); if (nm && !nm.value) nm.focus();
      return;
    }
    if (at('[data-fl-cancel]')) { st.create = null; return paintResults(); }
    if (at('[data-fl-save-own]')) {
      const c = st.create, err = $('flErr');
      if (!String(c.name).trim()) { err.textContent = 'Give it a name first.'; return; }
      if (c.cal === '' || !(+c.cal >= 0)) { err.textContent = 'Add the calories for one serving.'; return; }
      const item = { id: 'custom-ing-' + Date.now(), name: String(c.name).trim(), unit: String(c.unit).trim() || '1 serving',
        cal: Math.round(+c.cal), p: r1(c.p), c: r1(c.c), f: r1(c.f), fib: 0 };
      try { const list = getCustomIngredients(); list.push(item); setCustomIngredients(list); } catch {}
      if (c.code) remember_scan(c.code, { ref: 'c:' + item.id });   // next scan of this pack finds it
      cache = null;
      const f = byId('c:' + item.id);
      addEntry({ name: esc(item.name), qty: item.unit, cal: item.cal, p: item.p, c: item.c, f: item.f, fib: 0, src: 'own', est: true, ref: f && f.id, amt: 1, unit: 'serving' }, st.slot);
      if (f) remember(f.id, 1, 'serving');
      window.EBAnalytics && EBAnalytics.track('food_created', { mode: 'log' });
      EB.toast && EB.toast(`${item.name} saved and added`);
      Object.assign(st, { raw: '', open: null, create: null });
      return repaint();
    }
    // Logged entries: edit, move meal, delete
    if ((n = at('[data-fl-edit]'))) {
      const key = n.dataset.flEdit;
      if (st.edit && st.edit.key === key) { st.edit = null; return repaint(); }
      const [slot, i] = [key.slice(0, key.lastIndexOf(':')), +key.slice(key.lastIndexOf(':') + 1)];
      const m = (entries(st.d).find(x => x.slot === slot && x.i === i) || {}).m; if (!m) return;
      // Entries from a known food edit by amount; anything else (Plan, the
      // assistant, corrected numbers) edits the numbers directly.
      const food = m.ref && m.src !== 'you' ? byId(m.ref) : null;
      const byAmount = food && m.amt != null && food.units[m.unit];
      st.edit = { key, slot, from: slot, i, food: byAmount ? food : null, amt: m.amt, unit: m.unit,
        fix: byAmount ? null : { cal: Math.round(+m.cal || 0), p: r1(m.p), c: r1(m.c), f: r1(m.f) } };
      st.open = null; return repaint();
    }
    if ((n = at('[data-fl-eslot]'))) { st.edit.slot = n.dataset.flEslot; return repaint(); }
    if (at('[data-fl-efix]')) { const e = st.edit; e.fix = totals(e.food, e.amt, e.unit); return repaint(); }
    if (at('[data-fl-ecancel]')) { st.edit = null; return repaint(); }
    if (at('[data-fl-esave]')) {
      const e = st.edit, d = st.d, log = getSlotLog(d);
      const arr = Array.isArray(log[e.from]) ? log[e.from] : log[e.from] ? [log[e.from]] : [];
      const m = arr[e.i]; if (!m) { st.edit = null; return repaint(); }
      if (e.fix) Object.assign(m, { cal: Math.round(+e.fix.cal || 0), p: r1(e.fix.p), c: r1(e.fix.c), f: r1(e.fix.f), src: 'you', est: true });
      else if (e.food && e.amt > 0) Object.assign(m, totals(e.food, e.amt, e.unit), { qty: qtyLabel(e.food, e.amt, e.unit), amt: e.amt, unit: e.unit, est: true });
      if (e.slot !== e.from) {
        arr.splice(e.i, 1); if (arr.length) log[e.from] = arr; else delete log[e.from];
        if (!Array.isArray(log[e.slot])) log[e.slot] = log[e.slot] ? [log[e.slot]] : [];
        log[e.slot].push(m);
      } else log[e.from] = arr;
      setSlotLog(d, log); st.edit = null;
      EB.toast && EB.toast('Saved');
      return repaint();
    }
    if ((n = at('[data-fl-del]'))) {
      const key = n.dataset.flDel, slot = key.slice(0, key.lastIndexOf(':')), i = +key.slice(key.lastIndexOf(':') + 1);
      const d = st.d, log = getSlotLog(d), arr = Array.isArray(log[slot]) ? log[slot] : log[slot] ? [log[slot]] : [];
      const gone = arr.splice(i, 1)[0];
      if (arr.length) log[slot] = arr; else delete log[slot];
      setSlotLog(d, log); st.edit = null;
      EB.toast && EB.toast(`${plain(gone && gone.name || 'Item')} removed`);
      return repaint();
    }
  });

  document.addEventListener('input', e => {
    const t = e.target; if (!t.closest || !t.closest('#foodLog')) return;
    if (t.id === 'flSearch') {
      // Only the results change while typing, so the keyboard never closes.
      st.raw = t.value; st.open = null; st.create = null; st.scan = null; st.label = null;
      if (st.online && st.online.q !== parse(st.raw).q) st.online = null;
      return paintResults();
    }
    const ed = t.closest('.fl-entry');
    if (t.matches('[data-fl-amt]')) {
      const cur = ed ? st.edit : st, f = ed ? st.edit.food : byId(st.open);
      cur.amt = Math.max(0, +t.value || 0); if (!ed) st.fix = null;
      return liveUpdate(t.closest('.fl-detail'), f, cur.amt, cur.unit, null);
    }
    if (t.matches('[data-fl-fixin]')) {
      st.fix[t.dataset.flFixin] = Math.max(0, +t.value || 0);
      return liveUpdate(t.closest('.fl-detail'), byId(st.open), st.amt, st.unit, st.fix);
    }
    if (t.matches('[data-fl-efixin]')) { st.edit.fix[t.dataset.flEfixin] = Math.max(0, +t.value || 0); return; }
    if (t.matches('[data-fl-cr]')) { st.create[t.dataset.flCr] = t.value; return; }
    if (t.matches('[data-fl-lb]')) { st.label[t.dataset.flLb] = t.value; return; }
  });
  document.addEventListener('change', e => {
    const t = e.target; if (!t.matches || !t.matches('#foodLog [data-fl-unit]')) return;
    const ed = t.closest('.fl-entry'), cur = ed ? st.edit : st, f = ed ? st.edit.food : byId(st.open);
    // Keep roughly the same portion when switching units (200 g → 1.5 katori).
    const grams = cur.amt * (f.units[cur.unit] || 1);
    cur.unit = t.value;
    const v = grams / (f.units[cur.unit] || 1);
    cur.amt = cur.unit === 'g' || cur.unit === 'ml' ? Math.round(v) : Math.max(0.5, Math.round(v * 2) / 2);
    if (!ed) st.fix = null;
    const box = t.closest('.fl-detail'); box.querySelector('[data-fl-amt]').value = cur.amt;
    liveUpdate(box, f, cur.amt, cur.unit, null);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'flCode') { e.preventDefault(); return lookup(e.target.value); }
    if (e.key !== 'Enter' || e.target.id !== 'flSearch') return;
    e.preventDefault();
    const first = $('flResults').querySelector('[data-fl-open]');
    if (first && !st.open) { e.target.blur(); first.click(); }
  });
  // Keep the search box in view above the keyboard.
  document.addEventListener('focusin', e => {
    if (e.target.id !== 'flSearch') return;
    setTimeout(() => { const y = e.target.getBoundingClientRect().top + window.scrollY - 96; if (Math.abs(window.scrollY - y) > 40) window.scrollTo(0, y); }, 250);
  });

  // Open the page's search bar, optionally for a given meal and with a query.
  // Used by Replace / Add, "Add" on suggested foods, and the old add sheet.
  function focusSearch(slot, query, opts) {
    if (slot && SLOT_NAME[slot]) st.slot = slot;
    Object.assign(st, { raw: query || '', open: null, create: null, scan: null, label: null, online: null, edit: null });
    if (window.EBDayMode) EBDayMode.paint();
    setTimeout(() => {
      const s = $('flSearch'); if (!s) return;
      s.value = st.raw; paintResults();
      // A single obvious match for a suggested food opens straight away.
      if (query) {
        const first = $('flResults') && $('flResults').querySelector('[data-fl-open]');
        if (first) first.click();
        // A suggested dish that isn't in the food list: start "my own food" with what we know.
        else if (opts && opts.cal) { st.create = { name: query, unit: '1 serving', cal: opts.cal, p: '', c: '', f: '' }; paintResults(); }
      }
      const y = s.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo(0, Math.max(0, y));
      if (!query) s.focus();
    }, 60);
  }

  window.EBFoodLog = { focusSearch, html, mounted, search: q => search(parse(q).q), parse, norm, catalog, lookup, fromOFF, parseLabel, flushShares };
})();
