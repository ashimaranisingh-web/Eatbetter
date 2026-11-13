// ── Accounts + sync (Supabase) ────────────────────────────────────────
// Optional. Without an account everything stays on this device, as before.
// Signed in, the app's saved data is backed up as one snapshot and kept in
// step across devices. Sign-in is a 6-digit code by email (no password).
(function () {
  const cfg = (window.EB_CONFIG || {}).supabase || {};
  const lib = window.supabase;
  const sb = lib && cfg.url && cfg.anonKey
    ? lib.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
    : null;

  const META_KEY = 'eb_sync';
  // Saved data that follows the person between devices. Left out on purpose:
  // eb_health (each phone connects to Health itself), eb_theme, eb_consent,
  // eb_sync, weekExpanded and Supabase's own session keys.
  const SYNCED = /^(eb_profile|eb_plan|eb_energy|eb_symptoms|eb_cycle_daily|eb_challenges|mealPlan_|slots_|slotEaten_|wakeup_|lastBuild_|supp_)/;

  let session = null, applying = false, pushTimer = null;

  const meta = () => { try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch { return {}; } };
  const setMeta = patch => { try { localStorage.setItem(META_KEY, JSON.stringify({ ...meta(), ...patch })); } catch {} };

  // ── Snapshot of everything synced, as raw strings ──
  function snapshot() {
    const keys = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (SYNCED.test(k)) keys[k] = localStorage.getItem(k);
    }
    // The Claude API key never leaves the device.
    if (keys.eb_profile) {
      try { const p = JSON.parse(keys.eb_profile); delete p.apiKey; keys.eb_profile = JSON.stringify(p); } catch {}
    }
    return keys;
  }

  function apply(keys) {
    const localKey = (() => { try { return JSON.parse(localStorage.getItem('eb_profile') || '{}').apiKey || ''; } catch { return ''; } })();
    applying = true;
    try {
      const drop = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (SYNCED.test(k) && !(k in keys)) drop.push(k); }
      drop.forEach(k => localStorage.removeItem(k));
      for (const [k, v] of Object.entries(keys)) {
        if (k === 'eb_profile' && localKey) {
          try { const p = JSON.parse(v); p.apiKey = localKey; localStorage.setItem(k, JSON.stringify(p)); continue; } catch {}
        }
        localStorage.setItem(k, v);
      }
    } finally { applying = false; }
  }

  const same = (a, b) => {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(k => b[k] === a[k] || (k === 'eb_profile' && stripKey(a[k]) === stripKey(b[k])));
  };
  const stripKey = s => { try { const p = JSON.parse(s); delete p.apiKey; return JSON.stringify(p); } catch { return s; } };

  // Decides what this device should end up with when the phone and the cloud
  // both have data.
  //   local, remote: { storageKey: rawString }
  //   info: { localChangedAt, remoteChangedAt, lastSyncedAt }  (ms, or 0 if never)
  // Returns the { storageKey: rawString } map to keep on both sides.
  function mergeSnapshots(local, remote, info) {
    // First sync on this phone: the cloud is the long-lived record, so it wins
    // where both have a key, and anything only this phone has is kept.
    if (!info.lastSyncedAt) return { ...local, ...remote };
    const localChanged = info.localChangedAt > info.lastSyncedAt;
    const remoteChanged = info.remoteChangedAt > info.lastSyncedAt;
    if (!localChanged) return remote;            // nothing new here: take the cloud
    if (!remoteChanged) return local;            // only this phone changed
    return { ...remote, ...local };              // both changed: keep both, this phone wins clashes
  }

  // Watch every save so a change is pushed a few seconds later.
  const origSet = Storage.prototype.setItem, origRemove = Storage.prototype.removeItem;
  const touched = k => {
    if (applying || !SYNCED.test(k)) return;
    setMeta({ localChangedAt: Date.now() });
    if (session) { clearTimeout(pushTimer); pushTimer = setTimeout(push, 3000); }
  };
  Storage.prototype.setItem = function (k, v) { origSet.call(this, k, v); if (this === localStorage) touched(k); };
  Storage.prototype.removeItem = function (k) { origRemove.call(this, k); if (this === localStorage) touched(k); };

  async function push(keys = snapshot()) {
    if (!sb || !session) return;
    const { error } = await sb.from('user_data').upsert({ user_id: session.user.id, data: { keys }, updated_at: new Date().toISOString() });
    if (!error) setMeta({ lastSyncedAt: Date.now() });
    return !error;
  }

  // Pull, reconcile, push. Returns true when local data changed (caller repaints).
  async function syncNow() {
    if (!sb || !session) return false;
    const { data: row, error } = await sb.from('user_data').select('data, updated_at').eq('user_id', session.user.id).maybeSingle();
    if (error) throw error;
    const local = snapshot();
    if (!row || !row.data || !row.data.keys) { await push(local); return false; }
    const m = meta();
    const merged = mergeSnapshots(local, row.data.keys, {
      localChangedAt: m.localChangedAt || 0,
      remoteChangedAt: Date.parse(row.updated_at) || 0,
      lastSyncedAt: m.lastSyncedAt || 0,
    }) || local;
    const changedHere = !same(merged, local);
    if (changedHere) apply(merged);
    if (!same(merged, row.data.keys)) await push(merged); else setMeta({ lastSyncedAt: Date.now() });
    return changedHere;
  }

  async function syncAndRepaint() {
    try { if (await syncNow()) location.reload(); }
    catch { /* offline or not set up: try again next time the app opens */ }
  }

  // ── Auth ──
  async function sendCode(email) {
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) throw error;
  }
  async function verifyCode(email, token) {
    const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
    session = data.session;
    const fresh = data.user && Date.now() - Date.parse(data.user.created_at) < 5 * 60 * 1000;
    if (fresh && window.EBAnalytics) EBAnalytics.track('account_created');
    await syncAndRepaint();
  }
  async function signOut() {
    if (sb) await sb.auth.signOut();
    session = null;
    setMeta({ lastSyncedAt: 0 });
  }
  async function deleteAccount() {
    if (!sb || !session) return;
    const { error } = await sb.rpc('delete_my_account');
    if (error) throw error;
    await signOut();
  }

  // ── Sign-in sheet ──
  const X = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  function openSignIn(onDone) {
    const { esc } = EB;
    const ov = document.createElement('div');
    ov.className = 'eb-cal-overlay app-sheet-overlay';
    let email = '', step = 'email', busy = false, err = '';
    const body = () => step === 'email' ? `
        <p class="acct-lead">Back up your plan, logs and cycle history, and use Menu-fi on more than one phone. We’ll email you a 6-digit code. No password.</p>
        <label class="ch-field"><span>Email</span><input class="eb-input" id="acctEmail" type="email" inputmode="email" autocomplete="email" value="${esc(email)}"></label>
        ${err ? `<p class="acct-err" role="alert">${esc(err)}</p>` : ''}
        <button type="button" class="eb-btn primary" data-acct="send" ${busy ? 'disabled' : ''}>${busy ? 'Sending…' : 'Send code'}</button>`
      : `
        <p class="acct-lead">Enter the code we sent to <b>${esc(email)}</b>.</p>
        <label class="ch-field"><span>Code</span><input class="eb-input" id="acctCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label>
        ${err ? `<p class="acct-err" role="alert">${esc(err)}</p>` : ''}
        <button type="button" class="eb-btn primary" data-acct="verify" ${busy ? 'disabled' : ''}>${busy ? 'Checking…' : 'Sign in'}</button>
        <button type="button" class="eb-btn ghost" data-acct="back">Use a different email</button>`;
    const paint = () => { ov.querySelector('.ch-sheet-body').innerHTML = body(); (ov.querySelector('#acctEmail') || ov.querySelector('#acctCode')).focus(); };
    ov.innerHTML = `<div class="eb-cal app-lsheet ch-sheet" role="dialog" aria-modal="true" aria-label="Sign in">
      <div class="ch-sheet-head"><b>Sign in</b><button type="button" class="eb-icon-btn" data-acct="close" aria-label="Close">${X}</button></div>
      <div class="ch-sheet-body"></div></div>`;
    document.body.appendChild(ov); paint();
    ov.addEventListener('click', async e => {
      const a = e.target.closest('[data-acct]');
      if (e.target === ov || a?.dataset.acct === 'close') return ov.remove();
      if (!a || busy) return;
      err = '';
      if (a.dataset.acct === 'back') { step = 'email'; return paint(); }
      if (a.dataset.acct === 'send') {
        email = ov.querySelector('#acctEmail').value.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) { err = 'Enter an email address like name@example.com.'; return paint(); }
        busy = true; paint();
        try { await sendCode(email); step = 'code'; }
        catch (x) { err = x.status === 429 ? 'Too many codes sent. Wait a minute and try again.' : 'Couldn’t send the code. Check your connection and try again.'; }
        busy = false; return paint();
      }
      if (a.dataset.acct === 'verify') {
        const code = ov.querySelector('#acctCode').value.replace(/\D/g, '');
        if (code.length !== 6) { err = 'The code is 6 digits.'; return paint(); }
        busy = true; paint();
        try { await verifyCode(email, code); ov.remove(); EB.toast('Signed in. Your data is backed up.'); onDone && onDone(); }
        catch { busy = false; err = 'That code didn’t work. Check it, or send a new one.'; paint(); }
      }
    });
  }

  // ── Boot ──
  if (sb) {
    sb.auth.getSession().then(({ data }) => { session = data.session; if (session) syncAndRepaint(); });
    sb.auth.onAuthStateChange((_e, s) => { session = s; });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && session) syncAndRepaint(); });
  }

  window.EBSync = {
    enabled: () => !!sb,
    email: () => session?.user?.email || '',
    signedIn: () => !!session,
    lastSyncedAt: () => meta().lastSyncedAt || 0,
    openSignIn, signOut, deleteAccount,
    syncNow: syncAndRepaint,
  };
})();
