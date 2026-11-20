// ── Analytics (PostHog) ───────────────────────────────────────────────
// Off until the person taps "Got it" in onboarding (or turns it on in Account). Only the
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
    meal_logged:          ['source', 'slot'],
    meal_unticked:        ['slot'],
    meal_removed:         ['slot'],
    meal_plan_prepared:   ['diet', 'cuisines'],
    craving_opened:       [],
    craving_swap_logged:  [],
    day_wrapped:          [],   // that a day was wrapped up, never the numbers   // that a swap was logged, never which food
    dish_crossed_out:     ['slot'],
    favourite_added:      [],
    favourite_removed:    [],
    workout_logged:       ['source', 'kind'],
    workout_removed:      ['source'],
    weight_logged:        [],
    energy_logged:        [],
    time_logged:          [],
    food_corrected:       [],   // that she fixed a food's name or numbers, never which
    grocery_opened:       [],   // groceries: never the items
    grocery_added:        [],
    grocery_bought:       [],
    food_edited:          [],   // that a logged food was edited, never which or how much
    food_tagged:          [],   // that a tag was set, never the tag or the food
    health_synced:        [],
    cycle_log_used:       ['section'],
    mood_face_saved:      [],   // that a face was saved, never the drawing
    challenge_created:    ['preset', 'days'],
    challenge_edited:     ['preset'],
    challenge_deleted:    [],
    challenge_day_done:   [],
    challenge_day_undone: [],
    challenge_completed:  [],
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
    onboarding_step:      ['step'],
    onboarding_skipped:   [],
    explore_prompt_shown: [],
    feedback_opened:      [],
  };

  function consent() {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null'); } catch { return null; }
  }
  const enabled = () => !!(ph && cfg.key);

  if (enabled()) {
    ph.init(cfg.key, {
      api_host: cfg.host,
      persistence: 'localStorage',
      person_profiles: 'identified_only',   // a person profile only after "Got it" + sign-in
      // Nothing at all is sent until the person taps "Got it" in onboarding
      // (or turns it on in Account). Apple 5.1.1 / 2.5.14: real choice first.
      opt_out_capturing_by_default: true,

      // Taps on buttons, links and fields. Element text is masked (a meal row's
      // button holds a food name), so events say WHICH control by its classes
      // and data-* attributes, never what it says.
      autocapture: {
        dom_event_allowlist: ['click', 'submit', 'change'],
        element_allowlist: ['a', 'button', 'form', 'input', 'select', 'textarea', 'label'],
        capture_copied_text: false,
      },
      mask_all_text: true,
      mask_all_element_attributes: false,
      rageclick: true,
      capture_dead_clicks: true,
      enable_heatmaps: true,

      // Which tab/page (hash routes like #nutrition) and how long people stay.
      capture_pageview: 'history_change',
      capture_pageleave: true,

      // Crashes and speed: JS errors with stack traces, load and network timing.
      capture_exceptions: true,
      capture_performance: { network_timing: true, web_vitals: true },

      // Session replay: every bit of text and typing is masked and images are
      // blocked, so a replay shows taps, scrolling and layout only — never
      // weight, cycle dates, food names or anything typed. Network requests in
      // the replay keep only the host and first path parts (no barcodes, no
      // search words, no query strings), and never headers or bodies.
      disable_session_recording: false,
      enable_recording_console_log: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '*',
        // Blocked outright (shown as empty boxes): photos, and anything that
        // shows the cycle without words: phase dots, mood faces, the cycle
        // bar and history, the cycle-day card and the Menstruation page.
        blockSelector: 'img, video, canvas, #pageCycle, .cycle-dot, .cycle-face, .mood-pad, .app-hero-card, .app-cycle-bar, .app-hist-bar',
        recordCrossOriginIframes: false,
        recordHeaders: false,
        recordBody: false,
        maskCapturedNetworkRequestFn: (r) => {
          try { const u = new URL(r.name); r.name = u.origin + u.pathname.split('/').slice(0, 3).join('/'); } catch { r.name = ''; }
          return r;
        },
      },

      disable_surveys: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      property_denylist: ['$referrer', '$initial_referrer', '$referring_domain', '$initial_referring_domain'],
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
  // Everyone now sees the notice in onboarding (test and public builds alike).
  const isTester = () => true;
  function askConsent() {
    // Onboarding explains this instead (the notice after the name), so no bar.
    if (!enabled() || consent() || isTester()) return;
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

  // After the onboarding notice, usage is linked to the user's
  // account email so feedback can be followed up. Still never health data:
  // the event list above is the same.
  function acceptTesterNotice() {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ analytics: true, tester: true, at: new Date().toISOString() })); } catch {}
    if (!enabled()) return;
    ph.opt_in_capturing(); identifyTester(); track('app_opened');
  }
  function identifyTester() {
    if (!enabled() || !isTester() || !consent()?.tester) return;
    const email = window.EBSync && EBSync.signedIn && EBSync.signedIn() ? EBSync.email() : '';
    if (!email) return;
    let prof = {}; try { prof = (window.EB && EB.getProfile && EB.getProfile()) || {}; } catch {}
    const build = (() => { try { return localStorage.getItem('eb_test_build') === '1' ? 'testflight' : 'app_store'; } catch { return ''; } })();
    // Only plain, non-health facts about how she uses the app.
    try { ph.identify(email, { email, tester: build === 'testflight', build, track_mode: prof.trackMode || '' }); } catch {}
  }

  // Account switch: on → same as "Got it"; off → stop and forget this device.
  const statsOn = () => !!consent()?.analytics;
  function setStats(on) { if (on) acceptTesterNotice(); else setConsent(false); }
  window.EBAnalytics = { track, setConsent, consent, enabled, acceptTesterNotice, identifyTester, statsOn, setStats };

  const boot = async () => {
    // Know whether this is a test build before deciding which consent to show.
    try { if (window.EBNative && EBNative.native && EBNative.buildInfo) await EBNative.buildInfo(); } catch {}
    askConsent(); track('app_opened'); setTimeout(identifyTester, 1500);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
