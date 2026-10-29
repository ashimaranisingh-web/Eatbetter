// ── Eatbetter shared layer ────────────────────────────────────────────
// Profile storage, theme, uploaded-file storage and voice helpers used by
// onboarding.js, profile.js and assistant.js. Everything stays on-device:
// the profile lives in localStorage, uploaded plans in IndexedDB.
(function () {
  const PROFILE_KEY = 'eb_profile';
  const THEME_KEY = 'eb_theme';

  // ── Profile ──
  function emptyProfile() {
    return {
      version: 1,
      completedAt: null,
      name: '', birthday: '', photo: '',
      goal: '', goals: [],
      weight: { unit: 'kg', current: '', goal: '' },
      cycle: { tracks: null, lastStart: '', cycleLength: 28, periodLength: 5,
               regular: '', symptoms: [], pmsStart: '' },
      activity: { level: '', types: [] },
      trackers: [],
      food: { diet: '', cuisines: [], usual: '', files: [] },
      nutritionist: { has: '', name: '', contact: '' },
      sleep: { hours: '', regular: '' },
      health: { conditions: [], meds: '' },
      coach: '', reminders: [], planSource: 'generated',
      apiKey: ''
    };
  }
  function merge(base, saved) {
    const out = Array.isArray(base) ? [] : {};
    for (const k of Object.keys(base)) {
      const b = base[k], s = saved ? saved[k] : undefined;
      if (b && typeof b === 'object' && !Array.isArray(b)) out[k] = merge(b, s || {});
      else out[k] = s === undefined ? b : s;
    }
    return out;
  }
  function getProfile() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch {}
    const p = merge(emptyProfile(), saved || {});
    // First run on an existing install: carry over what the meal plan
    // already knows so nobody re-enters their weight or cycle date.
    if (!saved) {
      try {
        const w = typeof getWeight === 'function' ? getWeight() : {};
        if (w.current) p.weight.current = w.current;
        if (w.goal) p.weight.goal = w.goal;
        if (w.unit) p.weight.unit = w.unit;
        const cs = typeof getCycleStart === 'function' ? getCycleStart() : null;
        if (cs) { p.cycle.lastStart = cs; p.cycle.tracks = true; }
      } catch {}
    }
    // v1 had one goal list; PMS, PCOS and "eat healthier" are now extra goals.
    if (['pms', 'hormones', 'healthier'].includes(p.goal)) {
      if (!p.goals.includes(p.goal)) p.goals.push(p.goal);
      p.goal = '';
    }
    return p;
  }
  // sync:false for fields the meal plan doesn't use (name, photo, key…),
  // so typing doesn't repaint the whole page on every keystroke.
  function saveProfile(p, { sync = true } = {}) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
    if (sync) syncToMealPlan(p);
    document.dispatchEvent(new CustomEvent('eb:profile', { detail: p }));
  }
  // Push onboarding answers into the meal plan's own storage so the weight
  // card and cycle calendar pick them up without any extra wiring.
  function syncToMealPlan(p) {
    try {
      if (typeof setWeight === 'function' && (p.weight.current || p.weight.goal)) {
        const data = { unit: p.weight.unit || 'kg' };
        if (+p.weight.current > 0) data.current = +p.weight.current;
        if (+p.weight.goal > 0) data.goal = +p.weight.goal;
        setWeight(data);
      }
      if (typeof setCycleStart === 'function' && p.cycle.tracks !== false && p.cycle.lastStart) {
        setCycleStart(p.cycle.lastStart);
      }
      ['renderCycleCalendar', 'renderWeeklyTracker', 'renderWeight'].forEach(fn => {
        if (typeof window[fn] === 'function') { try { window[fn](); } catch {} }
      });
    } catch {}
  }

  // ── Theme ── 'system' | 'light' | 'dark'
  function getThemePref() {
    try { return localStorage.getItem(THEME_KEY) || 'system'; } catch { return 'system'; }
  }
  function resolvedTheme(pref) {
    if (pref === 'light' || pref === 'dark') return pref;
    return window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  // One palette for the whole app (white, black, green / pink accent):
  // there is no dark mode any more, so the theme is always "light".
  function applyTheme() {
    const t = 'light';
    document.documentElement.dataset.theme = t;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t === 'light' ? '#f6f6f4' : '#000000';
    document.dispatchEvent(new CustomEvent('eb:theme', { detail: t }));
  }
  function setThemePref(pref) {
    try { localStorage.setItem(THEME_KEY, pref); } catch {}
    applyTheme(pref);
  }
  function toggleTheme() {
    setThemePref(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  }
  if (window.matchMedia) {
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (getThemePref() === 'system') applyTheme('system');
    });
  }
  applyTheme();

  // ── Uploaded plans (IndexedDB — PDFs and spreadsheets are too big for localStorage) ──
  function db() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('eb_files', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function putFile(id, blob) {
    const d = await db();
    return new Promise((res, rej) => {
      const tx = d.transaction('files', 'readwrite');
      tx.objectStore('files').put(blob, id);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  }
  async function getFile(id) {
    const d = await db();
    return new Promise((res, rej) => {
      const r = d.transaction('files').objectStore('files').get(id);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function deleteFile(id) {
    const d = await db();
    return new Promise((res) => {
      const tx = d.transaction('files', 'readwrite');
      tx.objectStore('files').delete(id);
      tx.oncomplete = res; tx.onerror = res;
    });
  }

  // ── Voice ──
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voice = {
    canListen: !!Recognition,
    canSpeak: 'speechSynthesis' in window,
    // One-shot listen. Calls onInterim(text) while speaking, resolves with
    // the final transcript ('' on silence). Rejects on mic/permission errors.
    listen({ onInterim, continuous = false } = {}) {
      return new Promise((resolve, reject) => {
        if (!Recognition) return reject(new Error('unsupported'));
        const rec = new Recognition();
        rec.lang = navigator.language || 'en-IN';
        rec.interimResults = true;
        rec.continuous = continuous;
        let finalText = '';
        rec.onresult = (e) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) finalText += t; else interim += t;
          }
          onInterim && onInterim((finalText + ' ' + interim).trim());
        };
        rec.onerror = (e) => {
          if (e.error === 'no-speech' || e.error === 'aborted') return;
          reject(new Error(e.error));
        };
        rec.onend = () => resolve(finalText.trim());
        voice._rec = rec;
        try { rec.start(); } catch (err) { reject(err); }
      });
    },
    stop() { try { voice._rec && voice._rec.stop(); } catch {} },
    abort() { try { voice._rec && voice._rec.abort(); } catch {} },
    speak(text) {
      return new Promise((resolve) => {
        if (!voice.canSpeak) return resolve();
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const v = pickVoice();
        if (v) { u.voice = v; u.lang = v.lang; }
        // Slightly slower and a touch higher: calmer, friendlier delivery.
        u.rate = 0.95; u.pitch = 1.08;
        u.onend = resolve; u.onerror = resolve;
        speechSynthesis.speak(u);
      });
    },
    hush() { try { speechSynthesis.cancel(); } catch {} }
  };

  // Luna's voice: the warmest young female voice the device offers.
  // Apple's Indian-English voices first, then other natural female voices.
  const VOICE_PREFS = ['Isha', 'Veena', 'Neerja', 'Samantha', 'Ava', 'Zoe', 'Allison', 'Susan', 'Karen', 'Tessa', 'Moira',
    'Google UK English Female', 'Microsoft Aria', 'Microsoft Jenny', 'Female'];
  let chosenVoice = null;
  function pickVoice() {
    if (chosenVoice) return chosenVoice;
    const all = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    const en = all.filter(v => /^en/i.test(v.lang));
    for (const name of VOICE_PREFS) {
      const hit = en.find(v => v.name.includes(name) && /premium|enhanced/i.test(v.name)) || en.find(v => v.name.includes(name));
      if (hit) return (chosenVoice = hit);
    }
    return null;
  }
  if (window.speechSynthesis) speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', () => { chosenVoice = null; });

  // Mic button for any text field: appends what's said to the field.
  function attachDictation(button, field) {
    if (!voice.canListen) { button.hidden = true; return; }
    let on = false, base = '';
    button.addEventListener('click', async () => {
      if (on) { voice.stop(); return; }
      on = true; button.classList.add('is-listening');
      button.setAttribute('aria-pressed', 'true');
      base = field.value ? field.value.replace(/\s*$/, ' ') : '';
      try {
        const text = await voice.listen({
          continuous: true,
          onInterim: t => { field.value = base + t; field.dispatchEvent(new Event('input', { bubbles: true })); }
        });
        field.value = (base + text).trim();
        field.dispatchEvent(new Event('input', { bubbles: true }));
      } catch (err) {
        EB.toast(micErrorMessage(err));
      } finally {
        on = false; button.classList.remove('is-listening');
        button.setAttribute('aria-pressed', 'false');
      }
    });
  }
  function micErrorMessage(err) {
    const m = err && err.message;
    if (m === 'not-allowed' || m === 'service-not-allowed') return 'Microphone access is blocked for this page.';
    if (m === 'network') return 'Voice input needs an internet connection in this browser.';
    return 'Voice input isn’t available here.';
  }

  // ── Small utilities ──
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function fmtDate(iso, opts) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, opts || { day: 'numeric', month: 'short' });
  }
  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return Math.round(n / 1024) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }
  let toastTimer;
  function toast(msg) {
    let el = document.getElementById('ebToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ebToast'; el.className = 'eb-toast'; el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  const ICONS = {
    back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    mic: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    sun: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    upload: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
    file: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
    person: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'
  };

  window.EB = {
    getProfile, saveProfile, emptyProfile,
    getThemePref, setThemePref, applyTheme, toggleTheme,
    putFile, getFile, deleteFile,
    voice, attachDictation, micErrorMessage,
    esc, todayISO, fmtDate, fmtBytes, toast, ICONS
  };
})();
