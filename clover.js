// ── The Menufi clover, from the real leaf photo (clover.jpg) ─────────────
// Three green leaves = menstruation, nutrition, fitness; the pink "lucky" leaf = the app.
// The photo is cut into five pie slices around the clover's centre (pink, right,
// bottom, left, stem) so each leaf can be lit, dimmed or animated on its own.
// The art sits on white; a filter keeps only coloured pixels (green leaves, pink heart,
// stem) and makes white and grey see-through, so it works on black and on white.
(function () {
  const S = 512, C = [256, 255], R = 420;               // art size and the point where the leaves meet
  const dir = deg => { const r = deg * Math.PI / 180; return [C[0] + R * Math.sin(r), C[1] - R * Math.cos(r)]; };
  // Angles clockwise from straight up. The stem leaves the centre towards the lower left (~216°).
  // Measured from the art: the gaps between leaves sit at 45°, 135°, 207°, 219° and 315°.
  const WEDGES = { top: [-45, 45], right: [45, 135], bottom: [135, 207], stem: [207, 219], left: [219, 315] };
  const wedge = ([a, b]) => { const p = [C, dir(a), dir((a + b) / 2), dir(b)]; return 'M' + p.map(q => q.map(n => n.toFixed(1)).join(' ')).join(' L') + ' Z'; };

  // One shared set of definitions for every clover on the page.
  function ensureDefs() {
    if (document.getElementById('clvDefs')) return;
    const d = document.createElement('div');
    d.innerHTML = `<svg id="clvDefs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
      <filter id="clvKnock" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 -2.5 -2.5 0 4.2"/></filter>
      ${Object.entries(WEDGES).map(([k, w]) => `<clipPath id="clv-${k}"><path d="${wedge(w)}"/></clipPath>`).join('')}
    </defs></svg>`;
    document.body.appendChild(d.firstElementChild);
  }
  const piece = (k, cls = '') => `<g class="clv-piece clv-${k}${cls}"><image href="clover.jpg" width="${S}" height="${S}" clip-path="url(#clv-${k})" filter="url(#clvKnock)"/></g>`;

  // svg({ lit: 'top' | 'left' | 'right' | 'bottom' | null, animate: true, size: 120 })
  function svg(o = {}) {
    ensureDefs();
    const lit = o.lit || null, size = o.size || 120;
    const on = k => lit && k === lit ? ' on' : '';
    return `<svg class="clv${o.animate ? ' clv-anim' : ''}${lit ? ' clv-lit' : ''}" viewBox="0 0 512 512" width="${size}" height="${size}" aria-hidden="true">
      ${piece('stem')}${piece('bottom', on('bottom'))}${piece('left', on('left'))}${piece('right', on('right'))}${piece('top', on('top'))}</svg>`;
  }
  window.EBClover = { svg, CENTER: C };
})();
