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
    render();
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    el.addEventListener('input', onInput);
  }
  function close() {
    el.remove(); el = null;
    document.documentElement.classList.remove('eb-locked');
    renderHeaderAvatar();
  }

  function render() {
    const p = EB.getProfile();
    const pref = EB.getThemePref();
    const steps = EBOnboarding.STEPS.filter(s => !s.info && s.profile !== false && (!s.when || s.when(p)));
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

        <div class="eb-list">
          <label class="eb-list-row is-input"><span class="eb-list-label">Name</span>
            <input class="pf-inline" data-pf="name" value="${esc(p.name)}" placeholder="Add" autocomplete="given-name"></label>
          <label class="eb-list-row is-input"><span class="eb-list-label">Birthday</span>
            <input type="date" class="pf-inline" data-pf="birthday" value="${esc(p.birthday)}" max="${EB.todayISO()}" autocomplete="bday"></label>
        </div>

        <p class="eb-group-label">Your plan</p>
        <div class="eb-list">${steps.map(s => {
          const sum = s.summary(p);
          return `<button type="button" class="eb-list-row" data-step-edit="${s.id}">
            <span class="eb-row-text"><span class="eb-list-label">${s.short}</span>
            <span class="eb-list-value${sum ? '' : ' muted'}">${esc(sum || 'Not set')}</span></span>${ICONS.chevron}</button>`;
        }).join('')}</div>

        <p class="eb-group-label">Meal Plan</p>
        <div class="eb-seg pf-seg" role="radiogroup" aria-label="Meal plan">
          ${[['generated', 'Built for me'], ['original', 'Original plan']].map(([v, t]) =>
            `<button type="button" class="eb-seg-btn${(p.planSource || 'generated') === v ? ' on' : ''}" data-plan-src="${v}" role="radio" aria-checked="${(p.planSource || 'generated') === v}">${t}</button>`).join('')}
        </div>
        <p class="eb-group-note">${window.EBPlanner && EBPlanner.current() ? `Built from your food, goal and activity. About ${TARGETS.cal.toLocaleString()} cal a day (an estimate).` : 'The fixed weekly plan the app started with.'}</p>

        <p class="eb-group-label">Appearance</p>
        <div class="eb-seg pf-seg" role="radiogroup" aria-label="Appearance">
          ${[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([v, t]) =>
            `<button type="button" class="eb-seg-btn${pref === v ? ' on' : ''}" data-theme-pref="${v}" role="radio" aria-checked="${pref === v}">${t}</button>`).join('')}
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

        <p class="eb-group-label">Meal assistant</p>
        <div class="eb-list">
          <label class="eb-list-row is-input"><span class="eb-list-label">Claude API Key</span>
            <input type="password" class="pf-inline" data-pf="apiKey" value="${esc(p.apiKey)}" placeholder="Optional" autocomplete="off" spellcheck="false"></label>
        </div>
        <p class="eb-group-note">Adds AI estimates for foods the built-in list doesn’t know. Meal text is sent to Anthropic when set.</p>

        <div class="eb-list pf-actions">
          <button type="button" class="eb-list-row" data-pf="redo"><span class="eb-list-label">Redo Onboarding</span>${ICONS.chevron}</button>
          <button type="button" class="eb-list-row danger" data-pf="erase"><span class="eb-list-label">Erase Profile</span></button>
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
    const ps = t.closest('[data-plan-src]');
    if (ps) { patch(p => { p.planSource = ps.dataset.planSrc; }); if (window.EBPlanner) EBPlanner.refresh(); return render(); }
    const tp = t.closest('[data-theme-pref]');
    if (tp) { EB.setThemePref(tp.dataset.themePref); return render(); }
    const se = t.closest('[data-step-edit]');
    if (se) return openEditor(se.dataset.stepEdit);
    const a = t.closest('[data-pf]'); if (!a) return;
    if (a.dataset.pf === 'close') close();
    if (a.dataset.pf === 'healthOn') connectHealth();
    if (a.dataset.pf === 'healthSync') EBHealth.syncIn().then(() => EBHealth.syncOut()).then(() => { EB.toast('Synced with Apple Health'); render(); });
    if (a.dataset.pf === 'healthOff') { EBHealth.disconnect(); render(); }
    if (a.dataset.pf === 'redo') { close(); EBOnboarding.open(); }
    if (a.dataset.pf === 'erase') {
      if (!confirm('Erase your profile and onboarding answers? Logged meals are kept.')) return;
      const p = EB.getProfile();
      p.food.files.forEach(f => EB.deleteFile(f.id));
      try { localStorage.removeItem('eb_profile'); } catch {}
      close(); EBOnboarding.open();
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

  window.EBProfile = { open };
})();
