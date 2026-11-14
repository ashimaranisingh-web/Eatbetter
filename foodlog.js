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

  const SRC = { usda: 'USDA FoodData Central', ifct: 'IFCT 2017 (NIN)', mf: 'Home recipe (Menu-fi)', plan: 'Your meal plan', own: 'Your own food', you: 'Your numbers', off: 'Open Food Facts' };
  const SLOTS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['snack', 'Snack'], ['dinner', 'Dinner']];
  const SLOT_NAME = Object.fromEntries(SLOTS);
  const PLURAL = { pack: 'packs', piece: 'pieces', katori: 'katori', spoon: 'spoons', cup: 'cups', serving: 'servings', g: 'g', ml: 'ml' };
  const RECENT = 'eb_food_recent', FAV = 'eb_food_fav', SCANNED = 'eb_food_scanned';

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
    cache = out; cacheSig = sig;
    return out;
  }
  const byId = id => catalog().find(f => f.id === id);

  function defaultUnit(f) {
    const u = f.units;
    return u.piece ? 'piece' : u.katori ? 'katori' : u.serving ? 'serving' : u.pack && u.pack <= 250 ? 'pack' : u.ml ? 'cup' : u.spoon && !u.cup ? 'spoon' : u.cup ? 'cup' : 'g';
  }
  const defaultAmt = unit => unit === 'g' || unit === 'ml' ? 100 : 1;
  function totals(f, amt, unit) {
    const k = (amt * (f.units[unit] || 0)) / f.per;
    const n = f.nut;
    return { cal: Math.round(n.cal * k), p: r1(n.p * k), c: r1(n.c * k), f: r1(n.f * k), fib: r1(n.fib * k) };
  }
  function qtyLabel(f, amt, unit) {
    if (unit === 'serving') return amt === 1 ? f.serving || '1 serving' : `${amt} × ${f.serving || 'serving'}`;
    if (unit === 'g' || unit === 'ml') return `${amt} ${unit}`;
    if (unit === 'piece' && f.pn) return `${amt} ${f.pn}`;
    return `${amt} ${amt === 1 ? unit : PLURAL[unit] || unit}`;
  }
  const unitText = (f, u) => u === 'serving' ? (f.serving || 'serving').replace(/^1\s+/, '')
    : u === 'piece' && f.pn ? f.pn : u === 'pack' ? `pack (${Math.round(f.units.pack)} ${f.units.ml ? 'ml' : 'g'})` : u;

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
    const rank = { own: 0, off: 0, mf: 1, plan: 2, usda: 3, ifct: 3 };
    return catalog().map(f => {
      // Very short words ("gi" from ghee) must match a whole word, or "gin" turns up.
      const hit = ws.every(w => f.words.some(t => w.length < 3 ? t === w : t.startsWith(w) || (w.length > 3 && t.startsWith(w.replace(/s$/, '')))));
      if (!hit) return null;
      // Exact name, then an exact word (makkhan → Butter), then a name that starts with it.
      let s = f.nn === q ? 0 : ws.every(w => f.words.includes(w)) ? 1 : f.nn.startsWith(q) ? 2 : 3;
      if (favs.includes(f.id)) s -= 1.5; else if (rec.includes(f.id)) s -= 1;
      return [f, s * 10 + rank[f.src] + (/\braw\b|\bdry\b/.test(f.nn) ? 2 : 0) + f.n.length / 100];
    }).filter(Boolean).sort((a, b) => a[1] - b[1]).slice(0, 30).map(x => x[0]);
  }

  // ── State (kept between repaints so typing is never lost) ─────────
  const st = { d: '', slot: null, raw: '', open: null, amt: 1, unit: 'g', fix: null, create: null, edit: null, scan: null };
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
    const per = f.units[st.unit] && st.unit !== 'g' && st.unit !== 'ml' && st.unit !== 'pack' && !(st.unit === 'serving' && f.src === 'off') ? `1 ${unitText(f, st.unit)} ≈ ${Math.round(f.units[st.unit])} ${f.units.ml ? 'ml' : 'g'}. ` : '';
    const off = f.src === 'off' && !st.fix ? 'Shared by volunteers, so check it against the pack. ' : '';
    return `<p class="fl-total"><b>About ${t.cal} cal</b><span>${macro(t)}</span></p>
      <p class="fl-src">Estimate. ${st.fix ? 'Your numbers.' : `Source: ${SRC[f.src]}.`} ${off}${f.per === 100 ? per : ''}</p>`;
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
      <button type="button" class="eb-btn primary" data-fl-save-own>Save and add to ${SLOT_NAME[st.slot]}</button>
      <button type="button" class="eb-link" data-fl-cancel>Cancel</button>
    </div>`;
  }

  function resultsHTML() {
    if (st.create) return createHTML();
    if (st.scan) return scanHTML();
    const { q } = parse(st.raw);
    if (!q) {
      const favs = get(FAV, []).map(byId).filter(Boolean);
      const rec = get(RECENT, []).map(r => [byId(r.id), r]).filter(x => x[0] && !get(FAV, []).includes(x[0].id)).slice(0, 8);
      if (!favs.length && !rec.length) return `<p class="fl-hint">Type what you ate, like “2 roti”, “1 katori dal”, “aloo” or “100 g paneer”. Foods you add show up here next time.</p>`;
      return (favs.length ? `<p class="fl-label">Favourites</p><ul class="fl-list">${favs.map(f => rowHTML(f)).join('')}</ul>` : '')
        + (rec.length ? `<p class="fl-label">Recent</p><ul class="fl-list">${rec.map(([f, r]) => rowHTML(f, `${qtyLabel(f, r.amt, r.unit)} · ${totals(f, r.amt, r.unit).cal} cal`)).join('')}</ul>` : '');
    }
    const list = search(q);
    const make = `<button type="button" class="eb-link fl-make" data-fl-create>Can’t find it? Create my own food</button>`;
    if (!list.length) return `<p class="fl-hint">Nothing found for “${esc(st.raw.trim())}”. Try a simpler word, like “dal” instead of “dal tadka”, or add it yourself.</p>
      <button type="button" class="eb-btn secondary fl-make-btn" data-fl-create>Create “${esc(foodWords(st.raw))}” as my own food</button>`;
    return `<ul class="fl-list">${list.map(f => rowHTML(f)).join('')}</ul>${make}`;
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
    const liquid = /\d\s*(ml|l|ltr|cl)\b/i.test(String(p.quantity || '') + ' ' + String(p.serving_size || ''));
    const units = liquid ? { ml: 1 } : { g: 1 };
    const pack = num(p.product_quantity), sq = num(p.serving_quantity);
    if (pack > 0 && pack <= 5000) units.pack = pack;
    if (sq > 0 && sq !== pack) units.serving = sq;
    return { n: name, brand, per: 100, units, src: 'off', serving: sq > 0 ? `1 serving (${Math.round(sq)} ${liquid ? 'ml' : 'g'})` : null,
      nut: { cal: Math.round(kcal), p: r1(num(n.proteins_100g)), c: r1(num(n.carbohydrates_100g)), f: r1(num(n.fat_100g)), fib: r1(num(n.fiber_100g)) } };
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
  async function lookup(raw) {
    const code = String(raw || '').replace(/\D/g, '');
    if (code.length < 8) { st.scan = { status: 'enter', code, err: 'A barcode has 8 to 13 numbers.' }; return paintResults(); }
    Object.assign(st, { raw: '', create: null, open: null, fix: null });
    const s = $('flSearch'); if (s) s.value = '';
    if (showFound(code)) { track('found_saved'); return paintResults(); }
    st.scan = { status: 'loading', code }; paintResults();
    let p = null, status = 'error';
    try {
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 9000);
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,generic_name,brands,quantity,product_quantity,serving_size,serving_quantity,nutriments`, { signal: ctrl.signal });
      clearTimeout(timer);
      const j = await r.json();
      p = j && j.status === 1 ? j.product : null;
      status = 'missing';
    } catch {}
    if (!st.scan || st.scan.code !== code) return;   // closed or rescanned meanwhile
    const food = p && fromOFF(p);
    if (food) { remember_scan(code, food); showFound(code); track('found'); }
    else { st.scan = { status, code, name: p && (p.product_name || '') }; track(status); }
    paintResults();
  }
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
    if (sc.status === 'loading') return `<div class="fl-scanbox">${head('Barcode')}<p class="fl-hint" role="status">Looking up ${esc(sc.code)}…</p></div>`;
    if (sc.status === 'found') {
      const f = byId(sc.id);
      return `<div class="fl-scanbox">${head('Scanned')}<ul class="fl-list">${f ? rowHTML(f) : ''}</ul>
        <button type="button" class="eb-link fl-make" data-fl-scan>Scan another</button></div>`;
    }
    if (sc.status === 'denied') return `<div class="fl-scanbox">${head('Barcode')}
        <p class="fl-hint">Camera access is off for Menu-fi. Turn it on in the iPhone Settings app → Menu-fi → Camera, or type the numbers instead.</p>
        <button type="button" class="eb-btn secondary fl-make-btn" data-fl-type>Type the barcode</button></div>`;
    if (sc.status === 'error') return `<div class="fl-scanbox">${head('Barcode')}
        <p class="fl-hint">Couldn’t reach the food database. Check your internet and try again, or add the food yourself.</p>
        <button type="button" class="eb-btn secondary fl-make-btn" data-fl-retry>Try again</button>
        <button type="button" class="eb-link fl-make" data-fl-create>Add it myself</button></div>`;
    return `<div class="fl-scanbox">${head('Barcode')}
        <p class="fl-hint">${sc.name ? `“${esc(sc.name)}” is in the food database, but without calories.` : 'This product isn’t in the food database yet.'} Add it once with the numbers from the pack, and the next scan will find it.</p>
        <button type="button" class="eb-btn secondary fl-make-btn" data-fl-create>Add it from the pack label</button></div>`;
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
      <div class="eb-seg fl-slots fl-slots-sm" role="radiogroup" aria-label="Meal">${SLOTS.map(([v, t]) =>
        `<button type="button" class="eb-seg-btn${e.slot === v ? ' on' : ''}" data-fl-eslot="${v}" role="radio" aria-checked="${e.slot === v}">${t}</button>`).join('')}</div>
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

  function html(d) {
    if (st.d !== d) { Object.assign(st, { d, raw: '', open: null, fix: null, create: null, edit: null }); }
    if (!st.slot) st.slot = defaultSlot();
    return `<div class="fl" id="foodLog">
      <div class="eb-seg fl-slots" role="radiogroup" aria-label="Which meal">${SLOTS.map(([v, t]) =>
        `<button type="button" class="eb-seg-btn${st.slot === v ? ' on' : ''}" data-fl-slot="${v}" role="radio" aria-checked="${st.slot === v}">${t}</button>`).join('')}</div>
      <label class="fl-search">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="flSearch" type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
          placeholder="Search food, e.g. 2 roti" value="${esc(st.raw)}" aria-label="Search food">
        <button type="button" class="fl-clear" data-fl-clear aria-label="Clear search">×</button>
        <button type="button" class="fl-scan" data-fl-scan aria-label="Scan a barcode">${BARCODE}</button>
      </label>
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
    try { localStorage.setItem('dayMode_' + d, JSON.stringify('log')); } catch {}
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
    if ((n = at('[data-fl-slot]'))) { st.slot = n.dataset.flSlot; return repaint(); }
    if (at('[data-fl-scan]')) return startScan();
    if (at('[data-fl-scanx]')) { st.scan = null; st.open = null; return paintResults(); }
    if (at('[data-fl-lookup]')) return lookup(($('flCode') || {}).value);
    if (at('[data-fl-retry]')) return lookup(st.scan && st.scan.code);
    if (at('[data-fl-type]')) { st.scan = { status: 'enter', code: '' }; paintResults(); const i = $('flCode'); if (i) i.focus(); return; }
    if (at('[data-fl-clear]')) {
      st.raw = ''; st.open = null; st.create = null;
      const s = $('flSearch'); s.value = ''; paintResults(); s.focus(); return;
    }
    if ((n = at('[data-fl-fav]'))) {
      const id = n.dataset.flFav, favs = get(FAV, []);
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
      const f = byId(st.open); if (!f || !(st.amt > 0)) return;
      const tot = st.fix ? { ...totals(f, st.amt, st.unit), ...st.fix } : totals(f, st.amt, st.unit);
      addEntry({ name: esc(f.n), qty: qtyLabel(f, st.amt, st.unit), ...tot, src: st.fix ? 'you' : f.src, est: true, ref: f.id, amt: st.amt, unit: st.unit }, st.slot);
      remember(f.id, st.amt, st.unit);
      window.EBAnalytics && EBAnalytics.track('food_logged', { mode: 'log', source: f.src, corrected: !!st.fix });
      EB.toast && EB.toast(`${f.n} added to ${SLOT_NAME[st.slot]}`);
      Object.assign(st, { raw: '', open: null, fix: null, scan: null });
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
      st.raw = t.value; st.open = null; st.create = null; st.scan = null;
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

  window.EBFoodLog = { html, mounted, search: q => search(parse(q).q), parse, norm, catalog, lookup, fromOFF };
})();
