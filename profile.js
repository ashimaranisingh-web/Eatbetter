// ── Profile ───────────────────────────────────────────────────────────
// Grouped-list settings page. Every onboarding answer is a row; tapping one
// opens that same onboarding step as an editor.
(function () {
  const { esc, ICONS } = EB;
  let el;

  function initials(name) {
    return (name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
  function avatarHTML(p, size) {
    if (p.photo) return `<img src="${p.photo}" alt="" width="${size}" height="${size}">`;
    const i = initials(p.name);
    return i ? `<span>${esc(i)}</span>` : ICONS.person;
  }

  function open() {
    el = document.createElement('div');
    el.className = 'ob pf';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'pfTitle');
    document.body.appendChild(el);
    document.documentElement.classList.add('eb-locked');
    render(); checkOwner();
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    el.addEventListener('input', onInput);
  }
  function close() {
    detailsOpen = false;
    el.remove(); el = null;
    document.documentElement.classList.remove('eb-locked');
    renderHeaderAvatar();
  }

  // Tester feedback form (feedback.html on the project's GitHub Pages site).
  const FEEDBACK_URL = 'https://tally.so/r/Z9Epva';
  // Owner-only rows (Redo onboarding, the Claude API key). The repo is public,
  // so the owner's email is stored only as a SHA-256 hash.
  const OWNER = 'a1cda088f7635b9837e955ed3838d5d56733095ff0279ee845abd4a2dd402c5c';
  let isOwner = false;
  async function checkOwner() {
    const email = window.EBSync && EBSync.signedIn() && EBSync.email();
    if (!email || !(window.crypto && crypto.subtle)) return (isOwner = false);
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(email).trim().toLowerCase()));
    const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    const was = isOwner; isOwner = hex === OWNER;
    if (was !== isOwner && el) render();
    return isOwner;
  }

  const PRIVACY_URL = 'https://ashimaranisingh-web.github.io/Eatbetter/privacy.html';
  function accountHTML() {
    if (!EBSync.signedIn()) return `
        <p class="eb-group-label">Account</p>
        <div class="eb-list">
          <button type="button" class="eb-list-row" data-pf="signIn"><span class="eb-row-text"><span class="eb-list-label">Sign In or Create Account</span>
            <span class="eb-list-value">Saves everything to your email</span></span>${ICONS.chevron}</button>
        </div>`;
    return `
        <p class="eb-group-label">Account</p>
        <div class="eb-list">
          ${isOwner ? `<button type="button" class="eb-list-row" data-pf="redo"><span class="eb-row-text"><span class="eb-list-label">See Onboarding</span>
            <span class="eb-list-value">Only you see this</span></span>${ICONS.chevron}</button>` : ''}
          <button type="button" class="eb-list-row" data-pf="signOut"><span class="eb-list-label">Sign Out</span></button>
        </div>
        <p class="eb-group-note">Everything saves to your account by itself.</p>`;
  }

  // "My details" is one row on Account that opens its own page.
  let detailsOpen = false;
  function detailsRow(s, p) {
    const sum = s.summary(p);
    return `<button type="button" class="eb-list-row" data-step-edit="${s.id}">
            <span class="eb-row-text"><span class="eb-list-label">${s.short}</span>
            <span class="eb-list-value${sum ? '' : ' muted'}">${esc(sum || 'Not set')}</span></span>${ICONS.chevron}</button>`;
  }
  function renderDetails(p, steps) {
    el.innerHTML = `
      <div class="ob-top">
        <button type="button" class="eb-icon-btn" data-pf="detailsBack" aria-label="Back">${ICONS.back}</button>
        <h1 class="pf-title" id="pfTitle">My Details</h1>
        <span class="eb-icon-btn" aria-hidden="true"></span>
      </div>
      <div class="ob-body pf-body">
        <div class="eb-list">${steps.map(s => detailsRow(s, p)).join('')}</div>
        ${window.EBDayMode && EBDayMode.openDishes && p.food.diet ? `<div class="eb-list">
          <button type="button" class="eb-list-row" data-pf="dishes"><span class="eb-row-text"><span class="eb-list-label">Dishes in My Plan</span>
            <span class="eb-list-value">${(p.food.skip || []).length ? `${p.food.skip.length} crossed out` : 'See and cross out dishes'}</span></span>${ICONS.chevron}</button>
        </div>` : ''}
        <p class="eb-group-note">Your plan updates when you change these.</p>
      </div>`;
  }

  function render() {
    const p = EB.getProfile();
    const pref = EB.getThemePref();
    const steps = EBOnboarding.STEPS.filter(s => !s.info && s.profile !== false && (!s.when || s.when(p)));
    if (detailsOpen) return renderDetails(p, steps);
    const setCount = steps.filter(s => s.summary(p)).length;
    el.innerHTML = `
      <div class="ob-top">
        <button type="button" class="eb-icon-btn" data-pf="close" aria-label="Close">${ICONS.back}</button>
        <h1 class="pf-title" id="pfTitle">Profile</h1>
        <span class="eb-icon-btn" aria-hidden="true"></span>
      </div>
      <div class="ob-body pf-body">
        <label class="pf-avatar" aria-label="Change profile photo">
          <span class="pf-avatar-img">${avatarHTML(p, 88)}</span>
          <span class="pf-avatar-edit">${p.photo ? 'Change photo' : 'Add photo'}</span>
          <input type="file" accept="image/*" data-pf="photo" hidden>
        </label>

        <a class="pf-test-card" href="${FEEDBACK_URL}" target="_blank" rel="noopener">
          <span class="pf-test-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M8 9h8M8 13h5"/></svg></span>
          <span class="pf-test-text"><b>Test Menu-fi (10min)</b></span>
          <span class="pf-test-go" aria-hidden="true">›</span>
        </a>

        <div class="eb-list">
          <label class="eb-list-row is-input"><span class="eb-list-label">Name</span>
            <input class="pf-inline" data-pf="name" value="${esc(p.name)}" placeholder="Add" autocomplete="given-name"></label>
          ${window.EBSync && EBSync.enabled() ? (EBSync.signedIn()
            ? `<div class="eb-list-row is-input"><span class="eb-list-label">Email</span><span class="pf-email">${esc(EBSync.email())}</span></div>`
            : `<button type="button" class="eb-list-row is-input" data-pf="signIn"><span class="eb-list-label">Email</span><span class="pf-email muted">Sign in to add</span></button>`) : ''}
        </div>

        ${window.EBDayMode && EBDayMode.MODES ? `
        <p class="eb-group-label">Nutrition plan</p>
        <div class="pf-track" role="radiogroup" aria-label="How you track food">${EBDayMode.MODES.map(m => {
          const on = EBDayMode.currentMode() === m.v;
          return `<button type="button" class="pf-track-opt${on ? ' on' : ''}" data-track-mode="${m.v}" role="radio" aria-checked="${on}">
            <i aria-hidden="true"></i><span><b>${m.t}</b><small>${m.line}</small></span></button>`;
        }).join('')}</div>
        <p class="eb-group-note">Applies from today. Best kept the same for a while, so your weeks compare fairly.</p>` : ''}

        <p class="eb-group-label">About you</p>
        <div class="eb-list">
          <button type="button" class="eb-list-row" data-pf="details"><span class="eb-row-text"><span class="eb-list-label">My Details</span>
            <span class="eb-list-value">Goal, body, cycle, food and more · ${setCount} of ${steps.length} set</span></span>${ICONS.chevron}</button>
        </div>

        ${window.EBHealth && EBHealth.native ? `
        <p class="eb-group-label">Apple Health</p>
        <div class="eb-list">
          ${EBHealth.isConnected()
            ? `<button type="button" class="eb-list-row" data-pf="healthSync"><span class="eb-row-text"><span class="eb-list-label">Sync Now</span>
                 <span class="eb-list-value">Weight, periods and workouts in · meals out</span></span></button>
               <button type="button" class="eb-list-row" data-pf="healthOff"><span class="eb-list-label">Stop Syncing</span></button>`
            : `<button type="button" class="eb-list-row" data-pf="healthOn"><span class="eb-row-text"><span class="eb-list-label">Connect Apple Health</span>
                 <span class="eb-list-value">Weight, periods and workouts in · meals out</span></span>${ICONS.chevron}</button>`}
        </div>` : ''}

        ${isOwner ? `
        <p class="eb-group-label">Meal Assistant · only you see this</p>
        <div class="eb-list">
          <label class="eb-list-row is-input"><span class="eb-list-label">Claude API Key</span>
            <input type="password" class="pf-inline" data-pf="apiKey" value="${esc(p.apiKey)}" placeholder="Optional" autocomplete="off" spellcheck="false"></label>
        </div>
        <p class="eb-group-note">Lets the app ask Claude for calories of foods it doesn’t know. Stays on this phone.</p>` : ''}

        ${window.EBAnalytics && EBAnalytics.enabled() ? `<p class="eb-group-label">Privacy</p>
        <div class="eb-list">
          <button type="button" class="eb-list-row" data-pf="stats" role="switch" aria-checked="${EBAnalytics.statsOn()}"><span class="eb-row-text"><span class="eb-list-label">Usage Stats and Screen Replays</span>
            <span class="eb-list-value">Never health, cycle, weight or food details</span></span><span class="pf-switch${EBAnalytics.statsOn() ? ' on' : ''}" aria-hidden="true"></span></button>
        </div>` : ''}

        ${window.EBSync && EBSync.enabled() ? accountHTML() : ''}

        <div class="eb-list pf-actions">
          <a class="eb-list-row" href="${PRIVACY_URL}" target="_blank" rel="noopener"><span class="eb-row-text"><span class="eb-list-label">Privacy and food data</span>
            <span class="eb-list-value">What’s saved, and where the numbers come from</span></span>${ICONS.chevron}</a>
          ${window.EBSync && EBSync.signedIn()
            ? `<button type="button" class="eb-list-row danger" data-pf="deleteAcct"><span class="eb-list-label">Delete Account</span></button>`
            : `<button type="button" class="eb-list-row danger" data-pf="erase"><span class="eb-list-label">Erase Everything</span></button>`}
        </div>
        <p class="eb-group-note center">Not medical advice. Check with your doctor before big diet changes.</p>
      </div>`;
  }

  function patch(fn) {
    const p = EB.getProfile(); fn(p); EB.saveProfile(p, { sync: false });
    return p;
  }
  function onInput(e) {
    const k = e.target.dataset.pf;
    if (k === 'name' || k === 'apiKey') {
      const v = e.target.value;
      const p = patch(p => { p[k] = k === 'apiKey' ? v.trim() : v; });
      if (k === 'name' && !p.photo) el.querySelector('.pf-avatar-img').innerHTML = avatarHTML(p, 88);
    }
  }
  async function onChange(e) {
    const k = e.target.dataset.pf;
    if (k === 'birthday') patch(p => { p.birthday = e.target.value; });
    if (k === 'photo' && e.target.files[0]) {
      try {
        const url = await resizeImage(e.target.files[0], 256);
        patch(p => { p.photo = url; });
        render();
      } catch { EB.toast('Couldn’t read that image'); }
    }
  }
  function onClick(e) {
    const t = e.target;
    if (t.closest('[data-pf="stats"]')) {
      const on = !EBAnalytics.statsOn(); EBAnalytics.setStats(on);
      EB.toast(on ? 'Usage stats and replays on. Thank you!' : 'Usage stats and replays off');
      return render();
    }
    if (t.closest('.pf-test-card')) { try { window.EBAnalytics && EBAnalytics.track('feedback_opened'); } catch {} }
    const ps = t.closest('[data-plan-src]');
    if (ps) { patch(p => { p.planSource = ps.dataset.planSrc; }); if (window.EBPlanner) EBPlanner.refresh(); return render(); }
    const tm = t.closest('[data-track-mode]');
    if (tm && window.EBDayMode) {
      const v = tm.dataset.trackMode, cur = EBDayMode.currentMode();
      if (v === cur) return;
      const name = (EBDayMode.MODES.find(m => m.v === v) || {}).t || v;
      if (EBDayMode.hasFood(todayStr()) && !confirm(`Switch to ${name}? Everything you’ve logged for food today will be cleared. Other days stay as they are.`)) return;
      EBDayMode.changeMode(v);
      patch(p => { p.trackMode = v; });
      EB.toast(`Tracking with ${name} from today`);
      return render();
    }
    const tp = t.closest('[data-theme-pref]');
    if (tp) { EB.setThemePref(tp.dataset.themePref); return render(); }
    const se = t.closest('[data-step-edit]');
    if (se) return openEditor(se.dataset.stepEdit);
    const a = t.closest('[data-pf]'); if (!a) return;
    if (a.dataset.pf === 'details') { detailsOpen = true; render(); el.querySelector('.ob-body').scrollTop = 0; return; }
    if (a.dataset.pf === 'dishes') { EBDayMode.openDishes(); return; }
    if (a.dataset.pf === 'detailsBack') { detailsOpen = false; return render(); }
    if (a.dataset.pf === 'close') close();
    if (a.dataset.pf === 'signIn') EBSync.openSignIn(() => el && (render(), checkOwner()));
    if (a.dataset.pf === 'syncNow') EBSync.syncNow().then(() => { EB.toast('Synced'); el && render(); });
    if (a.dataset.pf === 'signOut') {
      if (!confirm('Sign out? Your data stays in your account and is removed from this phone. Sign in again to get it back.')) return;
      EBSync.signOutAndClear().then(ok => { if (!ok) EB.toast('Couldn’t save to your account. Check your connection and try again.'); });
    }
    if (a.dataset.pf === 'deleteAcct') {
      if (!confirm('Delete your account and everything in it? This removes your data from this phone too, and can’t be undone.')) return;
      EBSync.deleteAccount().then(() => { try { localStorage.clear(); } catch {} location.reload(); })
        .catch(() => EB.toast('Couldn’t delete the account. Check your connection and try again.'));
    }
    if (a.dataset.pf === 'healthOn') connectHealth();
    if (a.dataset.pf === 'healthSync') EBHealth.syncIn().then(() => EBHealth.syncOut()).then(() => { EB.toast('Synced with Apple Health'); render(); });
    if (a.dataset.pf === 'healthOff') { EBHealth.disconnect(); render(); }
    if (a.dataset.pf === 'redo') { close(); EBOnboarding.open(); }
    if (a.dataset.pf === 'erase') {
      if (!confirm('Erase everything on this phone, including your meals and periods? This can’t be undone.')) return;
      const p = EB.getProfile();
      ((p.food && p.food.files) || []).forEach(f => EB.deleteFile(f.id));
      try { localStorage.clear(); } catch {}
      location.reload();
    }
  }

  async function connectHealth() {
    try { await EBHealth.connect(); EB.toast('Apple Health connected'); }
    catch { EB.toast('Apple Health isn’t available on this device'); }
    if (el) render();
  }

  // Edit one onboarding step in place
  function openEditor(stepId) {
    const step = EBOnboarding.STEPS.find(s => s.id === stepId);
    const draft = EB.getProfile();
    draft.weight._unit = draft.weight.unit;
    const ed = document.createElement('div');
    ed.className = 'ob ob-edit';
    ed.setAttribute('role', 'dialog'); ed.setAttribute('aria-modal', 'true'); ed.setAttribute('aria-labelledby', 'edTitle');
    ed.innerHTML = `
      <div class="ob-top">
        <button type="button" class="eb-text-btn" data-ed="cancel">Cancel</button>
        <span></span>
        <button type="button" class="eb-text-btn strong" data-ed="save">Save</button>
      </div>
      <div class="ob-body">
        <h1 class="ob-title" id="edTitle" tabindex="-1">${EBOnboarding.titleOf(step, draft)}</h1>
        <div class="ob-fields">${step.render(draft)}</div>
      </div>`;
    document.body.appendChild(ed);
    const fields = ed.querySelector('.ob-fields');
    const saveBtn = ed.querySelector('[data-ed="save"]');
    const refresh = () => { saveBtn.disabled = !(step.optional && !(step.touched ? step.touched(draft) : true)) && !step.valid(draft); };
    EBOnboarding.bindStep(fields, step, draft, {
      rerender: () => {
        fields.innerHTML = step.render(draft);
        fields.querySelectorAll('[data-dictate]').forEach(b => EB.attachDictation(b, b.parentElement.querySelector('textarea')));
        refresh();
      },
      refresh,
      onNoPeriods: () => save()
    });
    refresh();
    function save() {
      delete draft.weight._unit;
      EB.saveProfile(draft);
      if (window.EBReminders && (step.id === 'reminders' || step.id === 'cycle')) EBReminders.apply(draft);
      ed.remove(); render();
      if (step.id === 'food' && draft.trackMode !== 'guide' && window.EBDayMode && EBDayMode.openDishes) EBDayMode.openDishes();
    }
    ed.addEventListener('click', (e) => {
      const a = e.target.closest('[data-ed]'); if (!a) return;
      if (a.dataset.ed === 'cancel') { ed.remove(); }
      if (a.dataset.ed === 'save' && !a.disabled) save();
    });
    ed.querySelector('#edTitle').focus({ preventScroll: true });
  }

  function resizeImage(file, max) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(img.width, img.height);
        const c = document.createElement('canvas'); c.width = c.height = max;
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, max, max);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // ── Header buttons (assistant + avatar) ──
  function renderHeaderAvatar() {
    const btn = document.getElementById('ebAvatarBtn');
    if (btn) btn.innerHTML = avatarHTML(EB.getProfile(), 36);
  }
  function mountHeader() {
    const header = document.querySelector('.container > header');
    if (!header || document.getElementById('ebAvatarBtn')) return;
    header.classList.add('eb-header');
    const text = document.createElement('div');
    text.className = 'eb-header-text';
    while (header.firstChild) text.appendChild(header.firstChild);
    header.appendChild(text);
    const actions = document.createElement('div');
    actions.className = 'eb-header-actions';
    actions.innerHTML = `
      <button type="button" class="eb-icon-btn outlined" id="ebAssistantBtn" aria-label="Log what you ate">${ICONS.spark}</button>
      <button type="button" class="eb-avatar-btn" id="ebAvatarBtn" aria-label="Profile"></button>`;
    header.appendChild(actions);
    renderHeaderAvatar();
    document.getElementById('ebAvatarBtn').addEventListener('click', open);
    document.getElementById('ebAssistantBtn').addEventListener('click', () => window.EBAssistant && EBAssistant.open());
  }
  document.addEventListener('eb:profile', renderHeaderAvatar);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountHeader); else mountHeader();

  window.EBProfile = { open, close: () => el && close(), isOpen: () => !!el };
})();
