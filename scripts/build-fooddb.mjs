// Builds fooddb.js: the bundled food list used by Log mode search.
//
//   node scripts/build-fooddb.mjs <folder with the USDA SR Legacy CSVs>
//
// USDA FoodData Central "SR Legacy" (public domain) is downloaded from
// https://fdc.nal.usda.gov/download-datasets — only the foods picked below are
// kept, per 100 g, with cup / tablespoon weights from USDA's own portion table.
// IFCT 2017 (National Institute of Nutrition, India) has no official
// machine-readable file, so its values are typed in below by hand, per 100 g
// edible portion, raw. Spot-check them against the printed tables before release.
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('Pass the folder that holds food.csv, food_nutrient.csv, food_portion.csv'); process.exit(1); }

// Minimal CSV reader (USDA quotes every field; some contain commas and "").
function readCSV(file) {
  const txt = fs.readFileSync(path.join(dir, file), 'utf8'), rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.slice(1);
}

// [fdc_id, name shown, extra search words (Hindi in Latin letters), flags, piece grams]
// flags: L = drink (ml), K = sold by the katori (cooked foods), S = by the spoon
const USDA = [
  [171287, 'Egg, whole', 'anda ande egg', '', 50],
  [173424, 'Egg, boiled', 'anda ubla anda boiled egg', '', 50],
  [172183, 'Egg white', 'anda safedi egg white', '', 33],
  [171477, 'Chicken breast, cooked', 'murgh chicken', 'K'],
  [172388, 'Chicken thigh, cooked', 'murgh chicken leg', 'K'],
  [175168, 'Salmon, cooked', 'machli machhli fish', 'K'],
  [173709, 'Tuna, canned in water', 'machli fish', 'K'],
  [175180, 'Prawns, cooked', 'jhinga shrimp', 'K'],
  [171265, 'Milk, full cream', 'doodh dudh whole milk', 'L'],
  [171267, 'Milk, toned (2%)', 'doodh dudh', 'L'],
  [171269, 'Milk, skimmed', 'doodh dudh skim', 'L'],
  [171284, 'Curd, plain', 'dahi yogurt yoghurt', 'KS'],
  [171304, 'Greek yogurt, plain', 'hung curd dahi', 'KS'],
  [170903, 'Greek yogurt, low fat', 'hung curd dahi', 'KS'],
  [172182, 'Cottage cheese, low fat', 'cottage cheese', 'K'],
  [173414, 'Cheddar cheese', 'cheese', 'S', 21],
  [170845, 'Mozzarella', 'cheese pizza cheese', 'S'],
  [171247, 'Parmesan, grated', 'cheese', 'S'],
  [173410, 'Butter', 'makhan makkhan', 'S'],
  [171413, 'Olive oil', 'tel oil', 'S'],
  [171412, 'Coconut oil', 'nariyal tel oil', 'S'],
  [172336, 'Canola oil', 'tel oil refined', 'S'],
  [172475, 'Tofu, firm', 'soya paneer tofu', 'K'],
  [172446, 'Soy milk, unsweetened', 'soya doodh', 'L'],
  [173180, 'Whey protein powder', 'protein shake whey', 'S'],
  [169753, 'Rice, white, cooked', 'chawal chaawal bhaat bhat', 'K'],
  [168877, 'Rice, white, raw', 'chawal chaawal uncooked', ''],
  [169704, 'Brown rice, cooked', 'chawal', 'K'],
  [169705, 'Oats, dry', 'jai oatmeal', 'S'],
  [169737, 'Pasta, cooked', 'pasta macaroni', 'K'],
  [168917, 'Quinoa, cooked', 'quinoa', 'K'],
  [172688, 'Bread, whole wheat', 'brown bread double roti', '', 28],
  [174924, 'Bread, white', 'double roti pav bread', '', 25],
  [173757, 'Chickpeas, boiled', 'kabuli chana chole chhole', 'K'],
  [173756, 'Chickpeas, raw', 'kabuli chana chole', ''],
  [172421, 'Lentils, boiled', 'masoor dal daal', 'K'],
  [173740, 'Kidney beans, boiled', 'rajma', 'K'],
  [174257, 'Mung beans, boiled', 'moong sabut moong mung', 'K'],
  [174289, 'Hummus', 'hummus', 'S'],
  [172470, 'Peanut butter', 'moongphali', 'S'],
  [173806, 'Peanuts, roasted', 'moongphali mungfali singdana', 'S'],
  [172430, 'Peanuts, raw', 'moongphali mungfali singdana', 'S'],
  [170567, 'Almonds', 'badam', 'S', 1.2],
  [170187, 'Walnuts', 'akhrot', 'S', 4],
  [170162, 'Cashews', 'kaju', 'S', 1.5],
  [170184, 'Pistachios', 'pista', 'S', 0.7],
  [170554, 'Chia seeds', 'chia seeds', 'S'],
  [169414, 'Flax seeds', 'alsi alsi ke beej', 'S'],
  [170556, 'Pumpkin seeds', 'kaddu ke beej', 'S'],
  [170562, 'Sunflower seeds', 'surajmukhi ke beej', 'S'],
  [170150, 'Sesame seeds', 'til', 'S'],
  [170169, 'Coconut, fresh', 'nariyal', 'S'],
  [168191, 'Dates', 'khajoor khajur', '', 24],
  [173944, 'Banana', 'kela', '', 118],
  [171688, 'Apple', 'seb saib', '', 182],
  [169097, 'Orange', 'santra santara narangi', '', 131],
  [169910, 'Mango', 'aam', '', 200],
  [169926, 'Papaya', 'papita', ''],
  [174683, 'Grapes', 'angoor angur', ''],
  [167765, 'Watermelon', 'tarbooz tarbuj', ''],
  [167762, 'Strawberries', 'strawberry', ''],
  [171711, 'Blueberries', 'blueberry', ''],
  [169134, 'Pomegranate', 'anaar anar', '', 282],
  [173044, 'Guava', 'amrood amrud', '', 55],
  [169124, 'Pineapple', 'ananas', ''],
  [169118, 'Pear', 'nashpati naspati', '', 178],
  [168153, 'Kiwi', 'kiwi', '', 69],
  [171705, 'Avocado', 'avocado', '', 150],
  [170438, 'Potato, boiled', 'aloo alu', 'K', 150],
  [168483, 'Sweet potato, baked', 'shakarkandi', 'K', 114],
  [168462, 'Spinach, raw', 'palak', ''],
  [168463, 'Spinach, cooked', 'palak', 'K'],
  [170379, 'Broccoli, raw', 'broccoli', ''],
  [169967, 'Broccoli, cooked', 'broccoli', 'K'],
  [170393, 'Carrot', 'gajar', '', 61],
  [168409, 'Cucumber', 'kheera khira kakdi', '', 200],
  [170457, 'Tomato', 'tamatar', '', 123],
  [170000, 'Onion', 'pyaz pyaaz kanda', '', 110],
  [169986, 'Cauliflower', 'gobhi gobi phool gobhi', ''],
  [169975, 'Cabbage', 'patta gobhi band gobhi', ''],
  [170419, 'Green peas, raw', 'matar mattar', ''],
  [170017, 'Green peas, cooked', 'matar mattar', 'K'],
  [169251, 'Mushrooms', 'khumb mushroom', ''],
  [169999, 'Sweet corn, cooked', 'makka makkai bhutta', 'K'],
  [169247, 'Lettuce', 'salad patta', ''],
  [169145, 'Beetroot', 'chukandar', '', 82],
  [169260, 'Okra, raw', 'bhindi', ''],
  [169228, 'Brinjal, raw', 'baingan eggplant', ''],
  [169640, 'Honey', 'shahad shehad', 'S'],
  [169655, 'Sugar', 'cheeni chini shakkar', 'S'],
  [174831, 'Coconut water', 'nariyal pani', 'L'],
  [170273, 'Dark chocolate (70–85%)', 'chocolate', '', 10],
  [170317, 'Pizza, cheese', 'pizza', '', 107]
];

// IFCT 2017, per 100 g edible portion, raw. [name, search words, cal, protein, carbs, fat, fibre, flags]
const IFCT = [
  ['Atta (whole wheat flour)', 'atta gehun wheat flour aata', 321, 10.6, 64.2, 1.5, 11.4, 'S'],
  ['Maida (refined flour)', 'maida refined flour', 351, 10.4, 74.3, 0.8, 2.8, 'S'],
  ['Suji (semolina)', 'suji sooji rava rawa semolina', 333, 11.4, 68.4, 0.8, 9.7, 'S'],
  ['Rice, raw (milled)', 'chawal chaawal', 356, 7.9, 78.2, 0.5, 2.8, ''],
  ['Poha (rice flakes), dry', 'poha pohe chivda chura', 353, 7.4, 76.7, 1.1, 3.5, ''],
  ['Bajra (pearl millet)', 'bajra bajri millet', 348, 11.0, 61.8, 5.4, 11.5, ''],
  ['Jowar (sorghum)', 'jowar jwari millet', 334, 10.0, 67.7, 1.7, 10.2, ''],
  ['Ragi (finger millet)', 'ragi nachni nachani millet', 321, 7.2, 66.8, 1.9, 11.2, ''],
  ['Chana dal, raw / besan', 'chana dal besan bengal gram', 328, 21.6, 46.8, 5.3, 15.1, 'S'],
  ['Toor dal, raw', 'toor tur arhar dal daal', 335, 21.7, 55.2, 1.6, 9.1, ''],
  ['Moong dal, raw', 'moong mung dal daal yellow', 326, 23.8, 52.5, 1.3, 9.4, ''],
  ['Urad dal, raw', 'urad udad dal daal', 330, 23.1, 51.0, 1.6, 11.9, ''],
  ['Masoor dal, raw', 'masoor masur dal daal', 323, 24.3, 52.0, 0.8, 10.4, ''],
  ['Rajma, raw', 'rajma kidney beans', 299, 19.9, 48.2, 1.7, 16.6, ''],
  ['Kala chana, raw', 'kala chana black chana', 287, 18.8, 39.6, 5.1, 25.2, ''],
  ['Moong, whole, raw', 'sabut moong mung green gram', 299, 22.5, 47.2, 1.1, 17.0, ''],
  ['Ghee', 'ghee ghi desi ghee', 900, 0, 0, 100, 0, 'S'],
  ['Mustard oil', 'sarson tel sarso oil', 900, 0, 0, 100, 0, 'S']
];

const foods = readCSV('food.csv'), nutr = readCSV('food_nutrient.csv'), portion = readCSV('food_portion.csv');
const want = new Set(USDA.map(x => String(x[0])));
const desc = Object.fromEntries(foods.filter(r => want.has(r[0])).map(r => [r[0], r[2]]));
const N = { 1008: 'cal', 1003: 'p', 1005: 'c', 1004: 'f', 1079: 'fib' };
const vals = {};
for (const r of nutr) if (want.has(r[1]) && N[r[2]]) (vals[r[1]] ||= {})[N[r[2]]] = +r[3];
const cupOf = {}, tbspOf = {};
for (const r of portion) {
  if (!want.has(r[1])) continue;
  const mod = (r[6] || '').toLowerCase(), g = +r[7];
  if (!g) continue;
  if (/^cup\b/.test(mod) && !cupOf[r[1]]) cupOf[r[1]] = g;
  if (/^(tbsp|tablespoon)\b/.test(mod) && !tbspOf[r[1]]) tbspOf[r[1]] = g;
}

const r1 = n => Math.round((n || 0) * 10) / 10;
function units(flags, piece, cup, tbsp) {
  const u = { g: 1 };
  if (flags.includes('L')) { u.ml = 1; u.cup = cup || 240; }
  if (piece) u.piece = piece;
  if (flags.includes('K')) u.katori = 150;
  if (flags.includes('S')) u.spoon = tbsp || 15;
  if (cup && !u.cup && !piece && !flags.includes('S')) u.cup = Math.round(cup);
  return u;
}

const out = [];
for (const [id, name, words, flags, piece] of USDA) {
  const v = vals[id];
  if (!v || v.cal == null) { console.error('Missing USDA food', id, name); process.exit(1); }
  out.push(['u' + id, name, words, Math.round(v.cal), r1(v.p), r1(v.c), r1(v.f), r1(v.fib), units(flags, piece, cupOf[id], tbspOf[id]), 'usda', desc[id]]);
}
IFCT.forEach(([name, words, cal, p, c, f, fib, flags], i) =>
  out.push(['i' + (i + 1), name, words, cal, p, c, f, fib, units(flags), 'ifct']));

const js = `// Generated by scripts/build-fooddb.mjs. Do not edit by hand; edit the lists there.
// Values per 100 g. Sources: USDA FoodData Central, SR Legacy (public domain);
// IFCT 2017, National Institute of Nutrition, India (entered by hand).
// Row: [id, name, search words, cal, protein, carbs, fat, fibre, units (grams each), source, USDA description]
window.EB_FOODDB = ${JSON.stringify(out).replace(/\],\[/g, '],\n[')};
`;
fs.writeFileSync(new URL('../fooddb.js', import.meta.url), js);
console.log(`fooddb.js: ${out.length} foods, ${(js.length / 1024).toFixed(1)} KB`);
