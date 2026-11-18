// ── Look around first ────────────────────────────────────────────────
// "Skip" in onboarding opens Home without a profile. She can browse every
// tab, but nothing she does is saved until she finishes setup (which
// includes signing in). A tap that would save shows a sheet instead.
//
// How: writes to her data keys are dropped while exploring. Loaded before
// every other script so the guard is in place before anything writes.
(function () {
  const FLAG = 'eb_explore';
  const ls = window.localStorage;
  const proto = Storage.prototype;
  const rawSet = proto.setItem, rawGet = proto.getItem, rawRemove = proto.removeItem;

  // Her data: profile, meals, cycle, energy, workouts, weight, challenges,
  // food favourites and history. UI, sign-in and analytics keys still save.
  const DATA = /^(eb_profile|eb_energy|eb_time|eb_symptoms|eb_cycle_daily|eb_challenges|eb_health|eb_food_(recent|fav|scanned)|eb_lastDayMode|mealPlan_|slotEaten_|wakeup_items_|lastBuild_|dayMode_)/;

  const exploring = () => {
    try {
      if (rawGet.call(ls, FLAG) !== '1') return false;
      const p = JSON.parse(rawGet.call(ls, 'eb_profile') || 'null');
      return !(p && p.completedAt);
    } catch { return false; }
  };
  // Onboarding itself must be able to save (that's how she finishes).
  const inSetup = () => !!document.querySelector('.ob:not(.pf)');

  // Only prompt when she just did something, not for background writes.
  let lastTap = 0;
  ['click', 'change', 'submit'].forEach(t => document.addEventListener(t, () => { lastTap = Date.now(); }, true));

  let promptAt = 0;
  function prompt() {
    if (Date.now() - lastTap > 1500 || Date.now() - promptAt < 1500) return;
    promptAt = Date.now();
    setTimeout(show, 0);
  }

  proto.setItem = function (k, v) {
    if (this === ls && DATA.test(k) && exploring() && !inSetup()) { prompt(); return; }
    return rawSet.call(this, k, v);
  };
  proto.removeItem = function (k) {
    if (this === ls && DATA.test(k) && exploring() && !inSetup()) { prompt(); return; }
    return rawRemove.call(this, k);
  };

  function show() {
    if (document.querySelector('.eb-explore-sheet')) return;
    const wrap = document.createElement('div');
    wrap.className = 'eb-explore-sheet';
    wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'exploreTitle');
    wrap.innerHTML = `
      <div class="eb-explore-card">
        <h2 id="exploreTitle">Set up Menu-fi to save this</h2>
        <p>Your meals, cycle, workouts and challenges are saved to your account. Finish setup and sign in, and everything you do from then on is kept. It takes about 2 minutes.</p>
        <div class="eb-cta-row">
          <button type="button" class="eb-btn secondary" data-explore="later">Keep looking</button>
          <button type="button" class="eb-btn primary" data-explore="setup">Finish setup</button>
        </div>
      </div>`;
    wrap.addEventListener('click', e => {
      const b = e.target.closest('[data-explore]');
      if (!b && e.target !== wrap) return;
      wrap.remove();
      if (b && b.dataset.explore === 'setup') startSetup();
      else location.reload();   // drop anything the screen showed but didn't save
    });
    document.body.appendChild(wrap);
    try { window.EBAnalytics && EBAnalytics.track('explore_prompt_shown'); } catch {}
  }

  function startSetup() {
    if (window.EBProfile && EBProfile.isOpen && EBProfile.isOpen()) EBProfile.close();
    window.EBOnboarding && EBOnboarding.open();
  }

  // A reminder above the tab bar on every tab while she's looking around.
  function banner() {
    if (!exploring() || document.querySelector('.eb-explore-bar')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'eb-explore-bar';
    b.innerHTML = '<span><b>You’re looking around.</b> Finish setup to save your progress.</span><span aria-hidden="true">›</span>';
    b.addEventListener('click', startSetup);
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(banner, 300)); else setTimeout(banner, 300);

  window.EBExplore = {
    isOn: exploring,
    start() { rawSet.call(ls, FLAG, '1'); try { window.EBAnalytics && EBAnalytics.track('onboarding_skipped'); } catch {} },
    end() { rawRemove.call(ls, FLAG); document.querySelector('.eb-explore-bar')?.remove(); },
    startSetup,
  };
})();
