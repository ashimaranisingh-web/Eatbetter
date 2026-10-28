// ── Reminders ─────────────────────────────────────────────────────────
// Local notifications in the iOS app (Capacitor LocalNotifications). The
// website has no reliable way to notify, so there it only saves the choice.
(function () {
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const LN = native ? cap.registerPlugin('LocalNotifications') : null;

  // Fixed ids so re-applying replaces instead of stacking.
  const IDS = { morning: 101, lunch: 102, dinner: 103, evening: 104, pms: 105 };
  const PMS_LEAD = { '1-3': 3, '4-7': 7, '7+': 10 };

  function pmsDate(p) {
    if (p.cycle.tracks === false || !p.cycle.lastStart) return null;
    const [y, m, d] = p.cycle.lastStart.split('-').map(Number);
    const len = +p.cycle.cycleLength || 28;
    const lead = PMS_LEAD[p.cycle.pmsStart] || 5;
    const now = new Date();
    const period = new Date(y, m - 1, d, 9, 0);
    let at;
    do { period.setDate(period.getDate() + len); at = new Date(period); at.setDate(at.getDate() - lead - 1); } while (at <= now);
    return at;
  }

  function build(p) {
    const on = p.reminders || [];
    const list = [];
    if (on.includes('morning')) list.push({ id: IDS.morning, title: 'Today’s menu is ready', body: 'See what’s on your plate today.', schedule: { on: { hour: 8, minute: 0 } } });
    if (on.includes('meals')) {
      list.push({ id: IDS.lunch, title: 'Lunch time', body: 'Your planned lunch is waiting.', schedule: { on: { hour: 12, minute: 45 } } });
      list.push({ id: IDS.dinner, title: 'Dinner time', body: 'Check tonight’s dinner before you cook.', schedule: { on: { hour: 19, minute: 30 } } });
    }
    if (on.includes('evening')) list.push({ id: IDS.evening, title: 'How did today go?', body: 'Log anything you ate that wasn’t on the plan.', schedule: { on: { hour: 21, minute: 0 } } });
    const at = on.includes('pms') && pmsDate(p);
    if (at) list.push({ id: IDS.pms, title: 'PMS may start soon', body: 'Your comfort meals are ready when you need them.', schedule: { at } });
    return list;
  }

  async function apply(p) {
    if (!LN) return;
    try {
      await LN.cancel({ notifications: Object.values(IDS).map(id => ({ id })) });
      const list = build(p);
      if (!list.length) return;
      const perm = await LN.requestPermissions();
      if (perm.display !== 'granted') { EB.toast('Turn on notifications for Menu-fi in Settings to get reminders'); return; }
      await LN.schedule({ notifications: list });
    } catch {}
  }

  // The PMS reminder is one-off; re-plan it whenever the app opens.
  if (LN) document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { const p = EB.getProfile(); if ((p.reminders || []).includes('pms')) apply(p); }
  });

  window.EBReminders = { apply, build, native };
})();
