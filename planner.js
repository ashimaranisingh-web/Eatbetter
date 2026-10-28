// ── Meal planner ──────────────────────────────────────────────────────
// Builds the week's breakfast, lunch, snack and dinner from the profile:
// diet, cuisines, what the person usually eats, weight, activity and goal.
// Dishes are everyday food that is easy to make in India. The plan replaces
// the built-in weekly plan (switch back from Profile → Meal plan).
(function () {
  // d: who can eat it — 'vegan' (everyone), 'veg' (not vegan), 'egg',
  //    'fish' (pescatarian + non-veg), 'meat' (non-veg only).
  // jain: safe without onion, garlic and root vegetables.
  // k: words that match what someone types as a usual meal.
  // items: [name, qty, cal, protein, carbs, fat, fiber]
  const R = (slot, name, d, cuisines, k, items, extra = {}) => ({ slot, name, d, cuisines, k, items, ...extra });
  const DISHES = [
    // Breakfast
    R('breakfast', 'Poha with peanuts + curd', 'veg', ['north', 'home'], ['poha'],
      [['Poha with peanuts', '1 plate', 270, 5, 45, 8, 3], ['Curd', '100 g', 60, 4, 5, 3, 0]]),
    R('breakfast', 'Moong dal chilla + mint chutney + curd', 'veg', ['north', 'home'], ['chilla', 'cheela', 'moong'],
      [['Moong dal chilla', '2', 300, 16, 34, 10, 8], ['Mint chutney', '2 tbsp', 15, 1, 2, 0, 1], ['Curd', '100 g', 60, 4, 5, 3, 0]], { jain: true }),
    R('breakfast', 'Besan chilla with paneer', 'veg', ['north', 'home'], ['besan', 'chilla'],
      [['Besan chilla', '2', 280, 14, 30, 11, 6], ['Paneer filling', '40 g', 106, 7, 2, 8, 0]]),
    R('breakfast', 'Idli + sambar', 'vegan', ['south'], ['idli', 'idly', 'sambar'],
      [['Idli', '3', 120, 6, 24, 1, 2], ['Sambar', '1 bowl', 110, 5, 16, 3, 4], ['Coconut chutney', '2 tbsp', 60, 1, 3, 5, 1]]),
    R('breakfast', 'Masala dosa + sambar', 'vegan', ['south'], ['dosa'],
      [['Masala dosa', '1', 350, 7, 50, 13, 4], ['Sambar', '1 bowl', 110, 5, 16, 3, 4]]),
    R('breakfast', 'Vegetable upma + curd', 'veg', ['south', 'home'], ['upma', 'rava'],
      [['Vegetable upma', '1 bowl', 250, 6, 38, 8, 3], ['Curd', '100 g', 60, 4, 5, 3, 0]]),
    R('breakfast', 'Masala oats + boiled eggs', 'egg', ['home', 'continental'], ['oats', 'egg'],
      [['Masala oats', '1 bowl', 220, 8, 36, 5, 5], ['Boiled eggs', '2', 140, 12, 0, 10, 0]]),
    R('breakfast', 'Egg bhurji + 2 rotis', 'egg', ['north', 'home'], ['egg bhurji', 'anda', 'egg'],
      [['Egg bhurji', '2 eggs', 190, 13, 2, 14, 0], ['Roti', '2', 180, 6, 36, 2, 6]]),
    R('breakfast', 'Paneer bhurji + multigrain toast', 'veg', ['continental', 'home'], ['paneer', 'toast'],
      [['Paneer bhurji', '100 g', 200, 12, 4, 15, 1], ['Multigrain toast', '2 slices', 160, 8, 28, 2, 5]]),
    R('breakfast', 'Greek yogurt bowl with fruit + nuts', 'veg', ['continental', 'salads'], ['yogurt', 'curd', 'fruit', 'muesli', 'granola'],
      [['Hung curd', '150 g', 135, 12, 6, 6, 0], ['Seasonal fruit', '1 cup', 60, 1, 15, 0, 2], ['Almonds', '10', 70, 3, 2, 6, 1]], { jain: true }),
    R('breakfast', 'Overnight oats with chia + peanut butter', 'veg', ['continental', 'prep'], ['overnight oats', 'oats', 'chia'],
      [['Oats soaked in milk', '1 jar', 260, 10, 40, 6, 6], ['Chia seeds', '1 tbsp', 60, 2, 5, 4, 4], ['Peanut butter', '1 tbsp', 95, 4, 3, 8, 1]], { jain: true }),
    R('breakfast', 'Tofu scramble on toast', 'vegan', ['continental'], ['tofu'],
      [['Tofu scramble', '150 g', 180, 18, 4, 11, 2], ['Multigrain toast', '2 slices', 160, 8, 28, 2, 5]]),
    R('breakfast', 'Egg and bean breakfast burrito', 'egg', ['mexican'], ['burrito', 'wrap'],
      [['Whole-wheat tortilla', '1', 150, 5, 25, 4, 4], ['Scrambled eggs', '2', 180, 12, 2, 14, 0], ['Rajma + salsa', '½ cup', 110, 6, 18, 1, 6]]),
    R('breakfast', 'Paneer paratha + curd', 'veg', ['north', 'home'], ['paratha', 'parantha'],
      [['Paneer paratha', '1', 300, 13, 32, 13, 3], ['Curd', '100 g', 60, 4, 5, 3, 0]], { comfort: true }),

    // Lunch
    R('lunch', 'Dal + rice + sabzi + salad', 'vegan', ['north', 'home'], ['dal', 'rice', 'chawal', 'sabzi'],
      [['Dal', '1 bowl', 150, 9, 20, 4, 6], ['Rice', '120 g cooked', 156, 3, 34, 0, 1], ['Mixed veg sabzi', '1 bowl', 140, 3, 14, 8, 4], ['Salad', '1 bowl', 40, 1, 8, 0, 3]]),
    R('lunch', 'Rajma chawal + raita', 'veg', ['north', 'home'], ['rajma'],
      [['Rajma', '1 bowl', 200, 10, 28, 5, 8], ['Rice', '120 g cooked', 156, 3, 34, 0, 1], ['Raita', '1 bowl', 80, 4, 7, 4, 1]], { comfort: true }),
    R('lunch', 'Chole + 2 rotis + salad', 'vegan', ['north'], ['chole', 'chana'],
      [['Chole', '1 bowl', 240, 10, 30, 8, 8], ['Roti', '2', 180, 6, 36, 2, 6], ['Salad', '1 bowl', 40, 1, 8, 0, 3]], { comfort: true }),
    R('lunch', 'Paneer tikka + 2 rotis + salad', 'veg', ['north'], ['paneer'],
      [['Paneer tikka', '120 g', 260, 18, 6, 18, 1], ['Roti', '2', 180, 6, 36, 2, 6], ['Salad', '1 bowl', 40, 1, 8, 0, 3]]),
    R('lunch', 'Chicken curry + rice + salad', 'meat', ['north', 'home'], ['chicken'],
      [['Chicken curry', '1 bowl', 250, 24, 6, 14, 1], ['Rice', '120 g cooked', 156, 3, 34, 0, 1], ['Salad', '1 bowl', 40, 1, 8, 0, 3]]),
    R('lunch', 'Grilled chicken quinoa bowl', 'meat', ['salads', 'continental'], ['salad', 'bowl', 'quinoa', 'chicken'],
      [['Grilled chicken', '120 g', 198, 37, 0, 5, 0], ['Quinoa', '100 g cooked', 120, 4, 21, 2, 3], ['Veg + olive oil dressing', '1 bowl', 120, 2, 10, 8, 4]]),
    R('lunch', 'Fish curry + rice', 'fish', ['south', 'home'], ['fish'],
      [['Fish curry', '1 bowl', 220, 22, 5, 12, 1], ['Rice', '120 g cooked', 156, 3, 34, 0, 1], ['Salad', '1 bowl', 40, 1, 8, 0, 3]]),
    R('lunch', 'Curd rice + poriyal + sundal', 'veg', ['south'], ['curd rice', 'sundal'],
      [['Curd rice', '1 bowl', 280, 8, 45, 7, 1], ['Vegetable poriyal', '1 bowl', 100, 3, 10, 5, 4], ['Chana sundal', '½ cup', 150, 8, 22, 3, 6]], { jain: true, comfort: true }),
    R('lunch', 'Burrito bowl', 'veg', ['mexican', 'salads'], ['burrito', 'mexican', 'bowl'],
      [['Rice', '120 g cooked', 156, 3, 34, 0, 1], ['Rajma / black beans', '1 bowl', 200, 10, 28, 5, 8], ['Salsa + veg', '1 cup', 60, 2, 12, 0, 3], ['Hung curd', '50 g', 45, 4, 2, 2, 0]], { comfort: true }),
    R('lunch', 'Tofu vegetable stir-fry + rice', 'vegan', ['asian'], ['tofu', 'stir fry', 'chinese'],
      [['Tofu + veg stir-fry', '1 bowl', 250, 18, 12, 14, 4], ['Rice', '120 g cooked', 156, 3, 34, 0, 1]]),
    R('lunch', 'Egg curry + 2 rotis', 'egg', ['north', 'home'], ['egg curry', 'egg'],
      [['Egg curry', '2 eggs', 250, 14, 8, 18, 2], ['Roti', '2', 180, 6, 36, 2, 6]]),
    R('lunch', 'Khichdi + curd + salad', 'veg', ['home', 'north'], ['khichdi', 'khichri'],
      [['Moong dal khichdi', '1 bowl', 240, 9, 40, 5, 5], ['Curd', '100 g', 60, 4, 5, 3, 0], ['Salad', '1 bowl', 40, 1, 8, 0, 3]], { jain: true, comfort: true }),
    R('lunch', 'Hummus and roasted chickpea wrap', 'vegan', ['mediterranean'], ['hummus', 'wrap', 'falafel'],
      [['Whole-wheat wrap', '1', 180, 6, 30, 4, 4], ['Hummus', '50 g', 130, 4, 7, 9, 3], ['Roasted chickpeas + veg', '1 cup', 180, 8, 20, 7, 6]]),
    R('lunch', 'Soya chunk pulao + raita', 'veg', ['north', 'prep'], ['soya', 'pulao'],
      [['Soya chunk pulao', '1 bowl', 330, 22, 45, 6, 6], ['Raita', '1 bowl', 80, 4, 7, 4, 1]]),

    // Snack
    R('snack', 'Roasted makhana + green tea', 'vegan', ['home'], ['makhana'],
      [['Roasted makhana', '1 bowl', 88, 3, 18, 0, 1], ['Green tea', '1 cup', 2, 0, 0, 0, 0]], { jain: true }),
    R('snack', 'Apple + peanut butter', 'vegan', ['continental'], ['apple', 'peanut butter', 'fruit'],
      [['Apple', '1', 95, 0, 25, 0, 4], ['Peanut butter', '1 tbsp', 95, 4, 3, 8, 1]], { jain: true }),
    R('snack', 'Sprouts chaat', 'vegan', ['north'], ['sprouts', 'chaat'],
      [['Sprouts chaat', '1 bowl', 120, 8, 18, 1, 5]]),
    R('snack', 'Hung curd bowl with berries', 'veg', ['continental'], ['curd', 'yogurt', 'berries'],
      [['Hung curd', '100 g', 90, 8, 4, 4, 0], ['Berries / fruit', '½ cup', 40, 1, 10, 0, 2], ['Pumpkin seeds', '10 g', 55, 3, 1, 5, 1]], { jain: true }),
    R('snack', 'Boiled eggs + cucumber', 'egg', ['home'], ['egg'],
      [['Boiled eggs', '2', 140, 12, 0, 10, 0], ['Cucumber', '1', 15, 1, 3, 0, 1]]),
    R('snack', 'Roasted chana + chaas', 'veg', ['north', 'home'], ['chana', 'chaas', 'buttermilk'],
      [['Roasted chana', '30 g', 120, 7, 18, 2, 5], ['Chaas', '1 glass', 40, 2, 4, 1, 0]], { jain: true }),
    R('snack', 'Protein shake', 'veg', ['continental'], ['protein', 'whey', 'shake'],
      [['Whey', '1 scoop', 120, 25, 3, 1, 0], ['Milk', '150 ml', 90, 5, 7, 4, 0]], { jain: true }),
    R('snack', 'Hummus + veg sticks', 'vegan', ['mediterranean'], ['hummus'],
      [['Hummus', '50 g', 130, 4, 7, 9, 3], ['Carrot + cucumber sticks', '1 cup', 35, 1, 7, 0, 3]]),
    R('snack', 'Dhokla', 'veg', ['home'], ['dhokla'],
      [['Dhokla', '2 pieces', 160, 6, 22, 5, 2]], { jain: true }),
    R('snack', 'Chicken tikka bites', 'meat', ['north'], ['chicken', 'tikka'],
      [['Chicken tikka', '4 pieces', 170, 24, 3, 7, 0]]),
    R('snack', 'Mixed nuts + dates', 'vegan', ['home'], ['nuts', 'dates', 'almonds'],
      [['Mixed nuts', '20 g', 120, 4, 4, 10, 2], ['Dates', '2', 46, 0, 12, 0, 1]], { jain: true, comfort: true }),
    R('snack', 'Dark chocolate + almonds', 'veg', ['continental'], ['chocolate'],
      [['Dark chocolate (70%)', '2 squares', 110, 2, 9, 8, 2], ['Almonds', '8', 56, 2, 2, 5, 1]], { jain: true, comfort: true }),

    // Dinner
    R('dinner', 'Paneer bhurji + 2 rotis + salad', 'veg', ['north', 'home'], ['paneer'],
      [['Paneer bhurji', '120 g', 240, 15, 5, 18, 1], ['Roti', '2', 180, 6, 36, 2, 6], ['Salad', '1 bowl', 40, 1, 8, 0, 3]]),
    R('dinner', 'Moong dal + 2 rotis + sabzi', 'vegan', ['north', 'home'], ['dal', 'roti', 'sabzi'],
      [['Moong dal', '1 bowl', 150, 10, 20, 3, 5], ['Roti', '2', 180, 6, 36, 2, 6], ['Mixed veg sabzi', '1 bowl', 140, 3, 14, 8, 4]], { jain: true }),
    R('dinner', 'Grilled chicken + sautéed veg + roti', 'meat', ['continental', 'home'], ['chicken', 'grilled'],
      [['Grilled chicken', '150 g', 248, 46, 0, 6, 0], ['Sautéed veg', '1 bowl', 90, 3, 12, 4, 4], ['Roti', '1', 90, 3, 18, 1, 3]]),
    R('dinner', 'Grilled fish + quinoa + veg', 'fish', ['continental', 'salads'], ['fish', 'salmon', 'quinoa'],
      [['Grilled fish', '150 g', 210, 33, 0, 9, 0], ['Quinoa', '100 g cooked', 120, 4, 21, 2, 3], ['Steamed veg', '1 bowl', 60, 3, 10, 0, 4]]),
    R('dinner', 'Palak paneer + 2 rotis', 'veg', ['north'], ['palak', 'paneer', 'saag'],
      [['Palak paneer', '1 bowl', 260, 12, 8, 20, 3], ['Roti', '2', 180, 6, 36, 2, 6]], { jain: true, comfort: true }),
    R('dinner', 'Tofu bhurji + 2 rotis', 'vegan', ['north', 'home'], ['tofu'],
      [['Tofu bhurji', '150 g', 200, 18, 5, 12, 2], ['Roti', '2', 180, 6, 36, 2, 6]]),
    R('dinner', 'Vegetable khichdi + curd', 'veg', ['home'], ['khichdi'],
      [['Vegetable khichdi', '1 bowl', 280, 10, 45, 6, 6], ['Curd', '100 g', 60, 4, 5, 3, 0]], { jain: true, comfort: true }),
    R('dinner', 'Egg curry + rice', 'egg', ['south', 'home'], ['egg curry', 'egg'],
      [['Egg curry', '2 eggs', 250, 14, 8, 18, 2], ['Rice', '100 g cooked', 130, 3, 28, 0, 1]]),
    R('dinner', 'Chicken stir-fry + hakka noodles', 'meat', ['asian'], ['noodles', 'chinese', 'stir fry'],
      [['Chicken + veg stir-fry', '1 bowl', 250, 28, 10, 11, 3], ['Hakka noodles', '1 cup', 200, 6, 35, 4, 2]]),
    R('dinner', 'Soup + paneer salad', 'veg', ['continental', 'salads'], ['soup', 'salad'],
      [['Vegetable soup', '1 bowl', 100, 3, 12, 4, 2], ['Paneer salad', '1 bowl', 300, 18, 10, 20, 3]], { jain: true }),
    R('dinner', 'Rajma + roti + salad', 'vegan', ['north'], ['rajma'],
      [['Rajma', '1 bowl', 200, 10, 28, 5, 8], ['Roti', '1', 90, 3, 18, 1, 3], ['Salad', '1 bowl', 40, 1, 8, 0, 3]], { comfort: true }),
    R('dinner', 'Bean and cheese quesadilla', 'veg', ['mexican'], ['quesadilla', 'mexican'],
      [['Whole-wheat tortilla', '2', 300, 10, 50, 8, 8], ['Rajma + veg filling', '1 cup', 150, 8, 22, 3, 7], ['Cheese', '20 g', 80, 5, 0, 7, 0]], { comfort: true }),
    R('dinner', 'Pesarattu + chutney', 'vegan', ['south'], ['pesarattu', 'dosa', 'moong'],
      [['Pesarattu (moong dosa)', '2', 260, 14, 34, 7, 6], ['Ginger chutney', '2 tbsp', 60, 1, 3, 5, 1]])
  ];

  const ALLOWED = {
    vegan: ['vegan'], jain: ['vegan', 'veg'], veg: ['vegan', 'veg'], egg: ['vegan', 'veg', 'egg'],
    pescatarian: ['vegan', 'veg', 'egg', 'fish'], nonveg: ['vegan', 'veg', 'egg', 'fish', 'meat']
  };
  // Share of the day's meal calories per slot (wake-up and coffee come first).
  const SPLIT = { breakfast: 0.26, lunch: 0.32, snack: 0.12, dinner: 0.30 };
  const FIXED = 65;   // wake-up (40) + coffee (25), already in the app
  const SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'];
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const KEY = 'eb_plan';

  const r = n => Math.round(n);

  // ── Targets from the profile (estimate) ──
  // Calories per kg by activity are rough averages for women; the goal
  // then sets a gentle deficit or surplus.
  function targetsFor(p) {
    const toKg = v => (p.weight.unit === 'lb' ? +v / 2.20462 : +v);
    const kg = toKg(p.weight.current), goalKg = toKg(p.weight.goal) || kg;
    if (!(kg > 0)) return null;
    const perKg = { sedentary: 25, light: 28, moderate: 31, very: 34 }[p.activity.level] || 28;
    const tdee = r(kg * perKg / 10) * 10;
    let cal = tdee;
    if (p.goal === 'lose') cal = Math.max(1200, tdee - Math.min(500, r(tdee * 0.2)));
    if (p.goal === 'muscle') cal = tdee + 200;
    cal = r(cal / 10) * 10;
    const protein = r(Math.min(150, goalKg * (p.goal === 'maintain' ? 1.2 : 1.6)));
    const fat = r(cal * 0.27 / 9);
    const carbs = r((cal - protein * 4 - fat * 9) / 4);
    return { tdee, normal: { cal, p: protein, c: carbs, f: fat, fib: 28 },
             pms: { cal: cal + 150, p: protein - 5, c: carbs + 30, f: fat + 3, fib: 30 } };
  }

  // ── Building the week ──
  function score(dish, p) {
    const usual = (p.food.usual || '').toLowerCase();
    let s = 0;
    dish.k.forEach(k => { if (new RegExp(`\\b${k}`, 'i').test(usual)) s += 4; });
    dish.cuisines.forEach(c => { if ((p.food.cuisines || []).includes(c)) s += 2; });
    return s;
  }
  function scaled(dish, target) {
    const total = dish.items.reduce((a, it) => a + it[2], 0);
    const f = Math.min(1.4, Math.max(0.75, target / total));
    const items = dish.items.map(([n, q, cal, pr, c, fa, fib]) =>
      ({ n: `${n} (${q})`, cal: r(cal * f), p: r(pr * f), c: r(c * f), f: r(fa * f), fib: r(fib * f) }));
    const sum = k => items.reduce((a, it) => a + it[k], 0);
    const portion = Math.abs(f - 1) >= 0.1 ? ` · ${f > 1 ? 'larger' : 'smaller'} portion (${Math.round(f * 100)}%)` : '';
    return {
      name: dish.name,
      qty: dish.items.map(([n, q]) => `${n} (${q})`).join(' · ') + portion,
      cal: sum('cal'), p: sum('p'), c: sum('c'), f: sum('f'), fib: sum('fib'),
      items, planned: true
    };
  }
  function week(p, t, pms) {
    const diet = p.food.diet || 'veg';
    const ok = ALLOWED[diet] || ALLOWED.veg;
    const mealCal = t.cal - FIXED;
    const plan = {};
    DAYS.forEach(d => (plan[d] = {}));
    SLOTS.forEach(slot => {
      let pool = DISHES.filter(x => x.slot === slot && ok.includes(x.d) && (diet !== 'jain' || x.jain));
      if (!pool.length) return;
      const target = mealCal * SPLIT[slot];
      // Favourites first, then comfort food on PMS days, then closest calories.
      pool = pool.map(x => ({ x, s: score(x, p) + (pms && x.comfort ? 3 : 0),
        gap: Math.abs(x.items.reduce((a, it) => a + it[2], 0) - target) }))
        .sort((a, b) => b.s - a.s || a.gap - b.gap).map(o => o.x);
      // Favourites (named in "usual day") up to twice a week, everything
      // else once, and never the same dish two days running.
      const isLiked = x => score(x, p) >= 4;
      const used = new Map();
      const order = [];
      for (let i = 0; i < 7; i++) {
        const prev = order[i - 1];
        const fits = x => x !== prev && (used.get(x) || 0) < (isLiked(x) ? 2 : 1);
        // Alternate: a favourite, then the best other option, so the week mixes.
        const wantLiked = i % 2 === 0;
        // Least-used first, so every favourite appears once before any repeats.
        const least = list => list.sort((a, b) => (used.get(a) || 0) - (used.get(b) || 0))[0];
        const pick = least(pool.filter(x => fits(x) && isLiked(x) === wantLiked)) || least(pool.filter(fits))
          || pool.find(x => x !== prev) || pool[0];
        used.set(pick, (used.get(pick) || 0) + 1);
        order.push(pick);
      }
      DAYS.forEach((d, i) => (plan[d][slot] = scaled(order[i], target)));
    });
    return plan;
  }

  function signature(p) {
    return JSON.stringify([p.food.diet, p.food.cuisines, p.food.usual, p.weight, p.activity.level, p.goal]);
  }
  function build(p) {
    const t = targetsFor(p);
    if (!t || !p.food.diet) return null;
    return { sig: signature(p), at: Date.now(), targets: t,
      normal: week(p, t.normal, false), pms: week(p, t.pms, true) };
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
  function save(plan) { try { localStorage.setItem(KEY, JSON.stringify(plan)); } catch {} }

  const usePlan = p => p.completedAt && p.planSource !== 'original';

  // ── Hooking into the meal plan page ──
  let current = null;
  const origDefault = window.getEffectiveDefaultMeal;
  const origTargets = { n: { ...TARGETS }, pms: { ...PMS_TARGETS }, tdee: TDEE };

  function applyTargets(plan) {
    const t = plan ? plan.targets : null;
    Object.assign(TARGETS, t ? t.normal : origTargets.n);
    Object.assign(PMS_TARGETS, t ? t.pms : origTargets.pms);
    TDEE = t ? t.tdee : origTargets.tdee;
    const lbl = document.getElementById('tdeeLabel');
    if (lbl) lbl.textContent = TDEE.toLocaleString();
    updateGap();
    const sub = document.getElementById('modeSubtitle');
    if (sub && typeof modeSubtitle === 'function') sub.textContent = modeSubtitle(isPMSMode());
    // Per-slot calorie targets shown on the meal cards
    [[MEAL_SLOTS, TARGETS], [PMS_MEAL_SLOTS, PMS_TARGETS]].forEach(([slots, tg]) => slots.forEach(s => {
      if (!SPLIT[s.id]) return;
      if (!s._orig) s._orig = { targetCal: s.targetCal, targetP: s.targetP };
      s.targetCal = t ? r((tg.cal - FIXED) * SPLIT[s.id]) : s._orig.targetCal;
      s.targetP = t ? r(tg.p * SPLIT[s.id]) : s._orig.targetP;
    }));
  }

  // "deficit 420" / "surplus 200" next to maintenance: the plan's daily gap.
  function updateGap() {
    const el = document.getElementById('planGapLabel'); if (!el) return;
    const target = (typeof isPMSMode === 'function' && isPMSMode()) ? PMS_TARGETS.cal : TARGETS.cal;
    const gap = TDEE - target;
    if (Math.abs(gap) < 50) { el.innerHTML = ''; return; }
    // e.g. "weight loss 1,690 · deficit 420": the day's target and the gap that makes it.
    el.innerHTML =
      `<span class="tracker-stat"><small>${gap > 0 ? 'Weight loss' : 'Weight gain'}</small><b>${target.toLocaleString()}</b></span>` +
      `<span class="tracker-stat"><small>${gap > 0 ? 'Deficit' : 'Surplus'}</small><b>${Math.abs(gap).toLocaleString()}</b></span>`;
  }
  const origTracker = window.renderTracker;
  window.renderTracker = function () { const r = origTracker.apply(this, arguments); updateGap(); return r; };

  window.getEffectiveDefaultMeal = function (slot, day, pms) {
    const m = current && current[pms ? 'pms' : 'normal'][day] && current[pms ? 'pms' : 'normal'][day][slot.id];
    return m ? { ...m } : origDefault.apply(this, arguments);
  };

  function refresh() {
    const p = EB.getProfile();
    if (!usePlan(p)) { current = null; applyTargets(null); }
    else {
      let plan = load();
      if (!plan || plan.sig !== signature(p)) { plan = build(p); if (plan) save(plan); }
      current = plan;
      applyTargets(plan);
    }
    ['renderSlotSection', 'renderTracker', 'renderWeeklyTracker', 'renderTabs'].forEach(fn => {
      try { window[fn](); } catch {}
    });
  }
  function rebuild() { try { localStorage.removeItem(KEY); } catch {} refresh(); }

  document.addEventListener('eb:profile', refresh);
  refresh();

  window.EBPlanner = { refresh, rebuild, targetsFor, build, current: () => current, DISHES };
})();
