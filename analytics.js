// ── Analytics (PostHog) ───────────────────────────────────────────────
// Off until the person says yes on the first-launch consent line. Only the
// events below are sent, each with a short list of allowed properties —
// never cycle dates, symptoms, weight, food or anything from Apple Health.
(function () {
  const CONSENT_KEY = 'eb_consent';
  const cfg = (window.EB_CONFIG || {}).posthog || {};
  const ph = window.posthog;

  // event name → properties it may carry
  const EVENTS = {
    app_opened:           [],
    onboarding_started:   [],
    onboarding_completed: ['plan_source'],
    tab_viewed:           ['tab'],
    meal_logged:          ['source'],
    workout_logged:       ['source'],
    cycle_log_used:       ['section'],
    challenge_started:    ['preset'],
    health_connected:     [],
    account_created:      [],
    // Food modes, search and scanning. Only kinds and counts: never a food
    // name, barcode or amount, so the consent promise still holds.
    day_mode_set:         ['mode'],
    food_logged:          ['mode', 'source', 'corrected'],
    food_created:         ['mode'],
    barcode_scanned:      ['result'],
    label_read:           ['found'],
    label_saved:          ['barcode', 'converted'],
    label_shared:         [],
    shared_flagged:       [],
  };

  function consent() {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null'); } catch { return null; }
  }
  const enabled = () => !!(ph && cfg.key);

  if (enabled()) {
    ph.init(cfg.key, {
      api_host: cfg.host,
      persistence: 'localStorage',
      person_profiles: 'identified_only',   // anonymous: we never call identify()
      opt_out_capturing_by_default: true,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      property_denylist: ['$current_url', '$pathname', '$referrer', '$initial_referrer'],
    });
    ph.register({ app: 'menufi' });   // tells Menu-fi apart if a PostHog project is shared
    if (consent()?.analytics) ph.opt_in_capturing();
  }

  function track(name, props = {}) {
    if (!enabled() || !consent()?.analytics || !EVENTS[name]) return;
    const clean = {};
    for (const k of EVENTS[name]) if (props[k] != null) clean[k] = String(props[k]).slice(0, 40);
    try { ph.capture(name, clean); } catch {}
  }

  function setConsent(yes) {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ analytics: !!yes, at: new Date().toISOString() })); } catch {}
    if (!enabled()) return;
    if (yes) { ph.opt_in_capturing(); track('app_opened'); }
    else { ph.opt_out_capturing(); ph.reset(); }
  }

  // ── First-launch consent line ──
  function askConsent() {
    if (!enabled() || consent()) return;
    const bar = document.createElement('div');
    bar.className = 'eb-consent';
    bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Usage stats');
    bar.innerHTML = `
      <p>Share anonymous usage stats to help improve Menu-fi? Never your health, cycle or food data.</p>
      <div class="eb-consent-btns">
        <button type="button" class="eb-consent-no" data-consent="0">No thanks</button>
        <button type="button" class="eb-consent-yes" data-consent="1">OK</button>
      </div>`;
    bar.addEventListener('click', e => {
      const b = e.target.closest('[data-consent]'); if (!b) return;
      setConsent(b.dataset.consent === '1');
      bar.remove();
    });
    document.body.appendChild(bar);
  }

  window.EBAnalytics = { track, setConsent, consent, enabled };

  const boot = () => { askConsent(); track('app_opened'); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
