// 30-day dry run of the challenge day logic with a fake calendar.
// node scripts/test-challenges.mjs
import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('../challenges.js');

// Fake cycle: period 2–6 Nov (60%), PMS 26–30 Nov (80%).
const ctx = { factor: ds => (ds >= '2026-11-02' && ds <= '2026-11-06') ? 0.6 : (ds >= '2026-11-26' && ds <= '2026-11-30') ? 0.8 : 1 };
const chs = [
  { id: 'a', name: 'Push-ups', unit: 'reps', start: '2026-11-02', plan: { type: 'rule', start: 10, step: 10, max: 150, days: 20 },
    rest: [0], missed: 'repeat', cycle: true, pauses: [], done: {} },
  { id: 'b', name: 'Crunches', unit: 'reps', start: '2026-11-02', plan: { type: 'rule', start: 15, step: 5, days: 20 },
    rest: [], missed: 'skip', cycle: true, pauses: [], done: {} },
  { id: 'c', name: 'Plank', unit: 'seconds', start: '2026-11-04', plan: { type: 'custom', list: [20, 30, 40, 45, 60, 60, 75, 90] },
    rest: [], missed: 'repeat', cycle: false, pauses: [{ from: '2026-11-08', to: '2026-11-12' }], done: {} }
];
const MISS = new Set(['2026-11-05', '2026-11-12', '2026-11-13', '2026-11-20']);   // days nothing gets ticked
const W = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const cell = (ch, st) => {
  if (st.status === 'finished') return 'finished';
  if (st.status === 'upcoming') return 'starts later';
  if (st.status === 'rest') return `rest (stays d${st.day})`;
  if (st.status === 'paused') return 'paused';
  const t = ch.unit === 'seconds' ? st.target + 's' : st.target;
  return `d${st.day}/${st.total} ${t}${st.factor < 1 ? ` (of ${ch.unit === 'seconds' ? st.base + 's' : st.base})` : ''}${st.repeat ? ' repeat' : ''}`;
};
console.log('Date        | ' + chs.map(c => c.name.padEnd(26)).join(' | ') + ' | ticked?');
for (let i = 0; i < 30; i++) {
  const ds = C.addDays('2026-11-02', i), miss = MISS.has(ds);
  const row = chs.map(ch => {
    const st = C.state(ch, ds, ctx);
    let out = cell(ch, st);
    if (st.status === 'active' && !miss) { ch.done[ds] = st.target; out += st.last ? ' LAST → done 🎉' : ' ✓'; if (st.streak + 1 > 1) out += ` s${C.streakOf(ch, ds)}`; }
    return out.padEnd(26);
  });
  console.log(`${ds} ${W[C.weekday(ds)]} | ${row.join(' | ')} | ${miss ? 'MISSED' : 'yes'}`);
}
