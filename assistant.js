// ── Meal assistant ────────────────────────────────────────────────────
// "Tell me what you ate" → parsed into breakfast/lunch/snack/dinner with
// quantities and macros → one tap replaces those slots in the selected day's
// log, so the tracker and weekly numbers update like any manual log.
//
// Parsing is local by default (the food table below plus the meal plan's own
// ingredient lists). With a Claude API key saved in Profile, the text goes
// to Claude for estimates of foods the local table doesn't know.
(function () {
  const { esc, ICONS } = EB;

  // Per typical serving. g = grams in that serving (lets "150g paneer" scale).
  // k = words that identify the food; longest match wins.
  const FOODS = [
    ['Roti', ['roti', 'chapati', 'chapatti', 'phulka', 'fulka'], '1 roti', 40, 90, 3, 18, 1, 3],
    ['Plain paratha', ['paratha', 'parantha'], '1 paratha', 70, 200, 4, 28, 8, 3],
    ['Aloo paratha', ['aloo paratha', 'aloo parantha'], '1 paratha', 120, 280, 6, 40, 10, 4],
    ['Paneer paratha', ['paneer paratha'], '1 paratha', 120, 300, 13, 32, 13, 3],
    ['Thepla', ['thepla'], '1 thepla', 40, 120, 3, 16, 5, 2],
    ['Puri', ['puri', 'poori'], '1 puri', 25, 100, 2, 12, 5, 1],
    ['Bhatura', ['bhatura', 'bhature'], '1 bhatura', 80, 300, 6, 40, 13, 2],
    ['Rice', ['rice', 'chawal', 'steamed rice'], '1 bowl', 150, 195, 4, 43, 0, 1],
    ['Jeera rice', ['jeera rice'], '1 bowl', 150, 230, 4, 42, 5, 1],
    ['Pulao', ['pulao', 'pilaf'], '1 bowl', 150, 220, 5, 38, 6, 2],
    ['Fried rice', ['fried rice'], '1 plate', 250, 400, 9, 60, 13, 2],
    ['Chicken biryani', ['chicken biryani', 'biryani', 'biriyani'], '1 plate', 250, 450, 22, 55, 15, 2],
    ['Veg biryani', ['veg biryani', 'vegetable biryani'], '1 plate', 250, 380, 8, 60, 12, 4],
    ['Khichdi', ['khichdi', 'khichri'], '1 bowl', 200, 240, 9, 40, 5, 5],
    ['Dal', ['dal', 'daal', 'dhal', 'lentil'], '1 bowl', 150, 150, 9, 20, 4, 6],
    ['Dal makhani', ['dal makhani', 'daal makhani'], '1 bowl', 150, 250, 9, 22, 14, 6],
    ['Rajma', ['rajma', 'kidney bean'], '1 bowl', 150, 200, 10, 28, 5, 8],
    ['Chole', ['chole', 'chana masala', 'chickpea'], '1 bowl', 150, 240, 10, 30, 8, 8],
    ['Sambar', ['sambar', 'sambhar'], '1 bowl', 150, 110, 5, 16, 3, 4],
    ['Mixed veg sabzi', ['sabzi', 'sabji', 'subzi', 'veg curry', 'vegetable', 'veggies', 'mixed veg'], '1 bowl', 150, 140, 3, 14, 8, 4],
    ['Aloo sabzi', ['aloo sabzi', 'aloo', 'potato'], '1 bowl', 150, 180, 3, 25, 8, 3],
    ['Bhindi', ['bhindi', 'okra', 'lady finger'], '1 bowl', 150, 140, 3, 12, 9, 5],
    ['Palak paneer', ['palak paneer', 'saag paneer'], '1 bowl', 150, 260, 12, 8, 20, 3],
    ['Paneer bhurji', ['paneer bhurji'], '1 bowl', 150, 300, 18, 6, 23, 1],
    ['Paneer tikka', ['paneer tikka'], '6 pieces', 150, 330, 22, 8, 23, 1],
    ['Paneer', ['paneer', 'cottage cheese'], '100 g', 100, 265, 18, 4, 20, 0],
    ['Tofu', ['tofu'], '100 g', 100, 145, 15, 3, 8, 1],
    ['Soya chunks', ['soya', 'soy chunks', 'nutrela'], '50 g dry', 50, 170, 26, 16, 0, 6],
    ['Chicken curry', ['chicken curry', 'chicken gravy'], '1 bowl', 150, 250, 24, 6, 14, 1],
    ['Butter chicken', ['butter chicken', 'chicken makhani'], '1 bowl', 150, 330, 22, 8, 23, 1],
    ['Chicken tikka', ['chicken tikka', 'tandoori chicken', 'tandoori'], '6 pieces', 150, 250, 35, 4, 10, 0],
    ['Grilled chicken', ['chicken', 'chicken breast', 'grilled chicken'], '100 g', 100, 165, 31, 0, 4, 0],
    ['Mutton curry', ['mutton', 'lamb', 'goat'], '1 bowl', 150, 350, 25, 6, 25, 1],
    ['Fish curry', ['fish curry'], '1 bowl', 150, 220, 22, 5, 12, 1],
    ['Fish', ['fish', 'salmon', 'basa', 'pomfret', 'tuna'], '100 g', 100, 160, 22, 0, 7, 0],
    ['Prawns', ['prawn', 'shrimp'], '100 g', 100, 120, 24, 1, 2, 0],
    ['Boiled egg', ['boiled egg', 'egg', 'eggs', 'anda'], '1 egg', 50, 70, 6, 0, 5, 0],
    ['Omelette', ['omelette', 'omelet', 'egg bhurji', 'scrambled egg'], '2 eggs', 100, 190, 13, 2, 14, 0],
    ['Poha', ['poha'], '1 plate', 200, 270, 5, 45, 8, 3],
    ['Upma', ['upma'], '1 bowl', 200, 250, 6, 38, 8, 3],
    ['Idli', ['idli', 'idly'], '1 idli', 40, 40, 2, 8, 0, 1],
    ['Dosa', ['dosa', 'dosai'], '1 dosa', 100, 170, 4, 29, 4, 1],
    ['Masala dosa', ['masala dosa'], '1 dosa', 180, 350, 7, 50, 13, 4],
    ['Uttapam', ['uttapam', 'uthappam'], '1 uttapam', 120, 210, 6, 34, 6, 3],
    ['Medu vada', ['vada', 'wada'], '1 vada', 50, 140, 4, 13, 8, 2],
    ['Besan chilla', ['besan chilla', 'chilla', 'cheela'], '1 chilla', 80, 150, 7, 17, 6, 3],
    ['Dhokla', ['dhokla'], '2 pieces', 80, 160, 6, 22, 5, 2],
    ['Coconut chutney', ['chutney'], '2 tbsp', 30, 60, 1, 3, 5, 1],
    ['Curd', ['curd', 'dahi', 'yogurt', 'yoghurt'], '1 bowl', 150, 90, 5, 7, 5, 0],
    ['Hung curd', ['hung curd', 'greek yogurt', 'greek yoghurt'], '100 g', 100, 90, 8, 4, 4, 0],
    ['Raita', ['raita'], '1 bowl', 150, 80, 4, 7, 4, 1],
    ['Bread', ['bread', 'toast'], '1 slice', 30, 75, 3, 13, 1, 1],
    ['Butter', ['butter'], '1 tsp', 5, 36, 0, 0, 4, 0],
    ['Ghee', ['ghee'], '1 tsp', 5, 45, 0, 0, 5, 0],
    ['Peanut butter', ['peanut butter'], '1 tbsp', 16, 95, 4, 3, 8, 1],
    ['Sandwich', ['sandwich'], '1 sandwich', 150, 250, 8, 32, 10, 3],
    ['Wrap / roll', ['wrap', 'roll', 'kathi', 'frankie'], '1 roll', 180, 350, 14, 40, 14, 3],
    ['Oats', ['oats', 'oatmeal', 'porridge', 'overnight oats'], '1 bowl', 250, 250, 10, 38, 6, 5],
    ['Cereal with milk', ['muesli', 'cornflakes', 'cereal', 'granola'], '1 bowl', 250, 230, 8, 38, 5, 3],
    ['Milk', ['milk', 'doodh'], '1 glass', 200, 120, 6, 10, 6, 0],
    ['Chai', ['chai', 'tea', 'masala tea'], '1 cup', 150, 90, 2, 12, 3, 0],
    ['Coffee with milk', ['coffee', 'latte', 'cappuccino', 'cold coffee'], '1 cup', 200, 100, 5, 9, 4, 0],
    ['Black coffee', ['black coffee', 'americano', 'espresso'], '1 cup', 200, 5, 0, 1, 0, 0],
    ['Green tea', ['green tea', 'herbal tea'], '1 cup', 200, 2, 0, 0, 0, 0],
    ['Lassi', ['lassi'], '1 glass', 250, 200, 7, 28, 6, 0],
    ['Buttermilk', ['buttermilk', 'chaas', 'chaach'], '1 glass', 250, 40, 2, 4, 1, 0],
    ['Smoothie', ['smoothie', 'shake'], '1 glass', 300, 220, 6, 38, 5, 4],
    ['Juice', ['juice'], '1 glass', 250, 110, 1, 26, 0, 0],
    ['Coconut water', ['coconut water', 'nariyal pani'], '1 glass', 250, 45, 0, 9, 0, 0],
    ['Protein shake', ['protein shake', 'whey', 'protein'], '1 scoop', 32, 120, 25, 3, 1, 0],
    ['Banana', ['banana', 'kela'], '1 medium', 118, 105, 1, 27, 0, 3],
    ['Apple', ['apple', 'seb'], '1 medium', 180, 95, 0, 25, 0, 4],
    ['Orange', ['orange', 'santra', 'mosambi'], '1 medium', 130, 60, 1, 15, 0, 3],
    ['Mango', ['mango', 'aam'], '1 cup', 165, 100, 1, 25, 1, 3],
    ['Papaya', ['papaya'], '1 bowl', 150, 60, 1, 15, 0, 3],
    ['Grapes', ['grapes', 'angoor'], '1 bowl', 100, 70, 1, 18, 0, 1],
    ['Watermelon', ['watermelon', 'tarbooz'], '1 bowl', 150, 45, 1, 11, 0, 1],
    ['Fruit bowl', ['fruit', 'fruits', 'fruit bowl'], '1 bowl', 150, 80, 1, 20, 0, 3],
    ['Dates', ['date', 'dates', 'khajur'], '1 date', 8, 23, 0, 6, 0, 1],
    ['Almonds', ['almond', 'badam'], '10 almonds', 12, 70, 3, 2, 6, 1],
    ['Walnuts', ['walnut', 'akhrot'], '2 halves', 5, 26, 1, 1, 3, 0],
    ['Peanuts', ['peanut', 'moongphali', 'groundnut'], '1 handful', 30, 170, 7, 5, 14, 2],
    ['Mixed nuts', ['nuts', 'trail mix', 'dry fruit'], '1 handful', 30, 180, 5, 6, 16, 2],
    ['Makhana', ['makhana', 'fox nut', 'lotus seed'], '1 bowl', 25, 88, 3, 18, 0, 1],
    ['Sprouts', ['sprouts', 'sprout', 'moong salad'], '1 bowl', 100, 100, 7, 15, 1, 4],
    ['Salad', ['salad', 'cucumber', 'kachumber'], '1 bowl', 150, 40, 1, 8, 0, 3],
    ['Soup', ['soup'], '1 bowl', 250, 100, 3, 12, 4, 2],
    ['Pasta', ['pasta', 'spaghetti', 'penne', 'mac and cheese'], '1 plate', 200, 380, 12, 60, 10, 3],
    ['Noodles', ['noodles', 'chowmein', 'hakka', 'ramen'], '1 plate', 200, 350, 9, 55, 11, 3],
    ['Maggi', ['maggi', 'instant noodles'], '1 pack', 70, 310, 7, 42, 13, 2],
    ['Pizza', ['pizza'], '1 slice', 110, 260, 11, 30, 10, 2],
    ['Burger', ['burger'], '1 burger', 200, 380, 14, 42, 18, 2],
    ['French fries', ['fries', 'french fries', 'chips'], '1 medium', 115, 320, 4, 41, 15, 4],
    ['Momos', ['momo', 'momos', 'dumpling'], '1 piece', 30, 40, 2, 5, 1, 0],
    ['Samosa', ['samosa'], '1 samosa', 80, 260, 4, 26, 16, 2],
    ['Pakora', ['pakora', 'pakoda', 'bhajji', 'bhaji'], '4 pieces', 80, 250, 5, 22, 16, 3],
    ['Kachori', ['kachori'], '1 kachori', 60, 190, 4, 20, 11, 2],
    ['Vada pav', ['vada pav', 'wada pav'], '1 vada pav', 150, 300, 7, 40, 13, 3],
    ['Pav bhaji', ['pav bhaji'], '1 plate', 300, 400, 10, 55, 16, 6],
    ['Bhel / chaat', ['bhel', 'chaat', 'pani puri', 'golgappa', 'sev puri'], '1 plate', 150, 250, 6, 38, 8, 4],
    ['Biscuits', ['biscuit', 'cookie', 'cookies', 'rusk'], '1 biscuit', 10, 45, 1, 7, 2, 0],
    ['Cake', ['cake', 'pastry', 'brownie', 'muffin'], '1 slice', 80, 300, 4, 40, 14, 1],
    ['Indian sweet', ['ladoo', 'laddu', 'barfi', 'mithai', 'halwa', 'kheer', 'jalebi', 'rasgulla'], '1 piece', 50, 180, 3, 25, 8, 1],
    ['Gulab jamun', ['gulab jamun'], '1 piece', 50, 150, 2, 24, 6, 0],
    ['Ice cream', ['ice cream', 'icecream', 'kulfi', 'gelato'], '1 scoop', 70, 140, 2, 17, 7, 0],
    ['Dark chocolate', ['chocolate', 'dark chocolate'], '2 squares', 20, 110, 2, 9, 8, 2],
    ['Honey', ['honey'], '1 tsp', 7, 21, 0, 6, 0, 0],
    ['Sugar', ['sugar', 'jaggery', 'gud'], '1 tsp', 4, 16, 0, 4, 0, 0],
    ['Beer', ['beer'], '1 bottle', 330, 150, 1, 13, 0, 0],
    ['Wine', ['wine'], '1 glass', 150, 125, 0, 4, 0, 0],
    ['Cocktail', ['cocktail', 'whisky', 'whiskey', 'vodka', 'rum', 'gin'], '1 drink', 60, 140, 0, 6, 0, 0]
  ].map(([n, k, serving, g, cal, p, c, f, fib]) => ({ n, k, serving, g, cal, p, c, f, fib }));

  // Pull in the meal plan's own foods (their exact portions/macros) when present.
  function allFoods() {
    const extra = [];
    try {
      [...INGREDIENTS, ...SNACK_INGREDIENTS, ...COFFEE_OPTIONS, ...PROTEIN_OPTIONS].forEach(i => {
        const key = i.name.toLowerCase().replace(/\(.*?\)/g, '').replace(/[—–-].*$/, '').trim();
        if (key.length > 3) extra.push({ n: i.name, k: [key], serving: i.unit, g: /^(\d+)\s*g/.test(i.unit) ? parseInt(i.unit) : null,
          cal: i.cal, p: i.p, c: i.c, f: i.f, fib: i.fib || 0 });
      });
    } catch {}
    return FOODS.concat(extra);
  }

  const NUMS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    half: 0.5, quarter: 0.25, couple: 2, few: 3, some: 1, single: 1, double: 2 };
  const SLOTS = { breakfast: 'breakfast', brunch: 'breakfast', morning: 'breakfast', lunch: 'lunch', afternoon: 'lunch',
    snack: 'snack', snacks: 'snack', evening: 'snack', dinner: 'dinner', supper: 'dinner', night: 'dinner' };
  const SLOT_NAMES = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };

  function slotByClock() {
    const h = new Date().getHours();
    return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner';
  }
  const kwRe = k => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(e?s)?\\b`, 'i');

  // Split "breakfast was X. lunch: Y and Z" into slot → text
  function splitSlots(text) {
    const re = /\b(breakfast|brunch|lunch|snacks?|dinner|supper|(?:in the )?(?:morning|afternoon|evening|night))\b/gi;
    const parts = []; let m, last = 0, cur = null;
    while ((m = re.exec(text))) {
      if (cur !== null || m.index > last) parts.push({ slot: cur, text: text.slice(last, m.index) });
      cur = SLOTS[m[1].toLowerCase().replace(/^in the /, '')]; last = re.lastIndex;
    }
    parts.push({ slot: cur, text: text.slice(last) });
    const out = {};
    parts.forEach(pt => {
      const t = pt.text.replace(/^[\s:,.\-–—]*(i had|i ate|was|were|had|ate|is)?\s*/i, '').trim();
      if (!t) return;
      const s = pt.slot || slotByClock();
      out[s] = (out[s] ? out[s] + ', ' : '') + t;
    });
    return out;
  }

  // One item phrase → {name, qty, cal…} or {unknown}
  function parseItem(phrase, foods) {
    let t = phrase.toLowerCase().trim().replace(/^(i had|i ate|had|ate|some|also|then)\s+/, '');
    if (!t) return [];
    let qty = 1, grams = null;
    const g = t.match(/(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|ml)\b/);
    if (g) { grams = parseFloat(g[1]); t = t.replace(g[0], ' '); }
    const frac = t.match(/\b(\d+)\s*\/\s*(\d+)\b/);
    const n = t.match(/^(\d+(?:\.\d+)?)/) || t.match(/\b(\d+(?:\.\d+)?)\b/);
    if (frac) { qty = +frac[1] / +frac[2]; t = t.replace(frac[0], ' '); }
    else if (n && !grams) { qty = parseFloat(n[1]); t = t.replace(n[0], ' '); }
    else {
      const w = t.match(/^(a|an|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter|couple|few|single|double)\b( of)?/);
      if (w) { qty = NUMS[w[1]]; t = t.slice(w[0].length); }
    }
    if (/\b(and a half|\.5)\b/.test(phrase)) qty += 0.5;
    t = t.replace(/\b(bowls?|katoris?|plates?|cups?|glass(es)?|slices?|pieces?|pcs|tbsp|tsp|tablespoons?|teaspoons?|scoops?|handfuls?|servings?|small|medium|large|big|of|with|some)\b/g, ' ')
         .replace(/\s+/g, ' ').trim();
    // Find every food named in the phrase ("dal chawal" → dal + rice).
    const found = []; let rest = ' ' + t + ' ';
    for (let guard = 0; guard < 4; guard++) {
      let best = null, bestLen = 0, bestM = null;
      for (const f of foods) for (const k of f.k) {
        if (k.length <= bestLen) continue;
        const m = rest.match(kwRe(k));
        if (m) { best = f; bestLen = k.length; bestM = m; }
      }
      if (!best) break;
      found.push(best);
      rest = rest.slice(0, bestM.index) + ' ' + rest.slice(bestM.index + bestM[0].length);
    }
    if (!found.length) return [{ unknown: true, name: cap(phrase.trim()) }];
    return found.map((f, i) => {
      const scale = i === 0 ? (grams && f.g ? grams / f.g : qty) : 1;
      const qtyLabel = i === 0 && grams ? `${grams} ${/ml/.test(phrase) ? 'ml' : 'g'}` : scaleLabel(f.serving, scale);
      return { name: f.n, qty: qtyLabel, cal: rnd(f.cal * scale), p: rnd(f.p * scale), c: rnd(f.c * scale), f: rnd(f.f * scale), fib: rnd(f.fib * scale) };
    });
  }
  function scaleLabel(serving, s) {
    if (s === 1) return serving;
    const m = serving.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    if (!m) return `${s} × ${serving}`;
    const n = +m[1] * s;
    let unit = m[2];
    // "1 roti" → "2 rotis"; servings already plural ("6 pieces") or metric stay as is.
    if (n > 1 && +m[1] === 1 && !/^(g|ml|tsp|tbsp)\b/.test(unit)) {
      unit = unit.replace(/^(\w+)/, w => /(s|sh|ch|x)$/.test(w) ? w + 'es' : w + 's');
    }
    return `${+n.toFixed(2)} ${unit}`;
  }
  const rnd = v => Math.round(v * 10) / 10;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  function parseLocal(text) {
    const foods = allFoods();
    const bySlot = splitSlots(text);
    return Object.entries(bySlot).map(([slot, t]) => ({
      slot,
      items: t.split(/\s*(?:,|;|\+|&|\band\b|\bwith\b|\balong with\b|\bplus\b|\n|\.(?!\d))\s*/i)
        .filter(s => s && s.trim().length > 1)
        .flatMap(s => parseItem(s, foods))
    })).filter(m => m.items.length);
  }

  // ── Claude (optional) ──
  async function parseWithClaude(text, apiKey) {
    const p = EB.getProfile();
    const schema = {
      type: 'object', additionalProperties: false, required: ['meals'],
      properties: {
        meals: { type: 'array', items: {
          type: 'object', additionalProperties: false, required: ['slot', 'items'],
          properties: {
            slot: { type: 'string', enum: ['breakfast', 'lunch', 'snack', 'dinner'] },
            items: { type: 'array', items: {
              type: 'object', additionalProperties: false, required: ['name', 'qty', 'cal', 'p', 'c', 'f', 'fib'],
              properties: { name: { type: 'string' }, qty: { type: 'string' }, cal: { type: 'number' },
                p: { type: 'number' }, c: { type: 'number' }, f: { type: 'number' }, fib: { type: 'number' } } } }
          } } }
      }
    };
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2026-10-21',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-opus-5-5',
        max_tokens: 4000,
        fallbacks: 'default',
        output_config: { effort: 'low', format: { type: 'json_schema', schema } },
        system: 'You log meals for a calorie tracker used mainly for Indian home food. Split what the user ate into breakfast, lunch, snack and dinner (use the time of day ' +
          `${slotByClock()} if they don't say). One item per food with the quantity they gave, or a typical single portion if they didn't. ` +
          'Estimate calories and grams of protein, carbs, fat and fiber for that quantity, home-cooked unless they say otherwise. ' +
          `Diet: ${p.food.diet || 'unknown'}.`,
        messages: [{ role: 'user', content: text }]
      })
    });
    if (!res.ok) throw new Error('api ' + res.status);
    const data = await res.json();
    if (data.stop_reason === 'refusal') throw new Error('refusal');
    const json = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    return JSON.parse(json).meals.filter(m => m.items.length);
  }

  // ── Coach tone (picked in onboarding) ──
  function coachLine(kind, { when = 'today', left = null } = {}) {
    const tone = EB.getProfile().coach || 'gentle';
    const over = left != null && left < 0;
    const amount = left == null ? '' : `${Math.abs(left).toLocaleString()} cal`;
    const lines = {
      greet: {
        cheer: `What did you eat ${when}? Tell me everything!`,
        gentle: `What did you have ${when}? Rough amounts are fine.`,
        straight: `What did you eat ${when}? Quantities make it accurate.`,
        mindful: `What did you eat ${when}? Take a moment to remember each meal.`
      },
      done: {
        cheer: over ? 'Logged! A bigger day happens. You’re still showing up.' : `Logged! ${amount ? amount + ' to go. ' : ''}You’re doing great.`,
        gentle: over ? 'Saved. A fuller day is okay, tomorrow is a fresh plate.' : 'Saved. Every log helps you see the pattern.',
        straight: left == null ? 'Logged.' : over ? `You’re ${amount} over. Keep the rest of today light.` : `${amount} left today.`,
        mindful: 'Logged. How did those meals leave you feeling?'
      }
    };
    return (lines[kind] || {})[tone] || '';
  }

  // ── UI ──
  let el, log, pending;
  function dayLabel() {
    try { return DAY_NAMES[currentDay]; } catch { return 'today'; }
  }
  function dateStr() {
    try { return selectedDateStr(); } catch { return EB.todayISO(); }
  }

  function open() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'as-overlay';
    el.innerHTML = `
      <div class="as-sheet" role="dialog" aria-modal="true" aria-labelledby="asTitle">
        <div class="as-head">
          <h2 id="asTitle">Log what you ate</h2>
          <button type="button" class="eb-icon-btn" data-as="close" aria-label="Close">${ICONS.close}</button>
        </div>
        <div class="as-log" id="asLog" aria-live="polite"></div>
        <form class="as-input" id="asForm">
          <textarea id="asText" rows="1" placeholder="e.g. Lunch: 2 rotis, dal, salad" aria-label="What did you eat?"></textarea>
          <button type="button" class="eb-mic" data-dictate aria-label="Dictate" aria-pressed="false">${ICONS.mic}</button>
          <button type="submit" class="as-send" aria-label="Send">${ICONS.send}</button>
        </form>
      </div>`;
    document.body.appendChild(el);
    document.documentElement.classList.add('eb-locked');
    log = el.querySelector('#asLog');
    const ta = el.querySelector('#asText');
    EB.attachDictation(el.querySelector('[data-dictate]'), ta);
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
    el.querySelector('#asForm').addEventListener('submit', e => { e.preventDefault(); submit(); });
    el.addEventListener('click', onClick);
    if (!log.children.length) bot(coachLine('greet', { when: dayLabel() === DAY_NAMES_TODAY() ? 'today' : 'on ' + dayLabel() }));
    requestAnimationFrame(() => { el.classList.add('open'); ta.focus(); });
  }
  function DAY_NAMES_TODAY() {
    try { return DAY_NAMES[['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()]]; } catch { return ''; }
  }
  function close() {
    EB.voice.abort();
    el.classList.remove('open');
    const node = el; el = null;
    setTimeout(() => node.remove(), 200);
    document.documentElement.classList.remove('eb-locked');
  }
  function onClick(e) {
    if (e.target === el) return close();
    const a = e.target.closest('[data-as]'); if (!a) return;
    const act = a.dataset.as;
    if (act === 'close') close();
    if (act === 'remove') {
      const [mi, ii] = a.dataset.at.split(':').map(Number);
      pending[mi].items.splice(ii, 1);
      if (!pending[mi].items.length) pending.splice(mi, 1);
      renderPending(a.closest('.as-card'));
    }
    if (act === 'apply') apply(a.closest('.as-card'));
  }
  function msg(cls, html) {
    const d = document.createElement('div'); d.className = 'as-msg ' + cls; d.innerHTML = html;
    log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }
  const bot = t => msg('bot', esc(t));

  async function submit() {
    const ta = el.querySelector('#asText');
    const text = ta.value.trim(); if (!text) return;
    ta.value = ''; ta.style.height = 'auto';
    msg('me', esc(text));
    const key = EB.getProfile().apiKey;
    let meals = parseLocal(text);
    const hasUnknown = meals.some(m => m.items.some(i => i.unknown));
    if (key && (hasUnknown || !meals.length)) {
      const wait = msg('bot muted', 'Estimating…');
      try { meals = await parseWithClaude(text, key); }
      catch { /* keep the local result */ }
      wait.remove();
    }
    if (!meals.length) return bot('I couldn’t find any food in that. Try something like “Dinner: 2 rotis and paneer bhurji”.');
    pending = meals;
    const card = msg('bot card', '');
    card.classList.add('as-card');
    renderPending(card);
  }

  function totals(items) {
    return items.reduce((a, i) => ({ cal: a.cal + (+i.cal || 0), p: a.p + (+i.p || 0), c: a.c + (+i.c || 0), f: a.f + (+i.f || 0), fib: a.fib + (+i.fib || 0) }),
      { cal: 0, p: 0, c: 0, f: 0, fib: 0 });
  }
  function renderPending(card) {
    if (!pending.length) { card.innerHTML = '<p class="as-muted">Nothing left to log.</p>'; return; }
    const day = dayLabel();
    const existing = (() => { try { return getSlotLog(dateStr()); } catch { return {}; } })();
    card.innerHTML = pending.map((m, mi) => {
      const t = totals(m.items.filter(i => !i.unknown));
      return `<div class="as-meal">
        <div class="as-meal-head"><span>${SLOT_NAMES[m.slot]}</span><span class="as-meal-total">${Math.round(t.cal)} cal · ${Math.round(t.p)}g P</span></div>
        ${m.items.map((i, ii) => `<div class="as-item${i.unknown ? ' unknown' : ''}">
          <span class="as-item-name">${esc(i.name)}${i.unknown ? '' : `<span class="as-item-qty">${esc(i.qty)}</span>`}</span>
          ${i.unknown
            ? `<label class="as-cal-in"><input type="number" inputmode="numeric" min="0" placeholder="cal" data-unknown="${mi}:${ii}" aria-label="Calories for ${esc(i.name)}"></label>`
            : `<span class="as-item-cal">${Math.round(i.cal)}</span>`}
          <button type="button" class="eb-icon-btn sm" data-as="remove" data-at="${mi}:${ii}" aria-label="Remove ${esc(i.name)}">${ICONS.close}</button>
        </div>`).join('')}
      </div>`;
    }).join('') + `
      ${pending.some(m => m.items.some(i => i.unknown)) ? '<p class="as-muted">I don’t know these yet. Add calories or remove them.</p>' : ''}
      <button type="button" class="eb-btn primary sm" data-as="apply">${pending.some(m => existing[m.slot]) ? 'Replace' : 'Log'} on ${esc(day)}</button>`;
    card.querySelectorAll('[data-unknown]').forEach(inp => inp.addEventListener('input', () => {
      const [mi, ii] = inp.dataset.unknown.split(':').map(Number);
      const it = pending[mi].items[ii]; it.cal = +inp.value || 0;
    }));
  }

  function apply(card) {
    const ds = dateStr();
    const missing = pending.some(m => m.items.some(i => i.unknown && !(i.cal > 0)));
    if (missing) return EB.toast('Add calories for the unknown items, or remove them');
    try {
      const slotLog = getSlotLog(ds);
      pending.forEach(m => {
        slotLog[m.slot] = m.items.map(i => ({
          name: esc(i.name), qty: i.unknown ? '' : esc(i.qty),
          cal: +i.cal || 0, p: +i.p || 0, c: +i.c || 0, f: +i.f || 0, fib: +i.fib || 0
        }));
        setSlotEaten(ds, m.slot, true);
      });
      setSlotLog(ds, slotLog);
      renderSlotSection(); renderTracker(); renderWeeklyTracker();
      try { renderTabs(); } catch {}
    } catch (err) { return EB.toast('Couldn’t update the day'); }
    const names = pending.map(m => SLOT_NAMES[m.slot].toLowerCase());
    const t = totals(pending.flatMap(m => m.items));
    card.innerHTML = `<p class="as-done">${ICONS.check}<span>Updated ${names.join(', ')} · ${Math.round(t.cal)} cal</span></p>`;
    let left = null;
    try { left = Math.round((isPMSMode() ? PMS_TARGETS : TARGETS).cal - computeConsumed(currentDay).cal); } catch {}
    const follow = coachLine('done', { left });
    if (follow) bot(follow);
    pending = [];
  }

  window.EBAssistant = { open, parseLocal };
})();
