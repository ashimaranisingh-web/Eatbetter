// ── Native touches (iPhone only; quiet no-ops on the website) ──────────
// haptic: a light tap when something is logged.
// share:  hands a PNG (the weekly poster) to the iOS share sheet, or the
//         browser's share/download on the web.
// widget: saves the next two weeks of cycle days + today's meals for the
//         home and lock screen widget.
(function () {
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const M = native ? cap.registerPlugin('Menufi') : null;
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function haptic(style = 'light') { if (M) M.haptic({ style }).catch(() => {}); }

  async function share(dataUrl, filename = 'menufi-week.png') {
    if (M) { try { await M.shareImage({ base64: dataUrl }); return; } catch {} }
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = dataUrl; a.download = filename; a.click();
  }

  let last = '';
  function widget(data) {
    if (!M) return;
    const json = JSON.stringify(data);
    if (json === last) return;            // only wake the widget when something changed
    last = json;
    M.updateWidget({ json }).catch(() => {});
  }

  // A tap whenever a meal or workout is logged (wraps the shared helpers).
  function wrap(name, when) {
    const orig = window[name];
    if (typeof orig !== 'function' || orig.__eb) return;
    const w = function (...a) { const r = orig.apply(this, a); if (when(a)) haptic(); return r; };
    w.__eb = true; window[name] = w;
  }
  function hook() {
    wrap('setSlotEaten', a => !!a[2]);
    wrap('addActivity', () => true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();

  // Opens the camera barcode reader. Resolves { code } or { cancelled: true };
  // rejects with code CAMERA_DENIED / NO_CAMERA. Not available on the website.
  function scanBarcode() { return M ? M.scanBarcode() : Promise.reject(Object.assign(new Error('unavailable'), { code: 'UNAVAILABLE' })); }

  // Photo of a nutrition label (source 'camera' or 'photos') → { rows: [text] } or { cancelled }.
  function readLabel(source = 'camera') { return M ? M.readLabel({ source }) : Promise.reject(Object.assign(new Error('unavailable'), { code: 'UNAVAILABLE' })); }

  // GET JSON. In the iPhone app this goes through the native HTTP client, so
  // services that don't allow browser requests (CORS) still answer.
  async function getJSON(url, ms = 9000) {
    if (native && cap.nativePromise) {
      let t;
      const timer = new Promise((_, no) => { t = setTimeout(() => no(new Error('timeout')), ms); });
      const r = await Promise.race([cap.nativePromise('CapacitorHttp', 'request', { url, method: 'GET', headers: { Accept: 'application/json', 'User-Agent': 'Menufi/1.0 (iOS app)' } }), timer])
        .finally(() => clearTimeout(t));
      if (!r || r.status >= 400) throw Object.assign(new Error('http ' + (r && r.status)), { status: r && r.status });
      return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
    }
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms);
    const r = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
    if (!r.ok) throw Object.assign(new Error('http ' + r.status), { status: r.status });
    return r.json();
  }

  window.EBNative = { native, haptic, share, widget, reduce, scanBarcode, readLabel, getJSON };
})();
